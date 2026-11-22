// Runs the screen in a headless browser with a stand-in for the Android side. Saves ui_*.png. Exits with 1 on failure.
// Run: node tests/ui.js [output folder]. Needs Playwright for Node.
const { chromium } = require('playwright'); const path = require('path'), assert = require('assert');
const P = require('../app/assets/engine.js');
const STUB = `window.__c=[];window.__rem={on:false,h:6,m:30};window.Android={hasProx:()=>true,prox:on=>__c.push('prox:'+on),cue:k=>__c.push('cue:'+k),keepOn:on=>__c.push('keepOn:'+on),
 runStart:(r,w,t,l)=>{__c.push('run:'+r+','+w+','+t+','+l);window.__run={on:true,phase:'walk',left:12.2,elapsed:300,total:t}},runStop:()=>{__c.push('runStop');window.__run=null},runState:()=>JSON.stringify(window.__run||{on:false}),
 setLastDone:d=>__c.push('last:'+d),say:t=>__c.push('say:'+t),exportData:j=>{__c.push('export');window.__exp=j},importData:()=>__c.push('import'),
 getReminder:()=>JSON.stringify(__rem),setReminder:(on,h,m)=>{__rem={on,h,m};__c.push('rem:'+on+','+h+','+m)}};`;
(async () => {
  const out = process.argv[2] || __dirname, shot = n => path.join(out, n);
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 393, height: 830 }, deviceScaleFactor: 2 }), pg = await ctx.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(String(e)));
  await pg.clock.install({ time: new Date(2026, 10, 16, 6, 30) }); // a Monday
  await pg.addInitScript(STUB); await pg.goto('file://' + path.join(__dirname, '..', 'app', 'assets', 'index.html'));
  const txt = s => pg.textContent(s), act = a => pg.click(`[data-a=${a}]`), state = () => pg.evaluate('JSON.parse(localStorage.p15)');
  const touch = () => pg.dispatchEvent('#tap', 'pointerdown', { bubbles: true, cancelable: true });
  const hit = async () => { await touch(); await pg.clock.runFor(400); };
  const slow = async () => { await touch(); await pg.clock.runFor(600); }; // for Normal sensitivity, which ignores contacts closer than 0.5 s
  const day = async (y, m, d) => { await pg.clock.install({ time: new Date(y, m, d, 6, 30) }); await pg.reload(); };
  // the warm-up half: push-ups, rest, squats, rest, twice (done = the number asked for, skip = the rest); leaves the heavy half's first set
  const warmHalf = async () => { for (let i = 0; i < 2; i++) { await act('done'); await act('skip'); await act('done'); await act('skip'); } };
  // onboarding
  await pg.screenshot({ path: shot('ui_setup.png') });
  await pg.fill('#c_std', '22'); await pg.fill('#c_squat', '30'); await pg.fill('#c_uneven', '8'); await pg.fill('#c_bulg', '8');
  await pg.fill('#r_t', '06:15'); await pg.check('#r_on'); await act('setup');
  // the home plan: lines per half, the books and chair text only when the heavy half is in today's session
  assert.ok((await txt('#app')).includes('Monday') && (await txt('#app')).includes('4 rounds'));
  let plan = await txt('.plan'); assert.ok(plan.includes('Push-ups13 · 13') && plan.includes('Uneven push-ups / side6 · 6') && plan.includes('Squats18 · 18') && plan.includes('Bulgarian split squats / leg6 · 6'), plan);
  assert.ok((await txt('#setup')).includes('stack of books') && (await txt('#setup')).includes('secure chair'));
  assert.ok((await pg.$('[data-x=stats]')) && (await pg.$('[data-x=settings]')) && !(await pg.$('[data-x=path]')), 'header links: Record and Setup only');
  await pg.screenshot({ path: shot('ui_home.png') });
  await pg.click('[data-x=exhausted]'); plan = await txt('.plan'); assert.ok(plan.includes('13 · 13') && !plan.includes('Uneven') && !(await pg.$('#setup')) && (await txt('#app')).includes('2 rounds'), plan); await pg.click('[data-x=normal]');
  // one tap to start; warm-up counts down and can be skipped
  await act('start'); assert.strictEqual(await txt('#ex'), 'Warm up'); await pg.clock.runFor(5000); assert.ok(/0:5[56]/.test(await txt('#num'))); await act('skip');
  // push-ups: the marked pad counts at first contact; a second contact in the same instant is bounce
  assert.strictEqual(await txt('#ex'), 'Push-ups'); assert.strictEqual(await txt('#doneb'), 'Did all 13'); assert.ok((await txt('#app')).includes('Round 1 / 4'));
  assert.ok(await pg.isVisible('#tap.pad') && (await txt('#tap')).includes('NOSE ON THE PAD'));
  await touch(); await touch(); await pg.clock.runFor(400); assert.strictEqual(await txt('#num'), '1');
  await hit(); assert.strictEqual(await txt('#num'), '2'); assert.ok(await pg.$('#tap.pad'));
  await act('plus'); await act('minus'); await act('plus'); assert.strictEqual(await txt('#num'), '3'); await pg.screenshot({ path: shot('ui_pushups.png') });
  // pause stops the clock and the pad; leaving the app pauses too
  const c0 = await txt('#clock'); await act('pause'); await touch(); await pg.clock.runFor(20000); assert.strictEqual(await txt('#num'), '3'); await pg.screenshot({ path: shot('ui_paused.png') }); await pg.click('#veil'); assert.strictEqual(await txt('#clock'), c0);
  await pg.evaluate('hold()'); assert.ok(await pg.isVisible('#veil')); assert.strictEqual(await pg.evaluate('back()'), true); await pg.click('#veil');
  for (let i = 3; i < 13; i++) await hit(); await pg.clock.runFor(800);
  // reaching the target moves on by itself to the rest, then to squats
  assert.strictEqual(await txt('#ex'), 'Rest'); await pg.screenshot({ path: shot('ui_rest.png') }); await pg.clock.runFor(31000);
  assert.strictEqual(await txt('#ex'), 'Squats'); assert.strictEqual(await txt('#num'), '18'); assert.ok(!(await pg.$('#tap.pad'))); await act('minus'); await pg.screenshot({ path: shot('ui_squats.png') }); await act('done');
  // the session survives the app being closed; the message line says so
  await pg.reload(); assert.ok((await txt('.big')).includes('Resume')); assert.strictEqual(await txt('#msg'), 'Session under way. Resume it.'); await act('resume'); assert.strictEqual(await txt('#ex'), 'Rest'); await act('skip');
  await act('done'); await act('skip'); await act('skip'); await act('finish');
  // a shortened session is recorded as work done
  assert.ok((await txt('#app')).includes('Work done') && (await txt('#app')).includes('3 of 12 sets')); await pg.screenshot({ path: shot('ui_done.png') });
  await act('feel'); let s = await state();
  assert.deepStrictEqual(s.log[0].sets.map(x => x.done), [13, 17, 13]); assert.ok(s.log[0].partial && !s.active && s.cap.std === 22 && s.v === 2);
  assert.strictEqual(await txt('#msg'), 'Work recorded.');
  await pg.click('[data-x=stats]'); assert.ok((await txt('#app')).includes('43')); await pg.screenshot({ path: shot('ui_record.png') }); await pg.click('[data-x=home]');
  // Tuesday: both halves. The second side of a pair asks for exactly what the first side did, never more
  await day(2026, 10, 17); await act('start'); await act('skip'); await warmHalf();
  assert.ok((await txt('#app')).includes('Round 3 / 4')); assert.strictEqual(await txt('#ex'), 'Uneven push-ups'); assert.strictEqual(await txt('#side'), 'Left hand on books'); await pg.screenshot({ path: shot('ui_uneven.png') });
  await hit(); await hit(); await act('done');
  assert.strictEqual(await txt('#side'), 'Right hand on books'); assert.ok((await pg.evaluate('__c')).includes('say:Right hand. 2.')); assert.ok((await txt('#tap')).includes('Target 2')); assert.strictEqual(await txt('#doneb'), 'Did all 2'); await pg.screenshot({ path: shot('ui_match.png') });
  await act('done'); await act('skip'); assert.strictEqual(await txt('#side'), 'Left leg in front'); await act('done'); assert.ok((await txt('#tap')).includes('Do 5,')); await act('done');
  for (let i = 0; i < 5; i++) { await act('skip'); await act('done'); await act('done'); if (!(await pg.$('#ex'))) break; }
  assert.ok((await txt('#app')).includes('Day served')); await pg.click('[data-x=ok]'); s = await state();
  assert.ok(!s.log[1].partial && s.flip.uneven && s.flip.bulg && s.log[1].sets.length === 12);
  assert.deepStrictEqual(s.log[1].sets.filter(x => x.v === 'uneven').slice(0, 2).map(x => x.side + x.done), ['L2', 'R2']);
  assert.deepStrictEqual(s.log[1].sets.slice(0, 4).map(x => x.v), ['std', 'squat', 'std', 'squat']);
  // the 15 minute limit ends a session on its own
  await day(2026, 10, 18); await act('start'); await act('skip'); await act('done');
  await pg.clock.runFor(1000000); assert.ok(!(await pg.$('#clock')) && (await txt('#app')).includes('How did it feel'), 'limit'); await pg.click('[data-x=hard]');
  s = await state(); assert.ok(s.log[2].secs <= 900 && s.log[2].secs >= 880);
  // Thursday: at the limit a half-done pair is completed on the other side
  await day(2026, 10, 19); await act('start'); await act('skip'); await warmHalf(); assert.ok((await txt('#side')).startsWith('Right')); await hit(); await hit();
  await pg.clock.runFor(905000); assert.ok((await txt('#side')).startsWith('Left') && (await txt('#tap')).includes('Target 2'), 'other side owed after the limit'); await hit(); await hit(); await pg.clock.runFor(3000);
  assert.ok((await txt('#app')).includes('How did it feel')); await pg.click('[data-x=ok]'); s = await state();
  assert.deepStrictEqual(s.log[3].sets.slice(-2).map(x => x.side + x.done), ['R2', 'L2']); assert.ok(s.log[3].secs < 960);
  // Saturday, after a missed day: the short session is standard only; chosen normal, finishing early in the middle of a pair asks for the other side first
  await day(2026, 10, 21); assert.ok((await txt('#msg')).startsWith('Missed a day') && (await txt('#app')).includes('2 rounds') && !(await pg.$('#setup')));
  await pg.click('[data-x=normal]'); await act('start'); await act('skip'); await warmHalf(); await hit(); await hit(); await hit(); await act('finish'); assert.ok((await txt('#tap')).includes('Target 3'));
  await act('finish'); assert.ok((await txt('#app')).includes('Work done')); await pg.click('[data-x=ok]');
  // run tab: the pace sets the starting step, own run/walk is possible, the timer runs on the Android side and goes past the target
  await pg.click('[data-x=run]'); assert.ok(await pg.isVisible('.tabs')); assert.strictEqual(await txt('#advice'), 'First run: any day.');
  assert.strictEqual(await txt('#r_pace'), '7:00'); assert.strictEqual(await txt('#r_run'), '1:00'); assert.ok(!(await pg.$('#detect')) && !(await pg.$('#rmv')), 'no step detection on the Run tab');
  for (let i = 0; i < 4; i++) await pg.click('[data-x="pace,-1"]'); assert.strictEqual(await txt('#r_pace'), '6:00'); assert.strictEqual(await txt('#r_run'), '1:30');
  await pg.fill('#mm', '8:00'); await act('rmile'); assert.strictEqual(await txt('#r_pace'), '7:40'); assert.strictEqual(await txt('#r_run'), '0:30');
  await pg.click('[data-x="run,1"]'); assert.strictEqual(await txt('#r_run'), '0:35'); await act('rreset'); assert.strictEqual(await txt('#r_run'), '0:30');
  await pg.click('[data-x="mins,-1"]'); await pg.check('#loud'); assert.strictEqual((await state()).prefs.loud, true); await pg.screenshot({ path: shot('ui_run.png') });
  await act('rtest'); assert.ok((await pg.evaluate('__c')).includes('run:3,3,6,true')); await pg.evaluate('window.__run=null'); await pg.clock.runFor(500); await pg.uncheck('#loud');
  await act('runStart'); assert.strictEqual(await txt('#ex'), 'walk'); assert.strictEqual(await txt('#num'), '0:13'); assert.ok((await txt('#rtot')).includes('5:00 of 25:00')); await pg.screenshot({ path: shot('ui_running.png') });
  await pg.evaluate('__run.elapsed=1700'); await pg.clock.runFor(500); assert.ok((await txt('#rtot')).includes('target reached'));
  // stopping after 28 minutes: a done run; the app asks how it felt; two comfortable done runs step up
  await act('runStop'); assert.ok((await txt('#app')).includes('Run done') && !(await txt('#app')).includes('steps')); await pg.screenshot({ path: shot('ui_rundone.png') }); await pg.click('[data-x=ok]');
  assert.strictEqual(await txt('#advice'), 'Run logged.'); assert.ok((await pg.evaluate('__c')).includes('run:30,30,1500,false'));
  await act('runStart'); await pg.evaluate('__run.elapsed=1250'); await act('runStop'); await pg.click('[data-x=easy]');
  assert.ok((await txt('#advice')).startsWith('Step up')); assert.strictEqual(await txt('#r_run'), '0:45');
  // a 10-minute run is logged as short and moves nothing; a run under a minute is not logged; the app reopened on a pending run asks again
  await act('runStart'); await pg.evaluate('__run.elapsed=600'); await act('runStop'); assert.ok((await txt('#app')).includes('Short run')); await pg.reload(); assert.ok((await txt('#app')).includes('Short run')); await pg.click('[data-x=hard]');
  assert.strictEqual(await txt('#r_run'), '0:45'); await act('runStart'); await pg.evaluate('__run.elapsed=20'); await act('runStop'); assert.ok(await pg.$('[data-a=runStart]'));
  s = await state(); assert.deepStrictEqual(s.runs.map(r => [r.secs, r.done, r.feel]), [[1700, true, 'ok'], [1250, true, 'easy'], [600, false, 'hard']]); assert.ok(s.runs.every(r => r.steps === undefined && r.km === undefined), 'runs hold no steps any more');
  await pg.click('[data-x=stats]'); assert.ok((await txt('#app')).includes('28:20') && (await txt('#app')).includes('hard, short') && !(await txt('#app')).includes(' km')); await pg.screenshot({ path: shot('ui_record2.png') }); await pg.click('[data-x=home]');
  await day(2026, 10, 22); await pg.click('[data-x=run]'); assert.ok((await txt('#advice')).startsWith('Ran yesterday'));
  await day(2026, 10, 23); await pg.click('[data-x=run]'); assert.strictEqual(await txt('#advice'), 'Run day.'); assert.strictEqual(await pg.evaluate('back()'), true);
  assert.ok(await pg.isVisible('.tabs')); await pg.screenshot({ path: shot('ui_home2.png') });
  // setup: choices apply at once and keep typed capacities; rounds stay even and inside the time limit; no ladders, no detection
  await pg.click('[data-x=settings]'); await pg.fill('#c_std', '25'); await pg.click('[data-x="count,both"]'); await pg.click('[data-x="sens,normal"]'); await pg.click('[data-x="rounds,6"]');
  assert.strictEqual(await pg.inputValue('#c_std'), '25'); assert.ok(!(await pg.$('[data-x^="light,"]')) && !(await pg.$('[data-p=detect]')) && !/ladder|detect/i.test(await txt('#app')), 'no ladder or detection controls');
  await pg.screenshot({ path: shot('ui_setup2.png') }); await act('saveSet'); s = await state();
  assert.deepStrictEqual([s.prefs.count, s.prefs.sens, s.prefs.rounds, s.cap.std], ['both', 'normal', 6, 25]); assert.ok(!('light' in s.prefs) && !('detect' in s.prefs));
  assert.ok((await txt('#msg')).startsWith('Missed a day') && (await txt('#app')).includes('2 rounds')); await pg.click('[data-x=normal]');
  const rounds = +(/(\d) rounds/.exec(await txt('#app'))[1]); assert.ok(rounds % 2 === 0 && rounds >= 4, 'rounds ' + rounds);
  // both: a nose touch counted this approach is not counted again by the sensor; the sensor alone still counts
  await act('start'); await pg.clock.runFor(1000); assert.ok((await txt('#tap')).includes('Warm up')); await pg.clock.runFor(60000);
  { const c = await pg.evaluate('__c'), i3 = c.indexOf('say:3'), i2 = c.indexOf('say:2'), i1 = c.indexOf('say:1'); assert.ok(i3 > 0 && i2 > i3 && i1 > i2, 'countdown 3 2 1: ' + c.filter(x => x.startsWith('say:')));
    assert.ok(c.some(x => x.startsWith('say:Round 1. Push-ups. ') && x.includes('Crush the floor. Glutes tight. Breathe out sharp.')), 'first set spoken'); assert.ok((await txt('#tcue')).startsWith('Crush the floor')); }
  assert.ok(await pg.$('#tap.pad'));
  await pg.evaluate('onProx(true)'); await pg.clock.runFor(200); await touch(); await pg.clock.runFor(400); await pg.evaluate('onProx(false)'); await pg.clock.runFor(700); assert.strictEqual(await txt('#num'), '1');
  await pg.evaluate('onProx(true)'); await pg.clock.runFor(400); await pg.evaluate('onProx(false)'); await pg.clock.runFor(700); assert.strictEqual(await txt('#num'), '2');
  await act('finish'); const early = await pg.evaluate('__c'); assert.ok(early.includes('prox:true') && early.includes('keepOn:true') && early.includes('keepOn:false'));
  // test day, four weeks after the start: offered, not forced; open sets; the second side matches the first; capacities come from the result
  await day(2026, 11, 14); assert.ok(await pg.isVisible('#testb') && await pg.isVisible('[data-a=start]')); assert.ok((await txt('#msg')).startsWith('Test day is due')); await act('test'); await act('skip');
  assert.ok((await txt('#app')).includes('Test day') && (await txt('#tap')).includes('until your form slows')); assert.strictEqual(await txt('#doneb'), 'Skip');
  for (let i = 0; i < 20; i++) await slow(); assert.strictEqual(await txt('#num'), '20'); await pg.screenshot({ path: shot('ui_test.png') }); await act('done'); await act('skip');
  assert.strictEqual(await txt('#ex'), 'Squats'); const sq = +(await txt('#num')); await act('plus'); await act('plus'); await act('done'); await act('skip');
  const first = await txt('#side'); await slow(); await slow(); await slow(); await slow(); await slow(); await act('done');
  assert.ok((await txt('#side')) !== first && (await txt('#tap')).includes('Target 5')); for (let i = 0; i < 5; i++) await slow(); await pg.clock.runFor(800); await act('skip');
  assert.strictEqual(await txt('#ex'), 'Bulgarian split squats'); await act('skip'); await act('skip');
  assert.ok((await txt('#msg')).startsWith('Test done. Push-ups 25 → 20. Uneven push-ups'), await txt('#msg'));
  s = await state(); assert.deepStrictEqual([s.cap.std, s.cap.squat, s.cap.uneven, s.testAt], [20, sq + 2, 5, '2026-12-14']); assert.ok(!(await pg.$('#testb')));
  assert.ok((await pg.evaluate('__c')).includes('last:2026-12-14')); await pg.screenshot({ path: shot('ui_home3.png') });
  // Sunday: one sentence about the week
  await day(2026, 11, 20); assert.ok(/^Missed a day/.test(await txt('#msg'))); // the missed day comes before the Sunday sentence
  // voice off: nothing is spoken
  await pg.click('[data-x=settings]'); await pg.uncheck('[data-p=voice]'); await act('saveSet'); assert.strictEqual((await state()).prefs.voice, false);
  await act('start'); await act('skip'); assert.ok(!(await pg.evaluate('__c')).some(c => c.startsWith('say:'))); await act('finish');
  // paths live in Record: the next step opens at capacity 10 and needs two taps; the capacity restarts at half; the work screen then shows the new variation
  await pg.click('[data-x=settings]'); await pg.fill('#c_uneven', '10'); await act('saveSet'); await pg.click('[data-x=stats]');
  assert.ok((await txt('#app')).includes('Ready for the next step.') && await pg.isVisible('#up_uneven') && !(await pg.$('#up_bulg')) && (await txt('#up_uneven')) === 'Next step'); await pg.screenshot({ path: shot('ui_path.png') });
  await pg.click('#up_uneven'); assert.strictEqual((await state()).path, undefined); assert.ok((await txt('#up_uneven')).includes('Tap again')); await pg.click('#up_uneven');
  s = await state(); assert.deepStrictEqual([s.path.uneven, s.cap.uneven, s.best.uneven], [1, 5, 0]); assert.ok((await txt('#ps_uneven')).includes('Hands wide')); assert.ok(await pg.$('[data-a=stepBack]'));
  await day(2026, 11, 22); await pg.click('[data-x=normal]'); assert.ok((await txt('.plan')).includes('Archer push-ups') && (await txt('#setup')).includes('Hands wide')); await act('start'); await act('skip'); await warmHalf();
  assert.strictEqual(await txt('#ex'), 'Archer push-ups'); assert.ok((await txt('#side')).includes('working arm')); await act('finish'); await pg.click('[data-x=ok]');
  await pg.click('[data-x=stats]'); await pg.click('[data-a=stepBack]'); s = await state(); assert.deepStrictEqual([s.path.uneven, s.cap.uneven], [0, 9]); assert.ok((await txt('#app')).includes('opens at 10')); await pg.click('[data-x=home]');
  // backup: saved through the Android side; a loaded file replaces the history only after a second tap, and junk is refused
  await pg.click('[data-x=settings]'); await act('backup'); const exp = JSON.parse(await pg.evaluate('__exp')); assert.strictEqual(exp.cap.std, 20); assert.strictEqual(exp.v, 2);
  await pg.evaluate('onBackup(true)'); assert.strictEqual(await txt('#smsg'), 'Backup saved.'); await pg.screenshot({ path: shot('ui_setup3.png') });
  await act('restore'); assert.ok(!(await pg.evaluate('__c')).includes('import')); await act('restore'); assert.ok((await pg.evaluate('__c')).includes('import'));
  await pg.evaluate('onImport("junk")'); assert.strictEqual(await txt('#smsg'), 'That did not work.'); assert.strictEqual((await state()).cap.std, 20);
  await pg.evaluate('onImport(JSON.stringify({ v: 3, cap: {}, log: [] }))'); assert.strictEqual(await txt('#smsg'), 'That did not work.');
  // a backup from v1.0 or older (v 1, with the ladder and detection prefs) is accepted and upgraded
  const v1 = JSON.parse(JSON.stringify(exp)); v1.v = 1; v1.cap.std = 40; v1.log = v1.log.slice(0, 2); v1.prefs.light = 'ladder'; v1.prefs.detect = true; await pg.evaluate(j => onImport(j), JSON.stringify(v1));
  s = await state(); assert.ok(s.v === 2 && s.cap.std === 40 && s.log.length === 2 && !('light' in s.prefs) && !('detect' in s.prefs) && (await txt('#msg')) === 'Backup loaded.');
  // a v0.8 state already on the phone is upgraded when the app opens
  await pg.evaluate(j => localStorage.setItem('p15', j), JSON.stringify(Object.assign({}, v1, { prefs: Object.assign({}, v1.prefs, { light: 'ladder', detect: true }) }))); await pg.reload();
  s = await state(); assert.ok(s.v === 2 || (await pg.evaluate('S.v')) === 2); assert.ok(!('light' in (await pg.evaluate('S.prefs'))));
  // the message line: the first that applies, in this order
  //   resume > test day due > missed day > next path step ready > Sunday sentence > milestone > comeback line
  const logTo = (n, last) => Array.from({ length: n }, (_, i) => { const d = new Date(last); d.setDate(d.getDate() - i); return { date: P.dateKey(d), dow: d.getDay(), kind: 'moderate', energy: 'normal', feel: 'ok', secs: 100, partial: false, sets: [{ v: 'std', side: null, target: 5, done: 5, round: 1 }] }; }).reverse();
  const msgOn = async (mut, y, m, d) => {
    const q = P.newState(); q.cap = { std: 25, uneven: 8, squat: 30, bulg: 8 }; q.cap0 = { std: 20, uneven: 8, squat: 30, bulg: 8 };
    const today = new Date(y, m, d), yest = new Date(today); yest.setDate(d - 1); q.log = logTo(10, yest); q.testAt = P.dateKey(yest); mut(q, today, yest);
    await pg.evaluate(j => localStorage.setItem('p15', j), JSON.stringify(q)); await day(y, m, d); return txt('#msg');
  };
  const WED = [2027, 0, 6], SUN = [2027, 0, 10]; // a Wednesday and a Sunday
  assert.strictEqual(await msgOn(() => {}, ...WED), 'Since day 1: Push-ups 20 → 25', 'comeback line');
  assert.strictEqual(await msgOn(q => { q.log = logTo(7, new Date(2027, 0, 5)); }, ...WED), '7 days. First week served.', 'milestone before the comeback line');
  assert.ok((await msgOn(q => { q.log = logTo(7, new Date(2027, 0, 9)); }, ...SUN)).startsWith('This week: '), 'Sunday sentence before the milestone');
  assert.strictEqual(await msgOn(q => { q.cap.uneven = 10; q.log = logTo(7, new Date(2027, 0, 9)); }, ...SUN), 'Next step ready: see Record.', 'next step before the Sunday sentence');
  assert.ok((await msgOn(q => { q.cap.uneven = 10; q.log = logTo(7, new Date(2027, 0, 5)); }, ...SUN)).startsWith('Missed a day'), 'missed day before the next step');
  assert.ok((await msgOn(q => { q.cap.uneven = 10; q.log = logTo(7, new Date(2027, 0, 5)); q.testAt = '2026-11-01'; }, ...SUN)).startsWith('Test day is due'), 'test day before the missed day');
  assert.strictEqual(await msgOn((q, today) => { q.testAt = '2026-11-01'; q.active = P.buildSession(q, today, 'normal'); }, ...WED), 'Session under way. Resume it.', 'resume first');
  assert.strictEqual(await msgOn(q => { q.cap0 = q.cap; }, ...WED), '', 'nothing to say, nothing shown');
  const fits = await pg.evaluate('document.documentElement.scrollWidth<=window.innerWidth');
  assert.ok(fits && !errs.length, 'layout or script errors: ' + errs);
  console.log('UI PASS'); await b.close();
})().catch(e => { console.error(e); console.log('UI FAIL'); process.exit(1); });
