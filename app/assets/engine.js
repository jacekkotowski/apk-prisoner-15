// Prisoner 15 training engine. Pure functions, no DOM: used by index.html and by tests/engine.test.js.
(function (root) {
  const VAR = {
    std: { name: 'Push-ups', fam: 'push', sides: 1, sec: 2 },
    uneven: { name: 'Uneven push-ups', fam: 'push', sides: 2, sec: 2.5, sideWord: 'hand on books' },
    squat: { name: 'Squats', fam: 'squat', sides: 1, sec: 2.5 },
    bulg: { name: 'Bulgarian split squats', fam: 'squat', sides: 2, sec: 3, sideWord: 'leg in front' },
  };
  const ROUNDS = { moderate: 5, light: 5, recovery: 3 }, FACTOR = { moderate: 0.7, light: 0.6, recovery: 0.5 };
  const REST = 30, WARM = 60, LIMIT = 900, BUDGET = 810; // seconds; BUDGET leaves slack under the hard 15:00

  function newState() {
    return { v: 1, cap: null, ok: {}, hard: {}, flip: {}, best: {}, log: [], active: null, prefs: { sound: true, vibe: true, sensor: true } };
  }
  function dateKey(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function dayPlan(dow) { // 0 = Sunday
    if (dow === 0) return { push: 'std', squat: 'squat', kind: 'recovery' };
    return dow % 2 ? { push: 'std', squat: 'squat', kind: 'moderate' } : { push: 'uneven', squat: 'bulg', kind: 'light' };
  }
  function rounds(kind, energy) { return energy === 'exhausted' ? 2 : ROUNDS[kind]; }
  function targets(cap, kind, energy, n) {
    let f = FACTOR[kind];
    if (energy === 'exhausted') f = Math.min(f, 0.5);
    if (energy === 'strong' && kind !== 'recovery') f += 0.1;
    const wave = kind === 'moderate' && energy !== 'exhausted' && n >= 4;
    return Array.from({ length: n }, (_, i) => Math.max(1, Math.round(cap * f * (wave ? (i === 0 ? 1.07 : i === n - 1 ? 1.25 : 1) : 1))));
  }
  function steps(plan, tp, ts, flip) {
    const out = [{ t: 'warm', secs: WARM }], n = tp.length;
    const add = (v, target, round) => {
      if (VAR[v].sides === 1) out.push({ t: 'set', v, side: null, target, round });
      else (flip[v] ? ['R', 'L'] : ['L', 'R']).forEach(side => out.push({ t: 'set', v, side, target, round }));
    };
    for (let r = 0; r < n; r++) {
      add(plan.push, tp[r], r + 1); out.push({ t: 'rest', secs: REST });
      add(plan.squat, ts[r], r + 1); if (r < n - 1) out.push({ t: 'rest', secs: REST });
    }
    return out;
  }
  function estimate(st) { return st.reduce((s, x) => s + (x.t === 'set' ? x.target * VAR[x.v].sec + (x.side ? 6 : 0) : x.secs), 0); }
  // Builds today's session. Shortens it (rounds first, then repetitions) until it fits the time budget.
  function buildSession(state, date, energy) {
    const dow = date.getDay(), plan = dayPlan(dow);
    let n = rounds(plan.kind, energy), scale = 1, st, tp, ts;
    for (;;) {
      tp = targets(state.cap[plan.push] * scale, plan.kind, energy, n); ts = targets(state.cap[plan.squat] * scale, plan.kind, energy, n);
      st = steps(plan, tp, ts, state.flip);
      if (estimate(st) <= BUDGET) break;
      if (n > 3) n--; else if (scale > 0.05) scale *= 0.9; else break;
    }
    return { date: dateKey(date), dow, kind: plan.kind, push: plan.push, squat: plan.squat, energy, rounds: n, tp, ts, steps: st, i: 0, secs: 0, done: [] };
  }
  // Stores a finished or shortened session and moves the capacities. feel: 'easy' | 'ok' | 'hard'.
  function finish(state, ses, feel) {
    const sets = ses.done, planned = ses.steps.filter(s => s.t === 'set').length;
    const entry = { date: ses.date, dow: ses.dow, kind: ses.kind, energy: ses.energy, feel, secs: Math.round(ses.secs), partial: sets.length < planned, sets };
    const changes = [];
    [ses.push, ses.squat].forEach(v => {
      const mine = sets.filter(s => s.v === v), plannedV = ses.steps.filter(s => s.t === 'set' && s.v === v).length;
      if (!mine.length) return;
      const clean = mine.length === plannedV && mine.every(s => s.done >= s.target);
      mine.forEach(s => { if (s.done >= s.target && s.done > (state.best[v] || 0)) state.best[v] = s.done; });
      if (VAR[v].sides === 2) state.flip[v] = !state.flip[v];
      if (ses.energy === 'exhausted') return;
      if (feel === 'hard') {
        state.ok[v] = 0; state.hard[v] = (state.hard[v] || 0) + 1;
        if (state.hard[v] >= 2) { const c = Math.max(1, Math.round(state.cap[v] * 0.9)); if (c !== state.cap[v]) changes.push({ v, from: state.cap[v], to: c }); state.cap[v] = c; state.hard[v] = 0; }
      } else if (clean) {
        state.hard[v] = 0; state.ok[v] = (state.ok[v] || 0) + 1;
        if (state.ok[v] >= 2) { const c = state.cap[v] + Math.max(1, Math.round(state.cap[v] * 0.05)); changes.push({ v, from: state.cap[v], to: c }); state.cap[v] = c; state.ok[v] = 0; }
      } else state.ok[v] = 0;
    });
    state.log.push(entry); state.active = null;
    return { entry, changes };
  }
  // Counts one repetition when the face comes near and goes away again.
  function RepDetector(minNear, minGap) {
    minNear = minNear || 120; minGap = minGap || 500; let nearAt = 0, last = -1e9;
    return {
      feed(near, t) {
        if (near) { if (!nearAt) nearAt = t; return false; }
        const ok = nearAt && t - nearAt >= minNear && t - last >= minGap; nearAt = 0;
        if (ok) last = t; return !!ok;
      },
      near() { return !!nearAt; },
    };
  }
  function reps(entry, fam) { return entry.sets.reduce((s, x) => s + (!fam || VAR[x.v].fam === fam ? x.done : 0), 0); }
  function stats(state, today) {
    const byDay = {}; state.log.forEach(e => { byDay[e.date] = (byDay[e.date] || 0) + reps(e); });
    const week = []; for (let i = 6; i >= 0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); const k = dateKey(d); week.push({ date: k, dow: d.getDay(), reps: byDay[k] || 0, today: i === 0 }); }
    const side = { L: 0, R: 0 }; state.log.forEach(e => e.sets.forEach(s => { if (s.side) side[s.side] += s.done; }));
    return { days: Object.keys(byDay).length, push: state.log.reduce((s, e) => s + reps(e, 'push'), 0), squat: state.log.reduce((s, e) => s + reps(e, 'squat'), 0), week, side, doneToday: !!byDay[dateKey(today)] };
  }
  const api = { VAR, REST, WARM, LIMIT, BUDGET, newState, dateKey, dayPlan, rounds, targets, estimate, buildSession, finish, RepDetector, reps, stats };
  if (typeof module !== 'undefined') module.exports = api; else root.P15 = api;
})(this);
