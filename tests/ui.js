// Runs the screen in a headless browser with a stand-in for the Android side. Saves ui_*.png. Exits with 1 on failure.
// Run: node tests/ui.js [output folder]. Needs Playwright for Node.
const { chromium } = require('playwright'); const path = require('path'), assert = require('assert');
const STUB = `window.__c=[];window.__rem={on:false,h:6,m:30};window.Android={hasProx:()=>true,prox:on=>__c.push('prox:'+on),cue:k=>__c.push('cue:'+k),keepOn:on=>__c.push('keepOn:'+on),
 runStart:(r,w,t)=>{__c.push('run:'+r+','+w+','+t);window.__run={on:true,phase:'walk',left:12.2,elapsed:300,total:t}},runStop:()=>{__c.push('runStop');window.__run=null},runState:()=>JSON.stringify(window.__run||{on:false}),
 getReminder:()=>JSON.stringify(__rem),setReminder:(on,h,m)=>{__rem={on,h,m};__c.push('rem:'+on+','+h+','+m)}};`;
(async () => {
  const out = process.argv[2] || __dirname, shot = n => path.join(out, n);
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 393, height: 830 }, deviceScaleFactor: 2 }), pg = await ctx.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(String(e)));
  await pg.clock.install({ time: new Date(2026, 10, 16, 6, 30) }); // a Monday
  await pg.addInitScript(STUB); await pg.goto('file://' + path.join(__dirname, '..', 'app', 'assets', 'index.html'));
  const txt = s => pg.textContent(s), act = a => pg.click(`[data-a=${a}]`), state = () => pg.evaluate('JSON.parse(localStorage.p15)');
  // onboarding
  await pg.screenshot({ path: shot('ui_setup.png') });
  await pg.fill('#c_std', '22'); await pg.fill('#c_squat', '30'); await pg.fill('#c_uneven', '8'); await pg.fill('#c_bulg', '8');
  await pg.fill('#r_t', '06:15'); await pg.check('#r_on'); await act('setup');
  assert.ok((await txt('#app')).includes('Monday') && (await txt('.plan')).includes('16 · 15 · 15 · 15 · 19'));
  await pg.screenshot({ path: shot('ui_home.png') });
  // one tap to start; warm-up counts down and can be skipped
  await act('start'); assert.strictEqual(await txt('#ex'), 'Warm up'); await pg.clock.runFor(5000); assert.ok(/0:5[56]/.test(await txt('#num'))); await act('skip');
  // push-ups: the sensor counts near-then-far, a touch while the face is near is ignored
  assert.strictEqual(await txt('#ex'), 'Push-ups'); assert.strictEqual(await txt('#doneb'), 'Did all 16');
  const pushup = async () => { await pg.evaluate('onProx(true)'); await pg.clock.runFor(400); await pg.click('#tap'); await pg.evaluate('onProx(false)'); await pg.clock.runFor(400); };
  await pushup(); await pushup(); assert.strictEqual(await txt('#num'), '2');
  await pg.click('#tap'); await act('minus'); await act('plus'); assert.strictEqual(await txt('#num'), '3'); await pg.screenshot({ path: shot('ui_pushups.png') });
  // pause stops the clock; leaving the app pauses too
  const c0 = await txt('#clock'); await act('pause'); await pg.clock.runFor(20000); await pg.screenshot({ path: shot('ui_paused.png') }); await pg.click('#veil'); assert.strictEqual(await txt('#clock'), c0);
  await pg.evaluate('hold()'); assert.ok(await pg.isVisible('#veil')); assert.strictEqual(await pg.evaluate('back()'), true); await pg.click('#veil');
  for (let i = 3; i < 16; i++) await pushup(); await pg.clock.runFor(800);
  // reaching the target moves on by itself to the rest, then to squats
  assert.strictEqual(await txt('#ex'), 'Rest'); await pg.screenshot({ path: shot('ui_rest.png') }); await pg.clock.runFor(31000);
  assert.strictEqual(await txt('#ex'), 'Squats'); assert.strictEqual(await txt('#num'), '22'); await act('minus'); await pg.screenshot({ path: shot('ui_squats.png') }); await act('done');
  // the session survives the app being closed
  const early = await pg.evaluate('__c'); assert.ok(early.includes('cue:rep') && early.includes('cue:done') && early.includes('rem:true,6,15'));
  await pg.reload(); assert.ok((await txt('.big')).includes('Resume')); await act('resume'); assert.strictEqual(await txt('#ex'), 'Rest'); await act('skip');
  await act('done'); await act('skip'); await act('skip'); await act('finish');
  // a shortened session is recorded as work done
  assert.ok((await txt('#app')).includes('Work done') && (await txt('#app')).includes('3 of 10 sets')); await pg.screenshot({ path: shot('ui_done.png') });
  await act('feel'); let s = await state();
  assert.deepStrictEqual(s.log[0].sets.map(x => x.done), [16, 21, 15]); assert.ok(s.log[0].partial && !s.active && s.cap.std === 22);
  assert.ok((await txt('#hint')).includes('Work recorded'));
  await pg.click('[data-x=stats]'); assert.ok((await txt('#app')).includes('52')); await pg.screenshot({ path: shot('ui_record.png') }); await pg.click('[data-x=home]');
  // Tuesday: one-sided work, left then right, squats per leg
  await pg.clock.setFixedTime(new Date(2026, 10, 17, 6, 30)); await pg.reload(); await pg.click('[data-x=exhausted]'); await act('start'); await act('skip');
  assert.strictEqual(await txt('#side'), 'Left hand on books'); await pg.screenshot({ path: shot('ui_uneven.png') }); await act('done'); assert.strictEqual(await txt('#side'), 'Right hand on books'); await act('done');
  await act('skip'); assert.strictEqual(await txt('#side'), 'Left leg in front'); await act('done'); await act('done');
  for (let i = 0; i < 5; i++) { await act('skip'); await act('done'); await act('done'); if (!(await pg.$('#ex'))) break; }
  assert.ok((await txt('#app')).includes('Day served')); await pg.click('[data-x=ok]'); s = await state();
  assert.ok(!s.log[1].partial && s.flip.uneven && s.flip.bulg && s.log[1].sets.length === 8);
  // the 15 minute limit ends the session on its own
  await pg.clock.install({ time: new Date(2026, 10, 18, 6, 30) }); await pg.reload(); await act('start'); await act('skip'); await act('done');
  for (let i = 0; i < 95; i++) { await pg.clock.runFor(10000); if (!(await pg.$('#clock'))) break; if ((await txt('#ex')) === 'Rest') { await act('skip'); await act('minus'); await act('plus'); } }
  assert.ok(!(await pg.$('#clock')) && (await txt('#app')).includes('How did it feel'), 'limit'); await pg.click('[data-x=hard]');
  s = await state(); assert.ok(s.log[2].secs <= 900 && s.log[2].secs >= 880);
  // run screen: Galloway intervals follow the pace, the timed 1.6 km sets the pace, the timer runs on the Android side
  await pg.click('[data-x=run]'); assert.strictEqual(await txt('#r_pace'), '7:00'); assert.strictEqual(await txt('#r_run'), '1:00');
  await pg.click('[data-x="pace,-1"]'); await pg.click('[data-x="pace,-1"]'); await pg.click('[data-x="pace,-1"]'); await pg.click('[data-x="pace,-1"]'); assert.strictEqual(await txt('#r_pace'), '6:00'); assert.strictEqual(await txt('#r_run'), '1:30');
  await pg.fill('#mm', '8:00'); await act('rmile'); assert.strictEqual(await txt('#r_pace'), '7:40'); assert.strictEqual(await txt('#r_run'), '0:30');
  await pg.click('[data-x="run,1"]'); assert.strictEqual(await txt('#r_run'), '0:35'); await act('rreset'); assert.strictEqual(await txt('#r_run'), '0:30');
  await pg.click('[data-x="mins,-1"]'); await pg.screenshot({ path: shot('ui_run.png') }); await act('runStart');
  assert.strictEqual(await txt('#ex'), 'walk'); assert.strictEqual(await txt('#num'), '0:13'); assert.ok((await txt('#rtot')).includes('5:00 of 25:00')); await pg.screenshot({ path: shot('ui_running.png') });
  await act('runStop'); assert.ok(await pg.$('[data-a=runStart]')); assert.ok((await pg.evaluate('__c')).includes('run:30,30,1500')); assert.strictEqual(await pg.evaluate('back()'), true);
  // setup screen
  await pg.click('[data-x=settings]'); await pg.uncheck('[data-p=sensor]'); await pg.screenshot({ path: shot('ui_setup2.png') }); await act('saveSet'); s = await state(); assert.strictEqual(s.prefs.sensor, false);
  const calls = await pg.evaluate('__c'), fits = await pg.evaluate('document.documentElement.scrollWidth<=window.innerWidth');
  assert.ok(fits && !errs.length, 'layout or script errors: ' + errs); assert.ok(calls.includes('prox:true') && calls.includes('keepOn:true') && calls.includes('keepOn:false'));
  console.log('UI PASS'); await b.close();
})().catch(e => { console.error(e); console.log('UI FAIL'); process.exit(1); });
