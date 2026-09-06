import {writeFile,readFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {bodies,byId,DAY} from '../src/data.js';
import {tours,activities,glossary,missions} from '../src/content.js';
process.env.PLAYWRIGHT_BROWSERS_PATH=resolve('.tooling/browsers');process.env.TEMP=process.env.TMP=resolve('.tooling/temp');
const {chromium}=await import('playwright');
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader'],downloadsPath:resolve('test-results')});
const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,acceptDownloads:true});
const page=await context.newPage();page.setDefaultTimeout(10000);const results=[],errors=[],perf=[];
page.on('pageerror',e=>errors.push(e.message));
await mkdir('test-results/acceptance',{recursive:true});
const state=()=>page.evaluate(()=>window.observatory.snapshot());
const button=(action,value)=>page.locator(`[data-action="${action}"]${value===undefined?'':`[data-value="${value}"]`}`).filter({visible:true}).first();
const field=key=>page.locator(`#workspace[open] [data-field="${key}"], body:not(:has(#workspace[open])) [data-field="${key}"]`).filter({visible:true}).first();
async function click(action,value){const modal=await page.locator('#workspace[open]').count(),root=modal?page.locator('#workspace'):page;await root.locator(`[data-action="${action}"]${value===undefined?'':`[data-value="${value}"]`}`).filter({visible:true}).first().click();}
async function close(){if(await page.locator('#workspace[open]').count())await click('close-tool');}
async function open(id){await close();if(['learn','settings','help','tools'].includes(id))await click(id);else{await click('tools');if(['missions','glossary'].includes(id)){await close();await click('learn');}await click('open',id);}}
async function change(key,value){const f=field(key),tag=await f.evaluate(el=>el.tagName),type=await f.getAttribute('type');if(tag==='SELECT')await f.selectOption(String(value));else if(type==='checkbox')await f.setChecked(value);else if(type==='range'){await f.focus();await f.evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},String(value));}else await f.fill(String(value));}
async function select(id,focus=true){await close();await page.locator('#navigator-search').fill(byId[id].name[1]);await click('select',id);if(focus)await click('focus');await page.locator('#navigator-search').fill('');}
async function download(action,path){const pending=page.waitForEvent('download');await click(action);await(await pending).saveAs('test-results/acceptance/'+path);}
async function shot(name){await page.screenshot({path:'test-results/acceptance/'+name+'.png'});}
async function check(name,fn){try{await fn();results.push({name,status:'passed'});console.log('PASS '+name);}catch(e){results.push({name,status:'failed',error:e.message});console.log('FAIL '+name+': '+e.message);await shot('failure-'+results.length).catch(()=>{});await close().catch(()=>{});if((await state()).activity)await click('activity-exit').catch(()=>{});if((await state()).tour)await click('tour-exit').catch(()=>{});}}
await page.goto('http://127.0.0.1:4173',{waitUntil:'networkidle'});await page.evaluate(()=>window.observatory.ready);await click('dismiss-welcome');if(!(await state()).paused)await click('play');
await open('settings');await change('pref.reducedMotion','on');await change('pref.language','en');await change('pref.quality','medium');await close();
await check('all catalog bodies: identity, data, sources and immediate focus',async()=>{
  for(const b of bodies){await select(b.id);assert.equal((await state()).selected,b.id);assert.equal((await state()).camera.target,b.id);await click('inspector-tab','data');assert.ok((await page.locator('.data-list').innerText()).includes('Mean')||(await page.locator('.data-list').innerText()).includes('mean'));await click('inspector-tab','sources');assert.ok(await page.locator('#inspector .source-list a').count()>=4);if(['sun','mercury','venus','earth','moon','mars','jupiter','saturn','uranus','neptune','europa','vesta','pluto'].includes(b.id))await shot('body-'+b.id);}
});
await check('core catalog ray picking and overlap disambiguation in rendered scene',async()=>{
  for(const b of bodies.filter(b=>['star','planet'].includes(b.type)||b.id==='moon')){await select(b.id);await select(b.id==='mercury'?'venus':'mercury',false);await page.waitForTimeout(100);await page.mouse.click(690,428);if((await state()).tool==='catalog')await click('select',b.id);assert.equal((await state()).selected,b.id,'ray pick '+b.id);}
});
await check('camera presets, keyboard, pan, history and drag do not misselect',async()=>{
  await select('saturn');await click('inspector-tab','overview');const time=(await state()).time;
  for(const preset of ['equator','polar','top','low','overview']){await click('camera-menu');await click('camera-preset',preset);await close();assert.equal((await state()).time,time);}
  await click('focus');const before=(await state()).camera.offset;await page.locator('#scene canvas').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('+');assert.notDeepEqual((await state()).camera.offset,before);
  await page.mouse.move(710,300);await page.mouse.down();await page.mouse.move(790,340,{steps:9});await page.mouse.up();assert.equal((await state()).selected,'saturn');
  await click('camera-menu');await click('camera-pan','1,0');await close();await click('camera-menu');await click('view-history','-1');await close();await click('camera-menu');await click('view-history','1');await close();await click('camera-menu');await click('free');await close();assert.equal((await state()).camera.mode,'free');await click('follow');assert.equal((await state()).camera.mode,'follow');await shot('saturn-perspective');
});
await check('time presets, invalid input, real-time advance, both boundaries and reset separation',async()=>{
  await click('open','time');for(const rate of [1,10,100,1000,3600,DAY,7*DAY,30*DAY]){await click('speed-preset',String(rate));assert.equal((await state()).speed,rate);}
  const time=(await state()).time;await change('customRate','');await click('apply-rate');assert.ok((await page.locator('#tool-error').innerText()).includes('Invalid'));assert.equal((await state()).time,time);
  await change('dateInput','1799-01-01T00:00');await click('apply-date');assert.ok((await page.locator('#tool-error').innerText()).includes('Invalid'));
  for(const date of ['1800-01-01T00:00','2050-01-01T00:00']){await change('dateInput',date);await click('apply-date');assert.equal(new Date((await state()).time).toISOString().slice(0,16),date);}
  await click('now');assert.ok(Math.abs((await state()).time-Date.now())<30000);await change('customRate','1');await click('apply-rate');await close();await click('play');const t=(await state()).time;await page.waitForTimeout(1200);await click('play');const elapsed=(await state()).time-t;assert.ok(elapsed>500&&elapsed<2500,'1x interval '+elapsed);const frozen=(await state()).time;await click('reset-view');assert.equal((await state()).time,frozen);await click('open','time');await click('reset-simulation');await close();if(!(await state()).paused)await click('play');
});
await check('journey E: live ruler, reverse, saved date jump and recalculated trail',async()=>{
  await select('earth');await click('open','time');await change('dateInput','2025-02-01T12:00');await click('apply-date');await click('save-bookmark');const saved=(await state()).time;await close();await open('settings');await change('pref.trails',true);await change('pref.nodes',true);await change('pref.axes',true);await change('pref.velocity',true);await close();
  await open('measure');await change('measure.a','earth');await change('measure.b','mars');await click('measure-save');await close();await click('reverse');await click('play');await page.waitForTimeout(350);await click('play');assert.ok((await state()).time<saved);await click('open','time');await click('bookmark-next');assert.equal((await state()).time,saved);await close();await open('measure');assert.equal(new Date((await state()).time).toISOString(),await page.locator('[data-live=measure-date]').innerText());await click('export-measurements');await close();await open('settings');await click('clear-trails');await close();
});
await check('real pointer drag preserves a live slider, scale packing and mobile diameter circles',async()=>{
  await open('seasons');const f=field('seasons.tilt'),handle=await f.elementHandle(),box=await f.boundingBox();await page.mouse.move(box.x+box.width*.26,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width*.7,box.y+box.height/2,{steps:12});await page.mouse.up();assert.ok((await state()).lab.seasons.tilt>55);assert.ok(await handle.evaluate(el=>el!==null));await shot('seasons-live');await close();
  await open('scale');await change('scale.includeSun',true);await shot('scale-sun');await change('scale.group','inner');await change('scale.zoom',2);assert.ok(await page.locator('.scale-viewport').evaluate(el=>el.scrollWidth>el.clientWidth));await shot('scale-zoom');await close();
  await open('compare');await change('compareAdd','moon');await change('compareAdd','saturn');await page.setViewportSize({width:360,height:780});for(const ball of await page.locator('.comparison-ball').all()){const b=await ball.boundingBox();assert.ok(Math.abs(b.width-b.height)<.1);}await shot('comparison-mobile');await page.setViewportSize({width:1440,height:900});await download('compare-image','comparison.svg');const svg=await readFile('test-results/acceptance/comparison.svg','utf8');assert.ok(svg.includes('km'));await close();
});
await check('all twelve activities: meaningful state, hints, inspection and completion',async()=>{
  for(const a of activities){await open('learn');await click('start-activity',a.id);await click('activity-hint');
    if(a.id==='order')await select('mars',false);
    if(a.id==='size'){await change('compareRef','jupiter');await click('activity-answer','0');}
    if(a.id==='day'){await click('activity-inspect');await click('inspector-tab','data');await click('activity-resume');}
    if(a.id==='phase')await click('moon-preset','full');
    if(a.id==='speed'){await change('kepler.e',.6);await click('activity-answer','0');}
    if(a.id==='seasons'){await change('seasons.tilt',0);await change('seasons.latitude',45);}
    if(a.id==='rings')await click('activity-answer','0');
    if(a.id==='parent')await select('jupiter',false);
    if(a.id==='gravity'){await change('gravityBody','moon');await change('personMass',70);await change('activityAnswer','114');}
    if(a.id==='light'){if(!(await state()).paused)await click('measure-freeze');const val=await page.locator('[data-live=distance-light]').innerText();await change('activityAnswer',val);}
    if(a.id==='scale'){await change('scale.ref','earth');await change('scale.size',1);await change('scale.unit','cm');await change('activityAnswer','117');}
    if(a.id==='uncertainty'){await click('activity-inspect');await click('inspector-tab','sources');await click('activity-resume');await click('activity-answer','0');}
    await click('activity-check');assert.ok((await page.locator('.activity-feedback').filter({visible:true}).innerText()).includes('✓'),a.id+' completion');await click('activity-exit');await close();
  }await open('learn');assert.ok((await page.locator('.progress-count').innerText()).startsWith('12 / 12'));await shot('activities-completed');await close();
});
await check('five tours: every stop, pause/resume/previous, interruption and restoration',async()=>{
  for(const tour of tours){const before=await state();await open('learn');await click('start-tour',tour.id);assert.equal((await state()).tour.id,tour.id);await click('tour-toggle');assert.equal((await state()).tour.paused,true);await click('tour-toggle');await click('tour-next');await click('tour-prev');assert.equal((await state()).tour.index,0);
    for(let i=0;i<tour.stops.length;i++){assert.equal((await state()).selected,tour.stops[i]);await page.waitForTimeout(1050);await click('tour-next');}
    assert.equal((await state()).tour,null);assert.equal((await state()).selected,before.selected);assert.equal((await state()).speed,before.speed);assert.equal((await state()).paused,before.paused);await close();
  }
});
await check('encyclopedia articles, historical mission routes and outer-system steps',async()=>{
  await open('glossary');for(const article of glossary){await click('article',article.id);assert.ok((await page.locator('.article').innerText()).includes(article.definition[1]));await click('tool-back');}await close();
  await open('missions');assert.equal(await page.locator('.mission-line').count(),missions.length);assert.ok((await page.locator('#dialog-content').innerText()).includes('not'));await close();
  await open('outer');for(let i=0;i<4;i++)await click('outer-step','1');await shot('outer-system');for(let i=0;i<4;i++)await click('outer-step','-1');await close();
  await open('frames');await change('frameBody','earth');const t=(await state()).time;await click('apply-frame');assert.equal((await state()).time,t);await shot('geocentric');await close();
});
await check('journal CRUD, portable scene privacy, import merge and saved-camera restore',async()=>{
  await select('earth');await open('collections');await change('noteTitle','Acceptance observation');await change('noteText','Only a note created during this test.');await click('save-note');const n=(await state()).collections.notes;await click('note-edit');await change('noteText','Edited locally.');await click('save-note');await click('collection-duplicate');assert.equal((await state()).collections.notes,n+1);page.once('dialog',d=>d.accept('Renamed observation'));await click('collection-rename');page.once('dialog',d=>d.accept());await click('collection-delete');assert.equal((await state()).collections.notes,n);await download('export-data','collections.json');
  await field('importFile').setInputFiles(resolve('test-results/acceptance/collections.json'));await page.waitForFunction(()=>window.observatory.snapshot().tool==='import');await click('import-confirm');assert.equal((await state()).collections.notes,n);await close();
  const saved=(await state()).camera;await click('save-viewpoint');await select('mars');await open('collections');await click('collection-tab','viewpoints');await click('collection-open');assert.equal((await state()).camera.target,saved.target);assert.equal((await state()).selected,'earth');
  await click('camera-menu');await click('share');await download('export-scene','scene.json');const scene=JSON.parse(await readFile('test-results/acceptance/scene.json'));assert.equal(scene.view.target,'earth');assert.ok(!JSON.stringify(scene).includes('Edited locally'));await close();
});
await check('journey G: unsaved draft survives dialog, language and mobile orientation',async()=>{
  await open('collections');await click('collection-tab','notes');await change('noteTitle','Unsaved orientation');await change('noteText','This draft must survive rotation.');await page.setViewportSize({width:390,height:844});await shot('note-portrait');await page.setViewportSize({width:844,height:390});assert.equal(await field('noteText').inputValue(),'This draft must survive rotation.');await shot('note-landscape');await page.keyboard.press('Escape');await close();await page.setViewportSize({width:1440,height:900});await open('collections');assert.equal(await field('noteText').inputValue(),'This draft must survive rotation.');await close();
});
await check('photography: controls, actual 2x PNG, square crop, video and restore',async()=>{
  await select('saturn');const before=await state();await click('photo');await change('photo.aspect','square');await change('photo.resolution','2');await change('photo.labels',true);await change('photo.orbits',false);await change('photo.guides',false);await change('pref.exposure',.8);await change('photo.fov',48);await click('capture');await page.locator('.photo-preview').waitFor();const size=await page.locator('.photo-preview').evaluate(img=>[img.naturalWidth,img.naturalHeight]);assert.deepEqual(size,[1800,1800]);await shot('photo-square');await close();const video=page.waitForEvent('download');await click('record');await page.waitForTimeout(1500);await click('record');await(await video).saveAs('test-results/acceptance/scene.webm');assert.ok((await readFile('test-results/acceptance/scene.webm')).length>1000);await click('photo-exit');assert.equal((await state()).selected,before.selected);assert.equal((await state()).paused,before.paused);
});
await check('context interruption recovers without losing scientific or saved state',async()=>{
  const before=await state();await page.evaluate(()=>{const gl=document.querySelector('#scene canvas').getContext('webgl2');window.testContextLoss=gl.getExtension('WEBGL_lose_context');window.testContextLoss.loseContext();});await page.locator('#recovery').waitFor({state:'visible'});assert.equal((await state()).collections.notes,before.collections.notes);await page.waitForTimeout(200);await page.evaluate(()=>window.testContextLoss.restoreContext());await page.locator('#recovery').waitFor({state:'hidden'});assert.equal((await state()).selected,before.selected);await shot('context-restored');
});
await check('performance across overview, Earth, rings, moons, tools and high speed',async()=>{
  const sample=async label=>{const timing=await page.evaluate(()=>new Promise(resolve=>{const times=[];let start=performance.now(),last=start;function frame(now){times.push(now-last);last=now;if(now-start<3200)requestAnimationFrame(frame);else {const sorted=[...times].sort((a,b)=>a-b);resolve({sampleMs:now-start,frames:times.length,fps:times.length*1000/(now-start),p95ms:sorted[Math.floor(sorted.length*.95)]});}}requestAnimationFrame(frame);}));perf.push({label,...(await state()).diagnostics,isolatedTiming:timing});};
  await click('reset-view');await sample('overview');await select('earth');await sample('Earth');await select('saturn');await sample('Saturn rings');await select('jupiter');await click('system','jupiter');await sample('Jupiter system');await open('compare');await sample('comparison');await close();await open('kepler');await click('kepler-run');await sample('active Kepler lab');await close();await click('open','time');await click('speed-preset',String(30*DAY));await close();await click('play');await sample('30 days per second');await click('play');assert.ok(perf.every(p=>p.loops===1));await writeFile('test-results/acceptance/performance.json',JSON.stringify({browser:browser.version(),viewport:page.viewportSize(),device:'Headless Chromium; ANGLE SwiftShader software renderer; no physical device claim',samples:perf},null,2));
});
await context.close();
await check('fresh mobile opening, touch orbit/pinch and portrait/landscape framing',async()=>{
  const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:'reduce'});const p=await ctx.newPage();await p.goto('http://127.0.0.1:4173',{waitUntil:'networkidle'});await p.screenshot({path:'test-results/acceptance/mobile-opening.png'});await p.locator('[data-action=dismiss-welcome]').first().tap();await p.locator('[data-action=nav-toggle]').tap();await p.locator('#navigator [data-action=select][data-value=saturn]').tap();await p.locator('#inspector [data-action=focus]').tap();await p.waitForTimeout(200);await p.screenshot({path:'test-results/acceptance/mobile-saturn.png'});
  const cdp=await ctx.newCDPSession(p),before=await p.evaluate(()=>window.observatory.snapshot());await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:140,y:210,id:0}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:200,y:240,id:0}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(150);assert.notDeepEqual((await p.evaluate(()=>window.observatory.snapshot())).camera.offset,before.camera.offset);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:150,y:200,id:0},{x:230,y:200,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:110,y:200,id:0},{x:270,y:200,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.setViewportSize({width:844,height:390});await p.waitForTimeout(200);await p.screenshot({path:'test-results/acceptance/mobile-landscape.png'});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await ctx.close();
});
await check('optional APIs unavailable: text, copyable scene and PNG alternatives remain',async()=>{
  const ctx=await browser.newContext({viewport:{width:1024,height:768}});const p=await ctx.newPage();await p.addInitScript(()=>{Object.defineProperty(window,'MediaRecorder',{value:undefined});Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.reject(Error('denied'))}});Object.defineProperty(document.documentElement,'requestFullscreen',{value:undefined});delete window.speechSynthesis;});await p.goto('http://127.0.0.1:4173',{waitUntil:'networkidle'});await p.locator('[data-action=dismiss-welcome]').first().click();await p.locator('#topbar [data-action=photo]').click();await p.locator('[data-action=record]').click();assert.ok((await p.locator('#toast').innerText()).includes('PNG'));await p.locator('[data-action=photo-exit]').click();await p.locator('[data-action=camera-menu]').click();await p.locator('#workspace [data-action=share]').click();await p.locator('#workspace [data-action=copy-scene]').click();assert.ok((await p.locator('#dialog-toast').innerText()).includes('Selecione'));await p.screenshot({path:'test-results/acceptance/optional-fallback.png'});await ctx.close();
});
await writeFile('test-results/acceptance/report.json',JSON.stringify({results,pageErrors:errors},null,2));await browser.close();console.log(JSON.stringify({passed:results.filter(x=>x.status==='passed').length,failed:results.filter(x=>x.status==='failed').length,pageErrors:errors},null,2));if(results.some(x=>x.status==='failed')||errors.length)process.exitCode=1;
