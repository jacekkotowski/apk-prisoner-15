// Run: node tests/engine.test.js. No dependencies.
const P = require('../app/assets/engine.js'), assert = require('assert');
const day = n => new Date(2026, 10, 15 + n); // 15 Nov 2026 is a Sunday
const st = cap => Object.assign(P.newState(), { cap });
const C = { std: 22, uneven: 8, squat: 30, bulg: 8 };
// weekly rotation
assert.deepStrictEqual([0, 1, 2, 3, 4, 5, 6].map(d => P.dayPlan(d).kind), ['recovery', 'moderate', 'light', 'moderate', 'light', 'moderate', 'light']);
[2, 4, 6].forEach(d => assert.deepStrictEqual([P.dayPlan(d).push, P.dayPlan(d).squat], ['uneven', 'bulg']));
[0, 1, 3, 5].forEach(d => assert.deepStrictEqual([P.dayPlan(d).push, P.dayPlan(d).squat], ['std', 'squat']));
// rounds and targets
let s = P.buildSession(st(C), day(1), 'normal');
assert.strictEqual(s.rounds, 4); assert.deepStrictEqual(s.tp, [16, 15, 15, 19]);
assert.strictEqual(P.buildSession(st(C), day(1), 'exhausted').rounds, 2);
assert.strictEqual(P.buildSession(st(C), day(0), 'normal').rounds, 2);
assert.strictEqual(P.buildSession(st(C), day(1), 'strong').rounds, 4);
// the chosen number of rounds is kept inside 15 minutes by shortening the rests first
const six = st(C); six.prefs.rounds = 6; s = P.buildSession(six, day(1), 'normal');
assert.strictEqual(s.rounds, 6); assert.ok(s.steps.filter(q => q.t === 'rest').every(q => q.secs === 20) && P.estimate(s.steps) <= P.BUDGET);
const two = st(C); two.prefs.rounds = 2; assert.strictEqual(P.buildSession(two, day(3), 'normal').rounds, 2);
s = P.buildSession(st(C), day(1), 'normal');
assert.ok(P.buildSession(st(C), day(1), 'strong').tp[1] > s.tp[1]);
assert.ok(P.buildSession(st(C), day(2), 'normal').tp[0] < C.uneven, 'light day stays below capacity');
// only push-ups and squats, never above 15 minutes, for any capacity, day and energy
for (const cap of [1, 5, 10, 22, 40, 80, 200]) for (let d = 0; d < 7; d++) for (const e of ['exhausted', 'normal', 'strong']) {
  const x = P.buildSession(st({ std: cap, uneven: cap, squat: cap * 2, bulg: cap }), day(d), e);
  assert.strictEqual(x.rounds % 2, 0, 'rounds are even');
  assert.ok(P.estimate(x.steps) <= P.BUDGET && P.BUDGET < P.LIMIT, `fits: cap ${cap} day ${d} ${e} = ${P.estimate(x.steps)}s`);
  assert.ok(x.steps.filter(q => q.t === 'set').every(q => q.target >= 1 && ['push', 'squat'].includes(P.VAR[q.v].fam)));
}
assert.ok(P.estimate(P.buildSession(st(C), day(1), 'exhausted').steps) <= 6 * 60, 'exhausted is about 4 to 6 minutes');
// sides: both sides each round, equal targets, starting side alternates between sessions
const state = st(C); s = P.buildSession(state, day(2), 'normal');
const sides = s.steps.filter(q => q.v === 'uneven').map(q => q.side);
assert.strictEqual(sides.join(''), 'LRLRLRLR');
const run = (state, ses, short) => { ses.steps.forEach(q => { if (q.t === 'set') ses.done.push({ v: q.v, side: q.side, target: q.target, done: q.target - (short || 0), round: q.round }); }); return ses; };
P.finish(state, run(state, s), 'ok');
assert.strictEqual(P.buildSession(state, day(4), 'normal').steps.find(q => q.v === 'uneven').side, 'R');
assert.strictEqual(P.buildSession(state, day(4), 'normal').steps.find(q => q.v === 'bulg').side, 'R');
const b = P.stats(state, day(2)); assert.strictEqual(b.side.L, b.side.R); assert.ok(b.doneToday && b.days === 1);
// progression: only after two comfortable clean sessions of the same variation
assert.strictEqual(state.cap.uneven, 8);
let r = P.finish(state, run(state, P.buildSession(state, day(4), 'normal')), 'easy');
assert.strictEqual(state.cap.uneven, 9); assert.strictEqual(state.cap.std, 22); assert.strictEqual(r.changes.length, 2);
// missed targets, exhausted days and partial sessions never raise; two hard sessions lower
const s2 = st(C);
P.finish(s2, run(s2, P.buildSession(s2, day(1), 'normal')), 'ok'); P.finish(s2, run(s2, P.buildSession(s2, day(3), 'normal'), 2), 'ok');
P.finish(s2, run(s2, P.buildSession(s2, day(5), 'exhausted')), 'easy'); assert.strictEqual(s2.cap.std, 22);
const part = P.buildSession(s2, day(8), 'normal'); part.done.push({ v: 'std', side: null, target: 16, done: 16 });
r = P.finish(s2, part, 'ok'); assert.ok(r.entry.partial); assert.strictEqual(P.reps(r.entry), 16); assert.strictEqual(s2.cap.std, 22);
P.finish(s2, run(s2, P.buildSession(s2, day(10), 'normal')), 'hard'); P.finish(s2, run(s2, P.buildSession(s2, day(12), 'normal')), 'hard');
assert.strictEqual(s2.cap.std, 20); assert.strictEqual(s2.best.std, 19);
// pairs: the second side never asks for more than the first side did, and the first side is known
const ps = P.buildSession(st(C), day(2), 'normal'), iL = ps.steps.findIndex(q => q.v === 'uneven'), qL = ps.steps[iL], qR = ps.steps[iL + 1];
assert.ok(!P.hasFirst(ps, qL) && P.target(ps, qL) === qL.target && qL.side === 'L' && qR.side === 'R');
ps.done.push({ v: 'uneven', side: 'L', target: qL.target, done: 3, round: 1 });
assert.ok(P.hasFirst(ps, qR) && P.target(ps, qR) === 3 && !P.hasFirst(ps, qL));
ps.done[0].done = qL.target + 4; assert.strictEqual(P.target(ps, qR), qR.target);
ps.done[0].done = 0; assert.strictEqual(P.target(ps, qR), qR.target);
// proximity counter: near then far is one repetition; flicker and bounces are ignored
const d = P.RepDetector(); let n = 0; const f = (near, t) => { if (d.feed(near, t)) n++; };
f(true, 1000); f(false, 1600); f(true, 1650); f(false, 1700); f(true, 2600); f(true, 2700); f(false, 3300); f(false, 3400); f(true, 3450); f(false, 3600);
assert.strictEqual(n, 2);
// Galloway: slower pace means shorter runs; magic mile gives the long-run pace
const g = k => { const x = P.galloway(k); return x.run + '/' + x.walk; };
assert.strictEqual(g(335), '120/30'); assert.strictEqual(g(360), '90/30'); assert.strictEqual(g(420), '60/30'); assert.strictEqual(g(500), '30/30'); assert.strictEqual(g(800), '5/30');
let prev = 1e9; for (let k = 180; k <= 800; k += 5) { const x = P.galloway(k); assert.ok(x.run <= prev && x.walk === 30); prev = x.run; }
assert.strictEqual(P.longRunPace(480), 460); assert.strictEqual(P.parseTime('8:30'), 510); assert.strictEqual(P.parseTime('x'), 0); assert.strictEqual(P.mmss(390), '6:30');
// a screen touch already counted this approach: the sensor does not count it again, and a touch without the face near swallows nothing
const d2 = P.RepDetector(); let n2 = 0; const h2 = (near, t) => { if (d2.feed(near, t)) n2++; };
h2(true, 1000); d2.touched(); h2(false, 1700); assert.strictEqual(n2, 0);
h2(true, 2600); h2(false, 3300); assert.strictEqual(n2, 1);
d2.touched(); h2(true, 5000); h2(false, 5700); assert.strictEqual(n2, 2);
// running: start level from pace, 20 minutes counts as done, two comfortable done runs step up, short and custom runs never move the plan
const rs = P.newState(); rs.run = { pace: 420, mins: 30, custom: false, level: P.levelFor(420) }; [rs.run.run, rs.run.walk] = P.LADDER[rs.run.level];
assert.strictEqual(rs.run.run, 60); assert.strictEqual(P.levelFor(460), 1); assert.strictEqual(P.runAdvice(rs, day(1)), 'First run: any day.');
const runOf = (secs, feel, extra) => Object.assign({ date: P.dateKey(day(1)), secs, run: rs.run.run, walk: rs.run.walk, level: rs.run.level, custom: false, feel }, extra);
assert.deepStrictEqual(P.finishRun(rs, runOf(600, 'easy')), { done: false, change: 0 });
P.finishRun(rs, runOf(1250, 'ok', { custom: true, steps: 2400, km: 2.1 })); assert.deepStrictEqual([rs.runs[1].steps, rs.runs[1].km, rs.runs[0].steps], [2400, 2.1, 0]); P.finishRun(rs, runOf(2400, 'ok')); assert.strictEqual(rs.run.level, 3);
assert.deepStrictEqual(P.finishRun(rs, runOf(1200, 'easy')), { done: true, change: 1 }); assert.deepStrictEqual([rs.run.run, rs.run.walk], [90, 30]);
P.finishRun(rs, runOf(1500, 'hard')); P.finishRun(rs, runOf(1500, 'hard')); assert.strictEqual(rs.run.level, 3);
assert.strictEqual(rs.runs.length, 6); assert.ok(!rs.runs[0].done && rs.runs[2].done);
assert.strictEqual(P.runAdvice(rs, day(1)), 'Ran today.'); assert.ok(P.runAdvice(rs, day(2)).startsWith('Ran yesterday')); assert.strictEqual(P.runAdvice(rs, day(3)), 'Run day.');
// comeback line, never miss twice, weekly verdict, milestones
const fresh = () => ({ std: 22, uneven: 8, squat: 30, bulg: 8 });
const cs = st(fresh()); cs.cap0 = fresh(); assert.strictEqual(P.comeback(cs, ['std', 'squat']), ''); cs.cap.std = 26;
assert.strictEqual(P.comeback(cs, ['std', 'squat']), 'Push-ups 22 → 26');
assert.ok(!P.missed(cs, day(1))); P.finish(cs, run(cs, P.buildSession(cs, day(1), 'normal')), 'ok');
assert.ok(!P.missed(cs, day(1)) && !P.missed(cs, day(2)) && P.missed(cs, day(3)));
assert.strictEqual(P.verdict(cs, day(3)), ''); assert.ok(/^This week: 1 of 7 days\. \d+ repetitions\.$/.test(P.verdict(cs, day(7))), P.verdict(cs, day(7)));
P.finish(cs, run(cs, P.buildSession(cs, day(8), 'exhausted')), 'ok'); assert.ok(/1 of 7 days.*Down \d+% on last week\.$/.test(P.verdict(cs, day(14))));
assert.strictEqual(P.verdict(cs, day(28)), 'Quiet week. The next one starts tomorrow.');
assert.deepStrictEqual([6, 7, 29, 30, 100].map(P.milestone), ['', '7 days. First week served.', '7 days. First week served.', "30 days. You're a regular.", '100 days. Lifer.']);
// test day: due after four weeks, all four variations inside 15 minutes, sides equal, capacities set from the result
const ts = st(fresh()); ts.testAt = P.dateKey(day(1)); assert.ok(!P.testDue(ts, day(28)) && P.testDue(ts, day(29)));
const t = P.buildTest(ts, day(29)), tsets = t.steps.filter(q => q.t === 'set');
assert.deepStrictEqual(tsets.map(q => q.v + (q.side || '')), ['std', 'squat', 'unevenL', 'unevenR', 'bulgL', 'bulgR']); assert.ok(t.steps.filter(q => q.t !== 'set').reduce((a, q) => a + q.secs, 0) <= 300);
const rec = (q, n) => t.done.push({ v: q.v, side: q.side, target: P.target(t, q), done: n, round: 1 });
rec(tsets[0], 27); rec(tsets[1], 35); rec(tsets[2], 9); assert.strictEqual(P.target(t, tsets[3]), 9); rec(tsets[3], 9);
const tr = P.finishTest(ts, t); assert.deepStrictEqual([ts.cap.std, ts.cap.squat, ts.cap.uneven, ts.cap.bulg], [27, 35, 9, 8]);
assert.ok(tr.changes.length === 3 && ts.testAt === P.dateKey(day(29)) && !P.testDue(ts, day(30)) && ts.log.length === 1 && ts.flip.uneven && !ts.flip.bulg);
const t0 = P.buildTest(ts, day(60)); P.finishTest(ts, t0); assert.strictEqual(ts.log.length, 1);
// paths: level 0 is the original variation; the next step opens at capacity 10 and halves the capacity; stepping back never makes it instantly ready
const pt = st(fresh()); assert.deepStrictEqual([P.name(pt, 'uneven'), P.name(pt, 'bulg'), P.name(pt, 'std')], ['Uneven push-ups', 'Bulgarian split squats', 'Push-ups']);
assert.ok(!P.ready(pt, 'uneven') && !P.ready(pt, 'std') && P.info(pt, 'bulg').side === 'leg in front'); assert.strictEqual(P.stepUp(pt, 'uneven', '2026-12-01'), false);
pt.cap.uneven = 10; pt.best.uneven = 9; assert.ok(P.ready(pt, 'uneven')); assert.ok(P.stepUp(pt, 'uneven', '2026-12-01'));
assert.deepStrictEqual([pt.path.uneven, pt.cap.uneven, pt.best.uneven, P.name(pt, 'uneven')], [1, 5, 0, 'Archer push-ups']); assert.strictEqual(pt.pathLog.length, 1);
assert.strictEqual(P.buildSession(pt, day(2), 'normal').steps.find(q => q.v === 'uneven').sec, 3);
assert.ok(P.stepBack(pt, 'uneven', '2026-12-02') && pt.path.uneven === 0 && pt.cap.uneven === 9 && !P.ready(pt, 'uneven') && !P.stepBack(pt, 'uneven', '2026-12-03'));
for (let i = 0; i < 5; i++) { pt.cap.bulg = 10; assert.ok(P.stepUp(pt, 'bulg', '2026-12-10')); }
assert.strictEqual(P.name(pt, 'bulg'), 'Pistols'); pt.cap.bulg = 40; assert.ok(!P.ready(pt, 'bulg') && !P.stepUp(pt, 'bulg', '2026-12-11'));
P.PATH.uneven.concat(P.PATH.bulg).forEach(x => assert.ok(x.name && x.setup && x.side && x.say && x.sec > 0));
// every level stays inside 15 minutes with even rounds, in both modes
for (let lv = 0; lv < 6; lv++) for (const cap of [3, 10, 40, 150]) {
  const q = st({ std: cap, uneven: cap, squat: cap, bulg: cap }); q.path = { uneven: lv, bulg: lv };
  for (const mode of ['rounds', 'ladder']) { q.prefs.light = mode; const x = P.buildSession(q, day(2), 'normal'); assert.ok(P.estimate(x.steps) <= P.BUDGET && x.rounds % 2 === 0, `level ${lv} cap ${cap} ${mode}`); }
}
// 1-2-3 ladders: both sides on every rung with equal repetitions, only on the light days
const ld = st(fresh()); ld.prefs.light = 'ladder'; s = P.buildSession(ld, day(2), 'normal');
assert.deepStrictEqual(s.steps.filter(q => q.v === 'uneven' && q.round === 1).map(q => q.side + q.target), ['L1', 'R1', 'L2', 'R2', 'L3', 'R3']);
assert.strictEqual(s.rounds, 4); assert.deepStrictEqual(s.ladder, { uneven: 3, bulg: 3 });
assert.strictEqual(P.buildSession(ld, day(1), 'normal').ladder, null); assert.deepStrictEqual([1, 4, 5, 10, 15, 40].map(P.topRung), [1, 3, 3, 4, 5, 6]);
const lsets = s.steps.filter(q => q.v === 'uneven' && q.round === 1); s.done.push({ v: 'uneven', side: 'L', target: 2, done: 2, round: 1, rung: 2 });
assert.ok(P.hasFirst(s, lsets[3]) && P.target(s, lsets[3]) === 2 && !P.hasFirst(s, lsets[1]) && P.target(s, lsets[1]) === 1);
console.log('ENGINE PASS');
