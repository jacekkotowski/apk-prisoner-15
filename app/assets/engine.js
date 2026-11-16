// Prisoner 15 training engine. Pure functions, no DOM: used by index.html and by tests/engine.test.js.
(function (root) {
  const VAR = {
    std: { name: 'Push-ups', fam: 'push', sides: 1, sec: 2 },
    uneven: { name: 'Uneven push-ups', fam: 'push', sides: 2, sec: 2.5, sideWord: 'hand on books' },
    squat: { name: 'Squats', fam: 'squat', sides: 1, sec: 2.5 },
    bulg: { name: 'Bulgarian split squats', fam: 'squat', sides: 2, sec: 3, sideWord: 'leg in front' },
  };
  const FACTOR = { moderate: 0.7, light: 0.6, recovery: 0.5 };
  const REST = 30, WARM = 60, LIMIT = 900, BUDGET = 810; // seconds; BUDGET leaves slack under the hard 15:00

  function newState() {
    return { v: 1, cap: null, ok: {}, hard: {}, flip: {}, best: {}, log: [], active: null, prefs: { sound: true, vibe: true, voice: true, detect: false, light: 'rounds', rounds: 4, count: 'touch', sens: 'high', loud: false } };
  }
  function dateKey(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function dayPlan(dow) { // 0 = Sunday
    if (dow === 0) return { push: 'std', squat: 'squat', kind: 'recovery' };
    return dow % 2 ? { push: 'std', squat: 'squat', kind: 'moderate' } : { push: 'uneven', squat: 'bulg', kind: 'light' };
  }
  // Rounds are always an even number: 2 on exhausted and recovery days, otherwise the chosen 2, 4 or 6 (default 4).
  function rounds(kind, energy, pref) { return energy === 'exhausted' || kind === 'recovery' ? 2 : pref === 2 || pref === 6 ? pref : 4; }
  function targets(cap, kind, energy, n) {
    let f = FACTOR[kind];
    if (energy === 'exhausted') f = Math.min(f, 0.5);
    if (energy === 'strong' && kind !== 'recovery') f += 0.1;
    const wave = kind === 'moderate' && energy !== 'exhausted' && n >= 4;
    return Array.from({ length: n }, (_, i) => Math.max(1, Math.round(cap * f * (wave ? (i === 0 ? 1.07 : i === n - 1 ? 1.25 : 1) : 1))));
  }
  function steps(plan, tp, ts, flip, rest, warm, sec) {
    const out = [{ t: 'warm', secs: warm }], n = tp.length;
    const add = (v, target, round) => {
      if (VAR[v].sides === 1) out.push({ t: 'set', v, side: null, target, round, sec: sec && sec[v] });
      else (flip[v] ? ['R', 'L'] : ['L', 'R']).forEach(side => out.push({ t: 'set', v, side, target, round, sec: sec && sec[v] }));
    };
    for (let r = 0; r < n; r++) {
      add(plan.push, tp[r], r + 1); out.push({ t: 'rest', secs: rest });
      add(plan.squat, ts[r], r + 1); if (r < n - 1) out.push({ t: 'rest', secs: rest });
    }
    return out;
  }
  function estimate(st) { return st.reduce((s, x) => s + (x.t === 'set' ? x.target * (x.sec || VAR[x.v].sec) + (x.side ? 6 : 0) : x.secs), 0); }
  // The one-arm push-up and pistol paths: six levels each for the two one-sided variations. Level 0 is the original variation.
  // The ladder is ours, from general training sources; it is not copied from the book. Only floor, books, a chair or a low table are needed.
  const PATH = {
    uneven: [
      { name: 'Uneven push-ups', side: 'hand on books', say: 'hand', sec: 2.5, setup: 'One hand on a low, stable, nonslip stack of books, the other on the floor. Alternate the raised hand.' },
      { name: 'Archer push-ups', side: 'working arm', say: 'arm', sec: 3, setup: 'Hands wide. Bend one arm, keep the other straight and press lightly with its hand. Alternate sides.' },
      { name: 'Archer push-ups, fingertips', side: 'working arm', say: 'arm', sec: 3.5, setup: 'As archer push-ups, but the straight arm touches the floor with its fingertips only.' },
      { name: 'One-arm push-ups, high', side: 'working hand', say: 'hand', sec: 4, setup: 'Working hand on a sturdy, nonslip support about knee high (a stable chair seat against a wall, or a low table). Other hand behind your back, feet wide.' },
      { name: 'One-arm push-ups, low', side: 'working hand', say: 'hand', sec: 4, setup: 'The same on a low support, such as a step or a stack of books. Feet wide.' },
      { name: 'One-arm push-ups', side: 'working hand', say: 'hand', sec: 4.5, setup: 'Working hand on the floor, other hand behind your back, feet wide.' },
    ],
    bulg: [
      { name: 'Bulgarian split squats', side: 'leg in front', say: 'leg', sec: 3, setup: 'Rear foot on a secure chair, the front leg works. Start shallow, with a lower support if needed.' },
      { name: 'Deep Bulgarian split squats', side: 'leg in front', say: 'leg', sec: 3.5, setup: 'The same, down until the front thigh is level.' },
      { name: 'Box pistols, high seat', side: 'working leg', say: 'leg', sec: 3.5, setup: 'Stand on one leg in front of a secure chair, free leg forward. Sit back onto the seat, stand up. A hand on a wall is fine.' },
      { name: 'Box pistols, low seat', side: 'working leg', say: 'leg', sec: 4, setup: 'The same onto a lower seat.' },
      { name: 'Assisted pistols', side: 'working leg', say: 'leg', sec: 4, setup: 'One leg, free leg forward, down as low as you can control with a light hand on a doorframe, and up.' },
      { name: 'Pistols', side: 'working leg', say: 'leg', sec: 4.5, setup: 'One leg, free leg forward, down and up with no support.' },
    ],
  };
  const GRAD = 10; // capacity per side at which the next step opens
  function level(state, v) { return (state.path && state.path[v]) || 0; }
  function info(state, v) { const p = PATH[v]; return p ? p[Math.min(level(state, v), p.length - 1)] : { name: VAR[v].name, side: null, say: null, sec: VAR[v].sec, setup: '' }; }
  function name(state, v) { return info(state, v).name; }
  function ready(state, v) { const p = PATH[v]; return !!p && level(state, v) < p.length - 1 && state.cap[v] >= GRAD; }
  // Moving up is the owner's choice. The capacity restarts at half so the new step begins easy; the best set restarts too.
  function stepUp(state, v, date) {
    if (!ready(state, v)) return false;
    const from = level(state, v), capFrom = state.cap[v]; state.path = state.path || {}; state.path[v] = from + 1;
    state.cap[v] = Math.max(3, Math.round(capFrom / 2)); state.ok[v] = 0; state.hard[v] = 0; state.best[v] = 0;
    (state.pathLog = state.pathLog || []).push({ date, v, from, to: from + 1, capFrom, capTo: state.cap[v] }); return true;
  }
  function stepBack(state, v, date) {
    const from = level(state, v); if (!PATH[v] || from === 0) return false;
    const capFrom = state.cap[v]; state.path[v] = from - 1;
    state.cap[v] = Math.min(GRAD - 1, Math.max(capFrom, capFrom * 2)); state.ok[v] = 0; state.hard[v] = 0; state.best[v] = 0;
    (state.pathLog = state.pathLog || []).push({ date, v, from, to: from - 1, capFrom, capTo: state.cap[v] }); return true;
  }
  // 1-2-3 ladders on the light days: each ladder is rungs of 1, 2, 3 ... repetitions, both sides on every rung, no rest between rungs. The top rung grows with capacity.
  function topRung(c) { return c < 5 ? Math.max(1, Math.min(3, Math.round(c))) : Math.min(6, 3 + Math.floor((c - 5) / 5)); }
  function ladderSteps(plan, n, top, flip, rest, warm, sec) {
    const out = [{ t: 'warm', secs: warm }];
    for (let r = 1; r <= n; r++) [plan.push, plan.squat].forEach((v, i) => {
      for (let k = 1; k <= top[v]; k++) (flip[v] ? ['R', 'L'] : ['L', 'R']).forEach(side => out.push({ t: 'set', v, side, target: k, round: r, rung: k, sec: sec[v] }));
      if (i === 0 || r < n) out.push({ t: 'rest', secs: rest });
    });
    return out;
  }
  // Builds today's session. To fit the time budget it shortens the rests and the warm-up first, then drops two rounds, then lowers repetitions.
  function buildSession(state, date, energy) {
    const dow = date.getDay(), plan = dayPlan(dow), pr = state.prefs || {}, ladder = plan.kind === 'light' && pr.light === 'ladder';
    const sec = { [plan.push]: info(state, plan.push).sec, [plan.squat]: info(state, plan.squat).sec };
    let n = rounds(plan.kind, energy, pr.rounds), scale = 1, rest = REST, warm = WARM, st, tp, ts, top = null;
    for (;;) {
      if (ladder) {
        top = { [plan.push]: topRung(state.cap[plan.push] * scale), [plan.squat]: topRung(state.cap[plan.squat] * scale) };
        tp = [top[plan.push]]; ts = [top[plan.squat]]; st = ladderSteps(plan, n, top, state.flip, rest, warm, sec);
      } else {
        tp = targets(state.cap[plan.push] * scale, plan.kind, energy, n); ts = targets(state.cap[plan.squat] * scale, plan.kind, energy, n);
        st = steps(plan, tp, ts, state.flip, rest, warm, sec);
      }
      if (estimate(st) <= BUDGET) break;
      if (rest > 20) rest = 20; else if (warm > 30) warm = 30; else if (rest > 15) rest = 15;
      else if (n > 2) { n -= 2; rest = REST; warm = WARM; }
      else if (scale > 0.05) scale *= 0.9; else break;
    }
    return { date: dateKey(date), dow, kind: plan.kind, push: plan.push, squat: plan.squat, energy, rounds: n, tp, ts, ladder: top, steps: st, i: 0, secs: 0, done: [] };
  }
  // One-sided exercises are always done in pairs with the same repetitions on both sides.
  function firstSide(ses, st) { return st.side ? ses.done.find(d => d.v === st.v && d.round === st.round && (d.rung || 0) === (st.rung || 0) && d.side !== st.side && d.done > 0) : null; }
  function hasFirst(ses, st) { return !!firstSide(ses, st); }
  // Repetitions asked for in this set: the second side of a pair never asks for more than the first side did.
  function target(ses, st) { const f = firstSide(ses, st); return f ? Math.max(1, Math.min(st.target, f.done)) : st.target; }
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
  function daysBetween(a, b) { const p = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }; return Math.round((p(b) - p(a)) / 864e5); }
  // Comeback: where the capacities started and where they are now.
  function comeback(state, vs) { const c0 = state.cap0; return c0 ? vs.filter(v => c0[v] !== state.cap[v]).map(v => `${VAR[v].name} ${c0[v]} → ${state.cap[v]}`).join(' · ') : ''; }
  // Test day: offered every four weeks, never forced. One clean set of each variation, stopped when form slows; the second side matches the first.
  const OPEN = 999, TEST_EVERY = 28;
  function testDue(state, today) { const k = dateKey(today); return !!state.testAt && daysBetween(state.testAt, k) >= TEST_EVERY && !state.log.some(e => e.date === k); }
  function buildTest(state, date) {
    const st = [{ t: 'warm', secs: WARM }];
    ['std', 'squat', 'uneven', 'bulg'].forEach((v, i) => {
      if (i) st.push({ t: 'rest', secs: 60 });
      if (VAR[v].sides === 1) st.push({ t: 'set', v, side: null, target: OPEN, round: 1, test: true });
      else (state.flip[v] ? ['R', 'L'] : ['L', 'R']).forEach(side => st.push({ t: 'set', v, side, target: OPEN, round: 1, test: true }));
    });
    return { date: dateKey(date), dow: date.getDay(), kind: 'test', push: 'std', squat: 'squat', energy: 'test', rounds: 1, tp: [], ts: [], steps: st, i: 0, secs: 0, done: [], test: true };
  }
  function finishTest(state, ses) {
    const sets = ses.done.filter(s => s.done > 0), changes = [];
    Object.keys(VAR).forEach(v => {
      const mine = sets.filter(s => s.v === v); if (!mine.length) return;
      const n = Math.min(...mine.map(s => s.done));
      changes.push({ v, from: state.cap[v], to: n }); state.cap[v] = n; state.ok[v] = 0; state.hard[v] = 0;
      if (n > (state.best[v] || 0)) state.best[v] = n;
      if (VAR[v].sides === 2) state.flip[v] = !state.flip[v];
    });
    const entry = { date: ses.date, dow: ses.dow, kind: 'test', energy: 'test', feel: 'ok', secs: Math.round(ses.secs), partial: false, sets };
    if (sets.length) { state.log.push(entry); state.testAt = ses.date; }
    state.active = null;
    return { entry, changes };
  }
  // Never miss twice: true when the last session is older than yesterday.
  function missed(state, today) { const l = state.log[state.log.length - 1]; return !!l && daysBetween(l.date, dateKey(today)) >= 2; }
  // One sentence on Sunday about the week that ends today.
  function verdict(state, today) {
    if (today.getDay() !== 0 || !state.log.length) return '';
    const k = dateKey(today), win = (a, b) => { const days = new Set(); let n = 0; state.log.forEach(e => { const d = daysBetween(e.date, k); if (d >= a && d <= b) { days.add(e.date); n += reps(e); } }); return [days.size, n]; };
    const [d, n] = win(0, 6), prev = win(7, 13)[1];
    if (!d) return 'Quiet week. The next one starts tomorrow.';
    const pct = prev ? Math.round((n - prev) / prev * 100) : 0;
    return `This week: ${d} of 7 days. ${n} repetitions.` + (prev ? ` ${pct >= 0 ? 'Up' : 'Down'} ${Math.abs(pct)}% on last week.` : '');
  }
  function milestone(days) { return days >= 100 ? '100 days. Lifer.' : days >= 30 ? "30 days. You're a regular." : days >= 7 ? '7 days. First week served.' : ''; }
  // Counts one repetition when the face comes near and goes away again. touched() tells it a screen touch already counted this approach.
  function RepDetector(minNear, minGap) {
    minNear = minNear || 120; minGap = minGap || 500; let nearAt = 0, last = -1e9, skip = false;
    return {
      feed(near, t) {
        if (near) { if (!nearAt) nearAt = t; return false; }
        const was = nearAt, ok = was && t - was >= minNear && t - last >= minGap && !skip; nearAt = 0;
        if (was) skip = false;
        if (ok) last = t; return !!ok;
      },
      near() { return !!nearAt; },
      touched() { if (nearAt) skip = true; },
    };
  }
  function reps(entry, fam) { return entry.sets.reduce((s, x) => s + (!fam || VAR[x.v].fam === fam ? x.done : 0), 0); }
  function stats(state, today) {
    const byDay = {}; state.log.forEach(e => { byDay[e.date] = (byDay[e.date] || 0) + reps(e); });
    const week = []; for (let i = 6; i >= 0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); const k = dateKey(d); week.push({ date: k, dow: d.getDay(), reps: byDay[k] || 0, today: i === 0 }); }
    const side = { L: 0, R: 0 }; state.log.forEach(e => e.sets.forEach(s => { if (s.side) side[s.side] += s.done; }));
    return { days: Object.keys(byDay).length, push: state.log.reduce((s, e) => s + reps(e, 'push'), 0), squat: state.log.reduce((s, e) => s + reps(e, 'squat'), 0), week, side, doneToday: !!byDay[dateKey(today)] };
  }
  // Galloway run-walk-run: run and walk seconds for a training pace, from Jeff Galloway's published pace table (per mile).
  const GAL = [[420, 360, 30], [450, 300, 30], [480, 240, 30], [510, 180, 30], [540, 120, 30], [645, 90, 30], [735, 60, 30], [870, 30, 30], [945, 15, 30], [1020, 10, 30], [1110, 8, 30], [Infinity, 5, 30]];
  const MILE = 1.609344;
  function galloway(secPerKm) { const m = secPerKm * MILE, r = GAL.find(x => m <= x[0] + 0.5); return { run: r[1], walk: r[2] }; }
  // Magic Mile (a timed 1.6 km): long-run pace is predicted marathon pace (x 1.3) plus two minutes per mile. Returned per km.
  function longRunPace(mileSecs) { return Math.round((mileSecs * 1.3 + 120) / MILE / 5) * 5; }
  function mmss(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function parseTime(t) { const m = /^\s*(\d{1,2})[:.,](\d{1,2})\s*$/.exec(t || ''); return m && +m[2] < 60 ? +m[1] * 60 + +m[2] : 0; }
  // Running plan: run/walk steps. A run of 20 minutes or more counts as done; longer is welcome and shorter is still logged.
  // Two done runs that were not hard move one step up; two hard ones move one step down. Runs never change the strength plan.
  const LADDER = [[15, 45], [30, 30], [45, 30], [60, 30], [90, 30], [120, 30], [180, 30], [240, 30], [300, 30]], RUN_DONE = 1200;
  function levelFor(pace) { const g = galloway(pace).run; let i = 0; LADDER.forEach((x, k) => { if (x[0] <= g) i = k; }); return i; }
  function finishRun(state, r) {
    const R = state.run, done = r.secs >= RUN_DONE; let change = 0;
    (state.runs = state.runs || []).push({ date: r.date, secs: Math.round(r.secs), run: r.run, walk: r.walk, feel: r.feel, done, steps: r.steps || 0, km: r.km || 0 });
    if (done && !r.custom && r.level === R.level) {
      if (r.feel === 'hard') { R.ok = 0; R.hard = (R.hard || 0) + 1; if (R.hard >= 2 && R.level > 0) { R.level--; R.hard = 0; change = -1; } }
      else { R.hard = 0; R.ok = (R.ok || 0) + 1; if (R.ok >= 2 && R.level < LADDER.length - 1) { R.level++; R.ok = 0; change = 1; } }
    }
    if (change && !R.custom) [R.run, R.walk] = LADDER[R.level];
    return { done, change };
  }
  // Running every second day is suggested, never required.
  function runAdvice(state, today) {
    const runs = state.runs || []; if (!runs.length) return 'First run: any day.';
    const [y, m, d] = runs[runs.length - 1].date.split('-').map(Number);
    const days = Math.round((new Date(today.getFullYear(), today.getMonth(), today.getDate()) - new Date(y, m - 1, d)) / 864e5);
    return days <= 0 ? 'Ran today.' : days === 1 ? 'Ran yesterday. Every second day is enough; your call.' : 'Run day.';
  }
  const api = { PATH, GRAD, level, info, name, ready, stepUp, stepBack, topRung, OPEN, daysBetween, comeback, testDue, buildTest, finishTest, missed, verdict, milestone, LADDER, RUN_DONE, levelFor, finishRun, runAdvice, galloway, longRunPace, mmss, parseTime, VAR, REST, WARM, LIMIT, BUDGET, newState, dateKey, dayPlan, rounds, targets, estimate, buildSession, hasFirst, target, finish, RepDetector, reps, stats };
  if (typeof module !== 'undefined') module.exports = api; else root.P15 = api;
})(this);
