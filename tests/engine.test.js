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
assert.strictEqual(s.rounds, 5); assert.deepStrictEqual(s.tp, [16, 15, 15, 15, 19]);
assert.strictEqual(P.buildSession(st(C), day(1), 'exhausted').rounds, 2);
assert.strictEqual(P.buildSession(st(C), day(0), 'normal').rounds, 3);
assert.ok(P.buildSession(st(C), day(1), 'strong').tp[1] > s.tp[1]);
assert.ok(P.buildSession(st(C), day(2), 'normal').tp[0] < C.uneven, 'light day stays below capacity');
// only push-ups and squats, never above 15 minutes, for any capacity, day and energy
for (const cap of [1, 5, 10, 22, 40, 80, 200]) for (let d = 0; d < 7; d++) for (const e of ['exhausted', 'normal', 'strong']) {
  const x = P.buildSession(st({ std: cap, uneven: cap, squat: cap * 2, bulg: cap }), day(d), e);
  assert.ok(P.estimate(x.steps) <= P.BUDGET && P.BUDGET < P.LIMIT, `fits: cap ${cap} day ${d} ${e} = ${P.estimate(x.steps)}s`);
  assert.ok(x.steps.filter(q => q.t === 'set').every(q => q.target >= 1 && ['push', 'squat'].includes(P.VAR[q.v].fam)));
}
assert.ok(P.estimate(P.buildSession(st(C), day(1), 'exhausted').steps) <= 6 * 60, 'exhausted is about 4 to 6 minutes');
// sides: both sides each round, equal targets, starting side alternates between sessions
const state = st(C); s = P.buildSession(state, day(2), 'normal');
const sides = s.steps.filter(q => q.v === 'uneven').map(q => q.side);
assert.strictEqual(sides.join(''), 'LRLRLRLRLR');
const run = (state, ses, short) => { ses.steps.forEach(q => { if (q.t === 'set') ses.done.push({ v: q.v, side: q.side, target: q.target, done: q.target - (short || 0) }); }); return ses; };
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
// proximity counter: near then far is one repetition; flicker and bounces are ignored
const d = P.RepDetector(); let n = 0; const f = (near, t) => { if (d.feed(near, t)) n++; };
f(true, 1000); f(false, 1600); f(true, 1650); f(false, 1700); f(true, 2600); f(true, 2700); f(false, 3300); f(false, 3400); f(true, 3450); f(false, 3600);
assert.strictEqual(n, 2);
console.log('ENGINE PASS');
