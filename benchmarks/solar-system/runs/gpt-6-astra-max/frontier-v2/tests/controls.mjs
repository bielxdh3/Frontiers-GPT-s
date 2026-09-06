import {resolve} from 'node:path';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {byId,DAY} from '../src/data.js';
process.env.PLAYWRIGHT_BROWSERS_PATH=resolve('.tooling/browsers');
process.env.TEMP=process.env.TMP=resolve('.tooling/temp');
const {chromium}=await import('playwright');
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
const results=[],errors=[];
async function check(name,fn,init){
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  const p=await context.newPage();p.setDefaultTimeout(8000);p.on('pageerror',e=>errors.push(e.message));
  if(init)await p.addInitScript(init);
  const state=()=>p.evaluate(()=>window.observatory.snapshot());
  const click=async(action,value)=>{const root=await p.locator('#workspace[open]').count()?p.locator('#workspace'):p;await root.locator(`[data-action="${action}"]${value===undefined?'':`[data-value="${value}"]`}`).filter({visible:true}).first().click();};
  const field=key=>p.locator(`[data-field="${key}"]`).filter({visible:true}).first();
  const change=async(key,value)=>{const f=field(key);if(await f.evaluate(el=>el.tagName)==='SELECT')await f.selectOption(String(value));else await f.fill(String(value));};
  const close=async()=>{if(await p.locator('#workspace[open]').count())await click('close-tool');};
  const select=async id=>{await close();await click('nav-filter','main');await p.locator('#navigator-search').fill(byId[id].name[1]);await click('select',id);await p.locator('#navigator-search').fill('');};
  try{
    await p.goto('http://127.0.0.1:4173',{waitUntil:'networkidle'});await p.evaluate(()=>window.observatory.ready);await click('dismiss-welcome');
    await click('settings');await change('pref.language','en');await change('pref.reducedMotion','on');await change('pref.quality','low');await close();
    await fn({p,state,click,field,change,close,select});results.push({name,status:'passed'});console.log('PASS '+name);
  }catch(e){results.push({name,status:'failed',error:e.message});console.log('FAIL '+name+': '+e.message);await p.screenshot({path:`test-results/controls-failure-${results.length}.png`}).catch(()=>{});}
  finally{await context.close();}
}
await check('favorites persist; recent navigation and catalog filters/sorts remain usable',async({p,state,click,change,close,select})=>{
  await select('earth');await click('favorite');await select('saturn');await click('favorite');assert.equal((await state()).collections.favorites,2);
  await click('nav-filter','favorites');assert.equal(await p.locator('#navigator [data-action=select]').count(),2);
  await click('nav-filter','recent');assert.ok(await p.locator('#navigator [data-action=select]').count()>=2);
  await click('open','catalog');await change('catalogFilter','planet');await change('catalogSort','diameter');
  assert.equal(await p.locator('#workspace [data-action=select]').count(),8);assert.equal(await p.locator('#workspace [data-action=select]').first().getAttribute('data-value'),'jupiter');
  await change('catalogSort','distance');assert.equal(await p.locator('#workspace [data-action=select]').first().getAttribute('data-value'),'mercury');
  await change('catalogFilter','favorites');assert.equal(await p.locator('#workspace [data-action=select]').count(),2);await close();
  await p.reload({waitUntil:'networkidle'});assert.equal((await state()).collections.favorites,2);await click('nav-filter','favorites');await click('select','saturn');await click('favorite');assert.equal((await state()).collections.favorites,1);
});
await check('presentation presets, fullscreen and distraction-free mode preserve the clock',async({p,state,click,change,close,select})=>{
  await select('earth');const before=await state();await click('settings');
  for(const preset of ['cinema','classroom','study','low']){await click('preset',preset);assert.equal((await state()).time,before.time);assert.equal((await state()).selected,'earth');}
  await click('fullscreen');assert.ok(await p.evaluate(()=>!!document.fullscreenElement));await click('fullscreen');assert.equal(await p.evaluate(()=>!!document.fullscreenElement),false);
  await close();await click('zen');assert.equal(await p.locator('#restore-ui').isVisible(),true);await click('restore-ui');assert.equal(await p.locator('#restore-ui').isVisible(),false);
  await click('settings');await click('reset-settings');assert.equal((await state()).language,'en');await change('pref.reducedMotion','on');await close();assert.equal((await state()).time,before.time);
});
await check('custom time steps and previous/next saved dates use the same physical clock',async({state,click,change,close,select})=>{
  await select('earth');await click('open','time');await change('dateInput','2000-01-01T12:00');await click('apply-date');const start=(await state()).time;await click('save-bookmark');
  await change('stepSize','60');await click('step-custom','1');assert.equal((await state()).time,start+60000);await click('step-custom','-1');assert.equal((await state()).time,start);
  await change('stepSize',String(byId.earth.period*DAY));await click('step-custom','1');assert.ok(Math.abs((await state()).time-start-byId.earth.period*DAY*1000)<1);await click('save-bookmark');const end=(await state()).time;
  await click('bookmark-prev');assert.equal((await state()).time,start);await click('bookmark-next');assert.equal((await state()).time,end);assert.equal((await state()).paused,true);await close();
});
await check('a manually chosen date cancels one-orbit observation without snapping back',async({p,state,click,change,close,select})=>{
  await select('moon');await click('open','time');await change('dateInput','2000-01-01T12:00');await click('apply-date');const old=await state();await click('observe-orbit');
  await p.waitForTimeout(400);await click('open','time');await change('dateInput','2002-01-01T12:00');await click('apply-date');await p.waitForTimeout(150);
  assert.equal((await state()).time,Date.parse('2002-01-01T12:00:00Z'));assert.equal((await state()).speed,old.speed);assert.equal((await state()).paused,true);await close();
});
await check('one-orbit observation finishes at one exact period and restores rate/direction',async({p,state,click,change,select})=>{
  await select('moon');await click('open','time');await change('dateInput','2000-01-01T12:00');await click('apply-date');await change('customRate','-100');await click('apply-rate');const old=await state();await click('observe-orbit');
  await p.waitForFunction(()=>window.observatory.snapshot().paused,{},{timeout:26000});const end=await state();assert.ok(Math.abs(end.time-old.time-byId.moon.period*DAY*1000)<1);assert.equal(end.speed,old.speed);assert.equal(end.direction,old.direction);assert.equal(end.camera.mode,'follow');
});
await check('pausing observation releases its endpoint before later date steps',async({p,state,click,change,select})=>{
  await select('moon');await click('open','time');await change('dateInput','2000-01-01T12:00');await click('apply-date');const old=await state();await click('observe-orbit');await p.waitForTimeout(200);await click('play');assert.equal((await state()).paused,true);assert.equal((await state()).speed,old.speed);
  await click('open','time');await change('stepSize',String(7*DAY));for(let i=0;i<5;i++)await click('step-custom','1');const after=await state();assert.ok(after.time>old.time+byId.moon.period*DAY*1000);assert.equal(after.paused,true);
});
await check('unavailable speech and fullscreen retain readable tours and an in-page alternative',async({p,state,click,close})=>{
  await click('settings');await click('fullscreen');assert.match(await p.locator('#dialog-toast').innerText(),/Fullscreen unavailable/);await close();await click('zen');assert.equal(await p.locator('#restore-ui').isVisible(),true);await click('restore-ui');
  await click('learn');await click('start-tour','grand');await click('tour-narrate');assert.match(await p.locator('#toast').innerText(),/Narration unavailable/);assert.ok((await p.locator('#tourbar p').innerText()).length>40);
  await click('tour-stops');await click('tour-jump','2');assert.equal((await state()).tour.index,2);await click('tour-restart-stop');assert.equal((await state()).tour.index,2);await click('tour-toggle');assert.equal((await state()).tour.paused,true);await click('tour-exit');assert.equal((await state()).tour,null);
},()=>{Object.defineProperty(window,'speechSynthesis',{value:undefined,configurable:true});delete window.speechSynthesis;Object.defineProperty(Element.prototype,'requestFullscreen',{value:undefined,configurable:true});});
await browser.close();await writeFile('test-results/controls.json',JSON.stringify({results,pageErrors:errors},null,2));if(results.some(r=>r.status==='failed')||errors.length)process.exitCode=1;
