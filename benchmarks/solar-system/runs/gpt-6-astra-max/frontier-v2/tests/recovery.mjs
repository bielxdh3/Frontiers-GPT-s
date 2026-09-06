import {resolve} from 'node:path';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
process.env.PLAYWRIGHT_BROWSERS_PATH=resolve('.tooling/browsers');process.env.TEMP=process.env.TMP=resolve('.tooling/temp');
const {chromium}=await import('playwright');
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});const results=[];
async function check(name,fn){const ctx=await browser.newContext({viewport:{width:1024,height:768}});try{await fn(ctx);results.push({name,status:'passed'});console.log('PASS '+name);}catch(e){results.push({name,status:'failed',error:e.message});console.log('FAIL '+name+': '+e.message);}finally{await ctx.close();}}
await check('interrupted texture can be retried without replacing scene state',async ctx=>{
 const p=await ctx.newPage();await p.route('**/assets/earth_daymap.jpg',r=>r.abort());await p.goto('http://127.0.0.1:4173',{waitUntil:'networkidle'});await p.evaluate(()=>window.observatory.ready);assert.ok((await p.evaluate(()=>window.observatory.snapshot())).diagnostics.failedAssets.includes('earth'));await p.unroute('**/assets/earth_daymap.jpg');await p.locator('#topbar [data-action=settings]').click();await p.locator('[data-action=retry-assets]').click();await p.waitForFunction(()=>window.observatory.snapshot().diagnostics.failedAssets.length===0);assert.equal(await p.locator('#scene canvas').count(),1);
});
await check('malformed saved state starts a clean, usable session',async ctx=>{
 const p=await ctx.newPage();await p.addInitScript(()=>localStorage.setItem('observatory.v1','{"version":1,"preferences":{"scale":"invalid"}}'));await p.goto('http://127.0.0.1:4173',{waitUntil:'networkidle'});assert.equal((await p.evaluate(()=>window.observatory.snapshot())).scale,'explore');assert.ok((await p.locator('#toast').innerText()).includes('sessão limpa'));
});
await check('browser visibility event policy pauses with no accumulated return gap (emulated event)',async ctx=>{
 const p=await ctx.newPage();await p.goto('http://127.0.0.1:4173',{waitUntil:'networkidle'});const report=await p.evaluate(async()=>{
  const before=window.observatory.snapshot();Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));await new Promise(r=>setTimeout(r,850));const during=window.observatory.snapshot();Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));await new Promise(r=>requestAnimationFrame(r));const after=window.observatory.snapshot();delete document.hidden;return {before,during,after};
 });assert.equal(report.during.time,report.before.time);assert.ok(report.after.time-report.during.time<report.before.speed*1000*.1);await writeFile('test-results/visibility.json',JSON.stringify({method:'Browser Page Visibility event path with document.hidden emulated; not a physical operating-system suspension test',before:report.before.time,during:report.during.time,after:report.after.time},null,2));
});
await check('reduced motion, enlarged interface, high contrast and keyboard-owned focus',async ctx=>{
 const p=await ctx.newPage();await p.emulateMedia({reducedMotion:'reduce'});await p.goto('http://127.0.0.1:4173',{waitUntil:'networkidle'});assert.equal((await p.evaluate(()=>window.observatory.snapshot())).paused,true);await p.locator('[data-action=dismiss-welcome]').first().click();const settings=p.locator('#topbar [data-action=settings]');await settings.focus();await p.keyboard.press('Enter');await p.locator('[data-field="pref.fontSize"]').focus();await p.keyboard.press('End');await p.locator('[data-field="pref.highContrast"]').check();for(let i=0;i<5;i++)await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.querySelector('#workspace').contains(document.activeElement)),true);await p.keyboard.press('Escape');assert.equal(await settings.evaluate(el=>el===document.activeElement),true);await p.screenshot({path:'test-results/enlarged-interface.png'});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
});
await writeFile('test-results/recovery.json',JSON.stringify(results,null,2));await browser.close();if(results.some(r=>r.status==='failed'))process.exitCode=1;
