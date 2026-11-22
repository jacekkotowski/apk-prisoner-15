// Run: node tests/engine.test.js. No dependencies.
const P = require('../app/assets/engine.js'), assert = require('assert');
const day = n => new Date(2026, 10, 15 + n); // 15 Nov 2026 is a Sunday
const st = cap => Object.assign(P.newState(), { cap: Object.assign({}, cap) });
const C = { std: 22, uneven: 8, squat: 30, bulg: 8 };
const run = (state, ses, short, only) => { ses.steps.forEach(q => { if (q.t === 'set') ses.done.push({ v: q.v, side: q.side, target: q.target, done: q.target - (!only || only === q.v ? short || 0 : 0), round: q.round }); }); return ses; };
const vars = ses => [...new Set(ses.steps.filter(q => q.t === 'set').map(q => q.v))];
// week: Monday, Wednesday, Friday moderate; Tuesday, Thursday, Saturday light; Sunday recovery. No more standard-day / uneven-day rotation.
assert.deepStrictEqual([0, 1, 2, 3, 4, 5, 6].map(d => P.dayPlan(d).kind), ['recovery', 'moderate', 'light', 'moderate', 'light', 'moderate', 'light']);
// the plan table: first 2 rounds standard (warm-up half, 0.6 of capacity, flat), the rest one-sided (heavy half)
let plan = P.sessionPlan(st(C), day(1), 'normal');
assert.deepStrictEqual(plan.map(r => [r.round, r.push, r.squat, r.tp, r.ts]), [[1, 'std', 'squat', 13, 18], [2, 'std', 'squat', 13, 18], [3, 'uneven', 'bulg', 6, 6], [4, 'uneven', 'bulg', 6, 6]]);
const C2 = { std: 22, uneven: 20, squat: 30, bulg: 20 };
assert.deepStrictEqual(P.sessionPlan(st(C2), day(1), 'normal').slice(2).map(r => r.tp), [14, 16], 'moderate: last heavy round x1.15');
assert.deepStrictEqual(P.sessionPlan(st(C2), day(2), 'normal').slice(2).map(r => r.tp), [12, 12], 'light: 0.6, no boost');
assert.deepStrictEqual(P.sessionPlan(st(C2), day(2), 'strong').slice(2).map(r => r.tp), [14, 14], 'strong: +0.1');
assert.deepStrictEqual(P.sessionPlan(st(C2), day(1), 'strong').slice(0, 2).map(r => r.tp), [13, 13], 'the warm-up half does not change with energy');
// rounds: 2 = standard only; 4 = 2 + 2 one-sided; 6 = 2 + 4; exhausted, a missed day and Sunday give 2
for (const [pref, std, one] of [[2, 2, 0], [4, 2, 2], [6, 2, 4]]) {
  const q = st(C); q.prefs.rounds = pref; const x = P.buildSession(q, day(1), 'normal');
  assert.deepStrictEqual([x.rounds, x.plan.filter(r => r.push === 'std').length, x.plan.filter(r => r.push === 'uneven').length], [std + one, std, one]);
}
assert.strictEqual(P.buildSession(st(C), day(1), 'exhausted').rounds, 2);
assert.strictEqual(P.buildSession(st(C), day(0), 'normal').rounds, 2);
assert.strictEqual(P.buildSession(st(C), day(1), 'strong').rounds, 4);
// the chosen rounds are kept inside 15 minutes by shortening the rests and the warm-up first
const six = st(C); six.prefs.rounds = 6; let s = P.buildSession(six, day(1), 'normal');
assert.strictEqual(s.rounds, 6); assert.ok(s.steps.filter(q => q.t === 'rest').every(q => q.secs === 20) && P.estimate(s.steps) <= P.BUDGET);
// a heavy session that cannot fit drops heavy rounds, never the two standard ones
const big = st({ std: 60, uneven: 60, squat: 90, bulg: 60 }); big.prefs.rounds = 6; s = P.buildSession(big, day(1), 'normal');
assert.ok(s.rounds < 6 && s.rounds >= 2 && s.plan.slice(0, 2).every(r => r.push === 'std') && P.estimate(s.steps) <= P.BUDGET, 'rounds ' + s.rounds);
// for every round count, capacity, day and energy: even rounds, 2 standard first, rest one-sided in pairs, inside the budget
for (const pref of [2, 4, 6]) for (const cap of [1, 5, 10, 22, 40, 80, 200]) for (let d = 0; d < 7; d++) for (const e of ['exhausted', 'normal', 'strong']) {
  const q = st({ std: cap, uneven: cap, squat: cap * 2, bulg: cap }); q.prefs.rounds = pref;
  const x = P.buildSession(q, day(d), e), tag = `rounds ${pref} cap ${cap} day ${d} ${e}`;
  assert.strictEqual(x.rounds % 2, 0, 'even ' + tag); assert.strictEqual(x.plan.length, x.rounds);
  assert.ok(P.estimate(x.steps) <= P.BUDGET && P.BUDGET < P.LIMIT, `fits: ${tag} = ${P.estimate(x.steps)}s`);
  assert.ok(x.rounds >= 2 && x.rounds <= (e === 'exhausted' || d === 0 ? 2 : pref), 'rounds within the choice ' + tag);
  x.plan.forEach((r, i) => assert.deepStrictEqual([r.push, r.squat], i < 2 ? ['std', 'squat'] : ['uneven', 'bulg'], 'half ' + tag));
  const sets = x.steps.filter(q => q.t === 'set'); assert.ok(sets.every(q => q.target >= 1 && ['push', 'squat'].includes(P.VAR[q.v].fam)));
  if (e === 'exhausted' || d === 0) assert.deepStrictEqual(vars(x), ['std', 'squat'], 'standard only ' + tag);
  for (let r = 1; r <= x.rounds; r++) ['uneven', 'bulg', 'std', 'squat'].forEach(v => {
    const m = sets.filter(q => q.round === r && q.v === v); if (!m.length) return;
    assert.strictEqual(m.length, P.VAR[v].sides, 'pairs ' + tag);
    assert.ok(m.every(q => q.target === m[0].target) && (P.VAR[v].sides === 1 || m.map(q => q.side).sort().join('') === 'LR'), 'equal sides ' + tag);
    assert.strictEqual(r <= P.WARM_ROUNDS, P.VAR[v].sides === 1, 'standard in the first two rounds only ' + tag);
  });
}
assert.ok(P.estimate(P.buildSession(st(C), day(1), 'exhausted').steps) <= 6 * 60, 'exhausted is about 4 to 6 minutes');
// sides: both sides each round, equal targets, starting side alternates between sessions
const state = st(C); s = P.buildSession(state, day(2), 'normal');
assert.strictEqual(s.steps.filter(q => q.v === 'uneven').map(q => q.side).join(''), 'LRLR');
P.finish(state, run(state, s), 'ok');
assert.strictEqual(P.buildSession(state, day(4), 'normal').steps.find(q => q.v === 'uneven').side, 'R');
assert.strictEqual(P.buildSession(state, day(4), 'normal').steps.find(q => q.v === 'bulg').side, 'R');
const b = P.stats(state, day(2)); assert.strictEqual(b.side.L, b.side.R); assert.ok(b.doneToday && b.days === 1);
// progression: every variation in the session, each on its own two-clean-sessions rule
assert.deepStrictEqual(['std', 'uneven', 'squat', 'bulg'].map(v => state.cap[v]), [22, 8, 30, 8]);
let r = P.finish(state, run(state, P.buildSession(state, day(4), 'normal')), 'easy');
assert.deepStrictEqual(['std', 'uneven', 'squat', 'bulg'].map(v => state.cap[v]), [23, 9, 32, 9]); assert.deepStrictEqual(r.changes.map(c => c.v).sort(), ['bulg', 'squat', 'std', 'uneven']);
// one variation short, the others clean: only the clean ones rise
const s3 = st(C); [1, 3].forEach(d => P.finish(s3, run(s3, P.buildSession(s3, day(d), 'normal'), 1, 'uneven'), 'ok'));
assert.deepStrictEqual(['std', 'uneven', 'squat', 'bulg'].map(v => s3.cap[v]), [23, 8, 32, 9]);
// missed targets, exhausted days and partial sessions never raise; two hard sessions lower
const s2 = st(C);
P.finish(s2, run(s2, P.buildSession(s2, day(1), 'normal')), 'ok'); P.finish(s2, run(s2, P.buildSession(s2, day(3), 'normal'), 2), 'ok');
P.finish(s2, run(s2, P.buildSession(s2, day(5), 'exhausted')), 'easy'); assert.strictEqual(s2.cap.std, 22);
const sun = st(C); [7, 14].forEach(d => P.finish(sun, run(sun, P.buildSession(sun, day(d), 'normal')), 'easy'));
assert.deepStrictEqual(sun.cap, { std: 23, uneven: 8, squat: 32, bulg: 8 }, 'Sunday recovery trains only the standard variations');
const exh = st(C); [1, 3].forEach(d => P.finish(exh, run(exh, P.buildSession(exh, day(d), 'exhausted')), 'easy')); assert.deepStrictEqual(exh.cap, C, 'exhausted never raises');
const part = P.buildSession(s2, day(8), 'normal'); part.done.push({ v: 'std', side: null, target: part.plan[0].tp, done: part.plan[0].tp });
r = P.finish(s2, part, 'ok'); assert.ok(r.entry.partial); assert.strictEqual(P.reps(r.entry), 13); assert.strictEqual(s2.cap.std, 22);
P.finish(s2, run(s2, P.buildSession(s2, day(10), 'normal')), 'hard'); P.finish(s2, run(s2, P.buildSession(s2, day(12), 'normal')), 'hard');
assert.deepStrictEqual(['std', 'uneven', 'squat', 'bulg'].map(v => s2.cap[v]), [20, 7, 27, 7]); assert.strictEqual(s2.best.std, 13);
// pairs: the second side never asks for more than the first side did, and the first side is known
const ps = P.buildSession(st(C), day(2), 'normal'), iL = ps.steps.findIndex(q => q.v === 'uneven'), qL = ps.steps[iL], qR = ps.steps[iL + 1];
assert.ok(!P.hasFirst(ps, qL) && P.target(ps, qL) === qL.target && qL.side === 'L' && qR.side === 'R' && qL.round === 3);
ps.done.push({ v: 'uneven', side: 'L', target: qL.target, done: 3, round: 3 });
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
P.finishRun(rs, runOf(1250, 'ok', { custom: true, steps: 2400, km: 2.1 })); assert.ok(rs.runs[1].steps === undefined && rs.runs[1].km === undefined); P.finishRun(rs, runOf(2400, 'ok')); assert.strictEqual(rs.run.level, 3);
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
// every path level stays inside 15 minutes with even rounds, mixed sessions at every round count
for (let lv = 0; lv < 6; lv++) for (const cap of [3, 10, 40, 150]) for (const pref of [2, 4, 6]) {
  const q = st({ std: cap, uneven: cap, squat: cap, bulg: cap }); q.path = { uneven: lv, bulg: lv }; q.prefs.rounds = pref;
  const x = P.buildSession(q, day(2), 'normal'); assert.ok(P.estimate(x.steps) <= P.BUDGET && x.rounds % 2 === 0, `level ${lv} cap ${cap} rounds ${pref}`);
}
// migration: a v0.8-shaped state is upgraded by migrate() alone; nothing is lost
const old = {
  v: 1, cap: { std: 24, uneven: 9, squat: 32, bulg: 7 }, cap0: { std: 20, uneven: 6, squat: 28, bulg: 5 }, ok: { std: 1, uneven: 1 }, hard: {}, flip: { uneven: true }, best: { std: 20, uneven: 8 },
  path: { uneven: 1 }, pathLog: [{ date: '2026-11-10', v: 'uneven', from: 0, to: 1, capFrom: 10, capTo: 5 }], testAt: '2026-10-20', active: null,
  log: [
    { date: '2026-11-01', dow: 0, kind: 'recovery', push: 'std', squat: 'squat', energy: 'normal', feel: 'ok', secs: 300, partial: false, sets: [{ v: 'std', side: null, target: 12, done: 12, round: 1 }, { v: 'squat', side: null, target: 16, done: 16, round: 1 }] },
    { date: '2026-11-03', dow: 2, kind: 'light', push: 'uneven', squat: 'bulg', energy: 'normal', feel: 'easy', secs: 500, partial: false, sets: [{ v: 'uneven', side: 'L', target: 2, done: 2, round: 1, rung: 2 }, { v: 'uneven', side: 'R', target: 2, done: 2, round: 1, rung: 2 }, { v: 'bulg', side: 'L', target: 4, done: 4, round: 1 }, { v: 'bulg', side: 'R', target: 4, done: 4, round: 1 }] },
  ],
  runs: [{ date: '2026-11-02', secs: 1300, run: 60, walk: 30, feel: 'ok', done: true, steps: 2600, km: 2.2 }], run: { pace: 420, mins: 30, custom: false, level: 1, run: 60, walk: 30, ok: 1, hard: 0 },
  prefs: { sound: true, vibe: true, voice: false, detect: true, light: 'ladder', rounds: 4, count: 'both', sens: 'normal', loud: true },
};
const frozen = JSON.stringify(old), mig = P.migrate(old);
assert.strictEqual(JSON.stringify(old), frozen, 'migrate is pure');
assert.strictEqual(mig.v, 2); assert.ok(!('light' in mig.prefs) && !('detect' in mig.prefs));
assert.deepStrictEqual(mig.prefs, { sound: true, vibe: true, voice: false, rounds: 4, count: 'both', sens: 'normal', loud: true });
['log', 'runs', 'run', 'cap', 'cap0', 'best', 'path', 'pathLog', 'testAt', 'ok', 'flip', 'hard'].forEach(k => assert.deepStrictEqual(mig[k], old[k], k));
assert.strictEqual(P.stats(mig, day(2)).days, P.stats(old, day(2)).days); assert.deepStrictEqual([P.stats(mig, day(2)).push, P.stats(mig, day(2)).squat], [16, 24]);
assert.deepStrictEqual(P.migrate(mig), mig, 'idempotent');
assert.strictEqual(P.migrate(null), null); assert.strictEqual(P.migrate({ v: 3, cap: {}, log: [] }), null); assert.strictEqual(P.migrate({ cap: {}, log: [] }), null);
const nm = P.migrate({ v: 1, cap: { std: 10, uneven: 5, squat: 15, bulg: 5 }, log: [{ date: '2026-09-01', sets: [] }], prefs: {} }, day(0)); assert.deepStrictEqual([nm.cap0, nm.testAt], [nm.cap, '2026-09-01']);
const ns = P.migrate({ v: 1, cap: { std: 10, uneven: 5, squat: 15, bulg: 5 }, log: [] }, day(0)); assert.strictEqual(ns.testAt, P.dateKey(day(0)));
const ms = P.buildSession(mig, day(3), 'normal'); // Wednesday: mixed, at the archer level, flipped starting side
assert.deepStrictEqual(ms.plan.map(x => [x.push, x.tp, x.squat, x.ts]), [['std', 14, 'squat', 19], ['std', 14, 'squat', 19], ['uneven', 6, 'bulg', 5], ['uneven', 7, 'bulg', 6]]);
assert.strictEqual(ms.steps.find(q => q.v === 'uneven').sec, 3); assert.strictEqual(ms.steps.find(q => q.v === 'uneven').side, 'R'); assert.strictEqual(P.name(mig, 'uneven'), 'Archer push-ups');
P.finish(mig, run(mig, ms), 'ok'); assert.strictEqual(mig.log.length, 3); assert.strictEqual(mig.cap.std, 25); // ok was 1, this clean session makes 2
console.log('ENGINE PASS');
