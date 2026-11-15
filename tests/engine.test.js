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
console.log('ENGINE PASS');
