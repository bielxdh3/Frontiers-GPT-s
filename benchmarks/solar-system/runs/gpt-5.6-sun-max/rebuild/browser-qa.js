"use strict";

const fs = require("node:fs");

const port = Number(process.env.SOLAR_QA_PORT || 9222);
const base = `http://127.0.0.1:${port}`;
const pageUrl = "file:///E:/GPT-5.6-SUN/index.html";
let activeSocket = null;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson(url, options) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response.json();
    } catch (_) {}
    await delay(100);
  }
  throw new Error(`DevTools endpoint unavailable: ${url}`);
}

async function main() {
  let targets = await fetchJson(`${base}/json`);
  let target = targets.find((item) => item.type === "page");
  if (!target) target = await fetchJson(`${base}/json/new?${encodeURIComponent(pageUrl)}`, { method: "PUT" });

  const socket = new WebSocket(target.webSocketDebuggerUrl);
  activeSocket = socket;
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  let sequence = 0;
  const pending = new Map();
  const events = [];
  const errors = [];
  socket.addEventListener("message", (message) => {
    const payload = JSON.parse(String(message.data));
    if (payload.id && pending.has(payload.id)) {
      const item = pending.get(payload.id); pending.delete(payload.id);
      if (payload.error) item.reject(new Error(payload.error.message)); else item.resolve(payload.result);
      return;
    }
    events.push(payload);
    if (payload.method === "Runtime.exceptionThrown") errors.push({ type: "exception", detail: payload.params.exceptionDetails.text, description: payload.params.exceptionDetails.exception && payload.params.exceptionDetails.exception.description });
    if (payload.method === "Log.entryAdded" && ["error","warning"].includes(payload.params.entry.level)) errors.push({ type: payload.params.entry.level, detail: payload.params.entry.text, source: payload.params.entry.source });
    if (payload.method === "Runtime.consoleAPICalled" && payload.params.type === "error") errors.push({ type: "console", detail: payload.params.args.map((item) => item.value || item.description).join(" ") });
  });

  function send(method, params = {}) {
    const id = ++sequence;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evaluate(expression) {
    const response = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true, userGesture: true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.text || "Evaluation failed");
    return response.result.value;
  }

  async function click(selector) {
    const found = await evaluate(`(() => { const node = document.querySelector(${JSON.stringify(selector)}); if (!node) return false; node.click(); return true; })()`);
    if (!found) throw new Error(`Missing click target: ${selector}`);
    await delay(160);
  }

  async function setControl(selector, value, checked) {
    const ok = await evaluate(`(() => { const node=document.querySelector(${JSON.stringify(selector)}); if(!node)return false; ${checked === undefined ? `node.value=${JSON.stringify(value)};` : `node.checked=${checked ? "true" : "false"};`} node.dispatchEvent(new Event('change',{bubbles:true})); return true; })()`);
    if (!ok) throw new Error(`Missing control: ${selector}`);
    await delay(180);
  }

  async function screenshot(name) {
    const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
    fs.writeFileSync(`E:/GPT-5.6-SUN/${name}`, Buffer.from(shot.data, "base64"));
  }

  await Promise.all([send("Page.enable"), send("Runtime.enable"), send("Log.enable"), send("DOM.enable")]);
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: pageUrl });
  await delay(1600);
  await evaluate(`(() => { localStorage.clear(); location.reload(); return true; })()`);
  await delay(1400);
  await evaluate(`(() => { window.__qaArtifacts=[]; HTMLAnchorElement.prototype.click=function(){ const name=this.download,href=this.href; fetch(href).then(r=>r.blob()).then(blob=>window.__qaArtifacts.push({name,size:blob.size,type:blob.type})).catch(error=>window.__qaArtifacts.push({name,error:String(error)})); }; return true; })()`);

  const report = { generatedAt: new Date().toISOString(), environment: "Microsoft Edge headless, clean local state in a project-local profile", scenarios: [] };

  report.scenarios.push({
    name: "startup-and-onboarding",
    data: await evaluate(`({title:document.title,lang:document.documentElement.lang,welcomeVisible:!document.querySelector('#welcome').hidden,canvas:[document.querySelector('#space-canvas').width,document.querySelector('#space-canvas').height],bodyCount:document.querySelectorAll('.object-row').length})`)
  });
  await screenshot("qa-01-welcome.png");
  await click('[data-action="dismiss-welcome"]');
  await delay(700);
  report.scenarios.push({
    name: "overview",
    data: await evaluate(`({selected:document.querySelector('#inspector-name').textContent,date:document.querySelector('#date-label').textContent,rate:document.querySelector('#rate-label').textContent,canvasVisible:!!document.querySelector('#space-canvas').offsetParent,workspaceHidden:document.querySelector('#workspace').hidden,navRows:document.querySelectorAll('.object-row').length})`)
  });
  await screenshot("qa-02-overview-1440.png");

  await click('[data-section="tools"]');
  const dashboard = await evaluate(`({title:document.querySelector('#workspace-title').textContent,cards:document.querySelectorAll('.tool-card').length,visible:!document.querySelector('#workspace').hidden})`);
  report.scenarios.push({ name: "tools-dashboard", data: dashboard });

  await click('[data-action="open-tool"][data-tool="comparison"]');
  report.scenarios.push({ name: "comparison", data: await evaluate(`({title:document.querySelector('#workspace-title').textContent,slots:document.querySelectorAll('.compare-slot select').length,rows:document.querySelectorAll('.data-table tbody tr').length,discs:document.querySelectorAll('.compare-disc').length})`) });
  await screenshot("qa-03-comparison.png");
  await click('[data-action="export-comparison-svg"]');
  await click('[data-action="export-comparison-csv"]');
  await delay(700);
  report.scenarios.push({ name: "comparison-artifacts", data: { blobs: await evaluate(`window.__qaArtifacts.filter(item=>item.name.includes('comparison'))`) } });

  await click('[data-action="close-workspace"]');
  await click('[data-action="select-object"][data-id="saturn"]');
  await click('[data-action="focus"]');
  await delay(1100);
  report.scenarios.push({ name: "saturn-focus", data: await evaluate(`({selected:document.querySelector('#inspector-name').textContent,systemTabHidden:document.querySelector('#system-tab').hidden,followLabel:document.querySelector('#follow-label').textContent})`) });
  await screenshot("qa-04-saturn-focus.png");

  await click('[data-action="measure-selected"]');
  await setControl('[data-control="measure-pulse"]', null, true);
  report.scenarios.push({ name: "measurement", data: await evaluate(`({title:document.querySelector('#workspace-title').textContent,observer:document.querySelector('[data-control="measure-observer"] option:checked').textContent,values:[...document.querySelectorAll('.measure-value strong')].map(x=>x.textContent),lineDescription:document.querySelector('.tool-lead').textContent,pulseEnabled:document.querySelector('[data-control="measure-pulse"]').checked})`) });

  await click('[data-action="close-workspace"]');
  await click('[data-section="tools"]');
  await click('[data-action="open-tool"][data-tool="seasons"]');
  await setControl('[data-control="season-tilt"]', "0");
  report.scenarios.push({ name: "seasons-zero-tilt", data: await evaluate(`({metrics:[...document.querySelectorAll('.lab-metrics strong')].map(x=>x.textContent),hypothetical:document.querySelector('.tool-note').textContent})`) });
  await screenshot("qa-05-seasons.png");

  await click('[data-action="close-workspace"]');
  await click('[data-section="tools"]');
  await click('[data-action="open-tool"][data-tool="moon"]');
  await setControl('[data-control="moon-phase"]', "180");
  report.scenarios.push({ name: "moon-full-phase", data: await evaluate(`({metrics:[...document.querySelectorAll('.lab-metrics strong')].map(x=>x.textContent),note:document.querySelector('.tool-note.accent').textContent})`) });
  await screenshot("qa-06-moon-lab.png");

  await click('[data-action="close-workspace"]');
  await click('[data-section="learn"]');
  await click('[data-action="open-tool"][data-tool="tours"]');
  await click('[data-action="start-tour"][data-id="grand"]');
  await delay(1100);
  await click('[data-action="tour-toggle"]');
  await click('[data-action="tour-toggle"]');
  report.scenarios.push({ name: "tour-pause-resume", data: await evaluate(`({visible:!document.querySelector('#tour-hud').hidden,heading:document.querySelector('#tour-hud h3').textContent,progress:document.querySelector('#tour-hud .eyebrow').textContent,selected:document.querySelector('#inspector-name').textContent})`) });
  await screenshot("qa-07-tour.png");
  await click('[data-action="tour-exit"]');

  await click('[data-section="learn"]');
  await click('[data-action="open-tool"][data-tool="activities"]');
  await click('[data-action="start-activity"][data-id="rings"]');
  await delay(1100);
  await click('[data-action="view-cinematic"]');
  report.scenarios.push({ name: "ring-activity", data: await evaluate(`({completed:!!JSON.parse(localStorage.getItem('solar-observatory-v1')).activityProgress.rings,selected:document.querySelector('#inspector-name').textContent})`) });

  await click('[data-section="learn"]');
  await click('[data-action="open-tool"][data-tool="activities"]');
  await click('[data-action="start-activity"][data-id="emptiness"]');
  await click('[data-action="scale-view"][data-view="combined"]');
  await click('[data-action="check-activity"][data-check="combined-scale"]');
  report.scenarios.push({ name: "combined-scale-activity", data: await evaluate(`({completed:!!JSON.parse(localStorage.getItem('solar-observatory-v1')).activityProgress.emptiness,title:document.querySelector('#workspace-title').textContent,trueScale:document.body.textContent.includes('Terra é um ponto no vazio')})`) });

  await click('[data-action="close-workspace"]');
  await click('[data-action="settings"]');
  await click('[data-action="settings-tab"][data-tab="science"]');
  for (const overlay of ["grid","trails","axes","nodes","velocity"]) await setControl(`[data-control="overlay-${overlay}"]`, null, true);
  report.scenarios.push({ name: "scientific-overlays", data: await evaluate(`({toggles:[...document.querySelectorAll('[data-control^="overlay-"]')].map(x=>[x.dataset.control,x.checked]),persisted:JSON.parse(localStorage.getItem('solar-observatory-v1')).preferences.overlays})`) });
  await click('[data-action="close-workspace"]');
  await delay(500);
  await screenshot("qa-10-overlays.png");

  await click('[data-action="date-editor"]');
  await click('[data-action="j2000"]');
  report.scenarios.push({ name: "calendar-j2000", data: await evaluate(`({date:document.querySelector('#date-label').textContent,clock:document.querySelector('#clock-label').textContent,scrubber:document.querySelector('[data-control="date-scrub"]').value})`) });

  await click('[data-action="settings"]');
  await click('[data-action="settings-tab"][data-tab="science"]');
  await setControl('[data-control="language"]', "en");
  report.scenarios.push({ name: "english-localization", data: await evaluate(`({lang:document.documentElement.lang,title:document.title,nav:document.querySelector('[data-section="explore"]').textContent,workspaceTitle:document.querySelector('#workspace-title').textContent,selected:document.querySelector('#inspector-name').textContent})`) });

  await click('[data-action="close-workspace"]');
  await click('[data-action="select-object"][data-id="mercury"]');
  const orbitDateBefore = await evaluate(`document.querySelector('#date-label').textContent`);
  await click('[data-action="complete-orbit"][data-id="mercury"]');
  const orbitDateAfter = await evaluate(`document.querySelector('#date-label').textContent`);
  report.scenarios.push({ name: "complete-one-orbit", data: { orbitDateBefore, orbitDateAfter, changed: orbitDateBefore !== orbitDateAfter } });

  await click('[data-action="history-back"]');
  await click('[data-action="history-forward"]');
  report.scenarios.push({ name: "camera-history-two-way", data: await evaluate(`({back:!!document.querySelector('[data-action="history-back"]'),forward:!!document.querySelector('[data-action="history-forward"]'),runtimeErrors:${errors.length}})`) });

  const pausedBefore = await evaluate(`document.querySelector('.play-button').classList.contains('paused')`);
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: " ", code: "Space" });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: " ", code: "Space" });
  await delay(120);
  const pausedAfter = await evaluate(`document.querySelector('.play-button').classList.contains('paused')`);
  report.scenarios.push({ name: "keyboard-play-pause", data: { pausedBefore, pausedAfter, changed: pausedBefore !== pausedAfter } });

  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "p", code: "KeyP" });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "p", code: "KeyP" });
  await delay(250);
  await click('[data-action="photo-capture"]');
  await delay(1200);
  report.scenarios.push({ name: "photo-mode", data: Object.assign(await evaluate(`({active:document.querySelector('#app').classList.contains('photo-mode'),capture:!!document.querySelector('[data-action="photo-capture"]'),share:!!document.querySelector('[data-action="share-scene"]'),scaleAnnotation:!!document.querySelector('[data-control="photo-scale"]'),toolbarOverflow:document.querySelector('.photo-toolbar').scrollWidth>document.querySelector('.photo-toolbar').clientWidth})`), { blobs: await evaluate(`window.__qaArtifacts.filter(item=>/\\.png$/i.test(item.name))`) }) });
  await screenshot("qa-11-photo-mode.png");
  await click('[data-action="photo-exit"]');

  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 844 });
  await delay(500);
  const mobile = await evaluate(`(() => { const nodes=[...document.querySelectorAll('button:not([hidden]),input:not([hidden]),select:not([hidden])')].filter(x=>x.offsetParent); const rects=nodes.map(x=>x.getBoundingClientRect()); return {inner:[innerWidth,innerHeight],scrollWidth:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth>innerWidth+1,visibleControls:nodes.length,minVisibleTarget:Math.min(...rects.filter(r=>r.width&&r.height).map(r=>Math.min(r.width,r.height))),timeDock:document.querySelector('#time-dock').getBoundingClientRect().toJSON(),navigatorMobile:getComputedStyle(document.querySelector('#navigator')).position}; })()`);
  report.scenarios.push({ name: "mobile-390x844", data: mobile });
  await screenshot("qa-08-mobile-390.png");

  await send("Emulation.setDeviceMetricsOverride", { width: 768, height: 480, deviceScaleFactor: 1, mobile: true, screenWidth: 768, screenHeight: 480 });
  await delay(400);
  report.scenarios.push({ name: "short-landscape", data: await evaluate(`({inner:[innerWidth,innerHeight],scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,timeBottom:document.querySelector('#time-dock').getBoundingClientRect().bottom})`) });
  await screenshot("qa-09-landscape-768x480.png");

  report.errors = errors;
  const scenario = (name) => report.scenarios.find((item) => item.name === name).data;
  report.assertions = [
    ["catalog-has-32-bodies", scenario("startup-and-onboarding").bodyCount >= 32],
    ["tools-have-9-workspaces", scenario("tools-dashboard").cards === 9],
    ["comparison-has-physical-table", scenario("comparison").rows >= 7 && scenario("comparison").slots >= 2],
    ["comparison-exports-build-valid-blobs", scenario("comparison-artifacts").blobs.some((item) => item.name.endsWith(".svg") && item.size > 100) && scenario("comparison-artifacts").blobs.some((item) => item.name.endsWith(".csv") && item.size > 50)],
    ["measurement-has-angle-and-pulse", scenario("measurement").values.length === 4 && scenario("measurement").pulseEnabled],
    ["zero-tilt-gives-12-hours", scenario("seasons-zero-tilt").metrics.includes("12 h")],
    ["full-moon-is-turning-point", scenario("moon-full-phase").metrics[0] === "Lua cheia" && scenario("moon-full-phase").metrics[2] === "ponto de virada"],
    ["tour-is-operable", scenario("tour-pause-resume").visible],
    ["ring-activity-completes", scenario("ring-activity").completed],
    ["combined-scale-activity-completes", scenario("combined-scale-activity").completed && scenario("combined-scale-activity").trueScale],
    ["all-five-overlays-persist", scenario("scientific-overlays").toggles.length === 5 && scenario("scientific-overlays").toggles.every((item) => item[1])],
    ["calendar-reaches-j2000", scenario("calendar-j2000").date.includes("2000")],
    ["english-localization-switches", scenario("english-localization").lang === "en" && scenario("english-localization").title === "Solar System Observatory"],
    ["complete-orbit-changes-time", scenario("complete-one-orbit").changed],
    ["history-has-forward-and-back", scenario("camera-history-two-way").back && scenario("camera-history-two-way").forward],
    ["keyboard-toggle-works", scenario("keyboard-play-pause").changed],
    ["photo-mode-builds-png-and-has-share-annotations", scenario("photo-mode").active && scenario("photo-mode").capture && scenario("photo-mode").share && scenario("photo-mode").scaleAnnotation && scenario("photo-mode").blobs.some((item) => item.size > 1000 && item.type === "image/png")],
    ["mobile-has-no-page-overflow", !scenario("mobile-390x844").overflow],
    ["short-landscape-fits-width", scenario("short-landscape").scrollWidth <= scenario("short-landscape").inner[0] + 1]
  ].map(([name,ok])=>({name,ok:!!ok}));
  report.summary = { scenarios: report.scenarios.length, assertions: report.assertions.length, errors: errors.length, passed: errors.length === 0 && report.assertions.every((item) => item.ok) };
  fs.writeFileSync("E:/GPT-5.6-SUN/browser-qa-report.json", JSON.stringify(report, null, 2));
  process.stdout.write(JSON.stringify(report, null, 2));
  await send("Browser.close").catch(() => {});
  socket.close();
}

main().catch((error) => {
  if (activeSocket) activeSocket.close();
  fs.writeFileSync("E:/GPT-5.6-SUN/browser-qa-failure.txt", `${error.stack || error}\n`);
  console.error(error);
  process.exitCode = 1;
});
