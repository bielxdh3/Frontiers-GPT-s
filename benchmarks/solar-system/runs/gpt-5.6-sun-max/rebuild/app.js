(function () {
  "use strict";

  const D = window.SolarData;
  const S = window.SolarScience;
  if (!D || !S) throw new Error("Solar System modules did not load.");

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const localeOf = () => state.lang === "pt" ? "pt-BR" : "en-US";
  const L = (pt, en) => state.lang === "pt" ? pt : en;
  const t = (key) => {
    const item = D.i18n[key];
    return item ? item[state.lang] : key;
  };
  const bodyName = (body) => body ? body.name[state.lang] : "—";
  const bodyType = (body) => D.typeLabels[body.type] ? D.typeLabels[body.type][state.lang] : body.type;
  const escapeHtml = (value) => String(value == null ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

  const STORAGE_KEY = "solar-observatory-v1";
  const sessionStartMs = Date.UTC(2026, 8, 5, 0, 0, 0);
  const defaultPreferences = {
    lang: "pt", quality: "auto", presentation: "natural", scaleMode: "exploration",
    labels: "major", orbitMode: "all", background: .78, reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    highContrast: false, simpleMode: false, uiScale: 1, panelOpacity: .86, units: "metric",
    audio: false, ambience: false, narration: false,
    overlays: { grid:false, trails:false, axes:false, nodes:false, velocity:false }
  };
  const defaultCollections = { favorites: ["earth"], bookmarks: [], viewpoints: [], notes: [], measurements: [], experiments: [] };

  function safeLoad() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== 1 || typeof parsed !== "object") return null;
      return parsed;
    } catch (error) {
      return null;
    }
  }

  const loaded = safeLoad();
  const preferences = Object.assign({}, defaultPreferences, loaded && loaded.preferences || {});
  const collections = Object.assign({}, defaultCollections, loaded && loaded.collections || {});
  Object.keys(defaultCollections).forEach((key) => {
    if (!Array.isArray(collections[key])) collections[key] = [];
  });

  const state = {
    lang: preferences.lang === "en" ? "en" : "pt",
    quality: ["auto","low","medium","high"].includes(preferences.quality) ? preferences.quality : "auto",
    effectiveQuality: "high",
    presentation: preferences.presentation === "enhanced" ? "enhanced" : "natural",
    scaleMode: preferences.scaleMode === "relative" ? "relative" : "exploration",
    labels: ["major","system","selected","favorites","none"].includes(preferences.labels) ? preferences.labels : "major",
    orbitMode: ["all","selected","system","none"].includes(preferences.orbitMode) ? preferences.orbitMode : "all",
    background: S.clamp(Number(preferences.background) || .78, 0, 1),
    reducedMotion: !!preferences.reducedMotion,
    highContrast: !!preferences.highContrast,
    simpleMode: !!preferences.simpleMode,
    uiScale: S.clamp(Number(preferences.uiScale) || 1, .9, 1.3),
    panelOpacity: S.clamp(Number(preferences.panelOpacity) || .86, .55, 1),
    units: preferences.units === "familiar" ? "familiar" : "metric",
    audio: !!preferences.audio,
    ambience: !!preferences.ambience,
    narration: !!preferences.narration,
    overlays: Object.assign({ grid:false, trails:false, axes:false, nodes:false, velocity:false }, preferences.overlays || {}),
    selectedId: "earth", inspectorTab: "overview", visited: new Set(loaded && loaded.visited || ["earth"]),
    dateMs: sessionStartMs, playing: true, direction: 1, speed: 86400, previousSpeed: 86400,
    selectedSection: "explore", localSystem: null, referenceFrame: "sun", followingId: null,
    navigatorOpen: innerWidth > 760, inspectorOpen: innerWidth > 760, uiHidden: false,
    workspaceKind: null, workspaceData: {}, commandOpen: false, photoMode: false,
    collections, activityProgress: Object.assign({}, loaded && loaded.activityProgress || {}), activeActivity: null,
    discovery: Object.assign({ planet:false, moon:false, reverse:false, compare:false, scale:false }, loaded && loaded.discovery || {}),
    onboardingDone: !!(loaded && loaded.onboardingDone),
    comparison: { ids: ["earth","mars"], reference: "earth", synchronized: false },
    measurement: { a: "earth", b: "moon", observer: "sun", live: true, frozen: null, pulse: false },
    scaleLab: { view: "sizes", ids: ["earth","moon","jupiter","sun"], earthSizeCm: 1, axis: "linear" },
    seasonsLab: { tilt: 23.439, latitude: -15, longitude: 90, baseline: 23.439 },
    moonLab: { phase: 90, inclination: true, eclipse: "none" },
    orbitLab: { massEarths: 1, semiMajorKm: 42000, eccentricity: .25, testMass: 10, running: false, phase: 0 },
    outerStep: 0,
    tour: null
  };

  const runtime = {
    canvas: $("#space-canvas"), ctx: null, mapCtx: $("#map-canvas").getContext("2d"),
    width: 1, height: 1, dpr: 1, lastFrame: performance.now(), uiTick: 0,
    frameTimes: [], adaptiveSince: performance.now(), projected: [], positions: null, physical: null,
    orbitCache: new Map(), overlayCache: new Map(), stars: [], belt: [], kuiper: [], pointers: new Map(), drag: null, pinch: null,
    camera: { yaw: -.58, pitch: .36, distance: 315, target: {x:0,y:0,z:0}, fov: 48, transition: null, history: [], historyIndex: -1 },
    rendererOk: true, lastSelectionAnnouncement: 0, commandIndex: 0, commandItems: [],
    lastWorkspaceFocus: null, storageAvailable: true, resizeObserver: null, photoOptions: { ratio:"viewport", labels:true, date:true, scale:true, multiplier:1 },
    fps: 60, particleSeed: S.seededRandom(0x5A17C0DE)
  };

  function safeSave() {
    const payload = {
      version: 1,
      preferences: {
        lang:state.lang, quality:state.quality, presentation:state.presentation, scaleMode:state.scaleMode,
        labels:state.labels, orbitMode:state.orbitMode, background:state.background, reducedMotion:state.reducedMotion,
        highContrast:state.highContrast, simpleMode:state.simpleMode, uiScale:state.uiScale, panelOpacity:state.panelOpacity,
        units:state.units, audio:state.audio, ambience:state.ambience, narration:state.narration,
        overlays:Object.assign({},state.overlays)
      },
      collections: state.collections,
      visited: Array.from(state.visited), activityProgress: state.activityProgress, discovery: state.discovery,
      onboardingDone: state.onboardingDone
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      runtime.storageAvailable = true;
      return true;
    } catch (error) {
      runtime.storageAvailable = false;
      return false;
    }
  }

  function toast(message, tone = "info", duration = 3200) {
    const node = document.createElement("div");
    node.className = `toast ${tone}`;
    node.textContent = message;
    $("#toast-region").appendChild(node);
    setTimeout(() => { node.style.opacity = "0"; node.style.transform = "translateX(10px)"; }, duration - 250);
    setTimeout(() => node.remove(), duration);
  }

  function announce(message) {
    const live = $("#scene-live");
    live.textContent = "";
    requestAnimationFrame(() => { live.textContent = message; });
  }

  function applyPreferences() {
    const app = $("#app");
    app.dataset.quality = state.effectiveQuality;
    app.dataset.presentation = state.presentation;
    app.classList.toggle("high-contrast", state.highContrast);
    app.classList.toggle("simple-mode", state.simpleMode);
    app.classList.toggle("distraction-free", state.uiHidden);
    document.documentElement.style.setProperty("--ui-scale", String(state.uiScale));
    document.documentElement.style.setProperty("--panel-opacity", String(state.panelOpacity));
    document.documentElement.lang = state.lang === "pt" ? "pt-BR" : "en";
    document.title = state.lang === "pt" ? "Observatório do Sistema Solar" : "Solar System Observatory";
  }

  function applyTranslations() {
    $$('[data-i18n]').forEach((node) => {
      const key = node.dataset.i18n;
      if (D.i18n[key]) node.textContent = D.i18n[key][state.lang];
    });
    $("#navigator-search").placeholder = L("Buscar Terra, Saturno…", "Search Earth, Saturn…");
    $("#command-input").placeholder = L("Ir para um mundo ou executar um comando…", "Go to a world or run a command…");
    $("#space-canvas").setAttribute("aria-label", L("Cena tridimensional interativa do Sistema Solar", "Interactive three-dimensional Solar System scene"));
    const aria=[
      [".topbar","Comandos principais","Primary commands"],[".brand","Voltar à visão geral","Return to overview"],[".mode-tabs","Áreas do observatório","Observatory areas"],
      ["[data-action='command']","Pesquisar e abrir comandos","Search and open commands"],["[data-action='toggle-ui']","Ocultar interface","Hide interface"],["[data-action='settings']","Abrir configurações","Open settings"],
      [".scene-status","Estado da simulação","Simulation status"],["#navigator","Navegador de objetos","Object navigator"],["[data-action='close-navigator']","Recolher navegador","Collapse navigator"],
      [".filter-row","Filtros do catálogo","Catalog filters"],["#navigator-restore","Abrir navegador","Open navigator"],["#inspector","Inspetor do objeto selecionado","Selected object inspector"],
      ["[data-action='close-inspector']","Recolher inspetor","Collapse inspector"],[".inspector-tabs","Seções do inspetor","Inspector sections"],[".action-grid","Ações do objeto","Object actions"],
      ["#inspector-restore","Abrir inspetor","Open inspector"],[".camera-tools","Controles da câmera","Camera controls"],["[data-action='history-back']","Vista anterior","Previous view"],
      ["[data-action='history-forward']","Vista seguinte","Next view"],[".camera-tools [data-action='overview']","Visão geral","Overview"],["[data-action='view-top']","Vista superior","Top view"],
      ["[data-action='view-cinematic']","Vista cinematográfica","Cinematic view"],[".camera-tools [data-action='help']","Ajuda e atalhos","Help and shortcuts"],["#orientation-map","Mapa de orientação","Orientation map"],
      ["#orientation-map [data-action='overview']","Centralizar visão geral","Center overview"],["#time-dock","Controle do tempo da simulação","Simulation time controls"],["[data-action='date-editor']","Editar data da simulação","Edit simulation date"],
      [".transport","Reprodução do tempo","Time playback"],["[data-action='reverse']","Inverter direção","Reverse direction"],["[data-action='step-day']","Avançar um dia","Advance one day"],
      ["#speed-slider","Velocidade da simulação","Simulation speed"],["[data-action='time-more']","Mais controles de tempo","More time controls"],["#workspace","Espaço de ferramentas","Tool workspace"],
      ["[data-action='close-workspace']","Fechar ferramenta","Close tool"],["[data-action='dismiss-welcome']","Fechar boas-vindas","Close welcome"]
    ];
    aria.forEach(([selector,pt,en])=>{const node=$(selector);if(node){node.setAttribute("aria-label",L(pt,en));if(node.hasAttribute("title"))node.setAttribute("title",L(pt,en));}});
    applyPreferences();
  }

  function initProceduralData() {
    const random = S.seededRandom(0x51A7F13D);
    runtime.stars = Array.from({length: 1000}, () => ({
      x: random(), y: random(), size: .35 + random() * 1.5,
      alpha: .15 + Math.pow(random(), 2) * .76,
      hue: random() < .08 ? (random() < .5 ? 205 : 38) : 220
    }));
    runtime.belt = Array.from({length: 380}, () => ({
      angle: random() * Math.PI * 2, radius: 2.12 + random() * 1.15, y: (random() - .5) * .18, size: .25 + random() * .8
    }));
    runtime.kuiper = Array.from({length: 260}, () => ({
      angle: random() * Math.PI * 2, radius: 31 + random() * 18, y: (random() - .5) * 3, size: .2 + random() * .65
    }));
  }

  function initRenderer() {
    try {
      runtime.ctx = runtime.canvas.getContext("2d", { alpha: false, desynchronized: true });
      if (!runtime.ctx) throw new Error("Canvas 2D unavailable");
      runtime.rendererOk = true;
      $("#canvas-fallback").hidden = true;
    } catch (error) {
      runtime.rendererOk = false;
      $("#canvas-fallback").hidden = false;
      runtime.canvas.hidden = true;
    }
  }

  function effectiveDpr() {
    const caps = {low:1,medium:1.35,high:1.8};
    return Math.min(devicePixelRatio || 1, caps[state.effectiveQuality] || 1.35);
  }

  function resizeCanvas() {
    if (!runtime.rendererOk) return;
    const rect = runtime.canvas.getBoundingClientRect();
    const dpr = effectiveDpr();
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (runtime.canvas.width !== width || runtime.canvas.height !== height) {
      runtime.canvas.width = width; runtime.canvas.height = height;
      runtime.width = rect.width; runtime.height = rect.height; runtime.dpr = dpr;
    }
  }

  function cameraBasis(camera = runtime.camera) {
    const cp = Math.cos(camera.pitch), sp = Math.sin(camera.pitch), cy = Math.cos(camera.yaw), sy = Math.sin(camera.yaw);
    const offset = { x: camera.distance * cp * sy, y: camera.distance * sp, z: camera.distance * cp * cy };
    const position = S.add(camera.target, offset);
    const forward = S.normalize(S.sub(camera.target, position));
    let right = S.normalize(S.cross(forward, {x:0,y:1,z:0}));
    if (S.length(right) < .001) right = {x:1,y:0,z:0};
    const up = S.normalize(S.cross(right, forward));
    return { position, forward, right, up };
  }

  function projectPoint(point, width = runtime.width, height = runtime.height, camera = runtime.camera) {
    const basis = cameraBasis(camera);
    const relative = S.sub(point, basis.position);
    const z = S.dot(relative, basis.forward);
    if (z <= .08) return {visible:false,x:0,y:0,z,scale:0};
    const focal = .5 * height / Math.tan(S.degToRad(camera.fov / 2));
    const safeCenterShift = (state.inspectorOpen && innerWidth > 760 ? -55 : 0) + (state.navigatorOpen && innerWidth > 760 ? 45 : 0);
    return {
      visible: true,
      x: width / 2 + safeCenterShift + S.dot(relative, basis.right) * focal / z,
      y: height / 2 - S.dot(relative, basis.up) * focal / z,
      z, scale: focal / z
    };
  }

  function hexToRgb(hex) {
    const value = hex.replace("#", "");
    const full = value.length === 3 ? value.split("").map((x)=>x+x).join("") : value;
    return {r:parseInt(full.slice(0,2),16),g:parseInt(full.slice(2,4),16),b:parseInt(full.slice(4,6),16)};
  }

  function rgba(hex, alpha) {
    const c = hexToRgb(hex);
    return `rgba(${c.r},${c.g},${c.b},${alpha})`;
  }

  function renderStars(ctx, width, height) {
    const count = state.effectiveQuality === "low" ? 300 : state.effectiveQuality === "medium" ? 600 : 1000;
    const shiftX = runtime.camera.yaw / (Math.PI * 2);
    const shiftY = runtime.camera.pitch / Math.PI * .16;
    for (let i = 0; i < count; i += 1) {
      const star = runtime.stars[i];
      const x = S.mod(star.x + shiftX * .035, 1) * width;
      const y = S.mod(star.y + shiftY, 1) * height;
      ctx.fillStyle = `hsla(${star.hue},65%,88%,${star.alpha * state.background})`;
      ctx.fillRect(x, y, star.size, star.size);
    }
  }

  function renderDust(ctx, points, kind) {
    const max = state.effectiveQuality === "low" ? Math.floor(points.length * .35) : state.effectiveQuality === "medium" ? Math.floor(points.length * .7) : points.length;
    const dateTurns = (state.dateMs - S.J2000_MS) / S.DAY_MS / (kind === "belt" ? 1500 : 70000);
    for (let i = 0; i < max; i += 1) {
      const item = points[i];
      const angle = item.angle + dateTurns * Math.PI * 2;
      const physical = {x:Math.cos(angle)*item.radius,y:item.y,z:Math.sin(angle)*item.radius};
      const display = (function(){
        const radius = S.length(physical); const dir = S.scale(physical,1/radius);
        const mapped = state.scaleMode === "relative" ? radius*10 : 25+43*Math.log1p(radius*1.7);
        return S.scale(dir,mapped);
      })();
      const p = projectPoint(display);
      if (!p.visible || p.x < -3 || p.x > runtime.width+3 || p.y < -3 || p.y > runtime.height+3) continue;
      ctx.fillStyle = kind === "belt" ? `rgba(183,164,136,${.12*state.background})` : `rgba(137,179,202,${.09*state.background})`;
      const size = S.clamp(item.size*p.scale*.45,.3,1.3);
      ctx.fillRect(p.x,p.y,size,size);
    }
  }

  function shouldShowBody(body) {
    if (body.category !== "moon") return true;
    if (body.id === "moon") return true;
    const selected = D.getBody(state.selectedId);
    return state.localSystem === body.parent || state.selectedId === body.id || state.selectedId === body.parent || (selected && selected.parent === body.parent) || state.followingId === body.id;
  }

  function orbitBodies() {
    if (state.orbitMode === "none") return [];
    if (state.orbitMode === "selected") {
      const b = D.getBody(state.selectedId); return b && b.id !== "sun" ? [b] : [];
    }
    if (state.orbitMode === "system") {
      const selected = D.getBody(state.selectedId);
      const parentId = selected && selected.category === "moon" ? selected.parent : selected && selected.id;
      return D.bodies.filter((b)=>b.parent===parentId);
    }
    return D.bodies.filter((b)=>b.parent === "sun" && (b.category === "planet" || ["pluto","ceres","vesta","comet-edu"].includes(b.id)));
  }

  function getOrbitPoints(body) {
    const dateBucket = Math.floor(state.dateMs / S.DAY_MS / 30);
    const samples = state.effectiveQuality === "low" ? 54 : state.effectiveQuality === "medium" ? 84 : 120;
    const key = `${body.id}|${state.scaleMode}|${dateBucket}|${samples}`;
    if (!runtime.orbitCache.has(key)) {
      if (runtime.orbitCache.size > 80) runtime.orbitCache.clear();
      runtime.orbitCache.set(key, S.sampleOrbit(body,state.dateMs,D,state.scaleMode,samples));
    }
    return runtime.orbitCache.get(key);
  }

  function renderOrbit(ctx, body, emphasis = false) {
    const points = getOrbitPoints(body);
    ctx.beginPath();
    let started = false;
    points.forEach((point) => {
      const p = projectPoint(point);
      if (!p.visible) { started = false; return; }
      if (!started) { ctx.moveTo(p.x,p.y); started=true; } else ctx.lineTo(p.x,p.y);
    });
    ctx.strokeStyle = emphasis ? rgba(body.accent || body.color,.48) : "rgba(143,179,207,.13)";
    ctx.lineWidth = emphasis ? 1.25 : .7;
    ctx.stroke();
  }

  function strokeProjectedPath(ctx, points, color, width = 1, dash = []) {
    ctx.save();ctx.beginPath();let started=false;
    points.forEach(point=>{const p=projectPoint(point);if(!p.visible){started=false;return;}if(!started){ctx.moveTo(p.x,p.y);started=true;}else ctx.lineTo(p.x,p.y);});
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.stroke();ctx.restore();
  }

  function renderReferenceGrid(ctx) {
    if(!state.overlays.grid)return;
    const mapRadius=au=>state.scaleMode==="relative"?au*10:25+43*Math.log1p(au*1.7);
    [0.4,1,1.5,5.2,9.5,19.2,30].forEach(au=>{const r=mapRadius(au),points=[];for(let i=0;i<=96;i+=1){const a=i/96*Math.PI*2;points.push({x:Math.cos(a)*r,y:0,z:Math.sin(a)*r});}strokeProjectedPath(ctx,points,"rgba(92,142,174,.10)",.65);});
    const r=mapRadius(30);for(let i=0;i<8;i+=1){const a=i/8*Math.PI*2;strokeProjectedPath(ctx,[{x:0,y:0,z:0},{x:Math.cos(a)*r,y:0,z:Math.sin(a)*r}],"rgba(92,142,174,.08)",.6,[3,7]);}
  }

  function velocityDisplayVector(body) {
    const bucket=Math.floor(state.dateMs/S.DAY_MS);const key=`${body.id}|${state.scaleMode}|${bucket}`;
    if(runtime.overlayCache.has(key))return runtime.overlayCache.get(key);
    if(runtime.overlayCache.size>30)runtime.overlayCache.clear();
    const stepDays=Math.max(.01,Math.min(1,Math.abs(body.periodDays||1)*.01));
    const futurePhysical=S.allPhysicalPositions(state.dateMs+stepDays*S.DAY_MS,D);
    const futureDisplay=S.allDisplayPositions(state.dateMs+stepDays*S.DAY_MS,D,state.scaleMode,futurePhysical);
    const current=runtime.positions.get(body.id),future=futureDisplay.get(body.id);const vector=current&&future?S.normalize(S.sub(future,current)):null;
    runtime.overlayCache.set(key,vector);return vector;
  }

  function renderSelectedOverlays(ctx) {
    const body=D.getBody(state.selectedId),center=runtime.positions&&runtime.positions.get(state.selectedId);if(!body||!center)return;
    if(state.overlays.trails&&body.id!=="sun"&&body.periodDays){const points=getOrbitPoints(body),start=Math.floor(points.length*.72);for(let i=start+1;i<points.length;i+=1){const alpha=.04+.32*(i-start)/(points.length-start);strokeProjectedPath(ctx,[points[i-1],points[i]],`rgba(89,215,247,${alpha})`,1.35);}}
    const base=Math.max(5,S.displayRadius(body,state.scaleMode));
    if(state.overlays.axes){const tilt=S.degToRad(body.tilt||0),axis={x:Math.sin(tilt),y:Math.cos(tilt),z:0},extent=Math.max(13,base*2.8);const a=projectPoint(S.add(center,S.scale(axis,-extent))),b=projectPoint(S.add(center,S.scale(axis,extent)));if(a.visible&&b.visible){ctx.save();ctx.strokeStyle="rgba(116,229,255,.8)";ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.fillStyle="#8fe9ff";ctx.font="600 9px ui-monospace,Consolas,monospace";ctx.fillText(L("eixo","axis"),b.x+5,b.y);ctx.restore();}}
    if(state.overlays.nodes&&body.parent==="sun"&&body.id!=="sun"){const centuries=(state.dateMs-S.J2000_MS)/S.DAY_MS/36525;const degrees=body.jpl?body.jpl.base[5]+body.jpl.rate[5]*centuries:(body.node||0);const angle=S.degToRad(degrees),r=Math.max(18,S.length(center));const a=S.scale({x:Math.cos(angle),y:0,z:Math.sin(angle)},-r),b=S.scale({x:Math.cos(angle),y:0,z:Math.sin(angle)},r);strokeProjectedPath(ctx,[a,b],"rgba(255,193,91,.48)",1,[5,5]);[a,b].forEach(point=>{const p=projectPoint(point);if(p.visible){ctx.save();ctx.fillStyle="#ffc86b";ctx.beginPath();ctx.arc(p.x,p.y,2.6,0,Math.PI*2);ctx.fill();ctx.restore();}});}
    if(state.overlays.velocity&&body.id!=="sun"){const vector=velocityDisplayVector(body);if(vector){const start=projectPoint(center),end=projectPoint(S.add(center,S.scale(vector,Math.max(18,base*3.5))));if(start.visible&&end.visible){const angle=Math.atan2(end.y-start.y,end.x-start.x);ctx.save();ctx.strokeStyle="#77efb2";ctx.fillStyle="#77efb2";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.lineTo(end.x,end.y);ctx.stroke();ctx.beginPath();ctx.moveTo(end.x,end.y);ctx.lineTo(end.x-8*Math.cos(angle-.45),end.y-8*Math.sin(angle-.45));ctx.lineTo(end.x-8*Math.cos(angle+.45),end.y-8*Math.sin(angle+.45));ctx.closePath();ctx.fill();ctx.restore();}}}
  }

  function ringPoints(body, center, radius, start, end, samples = 48) {
    const points=[];
    const tilt = S.degToRad(body.tilt || 0);
    const node = S.degToRad((S.hashString(body.id)%60)-30);
    for(let i=0;i<=samples;i+=1){
      const a=start+(end-start)*i/samples;
      const x=Math.cos(a)*radius, z=Math.sin(a)*radius;
      const y1=z*Math.sin(tilt), z1=z*Math.cos(tilt);
      const xr=x*Math.cos(node)-z1*Math.sin(node), zr=x*Math.sin(node)+z1*Math.cos(node);
      points.push({x:center.x+xr,y:center.y+y1,z:center.z+zr});
    }
    return points;
  }

  function drawRingHalf(ctx, body, center, displayRadius, front) {
    const inner=(body.id==="saturn"?1.32:1.25)*displayRadius;
    const outer=(body.ringFactor||2)*displayRadius;
    const bands=body.id==="saturn"?7:3;
    for(let b=0;b<bands;b+=1){
      const rr=S.lerp(inner,outer,(b+.5)/bands);
      const pts=ringPoints(body,center,rr,front?0:Math.PI,front?Math.PI:Math.PI*2,32);
      ctx.beginPath(); let on=false;
      pts.forEach(v=>{const p=projectPoint(v);if(!p.visible){on=false;return;} if(!on){ctx.moveTo(p.x,p.y);on=true;}else ctx.lineTo(p.x,p.y);});
      const gap=(b===2&&body.id==="saturn")?.14:0;
      ctx.strokeStyle=body.id==="saturn"?`rgba(220,196,150,${front?.42-gap:.22-gap})`:`rgba(171,216,218,${front?.26:.13})`;
      ctx.lineWidth=Math.max(.6,displayRadius*(body.id==="saturn"?.11:.055)); ctx.stroke();
    }
  }

  function drawBodyPattern(ctx, body, x, y, r, spin) {
    if (r < 3.2) return;
    ctx.save(); ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.clip();
    const alpha = state.presentation === "enhanced" ? .42 : .3;
    if (["jupiter","saturn","uranus","neptune","clouds","haze"].includes(body.pattern)) {
      const bands = body.pattern === "jupiter" ? 9 : body.pattern === "saturn" ? 7 : 4;
      for(let i=0;i<bands;i+=1){
        const yy=y-r+(i+.55)*(2*r/bands);
        ctx.fillStyle=i%2?`rgba(255,255,255,${alpha*.3})`:`rgba(20,20,30,${alpha*.24})`;
        ctx.fillRect(x-r,yy,2*r,Math.max(.6,2*r/bands*.36));
      }
      if(body.pattern==="jupiter"&&r>7){ctx.fillStyle="rgba(151,63,43,.55)";ctx.beginPath();ctx.ellipse(x+r*.35*Math.cos(spin),y+r*.2,r*.22,r*.1,0,0,Math.PI*2);ctx.fill();}
      if(body.pattern==="neptune"&&r>6){ctx.fillStyle="rgba(21,40,92,.45)";ctx.beginPath();ctx.ellipse(x-r*.2,y+r*.15,r*.2,r*.09,0,0,Math.PI*2);ctx.fill();}
    } else if (body.pattern === "earth") {
      ctx.fillStyle="rgba(42,117,67,.8)";
      const offset=Math.sin(spin)*r*.22;
      ctx.beginPath();ctx.ellipse(x-r*.2+offset,y-r*.22,r*.34,r*.2,-.4,0,Math.PI*2);ctx.ellipse(x+r*.2+offset,y+r*.25,r*.24,r*.38,.5,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle="rgba(255,255,255,.48)";ctx.lineWidth=Math.max(.4,r*.06);ctx.beginPath();ctx.arc(x,y-r*.08,r*.78,.3,1.9);ctx.stroke();
    } else if (["craters","maria","mars","pluto","irregular","io","europa","ice","triton"].includes(body.pattern)) {
      const random=S.seededRandom(S.hashString(body.id));
      const count=Math.min(22,Math.floor(r*1.7));
      for(let i=0;i<count;i+=1){
        const angle=random()*Math.PI*2+spin*.25, dist=Math.sqrt(random())*r*.75;
        const cr=Math.max(.35,random()*r*.15);
        let color=`rgba(20,20,22,${.12+random()*.24})`;
        if(body.pattern==="mars") color=`rgba(72,28,18,${.12+random()*.25})`;
        if(body.pattern==="io") color=random()<.5?`rgba(80,48,16,.35)`:`rgba(246,218,86,.38)`;
        if(body.pattern==="europa") {ctx.strokeStyle="rgba(111,68,48,.52)";ctx.lineWidth=Math.max(.35,r*.035);ctx.beginPath();ctx.moveTo(x-r, y+(random()-.5)*r);ctx.quadraticCurveTo(x,y+(random()-.5)*r,x+r,y+(random()-.5)*r);ctx.stroke();continue;}
        if(body.pattern==="ice") color=`rgba(255,255,255,${.08+random()*.22})`;
        ctx.fillStyle=color;ctx.beginPath();ctx.arc(x+Math.cos(angle)*dist,y+Math.sin(angle)*dist,cr,0,Math.PI*2);ctx.fill();
      }
      if(body.pattern==="mars"){ctx.fillStyle="rgba(238,213,187,.65)";ctx.fillRect(x-r*.45,y-r*.94,r*.9,r*.12);}
      if(body.pattern==="pluto"){ctx.fillStyle="rgba(229,202,181,.38)";ctx.beginPath();ctx.arc(x-r*.22,y-r*.1,r*.32,0,Math.PI*2);ctx.fill();}
    }
    ctx.restore();
  }

  function drawComet(ctx, body, p, radius, displayPos) {
    const sunP=projectPoint({x:0,y:0,z:0});
    const dx=p.x-sunP.x,dy=p.y-sunP.y,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len;
    const physical=runtime.physical.get(body.id); const solarDistance=S.length(physical);
    const activity=S.clamp(2.2/solarDistance,.1,1);
    const tail=35+activity*90;
    const grad=ctx.createLinearGradient(p.x,p.y,p.x+ux*tail,p.y+uy*tail);
    grad.addColorStop(0,`rgba(133,233,246,${.5*activity})`);grad.addColorStop(1,"rgba(90,190,235,0)");
    ctx.strokeStyle=grad;ctx.lineWidth=Math.max(1,radius*.7);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+ux*tail,p.y+uy*tail);ctx.stroke();
    ctx.strokeStyle=`rgba(225,210,178,${.35*activity})`;ctx.lineWidth=Math.max(1,radius*.9);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.quadraticCurveTo(p.x+ux*tail*.45-uy*18,p.y+uy*tail*.45+ux*18,p.x+ux*tail*.8-uy*25,p.y+uy*tail*.8+ux*25);ctx.stroke();
  }

  function drawBody(ctx, body, displayPos, physicalPos, timeSec, options = {}) {
    const p=projectPoint(displayPos,options.width,options.height,options.camera);
    if(!p.visible)return null;
    const base=S.displayRadius(body,state.scaleMode);
    const radius=S.clamp(base*p.scale,body.category==="moon"?2:2.2,body.id==="sun"?80:48);
    if(p.x<-radius*3||p.x>(options.width||runtime.width)+radius*3||p.y<-radius*3||p.y>(options.height||runtime.height)+radius*3)return null;
    if(body.type==="comet") drawComet(ctx,body,p,radius,displayPos);
    if(body.rings) drawRingHalf(ctx,body,displayPos,base,false);
    if(body.id==="sun"){
      const glow=ctx.createRadialGradient(p.x,p.y,radius*.25,p.x,p.y,radius*2.6);
      glow.addColorStop(0,"rgba(255,209,104,.35)");glow.addColorStop(.4,"rgba(255,133,38,.12)");glow.addColorStop(1,"rgba(255,100,20,0)");ctx.fillStyle=glow;ctx.beginPath();ctx.arc(p.x,p.y,radius*2.6,0,Math.PI*2);ctx.fill();
    }
    ctx.save();
    if(body.shape==="ellipsoid"){ctx.translate(p.x,p.y);ctx.rotate(-.24);ctx.scale(1.38,.78);ctx.translate(-p.x,-p.y);}
    if(body.shape==="irregular"){ctx.translate(p.x,p.y);ctx.rotate(.2);ctx.scale(1.12,.83);ctx.translate(-p.x,-p.y);}
    const sunScreen=projectPoint({x:0,y:0,z:0},options.width,options.height,options.camera);
    let lx=body.id==="sun"?-.3:(sunScreen.x-p.x)/(Math.hypot(sunScreen.x-p.x,sunScreen.y-p.y)||1);
    let ly=body.id==="sun"?-.35:(sunScreen.y-p.y)/(Math.hypot(sunScreen.x-p.x,sunScreen.y-p.y)||1);
    const grad=ctx.createRadialGradient(p.x+lx*radius*.34,p.y+ly*radius*.34,radius*.08,p.x+lx*radius*.06,p.y+ly*radius*.06,radius*1.16);
    const bright=state.presentation==="enhanced"?body.accent||body.color:body.color;
    grad.addColorStop(0,body.id==="sun"?"#fff2b1":bright);
    grad.addColorStop(.48,body.color);
    grad.addColorStop(1,body.id==="sun"?"#9a3518":"#02050a");
    ctx.fillStyle=grad;ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);ctx.fill();
    const spin=(timeSec/S.DAY_SECONDS)/(Math.abs(body.rotationDays||50))*Math.PI*2*Math.sign(body.rotationDays||1);
    drawBodyPattern(ctx,body,p.x,p.y,radius,spin);
    if(body.id==="sun"&&state.effectiveQuality!=="low"){
      ctx.strokeStyle="rgba(255,230,150,.23)";ctx.lineWidth=.7;for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(p.x,p.y,radius*(.4+i*.22),spin*.06+i,spin*.06+i+4.7);ctx.stroke();}
    }
    ctx.restore();
    if(body.rings) drawRingHalf(ctx,body,displayPos,base,true);
    if(state.selectedId===body.id){
      ctx.strokeStyle=rgba(body.accent||"#59d7f7",.8);ctx.lineWidth=1.2;ctx.setLineDash([3,3]);ctx.beginPath();ctx.arc(p.x,p.y,radius+6,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
      for(let i=0;i<4;i++){const a=i*Math.PI/2+.18,rr=radius+9;ctx.beginPath();ctx.arc(p.x,p.y,rr,a,a+.45);ctx.stroke();}
    }
    return {body,p,radius,displayPos,physicalPos};
  }

  function labelVisible(body) {
    if(state.labels==="none")return false;
    if(body.id===state.selectedId)return true;
    if(state.labels==="selected")return false;
    if(state.labels==="favorites")return state.collections.favorites.includes(body.id);
    if(state.labels==="system"){
      const selected=D.getBody(state.selectedId);const system=selected.category==="moon"?selected.parent:selected.id;
      return body.id===system||body.parent===system;
    }
    return body.category==="planet"||body.id==="sun"||body.id==="moon";
  }

  function drawLabels(ctx, projected) {
    const sorted=projected.filter(h=>labelVisible(h.body)).sort((a,b)=>{
      const pa=a.body.id===state.selectedId?10:(a.body.category==="planet"?5:1);const pb=b.body.id===state.selectedId?10:(b.body.category==="planet"?5:1);return pb-pa;
    });
    const boxes=[];
    ctx.font="600 11px ui-sans-serif,Segoe UI,sans-serif";ctx.textBaseline="middle";
    sorted.forEach(hit=>{
      const text=bodyName(hit.body),width=ctx.measureText(text).width+12,x=hit.p.x+hit.radius+8,y=hit.p.y;
      const box={x,y:y-10,w:width,h:20};
      if(hit.body.id!==state.selectedId&&boxes.some(b=>!(box.x+box.w<b.x||box.x>b.x+b.w||box.y+box.h<b.y||box.y>b.y+b.h)))return;
      boxes.push(box);ctx.fillStyle=hit.body.id===state.selectedId?"rgba(7,19,27,.9)":"rgba(4,8,14,.72)";ctx.strokeStyle=hit.body.id===state.selectedId?rgba(hit.body.accent||"#59d7f7",.4):"rgba(200,220,240,.1)";
      ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y-10,width,20,6);else ctx.rect(x,y-10,width,20);ctx.fill();ctx.stroke();ctx.fillStyle=hit.body.id===state.selectedId?"#effbff":"#b9c6d6";ctx.fillText(text,x+6,y+.5);
    });
  }

  function drawMeasurement(ctx) {
    if(!state.measurement||!state.measurement.a||!state.measurement.b)return;
    if(state.workspaceKind!=="measurement"&&!state.measurement.pinned)return;
    const a=runtime.positions.get(state.measurement.a),b=runtime.positions.get(state.measurement.b);if(!a||!b)return;
    const pa=projectPoint(a),pb=projectPoint(b);if(!pa.visible||!pb.visible)return;
    ctx.save();ctx.strokeStyle="rgba(89,215,247,.65)";ctx.lineWidth=1.2;ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(pa.x,pa.y);ctx.lineTo(pb.x,pb.y);ctx.stroke();ctx.setLineDash([]);
    if(state.measurement.pulse){const phase=state.reducedMotion ? .5 : (performance.now()%1800)/1800;const x=S.lerp(pa.x,pb.x,phase),y=S.lerp(pa.y,pb.y,phase);ctx.shadowColor="#8ae8ff";ctx.shadowBlur=12;ctx.fillStyle="#c5f6ff";ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}
    const value=currentMeasurement();if(value){const label=S.formatDistance(value.km,localeOf());const x=(pa.x+pb.x)/2,y=(pa.y+pb.y)/2;ctx.font="600 10px ui-monospace,Consolas,monospace";const w=ctx.measureText(label).width+12;ctx.fillStyle="rgba(3,10,16,.88)";ctx.fillRect(x-w/2,y-10,w,20);ctx.fillStyle="#8ae8ff";ctx.fillText(label,x-w/2+6,y+4);}
    ctx.restore();
  }

  function renderScene(ctx, width, height, options={}) {
    const gradient=ctx.createRadialGradient(width*.5,height*.46,20,width*.5,height*.46,Math.max(width,height)*.76);
    gradient.addColorStop(0,state.presentation==="enhanced"?"#101d31":"#0b1422");gradient.addColorStop(.5,"#050911");gradient.addColorStop(1,"#020307");ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);
    renderStars(ctx,width,height);
    if(state.background>.08){renderDust(ctx,runtime.belt,"belt");if(state.localSystem===null)renderDust(ctx,runtime.kuiper,"kuiper");}
    renderReferenceGrid(ctx);
    orbitBodies().forEach(body=>renderOrbit(ctx,body,body.id===state.selectedId));
    renderSelectedOverlays(ctx);
    drawMeasurement(ctx);
    const visibleBodies=D.bodies.filter(shouldShowBody);
    const projected=[];const timeSec=(state.dateMs-S.J2000_MS)/1000;
    visibleBodies.forEach(body=>{
      const position=runtime.positions.get(body.id),physical=runtime.physical.get(body.id);if(!position)return;
      const p=projectPoint(position,width,height,options.camera||runtime.camera);if(p.visible)projected.push({body,position,physical,p});
    });
    projected.sort((a,b)=>b.p.z-a.p.z);
    const hits=[];projected.forEach(item=>{const hit=drawBody(ctx,item.body,item.position,item.physical,timeSec,{width,height,camera:options.camera||runtime.camera});if(hit)hits.push(hit);});
    drawLabels(ctx,hits);
    if(!options.photo)runtime.projected=hits;
    if(options.caption){ctx.fillStyle="rgba(3,7,12,.72)";ctx.fillRect(0,height-54,width,54);ctx.fillStyle="#f0f6fd";ctx.font="600 14px ui-sans-serif,Segoe UI,sans-serif";ctx.fillText(options.caption.title,16,height-31);ctx.fillStyle="#91a4b9";ctx.font="11px ui-monospace,Consolas,monospace";ctx.fillText(options.caption.meta,16,height-13);}
  }

  function renderMap() {
    const ctx=runtime.mapCtx;if(!ctx)return;const canvas=ctx.canvas,w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);ctx.fillStyle="rgba(2,6,11,.75)";ctx.fillRect(0,0,w,h);
    const max=state.scaleMode==="relative"?310:225,scale=.44*Math.min(w,h)/max,cx=w/2,cy=h/2;
    ctx.strokeStyle="rgba(123,167,198,.14)";ctx.lineWidth=1;[.4,1,1.5,5.2,9.5,19.2,30].forEach(au=>{const mapped=state.scaleMode==="relative"?au*10:25+43*Math.log1p(au*1.7);ctx.beginPath();ctx.arc(cx,cy,mapped*scale,0,Math.PI*2);ctx.stroke();});
    D.bodies.filter(b=>b.parent==="sun"&&b.category==="planet").forEach(b=>{const p=runtime.positions&&runtime.positions.get(b.id);if(!p)return;ctx.fillStyle=b.color;ctx.beginPath();ctx.arc(cx+p.x*scale,cy+p.z*scale,b.id===state.selectedId?3:1.8,0,Math.PI*2);ctx.fill();});
    ctx.fillStyle="#ffbd5d";ctx.beginPath();ctx.arc(cx,cy,3,0,Math.PI*2);ctx.fill();
    const basis=cameraBasis(),camRel=S.sub(basis.position,runtime.camera.target);const a=Math.atan2(camRel.z,camRel.x);ctx.strokeStyle="#66dffa";ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*17,cy+Math.sin(a)*17);ctx.stroke();
  }

  function updateCamera(now) {
    const camera=runtime.camera;
    if(state.followingId&&runtime.positions){const pos=runtime.positions.get(state.followingId);if(pos&&!camera.transition)camera.target=S.lerpVec(camera.target,pos,state.reducedMotion?1:.18);}
    if(camera.transition){
      const elapsed=(now-camera.transition.start)/camera.transition.duration;const t=S.clamp(elapsed,0,1);const eased=1-Math.pow(1-t,3);
      camera.target=S.lerpVec(camera.transition.from.target,camera.transition.to.target,eased);camera.distance=S.lerp(camera.transition.from.distance,camera.transition.to.distance,eased);camera.yaw=S.lerp(camera.transition.from.yaw,camera.transition.to.yaw,eased);camera.pitch=S.lerp(camera.transition.from.pitch,camera.transition.to.pitch,eased);
      if(t>=1){const label=camera.transition.label;camera.transition=null;if(label)announce(label);}
    }
  }

  function updateSimulation(now) {
    const delta=Math.min(.25,Math.max(0,(now-runtime.lastFrame)/1000));runtime.lastFrame=now;
    if(state.playing)state.dateMs+=delta*state.speed*state.direction*1000;
    const year=new Date(state.dateMs).getUTCFullYear();
    if(year<1800||year>2050){state.dateMs=year<1800?Date.UTC(1800,0,1):Date.UTC(2050,11,31,23,59,59);state.playing=false;toast(L("Limite do modelo JPL atingido (1800–2050).","JPL model boundary reached (1800–2050)."),"error",4500);}
  }

  function updatePerformance(deltaMs, now) {
    runtime.frameTimes.push(deltaMs);if(runtime.frameTimes.length>120)runtime.frameTimes.shift();
    if(runtime.frameTimes.length>30)runtime.fps=1000/(runtime.frameTimes.reduce((a,b)=>a+b,0)/runtime.frameTimes.length);
    if(state.quality!=="auto") {state.effectiveQuality=state.quality;return;}
    if(now-runtime.adaptiveSince<5000)return;runtime.adaptiveSince=now;
    if(runtime.fps<34&&state.effectiveQuality==="high"){state.effectiveQuality="medium";resizeCanvas();toast(L("Qualidade adaptada para estabilizar a cena.","Quality adapted to stabilize the scene."));}
    else if(runtime.fps<24&&state.effectiveQuality==="medium"){state.effectiveQuality="low";resizeCanvas();toast(L("Modo de baixa potência ativado automaticamente.","Low-power mode enabled automatically."));}
    else if(runtime.fps>56&&state.effectiveQuality==="medium"){state.effectiveQuality="high";resizeCanvas();}
    else if(runtime.fps>45&&state.effectiveQuality==="low"){state.effectiveQuality="medium";resizeCanvas();}
  }

  function frame(now) {
    const delta=now-runtime.lastFrame;updateSimulation(now);updateCamera(now);
    runtime.physical=S.allPhysicalPositions(state.dateMs,D);runtime.positions=S.allDisplayPositions(state.dateMs,D,state.scaleMode,runtime.physical);
    if(runtime.rendererOk){resizeCanvas();runtime.ctx.setTransform(runtime.dpr,0,0,runtime.dpr,0,0);renderScene(runtime.ctx,runtime.width,runtime.height);}
    if(now-runtime.uiTick>250){updateTimeUI();updateInspectorLive();renderMap();if(state.workspaceKind==="measurement")updateMeasurementReadout();if(state.workspaceKind==="orbit"&&state.orbitLab.running)updateOrbitAnimation(.25);runtime.uiTick=now;}
    updateTour(now);updatePerformance(delta,now);requestAnimationFrame(frame);
  }

  function cameraSnapshot() {const c=runtime.camera;return {target:{...c.target},distance:c.distance,yaw:c.yaw,pitch:c.pitch,selectedId:state.selectedId};}
  function sameCameraSnapshot(a,b){return !!a&&!!b&&S.length(S.sub(a.target,b.target))<.01&&Math.abs(a.distance-b.distance)<.5&&Math.abs(a.yaw-b.yaw)<.002&&Math.abs(a.pitch-b.pitch)<.002&&a.selectedId===b.selectedId;}
  function pushCameraHistory() {
    const c=runtime.camera;const snap=cameraSnapshot();
    if(c.historyIndex<c.history.length-1)c.history.splice(c.historyIndex+1);
    const last=c.history[c.history.length-1];if(sameCameraSnapshot(last,snap))return;
    c.history.push(snap);if(c.history.length>20)c.history.shift();c.historyIndex=c.history.length-1;
  }

  function transitionCamera(to,label,record=true) {
    const c=runtime.camera;if(record)pushCameraHistory();const target=Object.assign({target:{...c.target},distance:c.distance,yaw:c.yaw,pitch:c.pitch},to);
    if(state.reducedMotion){Object.assign(c,target);c.transition=null;if(label)announce(label);return;}
    c.transition={start:performance.now(),duration:900,from:{target:{...c.target},distance:c.distance,yaw:c.yaw,pitch:c.pitch},to:target,label};
  }

  function focusBody(id, options={}) {
    const body=D.getBody(id);if(!body||!runtime.positions)return;
    const target=runtime.positions.get(id);state.selectedId=id;state.visited.add(id);state.localSystem=body.category==="moon"?body.parent:(D.childrenOf(id).length?id:null);
    const base=S.displayRadius(body,state.scaleMode);let distance=Math.max(18,base*(body.rings?(body.ringFactor||2)*4.2:5.2));
    if(options.system){const children=D.childrenOf(body.id);if(children.length)distance=Math.max(distance,72);state.localSystem=body.id;}
    transitionCamera({target:{...target},distance,yaw:options.yaw==null?runtime.camera.yaw:options.yaw,pitch:options.pitch==null?runtime.camera.pitch:options.pitch},L(`Câmera focada em ${bodyName(body)}.`,`Camera focused on ${bodyName(body)}.`));
    renderNavigator();renderInspector();updateStatus();updateDiscovery();safeSave();
  }

  function selectBody(id, focus=false) {
    const body=D.getBody(id);if(!body)return;
    state.selectedId=id;state.visited.add(id);if(body.category==="moon")state.localSystem=body.parent;
    if(focus)focusBody(id);else{renderNavigator();renderInspector();updateStatus();announce(L(`${bodyName(body)} selecionado.`,`Selected ${bodyName(body)}.`));}
    trackActivitySelection(id);state.discovery.planet=state.discovery.planet||body.category==="planet";state.discovery.moon=state.discovery.moon||body.category==="moon";updateDiscovery();safeSave();
  }

  function overview() {
    state.followingId=null;state.localSystem=null;transitionCamera({target:{x:0,y:0,z:0},distance:315,yaw:-.58,pitch:.36},L("Visão geral do Sistema Solar.","Solar System overview."));updateStatus();renderInspector();
  }

  function hitsAt(x,y) {return runtime.projected.map(hit=>{const distance=Math.hypot(hit.p.x-x,hit.p.y-y),tolerance=Math.max(10,hit.radius+5);return {hit,distance,score:distance/Math.max(hit.radius,3),inside:distance<=tolerance};}).filter(item=>item.inside).sort((a,b)=>a.score-b.score||a.hit.p.z-b.hit.p.z).slice(0,6).map(item=>item.hit);}
  function pickAt(x,y) {return hitsAt(x,y)[0]||null;}
  function showPickChoices(hits,clientX,clientY){const menu=$("#context-menu");menu.innerHTML=`<div class="context-caption">${escapeHtml(L("Objetos sobrepostos","Overlapping objects"))}</div>${hits.map(hit=>`<button data-action="select-object" data-id="${hit.body.id}"><span class="mini-planet" style="--body-color:${hit.body.color}"></span>${escapeHtml(bodyName(hit.body))}</button>`).join("")}`;menu.style.left=`${Math.min(clientX,innerWidth-230)}px`;menu.style.top=`${Math.min(clientY,innerHeight-260)}px`;menu.hidden=false;announce(L(`${hits.length} objetos sob o ponteiro. Escolha um.`,`${hits.length} objects under the pointer. Choose one.`));}

  function pointerDown(event) {
    if(event.button!==0&&event.button!==2)return;runtime.canvas.setPointerCapture(event.pointerId);runtime.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(runtime.pointers.size===2){const pts=Array.from(runtime.pointers.values());runtime.pinch={distance:Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y),cameraDistance:runtime.camera.distance};runtime.drag=null;return;}
    runtime.drag={id:event.pointerId,startX:event.clientX,startY:event.clientY,lastX:event.clientX,lastY:event.clientY,moved:false,button:event.button};runtime.camera.transition=null;
  }

  function pointerMove(event) {
    if(runtime.pointers.has(event.pointerId))runtime.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(runtime.pointers.size===2&&runtime.pinch){const pts=Array.from(runtime.pointers.values());const d=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);runtime.camera.distance=S.clamp(runtime.pinch.cameraDistance*runtime.pinch.distance/Math.max(d,10),8,800);suspendTourForManual();return;}
    const drag=runtime.drag;if(!drag||drag.id!==event.pointerId)return;const dx=event.clientX-drag.lastX,dy=event.clientY-drag.lastY;drag.lastX=event.clientX;drag.lastY=event.clientY;if(Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>5)drag.moved=true;
    if(event.shiftKey||drag.button===2){const basis=cameraBasis();const factor=runtime.camera.distance*.0015;runtime.camera.target=S.add(runtime.camera.target,S.add(S.scale(basis.right,-dx*factor),S.scale(basis.up,dy*factor)));}
    else{runtime.camera.yaw-=dx*.006;runtime.camera.pitch=S.clamp(runtime.camera.pitch-dy*.006,-1.42,1.42);}
    suspendTourForManual();
  }

  function pointerUp(event) {
    const drag=runtime.drag;runtime.pointers.delete(event.pointerId);if(runtime.pointers.size<2)runtime.pinch=null;
    if(!drag||drag.id!==event.pointerId)return;runtime.drag=null;if(!drag.moved&&event.button===0){const rect=runtime.canvas.getBoundingClientRect(),hits=hitsAt(event.clientX-rect.left,event.clientY-rect.top);if(hits.length>1)showPickChoices(hits,event.clientX,event.clientY);else if(hits[0])selectBody(hits[0].body.id,false);}
    else pushCameraHistory();
  }

  function wheel(event) { event.preventDefault();runtime.camera.transition=null;runtime.camera.distance=S.clamp(runtime.camera.distance*Math.exp(event.deltaY*.001),7,900);suspendTourForManual(); }

  function showContext(event) {
    event.preventDefault();const rect=runtime.canvas.getBoundingClientRect();const hit=pickAt(event.clientX-rect.left,event.clientY-rect.top);if(!hit)return;selectBody(hit.body.id);
    const menu=$("#context-menu");menu.innerHTML=`<button data-action="focus">◎ ${escapeHtml(t("focus"))}</button><button data-action="follow">⌁ ${escapeHtml(t("follow"))}</button><button data-action="compare-selected">◐ ${escapeHtml(t("compare"))}</button><button data-action="measure-selected">↔ ${escapeHtml(t("measure"))}</button><button data-action="save-viewpoint">＋ ${escapeHtml(L("Salvar ponto de vista","Save viewpoint"))}</button>`;
    menu.style.left=`${Math.min(event.clientX,innerWidth-220)}px`;menu.style.top=`${Math.min(event.clientY,innerHeight-220)}px`;menu.hidden=false;
  }

  function renderNavigator() {
    const query=$("#navigator-search").value.trim().toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
    const activeFilter=$(".filter-pill.active")?.dataset.filter||"all";
    const list=$("#object-list");let total=0;let html="";
    D.groups.forEach(group=>{
      const items=D.bodies.filter(body=>group.categories.includes(body.category)).filter(body=>{
        if(activeFilter==="favorites"&&!state.collections.favorites.includes(body.id))return false;
        if(activeFilter==="visited"&&!state.visited.has(body.id))return false;
        if(!query)return true;const hay=[body.name.pt,body.name.en,...(body.aliases||[])].join(" ").toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");return hay.includes(query);
      });
      if(!items.length)return;total+=items.length;html+=`<section class="object-group"><h3 class="group-title">${escapeHtml(group.label[state.lang])}</h3>`;
      items.forEach(body=>{const parent=D.getBody(body.parent);const sub=parent?`${bodyType(body)} · ${bodyName(parent)}`:bodyType(body);html+=`<button class="object-row ${body.id===state.selectedId?"selected":""}" data-action="select-object" data-id="${body.id}" aria-current="${body.id===state.selectedId?"true":"false"}"><span class="mini-planet ${body.rings?"ringed":""}" style="--body-color:${body.color}"></span><span class="object-row-text"><strong>${escapeHtml(bodyName(body))}</strong><small>${escapeHtml(sub)}</small></span><span class="object-fav" role="button" tabindex="0" data-action="favorite-row" data-id="${body.id}" aria-label="${escapeHtml(L("Alternar favorito","Toggle favorite"))}" aria-pressed="${state.collections.favorites.includes(body.id)}">★</span></button>`;});
      html+="</section>";
    });
    list.innerHTML=html;$("#catalog-empty").hidden=total>0;list.hidden=total===0;
  }

  function bodyDistanceLabel(body) {
    if(body.parent&&body.parent!=="sun")return body.distanceKm?S.formatDistance(body.distanceKm,localeOf()):"—";
    return body.aAu?`${S.formatNumber(body.aAu,localeOf(),{maximumFractionDigits:3})} AU`:"—";
  }

  function formatPeriod(days) {
    if(!Number.isFinite(days))return "—";const abs=Math.abs(days);let value;if(abs<1)value=`${S.formatNumber(abs*24,localeOf(),{maximumFractionDigits:2})} h`;else if(abs<1000)value=`${S.formatNumber(abs,localeOf(),{maximumFractionDigits:2})} ${L("dias","days")}`;else value=`${S.formatNumber(abs/365.25,localeOf(),{maximumFractionDigits:2})} ${L("anos","years")}`;return days<0?`↶ ${value}`:value;
  }

  function renderInspector() {
    const body=D.getBody(state.selectedId);if(!body)return;
    $("#inspector-type").textContent=bodyType(body);$("#inspector-name").textContent=bodyName(body);$("#inspector-subtitle").textContent=body.description[state.lang].split(/[.—]/)[0];
    $("#object-emblem").style.setProperty("--body-color",body.color);$("#object-emblem").classList.toggle("ringed",!!body.rings);$("#selected-dot").style.background=body.color;$("#selected-dot").style.color=body.color;
    $("#inspector-restore-label").textContent=bodyName(body);const fav=state.collections.favorites.includes(body.id);$("#favorite-button").setAttribute("aria-pressed",String(fav));$("#favorite-button").setAttribute("aria-label",fav?L("Remover dos favoritos","Remove from favorites"):L("Adicionar aos favoritos","Add to favorites"));
    const children=D.childrenOf(body.id);$("#system-tab").hidden=!children.length&&body.category!=="moon";
    $$("[data-inspector-tab]").forEach(tab=>{const active=tab.dataset.inspectorTab===state.inspectorTab;tab.classList.toggle("active",active);tab.setAttribute("aria-selected",String(active));});
    if(state.inspectorTab==="system"&&$("#system-tab").hidden)state.inspectorTab="overview";
    $("#inspector-content").innerHTML=inspectorHtml(body,state.inspectorTab);
    $("#follow-label").textContent=state.followingId===body.id?t("stopFollowing"):t("follow");updateStatus();
  }

  function inspectorHtml(body,tab) {
    const parent=D.getBody(body.parent),children=D.childrenOf(body.id),locale=localeOf();
    if(tab==="overview"){
      const diameter=body.radiusKm?S.formatDistance(body.radiusKm*2,locale):"—";const orbit=body.parent?formatPeriod(body.periodDays):L("Centro do modelo","Model center");
      return `<p>${escapeHtml(body.description[state.lang])}</p><div class="quick-stats"><div class="stat"><small>${escapeHtml(L("Diâmetro médio","Mean diameter"))}</small><strong>${diameter}</strong></div><div class="stat"><small>${escapeHtml(body.category==="moon"?L("Órbita do planeta","Parent orbit"):L("Período orbital","Orbital period"))}</small><strong>${orbit}</strong></div><div class="stat"><small>${escapeHtml(body.category==="moon"?L("Distância do planeta","Parent distance"):L("Semieixo maior","Semi-major axis"))}</small><strong>${bodyDistanceLabel(body)}</strong></div><div class="stat"><small>${escapeHtml(L("Gravidade ref.","Reference gravity"))}</small><strong>${body.gravity==null?"—":S.formatNumber(body.gravity,locale,{maximumFractionDigits:3})+" m/s²"}</strong></div></div><div class="fact-callout"><strong>${escapeHtml(L("Observe isto","Notice this"))}</strong><p>${escapeHtml(body.fact[state.lang])}</p></div><div class="tool-actions" style="margin-top:8px">${children.length?`<button class="button secondary" data-action="explore-moons" data-id="${body.id}">${escapeHtml(L(`Explorar ${children.length} luas exibidas`,`Explore ${children.length} rendered moons`))}</button>`:""}${body.periodDays?`<button class="button ghost" data-action="complete-orbit" data-id="${body.id}">↻ ${escapeHtml(L("Completar uma órbita","Complete one orbit"))}</button>`:""}</div>`;
    }
    if(tab==="data"){
      const rows=[
        [L("Diâmetro médio","Mean diameter"),body.radiusKm?S.formatDistance(body.radiusKm*2,locale):null,L("Esfera de volume equivalente","Equal-volume sphere")],
        [L("Massa","Mass"),body.massKg?`${S.formatScientific(body.massKg,locale)} kg`:null],
        [L("Densidade média","Mean density"),body.density?`${S.formatNumber(body.density,locale,{maximumFractionDigits:4})} g/cm³`:null],
        [L("Gravidade de referência","Reference gravity"),body.gravity!=null?`${S.formatNumber(body.gravity,locale,{maximumFractionDigits:3})} m/s²`:null,body.type==="gas"||body.type==="ice"?L("Nível de referência, sem superfície sólida","Reference level; no solid surface"):null],
        [L("Rotação sideral","Sidereal rotation"),formatPeriod(body.rotationDays),body.rotationDays<0?L("retrógrada","retrograde"):null],
        [L("Período orbital","Orbital period"),body.periodDays?formatPeriod(body.periodDays):null],
        [body.category==="moon"?L("Distância média do planeta","Mean parent distance"):L("Semieixo maior","Semi-major axis"),bodyDistanceLabel(body),body.category==="moon"&&parent?`${L("relativa a","relative to")} ${bodyName(parent)}`:null],
        [L("Excentricidade","Eccentricity"),body.e!=null?S.formatNumber(body.e,locale,{maximumFractionDigits:6}):null],
        [L("Inclinação orbital","Orbital inclination"),body.inc!=null?`${S.formatNumber(body.inc,locale,{maximumFractionDigits:3})}°`:null],
        [L("Inclinação axial","Axial tilt"),body.tilt!=null?`${S.formatNumber(body.tilt,locale,{maximumFractionDigits:3})}°`:null],
        [L("Temperatura","Temperature"),body.temp?body.temp[state.lang]:null]
      ].filter(row=>row[1]!=null&&row[1]!=="—");
      return `<dl class="data-list">${rows.map(r=>`<div class="data-row"><dt>${escapeHtml(r[0])}</dt><dd>${escapeHtml(r[1])}${r[2]?`<small>${escapeHtml(r[2])}</small>`:""}</dd></div>`).join("")}</dl><div class="tool-note">${escapeHtml(L("Valores estáticos usam as definições indicadas nas fontes. Distâncias instantâneas dependem da data e do modelo orbital.","Static values use the definitions stated by the sources. Instantaneous distances depend on date and orbital model."))}</div>`;
    }
    if(tab==="system"){
      const target=body.category==="moon"?D.getBody(body.parent):body;const moons=D.childrenOf(target.id);
      return `<p>${escapeHtml(body.category==="moon"?L(`${bodyName(body)} orbita ${bodyName(target)}. A distância abaixo é relativa ao planeta pai.`,`${bodyName(body)} orbits ${bodyName(target)}. The distance below is parent-relative.`):L(`O catálogo renderiza uma seleção de ${moons.length} luas para estudo local.`,`The catalog renders a curated set of ${moons.length} moons for local study.`))}</p>${target.knownMoons!=null?`<div class="fact-callout"><strong>${escapeHtml(L("Satélites conhecidos","Known satellites"))}</strong><p>${escapeHtml(`${target.knownMoons} · ${L("referência","reference")} ${target.moonCountDate||D.sourceDate}. ${L("Luas exibidas","Rendered moons")}: ${moons.length}.`)}</p></div>`:""}<div class="moon-list">${moons.map(m=>`<button class="moon-row" data-action="select-object" data-id="${m.id}"><span><i style="--moon-color:${m.color}"></i><strong>${escapeHtml(bodyName(m))}</strong></span><small>${escapeHtml(formatPeriod(m.periodDays))}</small></button>`).join("")}</div>${moons.length?`<button class="button secondary" style="width:100%;margin-top:10px" data-action="explore-moons" data-id="${target.id}">${escapeHtml(L("Enquadrar sistema local","Frame local system"))}</button>`:""}`;
    }
    const links=body.sourceIds.map(id=>D.sources[id]).filter(Boolean);
    return `<p>${escapeHtml(L("Cada rota abre uma referência pública primária. O observatório usa conteúdo empacotado; os links não são necessários para a cena funcionar.","Each route opens a public primary reference. The observatory uses bundled content; links are not required for the scene to work."))}</p>${links.map(src=>`<a class="source-link" href="${src.url}" target="_blank" rel="noreferrer"><span><strong>${escapeHtml(src.title)}</strong><small>${escapeHtml(src.note[state.lang])}</small></span></a>`).join("")}<div class="tool-note">${escapeHtml(L(`Referência de conteúdo: ${D.sourceDate}. Posições dos oito planetas: elementos JPL aproximados, 1800–2050; luas e corpos menores: modelos keplerianos simplificados.`,`Content reference: ${D.sourceDate}. Eight-planet positions: approximate JPL elements, 1800–2050; moons and small bodies: simplified Keplerian models.`))}</div>`;
  }

  function updateInspectorLive() {
    if(state.inspectorTab!=="overview")return;const body=D.getBody(state.selectedId);if(!body||body.id==="sun")return;
    // Deliberately rerender at a readable cadence; the canvas remains independent.
    if(!$("#inspector").classList.contains("collapsed")&&innerWidth>760)renderInspector();
  }

  function updateStatus() {
    const body=D.getBody(state.selectedId);$("#selected-status").textContent=bodyName(body);$("#scale-status").textContent=state.scaleMode==="exploration"?L("Escala de exploração","Exploration Scale"):L("Distâncias relativas","Relative Distances");
    $("#frame-status").textContent=`${L("Referencial","Frame")}: ${state.referenceFrame==="sun"?bodyName(D.getBody("sun")):bodyName(D.getBody(state.referenceFrame))}`;
    $("#accuracy-status").textContent=L("≈ JPL 1800–2050","≈ JPL 1800–2050");
  }

  function updateTimeUI() {
    const date=new Date(state.dateMs);const fmt=new Intl.DateTimeFormat(localeOf(),{day:"2-digit",month:"short",year:"numeric",timeZone:"UTC"});$("#date-label").textContent=fmt.format(date).toLocaleUpperCase(localeOf());$("#clock-label").textContent=date.toISOString().slice(11,19);
    const play=$(".play-button");play.classList.toggle("paused",!state.playing);play.setAttribute("aria-pressed",String(state.playing));play.setAttribute("aria-label",state.playing?L("Pausar simulação","Pause simulation"):L("Reproduzir simulação","Play simulation"));
    $("#rate-label").textContent=`${S.formatNumber(state.speed,localeOf(),{maximumFractionDigits:0})}×`;$("#rate-human").textContent=rateHuman(state.speed,state.playing);
    const direction=$("#direction-label");direction.textContent=state.direction>0?L("→ futuro","→ future"):L("← passado","← past");direction.classList.toggle("reverse",state.direction<0);
    $("[data-action='reverse']").setAttribute("aria-pressed",String(state.direction<0));$("#speed-slider").value=String(speedToSlider(state.speed));
  }

  function rateHuman(speed,playing=true) {
    if(!playing)return `${L("Pausado · retoma em","Paused · resumes at")} ${humanMagnitude(speed)}`;return humanMagnitude(speed);
  }
  function humanMagnitude(speed){if(speed<60)return `${S.formatNumber(speed,localeOf(),{maximumFractionDigits:1})} ${L("s por segundo","s per second")}`;if(speed<3600)return `${S.formatNumber(speed/60,localeOf(),{maximumFractionDigits:1})} ${L("min por segundo","min per second")}`;if(speed<86400)return `${S.formatNumber(speed/3600,localeOf(),{maximumFractionDigits:1})} ${L("h por segundo","h per second")}`;return `${S.formatNumber(speed/86400,localeOf(),{maximumFractionDigits:1})} ${L("dias por segundo","days per second")}`;}
  function sliderToSpeed(value){return Math.pow(10,Number(value));}
  function speedToSlider(value){return Math.log10(Math.max(1,value));}

  function toggleFavorite(id=state.selectedId) {
    const list=state.collections.favorites,index=list.indexOf(id);if(index>=0)list.splice(index,1);else list.push(id);safeSave();renderNavigator();renderInspector();toast(index>=0?L("Removido dos favoritos.","Removed from favorites."):L("Adicionado aos favoritos.","Added to favorites."),"success");
  }

  function setPanels() {
    const nav=$("#navigator"),ins=$("#inspector");if(innerWidth<=760){nav.classList.toggle("mobile-open",state.navigatorOpen);ins.classList.toggle("mobile-open",state.inspectorOpen);nav.classList.remove("collapsed");ins.classList.remove("collapsed");}
    else{nav.classList.toggle("collapsed",!state.navigatorOpen);ins.classList.toggle("collapsed",!state.inspectorOpen);nav.classList.remove("mobile-open");ins.classList.remove("mobile-open");}
    $("#navigator-restore").hidden=state.navigatorOpen;$("#inspector-restore").hidden=state.inspectorOpen;
  }

  function updateDiscovery() {
    const allDone=Object.values(state.discovery).every(Boolean);const card=$("#discovery-card");if(state.onboardingDone||allDone){card.hidden=true;return;}
    const items=[["planet",L("Visite um planeta","Visit a planet")],["moon",L("Siga uma lua","Follow a moon")],["reverse",L("Inverta o tempo","Reverse time")],["compare",L("Compare mundos","Compare worlds")],["scale",L("Entenda a escala","Understand scale")]];
    card.innerHTML=`<h3>${escapeHtml(L("Primeiras descobertas","First discoveries"))}</h3><div class="checklist">${items.map(([id,label])=>`<span class="check-item ${state.discovery[id]?"done":""}">${state.discovery[id]?"✓ ":""}${escapeHtml(label)}</span>`).join("")}</div>`;card.hidden=false;safeSave();
  }

  function setWorkspace(kind,data={}) {
    state.workspaceKind=kind;state.workspaceData=data;runtime.lastWorkspaceFocus=document.activeElement;$("#workspace").hidden=false;renderWorkspace();requestAnimationFrame(()=>$("#workspace .workspace-panel")?.focus?.());
  }
  function closeWorkspace() {state.workspaceKind=null;$("#workspace").hidden=true;if(runtime.lastWorkspaceFocus&&document.contains(runtime.lastWorkspaceFocus))runtime.lastWorkspaceFocus.focus();}

  function renderWorkspace() {
    const kind=state.workspaceKind;if(!kind)return;const meta=workspaceMeta(kind);$("#workspace-kicker").textContent=meta.kicker;$("#workspace-title").textContent=meta.title;const target=$("#workspace-content");
    const renderers={tools:renderToolsDashboard,learn:renderLearnDashboard,comparison:renderComparison,measurement:renderMeasurement,scale:renderScaleLab,seasons:renderSeasonsLab,moon:renderMoonLab,orbit:renderOrbitLab,outer:renderOuterSystem,missions:renderMissions,tours:renderTours,activities:renderActivities,encyclopedia:renderEncyclopedia,collections:renderCollections,settings:renderSettings,help:renderHelp,time:renderTimeTools,date:renderDateEditor,scaleInfo:renderScaleInfo,frameInfo:renderFrameInfo};
    target.innerHTML=renderers[kind]?renderers[kind]():`<p>${escapeHtml(L("Ferramenta indisponível.","Tool unavailable."))}</p>`;
  }

  function workspaceMeta(kind){const map={tools:[L("Laboratórios e análise","Labs and analysis"),t("tools")],learn:[L("Jornadas educativas","Learning journeys"),t("learn")],comparison:[L("Proporções verdadeiras","Truthful proportions"),t("compare")],measurement:[L("Coordenadas físicas","Physical coordinates"),t("measure")],scale:[L("Laboratório","Laboratory"),L("Escalas do Sistema Solar","Solar System Scales")],seasons:[L("Laboratório","Laboratory"),L("Inclinação e estações","Tilt and Seasons")],moon:[L("Laboratório","Laboratory"),L("Fases e eclipses","Phases and Eclipses")],orbit:[L("Experimento hipotético","Hypothetical experiment"),L("Gravidade e órbitas","Gravity and Orbits")],outer:[L("Jornada de distância","Distance journey"),L("Além de Netuno","Beyond Neptune")],missions:[L("História da exploração","Exploration history"),L("Missões espaciais","Space Missions")],tours:[L("Narrativas guiadas","Guided narratives"),L("Tours","Tours")],activities:[L("Aprender fazendo","Learn by doing"),L("Atividades","Activities")],encyclopedia:[L("Conceitos conectados","Connected concepts"),L("Enciclopédia","Encyclopedia")],collections:[L("Dados locais","Local data"),L("Minha observação","My Observatory")],settings:[L("Preferências locais","Local preferences"),L("Configurações","Settings")],help:[L("Controles acessíveis","Accessible controls"),L("Ajuda e atalhos","Help and Shortcuts")],time:[L("Modelo temporal único","Single time model"),L("Controles do tempo","Time Controls")],date:["UTC",L("Ir para uma data","Go to a Date")],scaleInfo:[L("Transparência do modelo","Model transparency"),L("Como a escala funciona","How Scale Works")],frameInfo:[L("Coordenadas","Coordinates"),L("Referenciais","Reference Frames")]};const m=map[kind]||[L("Ferramenta","Tool"),kind];return{kicker:m[0],title:m[1]};}

  function openCommand() {state.commandOpen=true;$("#command-palette").hidden=false;$("#command-input").value="";runtime.commandIndex=0;renderCommandResults();setTimeout(()=>$("#command-input").focus(),0);}
  function closeCommand(){state.commandOpen=false;$("#command-palette").hidden=true;}
  function commandCatalog(){const bodyItems=D.bodies.map(body=>({type:"body",id:body.id,title:bodyName(body),sub:bodyType(body),icon:"●",keywords:[...(body.aliases||[]),body.name.pt,body.name.en].join(" "),run:()=>{selectBody(body.id,true);closeCommand();}}));const commands=[
    ["overview",L("Visão geral do sistema","System overview"),"R",()=>overview()],
    ["play",state.playing?L("Pausar tempo","Pause time"):L("Reproduzir tempo","Play time"),"Space",()=>togglePlay()],
    ["comparison",L("Abrir comparação","Open comparison"),"C",()=>setWorkspace("comparison")],
    ["measurement",L("Medir distâncias","Measure distances"),"M",()=>setWorkspace("measurement")],
    ["scale",L("Laboratório de escala","Scale laboratory"),"",()=>setWorkspace("scale")],
    ["seasons",L("Laboratório de estações","Seasons laboratory"),"",()=>setWorkspace("seasons")],
    ["moon",L("Fases e eclipses","Phases and eclipses"),"",()=>setWorkspace("moon")],
    ["orbit",L("Sandbox de órbitas","Orbit sandbox"),"",()=>setWorkspace("orbit")],
    ["photo",L("Entrar no modo Foto","Enter Photo mode"),"P",()=>enterPhotoMode()],
    ["labels",L("Alternar rótulos","Toggle labels"),"L",()=>toggleLabels()],
    ["orbits",L("Alternar órbitas","Toggle orbits"),"O",()=>toggleOrbits()],
    ["help",L("Ajuda e atalhos","Help and shortcuts"),"?",()=>setWorkspace("help")]
  ].map(([id,title,key,run])=>({type:"command",id,title,sub:L("Comando","Command"),icon:"⌘",key,keywords:title,run}));return [...bodyItems,...commands];}
  function renderCommandResults(){const q=$("#command-input").value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");const all=commandCatalog().filter(item=>!q||`${item.title} ${item.sub} ${item.keywords}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").includes(q)).slice(0,14);runtime.commandItems=all;runtime.commandIndex=S.clamp(runtime.commandIndex,0,Math.max(0,all.length-1));$("#command-results").innerHTML=all.length?all.map((item,i)=>`<button class="command-result ${i===runtime.commandIndex?"active":""}" role="option" aria-selected="${i===runtime.commandIndex}" data-command-index="${i}"><span class="result-icon">${item.icon}</span><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.sub)}</small></span>${item.key?`<kbd>${escapeHtml(item.key)}</kbd>`:""}</button>`).join(""):`<div class="empty-state"><strong>${escapeHtml(L("Nada encontrado","Nothing found"))}</strong></div>`;}

  function togglePlay(){state.playing=!state.playing;updateTimeUI();announce(state.playing?L("Simulação em movimento.","Simulation playing."):L("Simulação pausada.","Simulation paused."));}
  function toggleLabels(){const order=["major","system","selected","none"];state.labels=order[(order.indexOf(state.labels)+1)%order.length];safeSave();toast(`${L("Rótulos","Labels")}: ${state.labels}`);}
  function toggleOrbits(){const order=["all","selected","system","none"];state.orbitMode=order[(order.indexOf(state.orbitMode)+1)%order.length];runtime.orbitCache.clear();safeSave();toast(`${L("Órbitas","Orbits")}: ${state.orbitMode}`);}
  function toggleFollow(){if(state.followingId===state.selectedId){state.followingId=null;toast(L("Câmera livre.","Free camera."));}else{state.followingId=state.selectedId;focusBody(state.selectedId);const body=D.getBody(state.selectedId);if(body.category==="moon")state.discovery.moon=true;toast(L(`Seguindo ${bodyName(body)}. Arraste para orbitar sem soltar o alvo.`,`Following ${bodyName(body)}. Drag to orbit without releasing the target.`));}renderInspector();updateStatus();updateDiscovery();}

  function handleAction(action,node,event){
    const id=node.dataset.id;
    const actions={
      "retry-renderer":()=>{runtime.canvas.hidden=false;initRenderer();}, overview, command:openCommand,"close-command":closeCommand,
      "toggle-ui":()=>{state.uiHidden=!state.uiHidden;applyPreferences();},settings:()=>setWorkspace("settings"),
      "close-navigator":()=>{state.navigatorOpen=false;setPanels();},"open-navigator":()=>{state.navigatorOpen=true;if(innerWidth<=760)state.inspectorOpen=false;setPanels();},
      "close-inspector":()=>{state.inspectorOpen=false;setPanels();},"open-inspector":()=>{state.inspectorOpen=true;if(innerWidth<=760)state.navigatorOpen=false;setPanels();},
      "clear-search":()=>{$("#navigator-search").value="";$$('.filter-pill').forEach(x=>x.classList.toggle("active",x.dataset.filter==="all"));renderNavigator();},
      "select-object":()=>selectBody(id,false),"favorite-row":()=>toggleFavorite(id),favorite:()=>toggleFavorite(),focus:()=>focusBody(state.selectedId),follow:toggleFollow,
      "compare-selected":()=>{const other=state.selectedId==="earth"?"mars":"earth";state.comparison.ids=[state.selectedId,other];state.discovery.compare=true;setWorkspace("comparison");updateDiscovery();},
      "measure-selected":()=>{state.measurement.a=state.selectedId;state.measurement.b=state.selectedId==="earth"?"moon":"earth";setWorkspace("measurement");},
      "explore-moons":()=>focusBody(id||state.selectedId,{system:true}),"complete-orbit":()=>completeOrbit(id||state.selectedId),"save-viewpoint":saveViewpoint,
      "history-back":cameraHistoryBack,"history-forward":cameraHistoryForward,"view-top":()=>transitionCamera({pitch:1.42,yaw:0},L("Vista superior.","Top-down view.")),"view-cinematic":cinematicView,help:()=>setWorkspace("help"),
      "scale-info":()=>{state.discovery.scale=true;setWorkspace("scaleInfo");updateDiscovery();},"frame-info":()=>setWorkspace("frameInfo"),
      reverse:()=>{state.direction*=-1;state.discovery.reverse=true;updateTimeUI();updateDiscovery();announce(state.direction<0?L("Tempo invertido para o passado.","Time reversed toward the past."):L("Tempo avança para o futuro.","Time moves toward the future."));},
      play:togglePlay,"step-day":()=>stepTime(S.DAY_SECONDS),now:()=>{state.dateMs=Date.now();updateTimeUI();toast(L("Data ajustada para agora em UTC.","Date set to now in UTC."));},"time-more":()=>setWorkspace("time"),"date-editor":()=>setWorkspace("date"),"rate-menu":()=>setWorkspace("time"),
      "close-workspace":closeWorkspace,"dismiss-welcome":dismissWelcome,"start-grand-tour":()=>{dismissWelcome();startTour("grand");},"welcome-controls":()=>{dismissWelcome();setWorkspace("help");}
    };
    if(actions[action]){event&&event.preventDefault();actions[action]();return true;}return handleToolAction(action,node,event);
  }

  function moveCameraHistory(delta){const c=runtime.camera,current=cameraSnapshot(),last=c.history[c.history.length-1];if(delta<0&&c.historyIndex===c.history.length-1&&!sameCameraSnapshot(last,current)){c.history.push(current);if(c.history.length>20)c.history.shift();c.historyIndex=c.history.length-1;}const next=c.historyIndex+delta;if(next<0||next>=c.history.length){toast(delta<0?L("Não há vista anterior.","No earlier view."):L("Não há vista seguinte.","No later view."));return;}c.historyIndex=next;const snap=c.history[next];state.selectedId=snap.selectedId||state.selectedId;transitionCamera(snap,delta<0?L("Vista anterior restaurada.","Previous view restored."):L("Vista seguinte restaurada.","Next view restored."),false);renderInspector();renderNavigator();}
  function cameraHistoryBack(){moveCameraHistory(-1);}
  function cameraHistoryForward(){moveCameraHistory(1);}
  function cinematicView(){transitionCamera({pitch:.17,yaw:-.82},L("Vista cinematográfica baixa.","Low cinematic view."));if(state.activeActivity&&state.activeActivity.id==="rings"&&state.selectedId==="saturn")completeActivity("rings");}
  function stepTime(seconds){state.playing=false;state.dateMs+=seconds*state.direction*1000;updateTimeUI();}
  function completeOrbit(id){const body=D.getBody(id);if(!body||!Number.isFinite(body.periodDays))return;const candidate=state.dateMs+Math.abs(body.periodDays)*S.DAY_MS*state.direction;const check=S.validDateMs(candidate);state.playing=false;if(!check.ok){state.dateMs=state.direction<0?Date.UTC(1800,0,1):Date.UTC(2050,11,31,23,59,59);toast(L("A órbita alcançaria fora de 1800–2050; o relógio foi limitado à fronteira do modelo.","The orbit would leave 1800–2050; the clock was clamped to the model boundary."),"error",5000);}else{state.dateMs=candidate;toast(L(`Uma órbita sideral de ${bodyName(body)} foi adicionada ao relógio.`,`One sidereal orbit of ${bodyName(body)} was added to the clock.`),"success");}runtime.orbitCache.clear();runtime.overlayCache.clear();updateTimeUI();renderInspector();}
  function dismissWelcome(){state.onboardingDone=true;$("#welcome").hidden=true;safeSave();updateDiscovery();}

  function bindEvents(){
    runtime.canvas.addEventListener("pointerdown",pointerDown);runtime.canvas.addEventListener("pointermove",pointerMove);runtime.canvas.addEventListener("pointerup",pointerUp);runtime.canvas.addEventListener("pointercancel",pointerUp);runtime.canvas.addEventListener("wheel",wheel,{passive:false});runtime.canvas.addEventListener("contextmenu",showContext);
    runtime.canvas.addEventListener("dblclick",event=>{const rect=runtime.canvas.getBoundingClientRect();const hit=pickAt(event.clientX-rect.left,event.clientY-rect.top);if(hit)focusBody(hit.body.id);});
    document.addEventListener("click",event=>{const node=event.target.closest("[data-action]");if(node){if(node.dataset.action==="favorite-row")event.stopPropagation();handleAction(node.dataset.action,node,event);if(node.closest("#context-menu"))$("#context-menu").hidden=true;}if(!event.target.closest("#context-menu"))$("#context-menu").hidden=true;});
    document.addEventListener("change",handleControlChange);document.addEventListener("input",handleControlInput);
    $("#navigator-search").addEventListener("input",renderNavigator);$("#navigator-search").addEventListener("keydown",event=>{if(event.key==="Escape"){event.currentTarget.value="";renderNavigator();}if(event.key==="ArrowDown"){$("#object-list .object-row")?.focus();event.preventDefault();}});
    $("#command-input").addEventListener("input",()=>{runtime.commandIndex=0;renderCommandResults();});$("#command-input").addEventListener("keydown",event=>{if(event.key==="ArrowDown"){runtime.commandIndex=Math.min(runtime.commandItems.length-1,runtime.commandIndex+1);renderCommandResults();event.preventDefault();}else if(event.key==="ArrowUp"){runtime.commandIndex=Math.max(0,runtime.commandIndex-1);renderCommandResults();event.preventDefault();}else if(event.key==="Enter"){runtime.commandItems[runtime.commandIndex]?.run();event.preventDefault();}else if(event.key==="Escape")closeCommand();});
    $("#command-results").addEventListener("click",event=>{const node=event.target.closest("[data-command-index]");if(node)runtime.commandItems[Number(node.dataset.commandIndex)]?.run();});
    $$(".filter-pill").forEach(button=>button.addEventListener("click",()=>{$$(".filter-pill").forEach(x=>x.classList.toggle("active",x===button));renderNavigator();}));
    $$("[data-inspector-tab]").forEach(button=>button.addEventListener("click",()=>{state.inspectorTab=button.dataset.inspectorTab;renderInspector();}));
    $$(".mode-tab").forEach(button=>button.addEventListener("click",()=>{state.selectedSection=button.dataset.section;$$(".mode-tab").forEach(x=>x.classList.toggle("active",x===button));if(state.selectedSection==="explore")closeWorkspace();else setWorkspace(state.selectedSection); }));
    $("#speed-slider").addEventListener("input",event=>{state.speed=sliderToSpeed(event.target.value);state.previousSpeed=state.speed;updateTimeUI();});
    window.addEventListener("keydown",globalKeydown);window.addEventListener("resize",()=>{if(innerWidth<=760){state.navigatorOpen=false;state.inspectorOpen=false;}setPanels();resizeCanvas();});
    document.addEventListener("visibilitychange",()=>{runtime.lastFrame=performance.now();if(document.hidden){runtime.wasPlayingBeforeHidden=state.playing;state.playing=false;}else if(runtime.wasPlayingBeforeHidden){state.playing=true;runtime.wasPlayingBeforeHidden=false;}});
    document.addEventListener("focusin",event=>{if(event.target.closest(".workspace-panel")&&state.workspaceKind)runtime.lastFocusedInWorkspace=event.target;});
  }

  function isTypingTarget(target){return target&&(["INPUT","TEXTAREA","SELECT"].includes(target.tagName)||target.isContentEditable);}
  function globalKeydown(event){
    if(isTypingTarget(event.target)){if(event.key==="Escape"&&state.commandOpen)closeCommand();return;}
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k"){event.preventDefault();openCommand();return;}
    if(event.key==="Escape"){if(!$("#context-menu").hidden){$("#context-menu").hidden=true;return;}if(state.commandOpen){closeCommand();return;}if(state.photoMode){exitPhotoMode();return;}if(state.workspaceKind){closeWorkspace();return;}if(state.tour){exitTour();return;}return;}
    const key=event.key.toLowerCase();if(key===" "){event.preventDefault();togglePlay();}else if(key==="r")overview();else if(key==="o")toggleOrbits();else if(key==="l")toggleLabels();else if(key==="/"){event.preventDefault();openCommand();}else if(key==="f")focusBody(state.selectedId);else if(key==="c")setWorkspace("comparison");else if(key==="m")setWorkspace("measurement");else if(key==="p")enterPhotoMode();else if(key==="h"){state.uiHidden=!state.uiHidden;applyPreferences();}else if(key==="?")setWorkspace("help");
    else if(event.target===runtime.canvas&&["arrowleft","arrowright","arrowup","arrowdown","+","-"].includes(key)){event.preventDefault();if(key==="arrowleft")runtime.camera.yaw+=.08;if(key==="arrowright")runtime.camera.yaw-=.08;if(key==="arrowup")runtime.camera.pitch=S.clamp(runtime.camera.pitch+.06,-1.42,1.42);if(key==="arrowdown")runtime.camera.pitch=S.clamp(runtime.camera.pitch-.06,-1.42,1.42);if(key==="+")runtime.camera.distance*=.9;if(key==="-")runtime.camera.distance*=1.1;}
  }

  function handleControlInput(event){const node=event.target;if(!node.dataset.control)return;handleToolControl(node.dataset.control,node.value,node,event,true);}
  function handleControlChange(event){const node=event.target;if(!node.dataset.control)return;handleToolControl(node.dataset.control,node.type==="checkbox"?node.checked:node.value,node,event,false);}

  function saveViewpoint(){
    const title=`${bodyName(D.getBody(state.selectedId))} · ${new Date(state.dateMs).toISOString().slice(0,10)}`;state.collections.viewpoints.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),title,targetId:state.selectedId,camera:{target:{...runtime.camera.target},distance:runtime.camera.distance,yaw:runtime.camera.yaw,pitch:runtime.camera.pitch},scaleMode:state.scaleMode,dateMs:state.dateMs,restoreDate:true,labels:state.labels,orbits:state.orbitMode,overlays:Object.assign({},state.overlays),createdAt:new Date().toISOString()});safeSave();toast(L("Ponto de vista salvo localmente.","Viewpoint saved locally."),"success");
  }

  function calculateMeasurement(){const value=S.distanceBetween(state.measurement.a,state.measurement.b,state.dateMs,D);if(!value)return null;const physical=S.allPhysicalPositions(state.dateMs,D),observer=physical.get(state.measurement.observer),a=physical.get(state.measurement.a),b=physical.get(state.measurement.b);value.angularDeg=observer&&a&&b?S.angularSeparation(observer,a,b):NaN;value.observer=state.measurement.observer;return value;}
  function currentMeasurement(){if(state.measurement.live||!state.measurement.frozen)return calculateMeasurement();return state.measurement.frozen;}

  function init(){
    initProceduralData();initRenderer();applyTranslations();applyPreferences();renderNavigator();renderInspector();updateStatus();updateTimeUI();setPanels();bindEvents();
    if(!state.onboardingDone)$("#welcome").hidden=false;else updateDiscovery();
    state.effectiveQuality=state.quality==="auto"?"high":state.quality;runtime.physical=S.allPhysicalPositions(state.dateMs,D);runtime.positions=S.allDisplayPositions(state.dateMs,D,state.scaleMode,runtime.physical);
    requestAnimationFrame(frame);
  }

  function toolCard(kind,icon,title,description){return `<button class="tool-card" data-action="open-tool" data-tool="${kind}"><span class="tool-icon">${icon}</span><strong>${escapeHtml(title)}</strong><p>${escapeHtml(description)}</p></button>`;}

  function renderToolsDashboard(){return `<div class="tool-dashboard">
    ${toolCard("comparison","◐",L("Comparar mundos","Compare worlds"),L("Dois a quatro corpos, diâmetros lineares, razões e tabelas exportáveis.","Two to four bodies, linear diameters, ratios, and exportable tables."))}
    ${toolCard("measurement","↔",L("Medições e tempo-luz","Measurements and light-time"),L("Distância física, unidade astronômica e atraso da luz no instante do modelo.","Physical distance, astronomical units, and light delay at the modeled instant."))}
    ${toolCard("scale","⊙",L("Laboratório de escala","Scale laboratory"),L("Tamanhos relativos, distâncias e uma escala física combinada.","Relative sizes, distances, and one combined physical scale."))}
    ${toolCard("seasons","☼",L("Inclinação e estações","Tilt and seasons"),L("Altere inclinação, latitude e posição orbital em uma Terra hipotética.","Change tilt, latitude, and orbital position on a hypothetical Earth."))}
    ${toolCard("moon","◑",L("Fases e eclipses","Phases and eclipses"),L("Relacione a geometria externa à Lua vista da Terra.","Connect external geometry to the Moon as seen from Earth."))}
    ${toolCard("orbit","⌁",L("Gravidade e órbitas","Gravity and orbits"),L("Um sistema ideal de dois corpos, com massa, excentricidade e período.","An ideal two-body system with mass, eccentricity, and period."))}
    ${toolCard("outer","∞",L("Além de Netuno","Beyond Neptune"),L("Uma jornada em AU até o cinturão de Kuiper e a Nuvem de Oort.","An AU journey through the Kuiper Belt and toward the Oort Cloud."))}
    ${toolCard("missions","✦",L("História da exploração","Exploration history"),L("Missões selecionadas, datas distintas e rotas honestamente esquemáticas.","Curated missions, distinct dates, and honestly schematic routes."))}
    ${toolCard("photo","⌾",L("Modo Foto","Photo mode"),L("Componha e exporte o canvas procedural sem dependências remotas.","Compose and export the procedural canvas without remote dependencies."))}
  </div>`;}

  function renderLearnDashboard(){return `<div class="tool-dashboard">
    ${toolCard("tours","▷",L("Tours guiados","Guided tours"),L("Cinco jornadas completas, pausáveis e retomáveis no mesmo ponto.","Five complete journeys that pause and resume at the same stop."))}
    ${toolCard("activities","✓",L("Atividades","Activities"),L("Doze desafios conectados aos dados, à cena e aos laboratórios.","Twelve challenges connected to data, scene, and laboratories."))}
    ${toolCard("encyclopedia","Aa",L("Enciclopédia","Encyclopedia"),L("Conceitos em dois níveis, ligados a exemplos que realmente abrem.","Two-level concepts linked to examples that actually open."))}
    ${toolCard("collections","☆",L("Minha observação","My Observatory"),L("Favoritos, vistas, instantes, medições e diário mantidos localmente.","Favorites, views, instants, measurements, and journal kept locally."))}
    ${toolCard("missions","✦",L("Missões espaciais","Space missions"),L("Uma cronologia conectada aos mundos visitados.","A timeline connected to the worlds visited."))}
    ${toolCard("help","?",L("Como explorar","How to explore"),L("Gestos, teclado, acessibilidade e limites do modelo.","Gestures, keyboard, accessibility, and model limits."))}
  </div>`;}

  function bodyOptions(selected){return D.bodies.map(b=>`<option value="${b.id}" ${b.id===selected?"selected":""}>${escapeHtml(bodyName(b))} · ${escapeHtml(bodyType(b))}</option>`).join("");}

  function comparisonField(body,key){
    const locale=localeOf();if(key==="diameter")return body.radiusKm?`${S.formatDistance(body.radiusKm*2,locale)}`:"—";
    if(key==="mass")return body.massKg?`${S.formatScientific(body.massKg,locale)} kg`:"—";
    if(key==="gravity")return body.gravity!=null?`${S.formatNumber(body.gravity,locale,{maximumFractionDigits:3})} m/s²`:"—";
    if(key==="density")return body.density?`${S.formatNumber(body.density,locale,{maximumFractionDigits:3})} g/cm³`:"—";
    if(key==="rotation")return formatPeriod(body.rotationDays);
    if(key==="orbit")return body.parent?formatPeriod(body.periodDays):L("não aplicável","not applicable");
    if(key==="temperature")return body.temp?body.temp[state.lang]:"—";return "—";
  }

  function renderComparison(){
    state.comparison.ids=state.comparison.ids.filter(id=>D.getBody(id)).slice(0,4);while(state.comparison.ids.length<2)state.comparison.ids.push(state.comparison.ids.includes("earth")?"mars":"earth");
    const bodies=state.comparison.ids.map(D.getBody);const maxDiameter=Math.max(...bodies.map(b=>b.radiusKm*2));const ref=D.getBody(state.comparison.reference)||bodies[0];
    const fields=[["diameter",L("Diâmetro médio","Mean diameter")],["mass",L("Massa","Mass")],["gravity",L("Gravidade ref.","Reference gravity")],["density",L("Densidade média","Mean density")],["rotation",L("Rotação sideral","Sidereal rotation")],["orbit",L("Período orbital","Orbital period")],["temperature",L("Temperatura contextual","Temperature context")]];
    return `<div class="tool-stage no-frame">
      <p class="tool-lead">${escapeHtml(L("Os discos usam uma escala linear comum de diâmetro. Um marcador preserva o acesso quando a proporção real fica subpixel.","Disks share one linear diameter scale. A locator preserves access when the true proportion becomes subpixel."))}</p>
      <div class="compare-picker">${bodies.map((b,i)=>`<div class="compare-slot"><label class="field-label" for="compare-${i}">${escapeHtml(L(`Mundo ${i+1}`,`World ${i+1}`))}</label><select id="compare-${i}" class="select" data-control="compare-body" data-index="${i}">${bodyOptions(b.id)}</select><div class="compare-slot-actions"><button data-action="move-compare" data-index="${i}" data-direction="-1" aria-label="${escapeHtml(L("Mover para esquerda","Move left"))}">←</button><button data-action="remove-compare" data-index="${i}" ${bodies.length<=2?"disabled":""}>${escapeHtml(L("Remover","Remove"))}</button><button data-action="move-compare" data-index="${i}" data-direction="1" aria-label="${escapeHtml(L("Mover para direita","Move right"))}">→</button></div></div>`).join("")}${bodies.length<4?`<button class="compare-slot button ghost" data-action="add-compare">＋ ${escapeHtml(L("Adicionar mundo","Add world"))}</button>`:""}</div>
      <div class="inline-fields" style="max-width:520px;margin-bottom:12px"><div class="form-group"><label>${escapeHtml(L("Corpo de referência","Reference body"))}</label><select class="select" data-control="compare-reference">${bodies.map(b=>`<option value="${b.id}" ${b.id===ref.id?"selected":""}>${escapeHtml(bodyName(b))}</option>`).join("")}</select></div><label class="toggle-row"><span><strong>${escapeHtml(L("Rotação sincronizada","Synchronized rotation"))}</strong><small>${escapeHtml(L("Apenas apresentação; não altera períodos científicos.","Presentation only; scientific periods stay unchanged."))}</small></span><input class="switch" type="checkbox" data-control="compare-sync" ${state.comparison.synchronized?"checked":""}></label></div>
      <div class="compare-visual">${bodies.map(b=>{const raw=b.radiusKm*2/maxDiameter*150;const size=Math.max(2,raw);return `<div class="compare-body"><div class="compare-disc ${raw<3?"locator":""}" style="--size:${size}px;--body-color:${b.color}" title="${escapeHtml(S.formatDistance(b.radiusKm*2,localeOf()))}"></div><strong>${escapeHtml(bodyName(b))}</strong><small>${escapeHtml(`${S.formatNumber((b.radiusKm/ref.radiusKm),localeOf(),{maximumFractionDigits:3})}× ${bodyName(ref)}`)}</small></div>`;}).join("")}</div>
      <div class="data-table-wrap"><table class="data-table"><thead><tr><th>${escapeHtml(L("Grandeza","Quantity"))}</th>${bodies.map(b=>`<th>${escapeHtml(bodyName(b))}</th>`).join("")}</tr></thead><tbody>${fields.map(([key,label])=>`<tr><td>${escapeHtml(label)}</td>${bodies.map(b=>`<td>${escapeHtml(comparisonField(b,key))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
      <div class="tool-actions"><button class="button primary" data-action="export-comparison-svg">${escapeHtml(L("Exportar imagem SVG","Export SVG image"))}</button><button class="button secondary" data-action="export-comparison-csv">${escapeHtml(L("Exportar tabela CSV","Export CSV table"))}</button><button class="button ghost" data-action="comparison-preset" data-preset="earth-mars">Terra × Marte</button><button class="button ghost" data-action="comparison-preset" data-preset="earth-moon">Terra × Lua</button><button class="button ghost" data-action="comparison-preset" data-preset="jupiter-saturn">Júpiter × Saturno</button></div>
    </div>`;
  }

  function measurementValues(){const value=currentMeasurement();if(!value)return null;return value;}
  function renderMeasurement(){const value=measurementValues();return `<div class="tool-layout"><aside class="tool-sidebar">
    <div class="form-group"><label>${escapeHtml(L("Ponto A","Endpoint A"))}</label><select class="select" data-control="measure-a">${bodyOptions(state.measurement.a)}</select></div>
    <div class="form-group"><label>${escapeHtml(L("Ponto B","Endpoint B"))}</label><select class="select" data-control="measure-b">${bodyOptions(state.measurement.b)}</select></div>
    <div class="form-group"><label>${escapeHtml(L("Observador angular","Angular observer"))}</label><select class="select" data-control="measure-observer">${bodyOptions(state.measurement.observer)}</select><small>${escapeHtml(L("Define o vértice da separação angular; não altera a distância A–B.","Defines the vertex of angular separation; it does not change A–B distance."))}</small></div>
    <button class="button secondary" style="width:100%" data-action="swap-measure">⇄ ${escapeHtml(L("Trocar pontos","Swap endpoints"))}</button>
    <label class="toggle-row"><span><strong>${escapeHtml(L("Medição ao vivo","Live measurement"))}</strong><small>${escapeHtml(L("Atualiza com o relógio do modelo.","Updates with the model clock."))}</small></span><input class="switch" type="checkbox" data-control="measure-live" ${state.measurement.live?"checked":""}></label>
    <label class="toggle-row"><span><strong>${escapeHtml(L("Pulso de luz","Light pulse"))}</strong><small>${escapeHtml(L("Animação acelerada sobre distância instantânea.","Accelerated animation over instantaneous distance."))}</small></span><input class="switch" type="checkbox" data-control="measure-pulse" ${state.measurement.pulse?"checked":""}></label>
    <div class="tool-actions"><button class="button primary" data-action="freeze-measure">${escapeHtml(state.measurement.live?L("Congelar instante","Freeze instant"):L("Atualizar congelada","Refresh frozen"))}</button><button class="button ghost" data-action="pin-measure">${escapeHtml(state.measurement.pinned?L("Desafixar da cena","Unpin from scene"):L("Fixar na cena","Pin to scene"))}</button></div>
  </aside><section class="tool-stage"><h3 class="tool-heading">${escapeHtml(`${bodyName(D.getBody(state.measurement.a))} ↔ ${bodyName(D.getBody(state.measurement.b))}`)}</h3><p class="tool-lead">${escapeHtml(L("Distância centro a centro nas coordenadas físicas do instante indicado. A linha visível cruza espaço comprimido e não determina o número.","Center-to-center distance in physical coordinates at the stated instant. The visible line crosses compressed space and does not determine the number."))}</p>
    <div id="measurement-readout">${measurementReadoutHtml(value)}</div>
    <div class="tool-note accent">${escapeHtml(L("Tempo-luz é de ida, no vácuo, usando c = 299.792,458 km/s. Não resolve um receptor em movimento.","Light-time is one-way in vacuum using c = 299,792.458 km/s. It does not solve for a moving receiver."))}</div>
    <div class="tool-actions"><button class="button primary" data-action="save-measurement">${escapeHtml(L("Salvar no histórico","Save to history"))}</button><button class="button secondary" data-action="export-measurements">${escapeHtml(L("Exportar CSV","Export CSV"))}</button><button class="button ghost" data-action="focus-measure-a">${escapeHtml(L("Focar ponto A","Focus endpoint A"))}</button><button class="button ghost" data-action="focus-measure-b">${escapeHtml(L("Focar ponto B","Focus endpoint B"))}</button></div>
    ${renderMeasurementHistory()}
  </section></div>`;}

  function measurementReadoutHtml(value){if(!value)return `<div class="empty-state">${escapeHtml(L("Medição indisponível.","Measurement unavailable."))}</div>`;const observer=bodyName(D.getBody(value.observer||state.measurement.observer));return `<div class="measure-readout"><div class="measure-value"><small>${escapeHtml(L("Quilômetros","Kilometers"))}</small><strong>${escapeHtml(S.formatDistance(value.km,localeOf()))}</strong></div><div class="measure-value"><small>${escapeHtml(L("Unidades astronômicas","Astronomical units"))}</small><strong>${escapeHtml(`${S.formatNumber(value.au,localeOf(),{maximumFractionDigits:6})} AU`)}</strong></div><div class="measure-value"><small>${escapeHtml(L("Tempo-luz de ida","One-way light-time"))}</small><strong>${escapeHtml(S.formatDuration(value.lightSeconds,localeOf()))}</strong></div><div class="measure-value"><small>${escapeHtml(`${L("Separação vista de","Separation seen from")} ${observer}`)}</small><strong>${escapeHtml(Number.isFinite(value.angularDeg)?`${S.formatNumber(value.angularDeg,localeOf(),{maximumFractionDigits:4})}°`:"—")}</strong></div></div><p style="color:var(--muted);font: .63rem ui-monospace,Consolas,monospace">${escapeHtml(new Date(value.dateMs).toISOString().replace(".000",""))} · ${state.measurement.live?L("ao vivo","live"):L("congelada","frozen")}</p>`;}
  function updateMeasurementReadout(){const node=$("#measurement-readout");if(node)node.innerHTML=measurementReadoutHtml(measurementValues());}
  function renderMeasurementHistory(){const items=state.collections.measurements.slice(-5).reverse();if(!items.length)return `<div class="tool-note">${escapeHtml(L("Nenhuma medição salva nesta coleção local.","No measurements saved in this local collection."))}</div>`;return `<div class="data-table-wrap"><table class="data-table"><thead><tr><th>${escapeHtml(L("Medição","Measurement"))}</th><th>km</th><th>AU</th><th>°</th><th>UTC</th></tr></thead><tbody>${items.map(m=>`<tr><td>${escapeHtml(`${bodyName(D.getBody(m.a))}–${bodyName(D.getBody(m.b))}`)}</td><td>${escapeHtml(S.formatNumber(m.km,localeOf(),{maximumFractionDigits:0}))}</td><td>${escapeHtml(S.formatNumber(m.au,localeOf(),{maximumFractionDigits:6}))}</td><td>${escapeHtml(Number.isFinite(m.angularDeg)?S.formatNumber(m.angularDeg,localeOf(),{maximumFractionDigits:3}):"—")}</td><td>${escapeHtml(new Date(m.dateMs).toISOString().slice(0,10))}</td></tr>`).join("")}</tbody></table></div>`;}

  function scaleBodySet(){return state.scaleLab.ids.map(D.getBody).filter(Boolean);}
  function renderScaleLab(){const bodies=scaleBodySet();const view=state.scaleLab.view;const axis=state.scaleLab.axis;let visual="";
    if(view==="sizes"){
      const max=Math.max(...bodies.map(b=>b.radiusKm));visual=`<div class="size-lineup">${bodies.map(b=>{const raw=b.radiusKm/max*150;return `<div class="compare-body"><div class="compare-disc ${raw<3?"locator":""}" style="--size:${Math.max(2,raw)}px;--body-color:${b.color}"></div><strong>${escapeHtml(bodyName(b))}</strong><small>${escapeHtml(S.formatDistance(b.radiusKm*2,localeOf()))}</small></div>`;}).join("")}</div><p class="tool-note accent">${escapeHtml(L("Uma única escala linear de diâmetro. A barra inferior representa o mesmo fator para todos os corpos.","One linear diameter scale. The baseline uses the same factor for every body."))}</p>`;
    }else if(view==="distances"){
      const heliocentric=bodies.filter(b=>b.aAu);const values=heliocentric.map(b=>b.aAu);const min=Math.min(...values,.01),max=Math.max(...values,1);const pos=v=>axis==="log"?(Math.log10(v)-Math.log10(min))/(Math.log10(max)-Math.log10(min))*92+4:(v/max)*92+4;visual=`<div class="distance-axis">${heliocentric.map(b=>`<div class="distance-mark" style="left:${pos(b.aAu)}%;--body-color:${b.color}"><i></i><strong>${escapeHtml(bodyName(b))}</strong><small>${escapeHtml(`${S.formatNumber(b.aAu,localeOf(),{maximumFractionDigits:3})} AU`)}</small></div>`).join("")}</div><p class="tool-note ${axis==="log"?"":"accent"}">${escapeHtml(axis==="log"?L("Eixo logarítmico: espaçamentos iguais representam fatores, não quilômetros iguais.","Logarithmic axis: equal spacing represents factors, not equal kilometers."):L("Eixo linear: posições proporcionais ao semieixo maior em AU.","Linear axis: positions are proportional to semi-major axis in AU."))}</p>`;
    }else{
      const earthSizeKm=6371.0084*2;const earthCm=state.scaleLab.earthSizeCm;const scaleRatio=(earthCm/100)/ (earthSizeKm*1000);const sunEarthM=1* S.AU_KM*1000*scaleRatio;const moonM=384400*1000*scaleRatio;visual=`<div class="true-scale-message"><span class="eyebrow">1:${escapeHtml(S.formatScientific(1/scaleRatio,localeOf(),2))}</span><h3>${escapeHtml(L("A Terra é um ponto no vazio","Earth is a dot in the void"))}</h3><p class="tool-lead">${escapeHtml(L(`Com a Terra medindo ${S.formatNumber(earthCm,localeOf())} cm, a Lua estaria a ${S.formatNumber(moonM,localeOf(),{maximumFractionDigits:2})} m e o Sol a ${S.formatNumber(sunEarthM/1000,localeOf(),{maximumFractionDigits:2})} km.`,`With Earth measuring ${S.formatNumber(earthCm,localeOf())} cm, the Moon would be ${S.formatNumber(moonM,localeOf(),{maximumFractionDigits:2})} m away and the Sun ${S.formatNumber(sunEarthM/1000,localeOf(),{maximumFractionDigits:2})} km away.`))}</p><div class="locator-line"></div><small>${escapeHtml(L("Os marcadores são localizadores; os discos verdadeiros seriam difíceis de ver nesta largura.","Markers are locators; true disks would be hard to see at this width."))}</small></div>`;
    }
    return `<div class="tool-layout"><aside class="tool-sidebar"><div class="segmented">${[["sizes",L("Tamanhos","Sizes")],["distances",L("Distâncias","Distances")],["combined",L("Escala real","True scale")]].map(([id,label])=>`<button data-action="scale-view" data-view="${id}" class="${view===id?"active":""}">${escapeHtml(label)}</button>`).join("")}</div>
      ${view==="distances"?`<div class="form-group" style="margin-top:14px"><label>${escapeHtml(L("Tipo de eixo","Axis type"))}</label><div class="segmented"><button data-action="scale-axis" data-axis="linear" class="${axis==="linear"?"active":""}">${escapeHtml(L("Linear","Linear"))}</button><button data-action="scale-axis" data-axis="log" class="${axis==="log"?"active":""}">${escapeHtml(L("Logarítmico","Logarithmic"))}</button></div></div>`:""}
      ${view==="combined"?`<div class="form-group" style="margin-top:14px"><label>${escapeHtml(L("Se a Terra tivesse este diâmetro","If Earth had this diameter"))}: <strong>${S.formatNumber(state.scaleLab.earthSizeCm,localeOf(),{maximumFractionDigits:1})} cm</strong></label><input class="input" type="range" min="0.2" max="10" step="0.1" value="${state.scaleLab.earthSizeCm}" data-control="earth-size"></div>`:""}
      <div class="form-group" style="margin-top:14px"><label>${escapeHtml(L("Conjunto comparado","Compared set"))}</label><select class="select" data-control="scale-preset"><option value="custom">${escapeHtml(L("Seleção atual","Current selection"))}</option><option value="inner">${escapeHtml(L("Planetas interiores","Inner planets"))}</option><option value="giants">${escapeHtml(L("Planetas gigantes","Giant planets"))}</option><option value="earth-moon">${escapeHtml(L("Terra e Lua","Earth and Moon"))}</option><option value="all-planets">${escapeHtml(L("Oito planetas","Eight planets"))}</option></select></div>
      <div class="tool-actions">${view==="combined"?`<button class="button primary" data-action="check-activity" data-check="combined-scale">${escapeHtml(L("Verificar descoberta do vazio","Check the emptiness discovery"))}</button>`:""}<button class="button secondary" data-action="reset-scale-lab">${escapeHtml(L("Redefinir laboratório","Reset laboratory"))}</button><button class="button ghost" data-action="apply-main-scale">${escapeHtml(L("Alternar escala da cena","Toggle scene scale"))}</button></div>
    </aside><section class="tool-stage"><h3 class="tool-heading">${escapeHtml(view==="sizes"?L("Diâmetros no mesmo fator","Diameters at one factor"):view==="distances"?L("Posições em uma régua comum","Positions on one ruler"):L("Tamanhos e distâncias juntos","Sizes and distances together"))}</h3><div class="scale-stage">${visual}</div>${scaleTableHtml(bodies,view)}</section></div>`;
  }
  function scaleTableHtml(bodies,view){const earth=D.getBody("earth");return `<div class="data-table-wrap"><table class="data-table"><thead><tr><th>${escapeHtml(L("Corpo","Body"))}</th><th>${escapeHtml(L("Diâmetro","Diameter"))}</th><th>${escapeHtml(L("× Terra","× Earth"))}</th><th>${escapeHtml(L("Semieixo maior","Semi-major axis"))}</th></tr></thead><tbody>${bodies.map(b=>`<tr><td>${escapeHtml(bodyName(b))}</td><td>${escapeHtml(S.formatDistance(b.radiusKm*2,localeOf()))}</td><td>${escapeHtml(S.formatNumber(b.radiusKm/earth.radiusKm,localeOf(),{maximumFractionDigits:4}))}</td><td>${escapeHtml(b.aAu?`${S.formatNumber(b.aAu,localeOf(),{maximumFractionDigits:4})} AU`:b.distanceKm?S.formatDistance(b.distanceKm,localeOf()):"—")}</td></tr>`).join("")}</tbody></table></div>`;}

  function renderSeasonsLab(){const v=state.seasonsLab;const daylight=S.daylightHours(v.tilt,v.latitude,v.longitude);const sunX=85,planetX=365,planetY=180;const axis=S.degToRad(v.tilt);const topX=planetX+Math.sin(axis)*70,topY=planetY-Math.cos(axis)*70;const bottomX=planetX-Math.sin(axis)*70,bottomY=planetY+Math.cos(axis)*70;const stateLabel=daylight.state==="polar-day"?L("dia polar","polar day"):daylight.state==="polar-night"?L("noite polar","polar night"):L("ciclo normal","normal cycle");return `<div class="tool-layout"><aside class="tool-sidebar">
    <div class="tool-note">${escapeHtml(L("Experimento hipotético isolado. Alterar estes valores não modifica a Terra canônica.","Isolated hypothetical experiment. Changing these values does not modify canonical Earth."))}</div>
    <div class="form-group"><label>${escapeHtml(L("Inclinação axial","Axial tilt"))}: <strong>${S.formatNumber(v.tilt,localeOf(),{maximumFractionDigits:1})}°</strong></label><input type="range" class="input" min="0" max="90" step="0.5" value="${v.tilt}" data-control="season-tilt"></div>
    <div class="form-group"><label>${escapeHtml(L("Latitude","Latitude"))}: <strong>${S.formatNumber(v.latitude,localeOf(),{maximumFractionDigits:0})}°</strong></label><input type="range" class="input" min="-90" max="90" step="1" value="${v.latitude}" data-control="season-lat"></div>
    <div class="form-group"><label>${escapeHtml(L("Posição orbital didática","Educational orbital position"))}: <strong>${S.formatNumber(v.longitude,localeOf(),{maximumFractionDigits:0})}°</strong></label><input type="range" class="input" min="0" max="360" step="1" value="${v.longitude}" data-control="season-lon"></div>
    <div class="tool-actions"><button class="button secondary" data-action="season-preset" data-value="0">${escapeHtml(L("Equinócio","Equinox"))}</button><button class="button secondary" data-action="season-preset" data-value="90">${escapeHtml(L("Solstício norte","North solstice"))}</button><button class="button ghost" data-action="season-zero">0°</button><button class="button ghost" data-action="reset-seasons">${escapeHtml(L("Terra base","Baseline Earth"))}</button></div>
  </aside><section class="tool-stage"><div class="lab-visual"><svg viewBox="0 0 500 360" role="img" aria-label="${escapeHtml(L("Diagrama de iluminação sazonal","Seasonal illumination diagram"))}"><defs><linearGradient id="earthday"><stop offset="0" stop-color="#77c2ec"/><stop offset=".5" stop-color="#356f9d"/><stop offset=".51" stop-color="#07111f"/><stop offset="1" stop-color="#02050b"/></linearGradient></defs><circle class="sun-fill" cx="85" cy="180" r="38"/><g stroke="rgba(255,210,110,.28)">${[-55,-30,0,30,55].map(d=>`<line x1="130" y1="${180+d}" x2="315" y2="${180+d}"/>`).join("")}</g><circle cx="${planetX}" cy="${planetY}" r="64" fill="url(#earthday)"/><ellipse class="guide" cx="${planetX}" cy="${planetY}" rx="64" ry="20"/><line class="accent-line" x1="${bottomX}" y1="${bottomY}" x2="${topX}" y2="${topY}"/><circle cx="${planetX}" cy="${planetY-S.clamp(v.latitude,-80,80)/90*52}" r="4" fill="#ffd779"/><text x="35" y="242">${escapeHtml(L("Sol","Sun"))}</text><text x="330" y="275">${escapeHtml(L("latitude escolhida","selected latitude"))}</text><text x="310" y="43">${escapeHtml(L("eixo de rotação","spin axis"))}</text></svg></div>
    <div class="lab-metrics"><div class="measure-value"><small>${escapeHtml(L("Declinação solar","Solar declination"))}</small><strong>${S.formatNumber(daylight.declinationDeg,localeOf(),{maximumFractionDigits:1})}°</strong></div><div class="measure-value"><small>${escapeHtml(L("Luz do dia idealizada","Idealized daylight"))}</small><strong>${S.formatNumber(daylight.hours,localeOf(),{maximumFractionDigits:1})} h</strong></div><div class="measure-value"><small>${escapeHtml(L("Regime","Regime"))}</small><strong>${escapeHtml(stateLabel)}</strong></div></div>
    <div class="tool-note accent">${escapeHtml(L("Cálculo geométrico simples, sem refração, horizonte, relevo ou disco solar. Hemisférios norte e sul respondem em sentidos opostos.","Simple geometric calculation without refraction, horizon, terrain, or solar-disk effects. Northern and southern hemispheres respond oppositely."))}</div>
    <button class="button primary" data-action="check-activity" data-check="tilt-zero">${escapeHtml(L("Verificar descoberta: inclinação zero","Check discovery: zero tilt"))}</button>
  </section></div>`;}

  function phaseName(key){const names={new:["Lua nova","New Moon"],"waxing-crescent":["Crescente","Waxing crescent"],"first-quarter":["Quarto crescente","First quarter"],"waxing-gibbous":["Gibosa crescente","Waxing gibbous"],full:["Lua cheia","Full Moon"],"waning-gibbous":["Gibosa minguante","Waning gibbous"],"last-quarter":["Quarto minguante","Last quarter"],"waning-crescent":["Minguante","Waning crescent"]};return names[key][state.lang==="pt"?0:1];}
  function renderMoonLab(){const v=state.moonLab,phase=S.lunarPhase(v.phase);const a=S.degToRad(v.phase),mx=250+Math.cos(a)*125,my=180+Math.sin(a)*80*(v.inclination?Math.cos(S.degToRad(5)):1);const lit=Math.round(phase.illuminatedFraction*100);const shadow=v.eclipse!=="none";const progression=phase.key==="new"||phase.key==="full"?L("ponto de virada","turning point"):(phase.waxing?L("crescente","waxing"):L("minguante","waning"));return `<div class="tool-layout"><aside class="tool-sidebar">
    <div class="form-group"><label>${escapeHtml(L("Posição no ciclo","Cycle position"))}: <strong>${S.formatNumber(v.phase,localeOf(),{maximumFractionDigits:0})}°</strong></label><input class="input" type="range" min="0" max="359" step="1" value="${v.phase}" data-control="moon-phase"></div>
    <label class="toggle-row"><span><strong>${escapeHtml(L("Inclinação orbital de 5°","5° orbital inclination"))}</strong><small>${escapeHtml(L("Evita eclipses mensais automáticos.","Prevents automatic monthly eclipses."))}</small></span><input class="switch" type="checkbox" data-control="moon-inclination" ${v.inclination?"checked":""}></label>
    <div class="form-group" style="margin-top:14px"><label>${escapeHtml(L("Configuração esquemática","Schematic configuration"))}</label><div class="segmented"><button data-action="eclipse-preset" data-value="none" class="${v.eclipse==="none"?"active":""}">${escapeHtml(L("Fase","Phase"))}</button><button data-action="eclipse-preset" data-value="solar" class="${v.eclipse==="solar"?"active":""}">${escapeHtml(L("Solar","Solar"))}</button><button data-action="eclipse-preset" data-value="lunar" class="${v.eclipse==="lunar"?"active":""}">${escapeHtml(L("Lunar","Lunar"))}</button></div></div>
    <div class="tool-actions"><button class="button ghost" data-action="moon-step" data-step="45">+45°</button><button class="button secondary" data-action="reset-moon-lab">${escapeHtml(L("Redefinir","Reset"))}</button></div>
  </aside><section class="tool-stage"><div class="lab-visual"><svg viewBox="0 0 500 360" role="img" aria-label="${escapeHtml(L("Geometria Sol Terra Lua","Sun Earth Moon geometry"))}"><defs><radialGradient id="moonSeen" cx="${phase.waxing?100-lit:lit}%"><stop offset="0" stop-color="#e3e5e2"/><stop offset="${Math.max(1,lit)}%" stop-color="#8c8d8a"/><stop offset="${Math.min(99,lit+1)}%" stop-color="#080b10"/></radialGradient></defs><circle class="sun-fill" cx="65" cy="180" r="34"/><line x1="105" y1="180" x2="430" y2="180" stroke="rgba(255,210,110,.18)"/><circle class="earth-fill" cx="250" cy="180" r="35"/><ellipse class="guide" cx="250" cy="180" rx="125" ry="${v.inclination?80:26}"/><circle class="moon-fill" cx="${mx}" cy="${my}" r="13"/>${shadow?`<path d="M ${v.eclipse==="lunar"?285:78} 166 L ${v.eclipse==="lunar"?430:215} 178 L ${v.eclipse==="lunar"?285:78} 194 Z" fill="rgba(8,12,19,.72)"/><text x="350" y="225">umbra</text>`:""}<circle cx="414" cy="102" r="45" fill="url(#moonSeen)"/><text x="355" y="167">${escapeHtml(L("vista da Terra","view from Earth"))}</text><text x="29" y="235">${escapeHtml(L("Sol","Sun"))}</text><text x="228" y="232">${escapeHtml(L("Terra","Earth"))}</text></svg></div>
    <div class="lab-metrics"><div class="measure-value"><small>${escapeHtml(L("Fase","Phase"))}</small><strong>${escapeHtml(phaseName(phase.key))}</strong></div><div class="measure-value"><small>${escapeHtml(L("Fração iluminada","Illuminated fraction"))}</small><strong>${lit}%</strong></div><div class="measure-value"><small>${escapeHtml(L("Movimento aparente","Apparent progression"))}</small><strong>${escapeHtml(progression)}</strong></div></div>
    <div class="tool-note accent">${escapeHtml(L("As fases vêm da porção iluminada vista da Terra. Eclipses são alinhamentos distintos; o diagrama de sombra é esquemático, não um serviço de previsão.","Phases come from the lit portion seen from Earth. Eclipses are distinct alignments; the shadow diagram is schematic, not a prediction service."))}</div>
  </section></div>`;}

  function orbitLabResult(){return S.orbitSandbox(state.orbitLab.massEarths*D.getBody("earth").massKg,state.orbitLab.semiMajorKm,state.orbitLab.eccentricity);}
  function renderOrbitLab(){const v=state.orbitLab,r=orbitLabResult();const rx=155,ry=rx*Math.sqrt(1-v.eccentricity*v.eccentricity),focus=v.eccentricity*rx,cx=250-focus,cy=180;const angle=v.phase;const ox=cx+Math.cos(angle)*rx,oy=cy+Math.sin(angle)*ry;const gravity=9.8*v.massEarths;const weight=S.weightNewton(v.testMass,gravity);return `<div class="tool-layout"><aside class="tool-sidebar">
    <div class="tool-note">${escapeHtml(L("Modelo hipotético de dois corpos, elíptico e ligado: 0 ≤ e < 0,9. Forma, rotação, atmosfera e outros corpos são omitidos.","Hypothetical bound two-body elliptical model: 0 ≤ e < 0.9. Shape, spin, atmosphere, and other bodies are omitted."))}</div>
    <div class="form-group"><label>${escapeHtml(L("Massa central","Central mass"))}: <strong>${S.formatNumber(v.massEarths,localeOf(),{maximumFractionDigits:2})} M⊕</strong></label><input class="input" type="range" min="0.1" max="10" step="0.1" value="${v.massEarths}" data-control="orbit-mass"></div>
    <div class="form-group"><label>${escapeHtml(L("Semieixo maior","Semi-major axis"))}: <strong>${S.formatNumber(v.semiMajorKm,localeOf(),{maximumFractionDigits:0})} km</strong></label><input class="input" type="range" min="10000" max="300000" step="1000" value="${v.semiMajorKm}" data-control="orbit-a"></div>
    <div class="form-group"><label>${escapeHtml(L("Excentricidade","Eccentricity"))}: <strong>${S.formatNumber(v.eccentricity,localeOf(),{maximumFractionDigits:2})}</strong></label><input class="input" type="range" min="0" max="0.89" step="0.01" value="${v.eccentricity}" data-control="orbit-e"></div>
    <div class="form-group"><label>${escapeHtml(L("Massa do objeto para peso","Object mass for weight"))}</label><input class="input" type="number" min="0" max="10000" step="1" value="${v.testMass}" data-control="test-mass"><small>${escapeHtml(L("Massa do teste não altera sua aceleração orbital.","Test mass does not alter its orbital acceleration."))}</small></div>
    <div class="tool-actions"><button class="button primary" data-action="orbit-run">${escapeHtml(v.running?L("Pausar","Pause"):L("Executar","Run"))}</button><button class="button secondary" data-action="reset-orbit">${escapeHtml(L("Redefinir","Reset"))}</button><button class="button ghost" data-action="orbit-preset" data-value="circle">${escapeHtml(L("Circular","Circular"))}</button><button class="button ghost" data-action="orbit-preset" data-value="ellipse">${escapeHtml(L("Elíptica","Elliptical"))}</button></div>
  </aside><section class="tool-stage"><div class="lab-visual"><svg viewBox="0 0 500 360" role="img" aria-label="${escapeHtml(L("Órbita elíptica idealizada","Idealized elliptical orbit"))}"><ellipse class="guide" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/><path d="M 250 180 L ${ox} ${oy} A ${rx} ${ry} 0 0 0 ${cx+Math.cos(angle-.55)*rx} ${cy+Math.sin(angle-.55)*ry} Z" fill="rgba(89,215,247,.08)" stroke="rgba(89,215,247,.35)"/><circle class="earth-fill" cx="250" cy="180" r="24"/><circle cx="${ox}" cy="${oy}" r="8" fill="#e7e3cb"/><text x="220" y="220">${escapeHtml(L("massa central","central mass"))}</text><text x="${Math.min(430,ox+12)}" y="${Math.max(24,oy-10)}">${escapeHtml(L("objeto teste","test object"))}</text></svg></div>
    <div id="orbit-readout" class="lab-metrics"><div class="measure-value"><small>${escapeHtml(L("Período","Period"))}</small><strong>${escapeHtml(r.ok?S.formatDuration(r.periodSeconds,localeOf()):"—")}</strong></div><div class="measure-value"><small>${escapeHtml(L("Periastro / apoastro","Periapsis / apoapsis"))}</small><strong>${escapeHtml(r.ok?`${S.formatNumber(r.periapsisKm,localeOf(),{maximumFractionDigits:0})} / ${S.formatNumber(r.apoapsisKm,localeOf(),{maximumFractionDigits:0})} km`:"—")}</strong></div><div class="measure-value"><small>${escapeHtml(L("Peso de teste","Test weight"))}</small><strong>${escapeHtml(`${S.formatNumber(weight,localeOf(),{maximumFractionDigits:2})} N`)}</strong></div></div>
    <div class="tool-note accent">${escapeHtml(r.ok?L(`Velocidade aproximada: ${S.formatNumber(r.periapsisSpeedKmS,localeOf(),{maximumFractionDigits:2})} km/s no periastro e ${S.formatNumber(r.apoapsisSpeedKmS,localeOf(),{maximumFractionDigits:2})} km/s no apoastro. Áreas iguais correspondem a tempos iguais.`,`Approximate speed: ${S.formatNumber(r.periapsisSpeedKmS,localeOf(),{maximumFractionDigits:2})} km/s at periapsis and ${S.formatNumber(r.apoapsisSpeedKmS,localeOf(),{maximumFractionDigits:2})} km/s at apoapsis. Equal areas correspond to equal times.`):L("Parâmetros inválidos.","Invalid parameters."))}</div>
    <div class="tool-actions"><button class="button secondary" data-action="save-experiment">${escapeHtml(L("Salvar predefinição hipotética","Save hypothetical preset"))}</button><button class="button primary" data-action="check-activity" data-check="earth-weight">${escapeHtml(L("Verificar peso terrestre de 10 kg","Check 10 kg Earth weight"))}</button></div>
  </section></div>`;}
  function updateOrbitAnimation(dt){if(!state.orbitLab.running)return;state.orbitLab.phase=S.mod(state.orbitLab.phase+dt*1.3,Math.PI*2);renderWorkspace();}

  function renderOuterSystem(){const milestones=[
    {au:0,label:{pt:"Sol",en:"Sun"},body:"sun",text:{pt:"Origem heliocêntrica.",en:"Heliocentric origin."}},
    {au:1,label:{pt:"Terra",en:"Earth"},body:"earth",text:{pt:"1 AU = 149.597.870,7 km.",en:"1 AU = 149,597,870.7 km."}},
    {au:30,label:{pt:"Netuno",en:"Neptune"},body:"neptune",text:{pt:"Último dos oito planetas.",en:"Outermost of the eight planets."}},
    {au:50,label:{pt:"Cinturão de Kuiper",en:"Kuiper Belt"},body:"pluto",text:{pt:"Região esquemática de muitos corpos gelados.",en:"Schematic region of many icy bodies."}},
    {au:120,label:{pt:"Heliopausa aproximada",en:"Approximate heliopause"},body:null,text:{pt:"Uma fronteira do vento solar, não da gravidade solar.",en:"A solar-wind boundary, not the end of solar gravity."}},
    {au:5000,label:{pt:"Nuvem de Oort interior",en:"Inner Oort Cloud"},body:null,text:{pt:"Região conceitual inferida por modelos e cometas.",en:"Conceptual region inferred from models and comets."}},
    {au:100000,label:{pt:"Nuvem de Oort exterior",en:"Outer Oort Cloud"},body:null,text:{pt:"Cerca de 1,6 ano-luz na descrição de referência da NASA.",en:"About 1.6 light-years in NASA's reference description."}}
  ];const idx=S.clamp(state.outerStep,0,milestones.length-1),m=milestones[idx];const light=S.formatDuration(m.au*S.AU_KM/S.C_KM_S,localeOf());return `<div class="tool-stage no-frame" style="max-width:1000px;margin:auto"><div class="tool-note">${escapeHtml(L("Não existe uma única esfera que seja “a borda”. Planetas, heliosfera e influência gravitacional descrevem limites diferentes.","There is no single sphere that is “the edge.” Planets, heliosphere, and gravitational influence describe different boundaries."))}</div><div class="scale-stage" style="min-height:380px"><div class="true-scale-message"><span class="eyebrow">${idx+1} / ${milestones.length} · ${escapeHtml(L("escala por etapas","staged scale"))}</span><h3 style="font-size:1.7rem">${escapeHtml(m.label[state.lang])}</h3><div style="font:700 clamp(1.5rem,5vw,3.5rem) ui-monospace,Consolas,monospace;color:var(--accent);margin:18px 0">${escapeHtml(S.formatNumber(m.au,localeOf(),{maximumFractionDigits:0}))} AU</div><p class="tool-lead" style="margin-inline:auto">${escapeHtml(m.text[state.lang])}</p><p>${escapeHtml(`${L("Tempo-luz a partir do Sol","Light-time from the Sun")}: ${light}`)}</p><div class="locator-line"></div></div></div><div class="tool-actions" style="justify-content:center"><button class="button secondary" data-action="outer-prev" ${idx===0?"disabled":""}>← ${escapeHtml(L("Anterior","Previous"))}</button><button class="button primary" data-action="outer-next" ${idx===milestones.length-1?"disabled":""}>${escapeHtml(L("Próximo marco","Next milestone"))} →</button>${m.body?`<button class="button ghost" data-action="outer-focus" data-id="${m.body}">${escapeHtml(L("Ver na cena","View in scene"))}</button>`:""}<button class="button ghost" data-action="outer-return">${escapeHtml(L("Voltar aos planetas","Return to planets"))}</button></div><div class="progress-track" style="--progress:${idx/(milestones.length-1)*100}%"><i></i></div></div>`;}

  function renderMissions(){const filters=state.workspaceData.missionTarget||"all";const list=D.missions.filter(m=>filters==="all"||m.target===filters);const targets=Array.from(new Set(D.missions.map(m=>m.target)));return `<div style="max-width:1120px;margin:auto"><div class="segmented" style="max-width:700px;margin-bottom:16px"><button data-action="mission-filter" data-target="all" class="${filters==="all"?"active":""}">${escapeHtml(L("Todas","All"))}</button>${targets.map(id=>`<button data-action="mission-filter" data-target="${id}" class="${filters===id?"active":""}">${escapeHtml(bodyName(D.getBody(id)))}</button>`).join("")}</div><p class="tool-lead">${escapeHtml(L("Conteúdo empacotado com referência de 5 set. 2026. Datas de lançamento, encontro e fim são mantidas separadas; trajetórias não disponíveis são chamadas de esquemáticas.","Bundled content referenced September 5, 2026. Launch, encounter, and end dates remain distinct; unavailable trajectories are called schematic."))}</p><div class="mission-grid">${list.map(m=>`<article class="content-card"><span class="eyebrow">${escapeHtml(m.agency)} · ${escapeHtml(m.type[state.lang])}</span><h3>${escapeHtml(m.name)}</h3><p>${escapeHtml(m.achievement[state.lang])}</p><dl class="data-list"><div class="data-row"><dt>${escapeHtml(L("Lançamento","Launch"))}</dt><dd>${m.launch}</dd></div><div class="data-row"><dt>${escapeHtml(L("Encontro/chegada","Encounter/arrival"))}</dt><dd>${m.encounter}</dd></div><div class="data-row"><dt>${escapeHtml(L("Fim","End"))}</dt><dd>${m.end||L("não indicado; status não é ao vivo","not stated; status is not live")}</dd></div></dl><footer><button class="button compact secondary" data-action="mission-focus" data-id="${m.target}">${escapeHtml(bodyName(D.getBody(m.target)))}</button><a class="button compact ghost" href="${m.url}" target="_blank" rel="noreferrer">${escapeHtml(L("Fonte NASA","NASA source"))} ↗</a></footer></article>`).join("")}</div></div>`;}

  function renderTours(){return `<div style="max-width:1140px;margin:auto"><p class="tool-lead">${escapeHtml(L("Cada tour guarda o ponto atual, aceita exploração manual e restaura escala, rótulos, órbitas e reprodução ao sair.","Each tour retains its current stop, allows manual exploration, and restores scale, labels, orbits, and playback on exit."))}</p><div class="tour-grid">${D.tours.map(tour=>{const progress=state.activityProgress[`tour:${tour.id}`]||0;return `<article class="content-card"><span class="eyebrow">${escapeHtml(tour.duration[state.lang])} · ${tour.stops.length} ${escapeHtml(L("paradas","stops"))}</span><h3>${escapeHtml(tour.title[state.lang])}</h3><p>${escapeHtml(tour.description[state.lang])}</p><div class="progress-track" style="--progress:${progress*100}%"><i></i></div><footer><span>${progress?escapeHtml(L("Em andamento","In progress")):escapeHtml(L("Não iniciado","Not started"))}</span><button class="button compact primary" data-action="start-tour" data-id="${tour.id}">${escapeHtml(progress?L("Continuar","Continue"):L("Iniciar","Start"))}</button></footer></article>`;}).join("")}</div></div>`;}

  function renderActivities(){if(state.workspaceData.activityQuestion){const activity=D.activities.find(a=>a.id===state.workspaceData.activityQuestion);if(activity)return renderActivityQuestion(activity);}const completed=D.activities.filter(a=>state.activityProgress[a.id]===true).length;return `<div style="max-width:1140px;margin:auto"><p class="tool-lead">${escapeHtml(L(`Progresso local: ${completed} de ${D.activities.length}. Cada tarefa avalia uma escolha, sequência ou estado real do laboratório.`,`Local progress: ${completed} of ${D.activities.length}. Each task evaluates a choice, sequence, or actual laboratory state.`))}</p><div class="progress-track" style="--progress:${completed/D.activities.length*100}%;margin-bottom:18px"><i></i></div><div class="activity-grid">${D.activities.map((a,i)=>{const done=state.activityProgress[a.id]===true;return `<article class="content-card"><span class="eyebrow">${done?"✓ ":""}${escapeHtml(L("Atividade","Activity"))} ${i+1} · ${escapeHtml(a.theme)}</span><h3>${escapeHtml(a.title[state.lang])}</h3><p>${escapeHtml(a.objective[state.lang])}</p><footer><span>${done?escapeHtml(L("Concluída","Completed")):escapeHtml(L("Pode repetir","Retry anytime"))}</span><button class="button compact ${done?"secondary":"primary"}" data-action="start-activity" data-id="${a.id}">${escapeHtml(done?L("Refazer","Retry"):L("Começar","Start"))}</button></footer></article>`;}).join("")}</div><div class="tool-actions"><button class="button danger" data-action="reset-activities">${escapeHtml(L("Redefinir progresso das atividades","Reset activity progress"))}</button></div></div>`;}

  function renderActivityQuestion(activity){
    const options=activity.kind==="choice"?activity.options.map(id=>({value:id,label:bodyName(D.getBody(id))})):activity.options.map((label,i)=>({value:String(i),label:label[state.lang]}));
    return `<div class="tool-stage" style="max-width:680px;margin:auto"><span class="eyebrow">${escapeHtml(activity.title[state.lang])}</span><h3 style="font-size:1.35rem">${escapeHtml(activity.objective[state.lang])}</h3><div style="display:grid;gap:8px;margin:20px 0">${options.map(o=>`<button class="button secondary" style="justify-content:flex-start;text-align:left" data-action="answer-activity" data-id="${activity.id}" data-answer="${escapeHtml(o.value)}">${escapeHtml(o.label)}</button>`).join("")}</div><button class="button ghost" data-action="back-activities">← ${escapeHtml(L("Todas as atividades","All activities"))}</button></div>`;
  }

  function renderEncyclopedia(){const selected=state.workspaceData.article||D.glossary[0].id;const article=D.glossary.find(x=>x.id===selected)||D.glossary[0];return `<div class="article-layout"><nav class="article-nav" aria-label="${escapeHtml(L("Termos","Terms"))}"><label class="search-field" style="margin:0 0 9px"><span class="sr-only">${escapeHtml(L("Buscar termos","Search terms"))}</span><input type="search" data-control="glossary-search" placeholder="${escapeHtml(L("Buscar conceito…","Search concept…"))}"></label>${D.glossary.map(item=>`<button data-action="open-article" data-id="${item.id}" class="${item.id===article.id?"active":""}">${escapeHtml(item.title[state.lang])}</button>`).join("")}</nav><article class="article"><span class="eyebrow">${escapeHtml(L("Definição essencial","Essential definition"))}</span><h2>${escapeHtml(article.title[state.lang])}</h2><p style="font-size:1rem;color:var(--text)">${escapeHtml(article.short[state.lang])}</p><h3>${escapeHtml(L("Veja no observatório","See it in the observatory"))}</h3><p>${escapeHtml(contextForGlossary(article))}</p><button class="button primary" data-action="glossary-tool" data-tool="${article.tool}">${escapeHtml(L("Abrir exemplo interativo","Open interactive example"))}</button><h3>${escapeHtml(L("Dentro deste modelo","Within this model"))}</h3><p>${escapeHtml(L("As grandezas físicas vêm do catálogo local e permanecem separadas do mapeamento visual comprimido. Resultados orbitais usam uma aproximação analítica, não telemetria ou uma efeméride integrada de alta precisão.","Physical quantities come from the local catalog and remain separate from compressed visual mapping. Orbital results use an analytic approximation, not telemetry or a high-precision integrated ephemeris."))}</p><div class="tool-note accent">${escapeHtml(L("Fontes públicas podem ser abertas no inspetor de cada corpo. O conteúdo essencial já está empacotado.","Public sources can be opened from each body's inspector. Essential content is already bundled."))}</div></article></div>`;}
  function contextForGlossary(article){const text={scale:["Compare o diâmetro da Terra em uma linha comum e depois veja o vazio da escala combinada.","Compare Earth's diameter on a common line, then see the emptiness of combined true scale."],measurement:["Trace uma régua entre dois mundos; o valor vem das coordenadas físicas do instante.","Draw a ruler between two worlds; its value comes from physical coordinates at that instant."],comparison:["Use círculos de diâmetro linear e razões contra um corpo de referência.","Use linear-diameter circles and ratios against a reference body."],orbit:["Altere uma órbita idealizada sem tocar no Sistema Solar canônico.","Change an idealized orbit without touching the canonical Solar System."],time:["Pause, inverta e avance o mesmo relógio autoritativo.","Pause, reverse, and step the same authoritative clock."],seasons:["Mude a inclinação de uma Terra experimental e compare os hemisférios.","Change the tilt of an experimental Earth and compare hemispheres."],moon:["Relacione a geometria Sol–Terra–Lua à aparência iluminada.","Relate Sun–Earth–Moon geometry to the illuminated appearance."]};return (text[article.tool]||text.orbit)[state.lang==="pt"?0:1];}

  function collectionTabs(){const active=state.workspaceData.collectionTab||"viewpoints";const tabs=[["viewpoints",L("Vistas","Views")],["bookmarks",L("Instantes","Instants")],["notes",L("Diário","Journal")],["favorites",L("Favoritos","Favorites")],["measurements",L("Medições","Measurements")],["data",L("Importar/exportar","Import/export")]];return `<div class="segmented" style="margin-bottom:16px">${tabs.map(([id,label])=>`<button class="${active===id?"active":""}" data-action="collection-tab" data-tab="${id}">${escapeHtml(label)}</button>`).join("")}</div>`;}
  function renderCollections(){const tab=state.workspaceData.collectionTab||"viewpoints";let content="";
    if(tab==="viewpoints")content=renderViewpoints();
    else if(tab==="bookmarks")content=renderBookmarks();
    else if(tab==="notes")content=renderNotes();
    else if(tab==="favorites")content=renderFavorites();
    else if(tab==="measurements")content=renderMeasurementCollection();
    else content=renderDataControl();
    return `<div style="max-width:1040px;margin:auto">${collectionTabs()}${!runtime.storageAvailable?`<div class="tool-note">${escapeHtml(L("O armazenamento do navegador não está disponível. A sessão continua funcional; use exportação manual.","Browser storage is unavailable. The session remains usable; use manual export."))}</div>`:""}${content}</div>`;
  }
  function renderViewpoints(){
    const items=state.collections.viewpoints;
    const add=`<div class="tool-actions" style="margin-top:0;margin-bottom:14px"><button class="button primary" data-action="save-viewpoint">${escapeHtml(L("Salvar vista atual","Save current view"))}</button></div>`;
    if(!items.length)return `${add}<div class="empty-state"><strong>${escapeHtml(L("Nenhuma vista salva","No saved views"))}</strong><p>${escapeHtml(L("Uma vista guarda alvo, câmera, escala e sobreposições.","A view stores target, camera, scale, and overlays."))}</p></div>`;
    const cards=items.map(v=>{
      const dateText=v.restoreDate?new Date(v.dateMs).toISOString().slice(0,10):L("data atual","current date");
      const context=`${bodyName(D.getBody(v.targetId))} · ${dateText}`;
      return `<article class="content-card"><span class="eyebrow">${escapeHtml(v.scaleMode)} · ${escapeHtml(new Date(v.createdAt).toLocaleDateString(localeOf()))}</span><h3>${escapeHtml(v.title)}</h3><p>${escapeHtml(context)}</p><footer><button class="button compact primary" data-action="restore-viewpoint" data-id="${v.id}">${escapeHtml(L("Abrir","Open"))}</button><button class="button compact ghost" data-action="duplicate-viewpoint" data-id="${v.id}">${escapeHtml(L("Duplicar","Duplicate"))}</button><button class="button compact danger" data-action="delete-viewpoint" data-id="${v.id}">${escapeHtml(L("Excluir","Delete"))}</button></footer></article>`;
    }).join("");
    return `${add}<div class="collection-grid">${cards}</div>`;
  }
  function renderBookmarks(){
    const items=state.collections.bookmarks;
    const add=`<div class="tool-actions" style="margin-top:0;margin-bottom:14px"><button class="button primary" data-action="add-bookmark">${escapeHtml(L("Marcar instante atual","Bookmark current instant"))}</button></div>`;
    if(!items.length)return `${add}<div class="empty-state"><strong>${escapeHtml(L("Nenhum instante marcado","No bookmarked instants"))}</strong></div>`;
    const cards=items.map(v=>`<article class="content-card"><span class="eyebrow">UTC · ${escapeHtml(v.scaleMode)}</span><h3>${escapeHtml(v.title)}</h3><p>${escapeHtml(new Date(v.dateMs).toISOString())}<br>${escapeHtml(bodyName(D.getBody(v.targetId)))}</p><footer><button class="button compact primary" data-action="restore-bookmark" data-id="${v.id}">${escapeHtml(L("Visitar","Visit"))}</button><button class="button compact danger" data-action="delete-bookmark" data-id="${v.id}">${escapeHtml(L("Excluir","Delete"))}</button></footer></article>`).join("");
    return `${add}<div class="collection-grid">${cards}</div>`;
  }
  function renderNotes(){const items=state.collections.notes;return `<div class="tool-layout"><aside class="tool-sidebar"><div class="form-group"><label>${escapeHtml(L("Título","Title"))}</label><input id="note-title" class="input" maxlength="80" value="${escapeHtml(state.workspaceData.noteTitle||bodyName(D.getBody(state.selectedId)))}"></div><div class="form-group"><label>${escapeHtml(L("Anotação","Note"))}</label><textarea id="note-body" class="input" maxlength="2000" placeholder="${escapeHtml(L("O que você observou?","What did you observe?"))}">${escapeHtml(state.workspaceData.noteBody||"")}</textarea></div><button class="button primary" style="width:100%" data-action="save-note">${escapeHtml(L("Salvar anotação","Save note"))}</button><small style="display:block;color:var(--muted);margin-top:8px">${escapeHtml(L("Nada é salvo automaticamente; textos ficam neste navegador.","Nothing is saved automatically; text stays in this browser."))}</small></aside><section class="tool-stage">${items.length?items.slice().reverse().map(n=>`<article class="content-card" style="min-height:0;margin-bottom:8px"><span class="eyebrow">${escapeHtml(bodyName(D.getBody(n.targetId)))} · ${escapeHtml(new Date(n.createdAt).toLocaleString(localeOf()))}</span><h3>${escapeHtml(n.title)}</h3><p style="white-space:pre-wrap">${escapeHtml(n.body)}</p><footer><button class="button compact secondary" data-action="edit-note" data-id="${n.id}">${escapeHtml(L("Editar","Edit"))}</button><button class="button compact danger" data-action="delete-note" data-id="${n.id}">${escapeHtml(L("Excluir","Delete"))}</button></footer></article>`).join(""):`<div class="empty-state"><strong>${escapeHtml(L("Diário vazio","Empty journal"))}</strong></div>`}</section></div>`;}
  function renderFavorites(){const items=state.collections.favorites.map(D.getBody).filter(Boolean);return items.length?`<div class="collection-grid">${items.map(b=>`<article class="content-card"><span class="eyebrow">${escapeHtml(bodyType(b))}</span><h3>${escapeHtml(bodyName(b))}</h3><p>${escapeHtml(b.description[state.lang])}</p><footer><button class="button compact primary" data-action="collection-focus" data-id="${b.id}">${escapeHtml(L("Explorar","Explore"))}</button><button class="button compact ghost" data-action="favorite-row" data-id="${b.id}">${escapeHtml(L("Remover","Remove"))}</button></footer></article>`).join("")}</div>`:`<div class="empty-state"><strong>${escapeHtml(L("Nenhum favorito","No favorites"))}</strong></div>`;}
  function renderMeasurementCollection(){return state.collections.measurements.length?`${renderMeasurementHistory()}<div class="tool-actions"><button class="button secondary" data-action="export-measurements">${escapeHtml(L("Exportar CSV","Export CSV"))}</button><button class="button danger" data-action="clear-measurements">${escapeHtml(L("Limpar somente medições","Clear measurements only"))}</button></div>`:`<div class="empty-state"><strong>${escapeHtml(L("Nenhuma medição salva","No saved measurements"))}</strong></div>`;}
  function renderDataControl(){return `<div class="tool-layout"><aside class="tool-sidebar"><h3 class="tool-heading">${escapeHtml(L("Exportação portátil","Portable export"))}</h3><p class="tool-lead">${escapeHtml(L("Inclui preferências, vistas, instantes e notas. Não inclui caminhos privados, identificadores do navegador ou código executável.","Includes preferences, views, instants, and notes. It excludes private paths, browser identifiers, and executable code."))}</p><button class="button primary" style="width:100%" data-action="export-data">${escapeHtml(L("Baixar JSON","Download JSON"))}</button></aside><section class="tool-stage"><h3 class="tool-heading">${escapeHtml(L("Importar com prévia","Import with preview"))}</h3><p class="tool-lead">${escapeHtml(L("O arquivo é validado por versão, tipos, identificadores, intervalos e tamanho de texto antes de qualquer substituição.","The file is validated by version, types, identifiers, ranges, and text length before anything is replaced."))}</p><input id="import-file" class="input" type="file" accept="application/json"><div class="tool-actions"><button class="button secondary" data-action="preview-import">${escapeHtml(L("Validar e visualizar","Validate and preview"))}</button><button class="button danger" data-action="clear-local-data">${escapeHtml(L("Limpar coleções locais","Clear local collections"))}</button></div><div id="import-preview"></div></section></div>`;}

  function renderSettings(){const tab=state.workspaceData.settingsTab||"visual";return `<div class="settings-layout"><nav class="settings-nav">${[["visual",L("Aparência","Appearance")],["science",L("Ciência e unidades","Science and units")],["accessibility",L("Acessibilidade","Accessibility")],["audio",L("Som","Sound")],["storage",L("Dados locais","Local data")]].map(([id,label])=>`<button class="${tab===id?"active":""}" data-action="settings-tab" data-tab="${id}">${escapeHtml(label)}</button>`).join("")}</nav><section>${settingsContent(tab)}</section></div>`;}
  function settingsContent(tab){
    if(tab==="visual")return `<div class="settings-group"><h3>${escapeHtml(L("Predefinições","Presets"))}</h3><div class="preset-row">${[["cinematic",L("Cinemático","Cinematic"),L("Aprimorado, fundo rico","Enhanced, rich background")],["classroom",L("Sala de aula","Classroom"),L("Rótulos claros","Clear labels")],["study",L("Estudo detalhado","Detailed study"),L("Órbitas e alta qualidade","Orbits and high quality")],["low",L("Baixa potência","Low power"),L("Menos partículas","Fewer particles")]].map(([id,title,sub])=>`<button class="preset-button" data-action="visual-preset" data-preset="${id}"><strong>${escapeHtml(title)}</strong><small>${escapeHtml(sub)}</small></button>`).join("")}</div></div><div class="settings-group"><div class="form-group"><label>${escapeHtml(L("Apresentação","Presentation"))}</label><select class="select" data-control="presentation"><option value="natural" ${state.presentation==="natural"?"selected":""}>${escapeHtml(L("Natural · contida","Natural · restrained"))}</option><option value="enhanced" ${state.presentation==="enhanced"?"selected":""}>${escapeHtml(L("Aprimorada · maior contraste","Enhanced · higher contrast"))}</option></select></div><div class="form-group"><label>${escapeHtml(L("Qualidade","Quality"))}</label><select class="select" data-control="quality"><option value="auto" ${state.quality==="auto"?"selected":""}>${escapeHtml(L("Adaptativa","Adaptive"))}</option><option value="high" ${state.quality==="high"?"selected":""}>${escapeHtml(L("Alta","High"))}</option><option value="medium" ${state.quality==="medium"?"selected":""}>${escapeHtml(L("Média","Medium"))}</option><option value="low" ${state.quality==="low"?"selected":""}>${escapeHtml(L("Baixa","Low"))}</option></select><small>${escapeHtml(`${L("Efetiva","Effective")}: ${state.effectiveQuality} · ~${Math.round(runtime.fps)} fps ${L("neste quadro","in this view")}`)}</small></div><div class="form-group"><label>${escapeHtml(L("Intensidade do fundo","Background intensity"))}: ${Math.round(state.background*100)}%</label><input class="input" type="range" min="0" max="1" step="0.01" value="${state.background}" data-control="background"></div><div class="form-group"><label>${escapeHtml(L("Opacidade dos painéis","Panel opacity"))}: ${Math.round(state.panelOpacity*100)}%</label><input class="input" type="range" min="0.55" max="1" step="0.01" value="${state.panelOpacity}" data-control="panel-opacity"></div></div>`;
    if(tab==="science")return `<div class="settings-group"><div class="form-group"><label>${escapeHtml(L("Idioma","Language"))}</label><select class="select" data-control="language"><option value="pt" ${state.lang==="pt"?"selected":""}>Português (Brasil)</option><option value="en" ${state.lang==="en"?"selected":""}>English</option></select></div><div class="form-group"><label>${escapeHtml(L("Modo de escala da cena","Scene scale mode"))}</label><select class="select" data-control="main-scale"><option value="exploration" ${state.scaleMode==="exploration"?"selected":""}>${escapeHtml(L("Exploração · distâncias comprimidas","Exploration · compressed distances"))}</option><option value="relative" ${state.scaleMode==="relative"?"selected":""}>${escapeHtml(L("Distâncias relativas · linear","Relative distances · linear"))}</option></select></div><div class="form-group"><label>${escapeHtml(L("Rótulos","Labels"))}</label><select class="select" data-control="labels">${["major","system","selected","favorites","none"].map(id=>`<option value="${id}" ${state.labels===id?"selected":""}>${escapeHtml(id)}</option>`).join("")}</select></div><div class="form-group"><label>${escapeHtml(L("Órbitas","Orbits"))}</label><select class="select" data-control="orbits">${["all","selected","system","none"].map(id=>`<option value="${id}" ${state.orbitMode===id?"selected":""}>${escapeHtml(id)}</option>`).join("")}</select></div></div><div class="settings-group"><h3>${escapeHtml(L("Sobreposições científicas","Scientific overlays"))}</h3>${[["grid",L("Grade de referência","Reference grid")],["trails",L("Trilha da seleção","Selection trail")],["axes",L("Eixo de rotação","Rotation axis")],["nodes",L("Linha dos nodos","Line of nodes")],["velocity",L("Vetor de velocidade","Velocity vector")]].map(([id,label])=>`<label class="toggle-row"><span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(L("Camada visual; não altera o modelo físico.","Visual layer; does not alter the physical model."))}</small></span><input class="switch" type="checkbox" data-control="overlay-${id}" ${state.overlays[id]?"checked":""}></label>`).join("")}</div><div class="settings-group"><div class="form-group"><label>${escapeHtml(L("Unidades familiares adicionais","Additional familiar units"))}</label><select class="select" data-control="units"><option value="metric" ${state.units==="metric"?"selected":""}>${escapeHtml(L("Métricas e AU","Metric and AU"))}</option><option value="familiar" ${state.units==="familiar"?"selected":""}>${escapeHtml(L("Métricas + comparações","Metric + comparisons"))}</option></select></div></div>`;
    if(tab==="accessibility")return `<div class="settings-group"><label class="toggle-row"><span><strong>${escapeHtml(L("Movimento reduzido","Reduced motion"))}</strong><small>${escapeHtml(L("Encurta viagens e remove movimento decorativo.","Shortens travel and removes decorative motion."))}</small></span><input class="switch" type="checkbox" data-control="reduced-motion" ${state.reducedMotion?"checked":""}></label><label class="toggle-row"><span><strong>${escapeHtml(L("Alto contraste","High contrast"))}</strong><small>${escapeHtml(L("Eleva contraste de texto, bordas e rótulos.","Raises contrast for text, borders, and labels."))}</small></span><input class="switch" type="checkbox" data-control="high-contrast" ${state.highContrast?"checked":""}></label><label class="toggle-row"><span><strong>${escapeHtml(L("Modo visual simplificado","Simplified visual mode"))}</strong><small>${escapeHtml(L("Remove mapa e estados secundários.","Removes map and secondary status."))}</small></span><input class="switch" type="checkbox" data-control="simple-mode" ${state.simpleMode?"checked":""}></label><div class="form-group" style="margin-top:14px"><label>${escapeHtml(L("Tamanho da interface","Interface size"))}: ${Math.round(state.uiScale*100)}%</label><input class="input" type="range" min="0.9" max="1.3" step="0.05" value="${state.uiScale}" data-control="ui-scale"></div></div>`;
    if(tab==="audio")return `<div class="settings-group"><div class="tool-note">${escapeHtml(L("O observatório é completo em silêncio. Nenhum som começa sozinho. Narração usa apenas síntese de voz do navegador após ativação explícita.","The observatory is complete in silence. No sound starts automatically. Narration uses only browser speech synthesis after explicit activation."))}</div><label class="toggle-row"><span><strong>${escapeHtml(L("Áudio mestre","Master audio"))}</strong><small>${escapeHtml(L("Permite recursos sonoros nesta sessão.","Allows sound features in this session."))}</small></span><input class="switch" type="checkbox" data-control="audio" ${state.audio?"checked":""}></label><label class="toggle-row"><span><strong>${escapeHtml(L("Narração dos tours","Tour narration"))}</strong><small>${escapeHtml("speechSynthesis" in window?L("Disponível; inicia somente por comando.","Available; starts only on command."):L("Não suportada neste navegador.","Unsupported in this browser."))}</small></span><input class="switch" type="checkbox" data-control="narration" ${state.narration?"checked":""} ${!("speechSynthesis" in window)?"disabled":""}></label></div>`;
    return `<div class="settings-group"><h3>${escapeHtml(L("Persistência local","Local persistence"))}</h3><p class="tool-lead">${escapeHtml(runtime.storageAvailable?L("O armazenamento está disponível. Salvamentos são confirmados somente após a gravação.","Storage is available. Saves are confirmed only after the write succeeds."):L("O armazenamento está indisponível; use exportação manual.","Storage is unavailable; use manual export."))}</p><div class="tool-actions"><button class="button secondary" data-action="open-data-control">${escapeHtml(L("Importar e exportar","Import and export"))}</button><button class="button ghost" data-action="reset-visuals">${escapeHtml(L("Redefinir apenas preferências visuais","Reset visual preferences only"))}</button></div></div>`;
  }

  function renderHelp(){const shortcuts=[["Space",L("Reproduzir / pausar","Play / pause")],["R",L("Redefinir vista","Reset view")],["O",L("Alternar órbitas","Cycle orbits")],["L",L("Alternar rótulos","Cycle labels")],["F",L("Focar seleção","Focus selection")],["C",L("Comparar","Compare")],["M",L("Medir","Measure")],["P",L("Foto","Photo")],["H",L("Ocultar interface","Hide interface")],["Ctrl/⌘ K",L("Comandos e busca","Commands and search")],["Esc",L("Fechar a camada superior","Close topmost layer")]];return `<div class="tool-layout"><aside class="tool-sidebar"><h3 class="tool-heading">${escapeHtml(L("Cena","Scene"))}</h3><p class="tool-lead">${escapeHtml(L("Arraste para orbitar. Role ou use pinça para zoom. Shift + arraste ou botão direito move o alvo. Clique seleciona; duplo clique foca.","Drag to orbit. Scroll or pinch to zoom. Shift-drag or right-drag pans the target. Click selects; double-click focuses."))}</p><p class="tool-lead">${escapeHtml(L("No teclado, foque o canvas e use as setas; + e − controlam o zoom. O catálogo oferece todas as ações sem apontamento preciso.","With the keyboard, focus the canvas and use arrows; + and − control zoom. The catalog offers every action without precision pointing."))}</p><button class="button secondary" data-action="restart-tutorial">${escapeHtml(L("Reiniciar boas-vindas","Restart welcome"))}</button></aside><section class="tool-stage"><h3 class="tool-heading">${escapeHtml(L("Atalhos","Shortcuts"))}</h3><dl class="data-list">${shortcuts.map(([key,label])=>`<div class="data-row"><dt>${escapeHtml(label)}</dt><dd><kbd>${escapeHtml(key)}</kbd></dd></div>`).join("")}</dl><div class="tool-note accent">${escapeHtml(L("Atalhos não disparam enquanto você digita em busca, data, nota ou qualquer campo. Tab nunca fica preso no canvas.","Shortcuts do not fire while you type in search, date, notes, or any field. Tab is never trapped in the canvas."))}</div></section></div>`;}

  function renderTimeTools(){const presets=[[1,"1×"],[10,"10×"],[100,"100×"],[1000,"1.000×"],[3600,L("1 h/s","1 h/s")],[86400,L("1 dia/s","1 day/s")],[604800,L("1 semana/s","1 week/s")],[2592000,L("30 dias/s","30 days/s")]];return `<div class="tool-layout"><aside class="tool-sidebar"><div class="form-group"><label>${escapeHtml(L("Magnitude exata (segundos simulados por segundo real)","Exact magnitude (simulated seconds per real second)"))}</label><input class="input" type="number" min="1" max="100000000" step="1" value="${state.speed}" data-control="custom-rate"><small>${escapeHtml(L("1× significa exatamente um segundo modelado por segundo real.","1× means exactly one modeled second per real second."))}</small></div><div class="tool-actions"><button class="button secondary" data-action="time-step" data-seconds="60">+1 min</button><button class="button secondary" data-action="time-step" data-seconds="3600">+1 h</button><button class="button secondary" data-action="time-step" data-seconds="86400">+1 ${escapeHtml(L("dia","day"))}</button><button class="button secondary" data-action="time-step" data-seconds="604800">+1 ${escapeHtml(L("semana","week"))}</button></div></aside><section class="tool-stage"><h3 class="tool-heading">${escapeHtml(L("Predefinições de duração","Duration presets"))}</h3><div class="tool-actions">${presets.map(([value,label])=>`<button class="button ${state.speed===value?"primary":"secondary"}" data-action="set-rate" data-value="${value}">${escapeHtml(String(label))}</button>`).join("")}</div><div class="tool-note">${escapeHtml(L("Um dia = 86.400 s; uma semana = 7 dias; o mês de demonstração = 30 dias. Navegar um mês civil é uma operação de calendário separada.","A day = 86,400 s; a week = 7 days; the demonstration month = 30 days. Navigating a calendar month is a separate operation."))}</div><div class="tool-actions"><button class="button primary" data-action="reset-simulation">${escapeHtml(L("Redefinir simulação","Reset Simulation"))}</button><button class="button secondary" data-action="reset-view">${escapeHtml(L("Redefinir vista","Reset View"))}</button><button class="button ghost" data-action="go-now">${escapeHtml(L("Ir para Agora","Go to Now"))}</button></div></section></div>`;}
  function renderDateEditor(){const iso=new Date(state.dateMs).toISOString().slice(0,16),minMs=Date.UTC(1800,0,1),maxMs=Date.UTC(2050,11,31,23,59,59);return `<div class="tool-stage" style="max-width:620px;margin:auto"><p class="tool-lead">${escapeHtml(L("O modelo planetário principal usa elementos aproximados JPL válidos de 1 jan. 1800 a 31 dez. 2050. Datas são interpretadas em UTC.","The primary planetary model uses approximate JPL elements valid from Jan 1, 1800 through Dec 31, 2050. Dates are interpreted in UTC."))}</p><div class="form-group"><label for="date-input">${escapeHtml(L("Data e hora UTC","UTC date and time"))}</label><input id="date-input" class="input" type="datetime-local" min="1800-01-01T00:00" max="2050-12-31T23:59" value="${iso}" data-control="date-value"></div><div class="form-group"><label for="date-scrub">${escapeHtml(L("Régua histórica 1800–2050","Historical scrubber 1800–2050"))}</label><input id="date-scrub" class="input" type="range" min="${minMs}" max="${maxMs}" step="${S.DAY_MS}" value="${state.dateMs}" data-control="date-scrub"><small>${escapeHtml(new Date(state.dateMs).toISOString().slice(0,10))} UTC</small></div><div id="date-error" class="tool-note" hidden></div><div class="tool-actions"><button class="button primary" data-action="apply-date">${escapeHtml(L("Aplicar e pausar","Apply and pause"))}</button><button class="button secondary" data-action="go-now">${escapeHtml(L("Agora","Now"))}</button><button class="button ghost" data-action="session-start">${escapeHtml(L("Início da sessão","Session start"))}</button><button class="button ghost" data-action="j2000">J2000 · 2000-01-01</button></div><h3>${escapeHtml(L("Instantes marcados","Bookmarked instants"))}</h3>${state.collections.bookmarks.length?state.collections.bookmarks.map(b=>`<button class="button ghost" data-action="restore-bookmark" data-id="${b.id}">${escapeHtml(b.title)} · ${escapeHtml(new Date(b.dateMs).toISOString().slice(0,10))}</button>`).join(" "):`<p class="tool-lead">${escapeHtml(L("Nenhum instante marcado ainda.","No bookmarked instant yet."))}</p>`}</div>`;}
  function renderScaleInfo(){return `<div class="article" style="margin:auto"><h2>${escapeHtml(L("Uma cena, quatro escalas distintas","One scene, four distinct scales"))}</h2><p>${escapeHtml(L("Escala de Exploração comprime distâncias heliocêntricas por uma função logarítmica e exagera raios para manter mundos visíveis. Distâncias Relativas usa um eixo heliocêntrico linear, mas mantém discos como localizadores. Sistemas de luas usam compressão local declarada nos dois modos. Dimensões dos anéis acompanham o raio visual do planeta.","Exploration Scale compresses heliocentric distances with a logarithmic function and exaggerates radii to keep worlds visible. Relative Distances uses a linear heliocentric axis but retains disks as locators. Moon systems use declared local compression in both modes. Ring dimensions follow the planet's visual radius."))}</p><div class="data-table-wrap"><table class="data-table"><thead><tr><th>${escapeHtml(L("Contexto","Context"))}</th><th>${escapeHtml(L("Tamanhos","Sizes"))}</th><th>${escapeHtml(L("Distâncias","Distances"))}</th></tr></thead><tbody><tr><td>${escapeHtml(L("Cena de exploração","Explorer scene"))}</td><td>${escapeHtml(L("exagerados","exaggerated"))}</td><td>${escapeHtml(L("comprimidas","compressed"))}</td></tr><tr><td>${escapeHtml(L("Distâncias relativas","Relative distances"))}</td><td>${escapeHtml(L("marcadores","locators"))}</td><td>${escapeHtml(L("lineares ao Sol","linear from Sun"))}</td></tr><tr><td>${escapeHtml(L("Comparação","Comparison"))}</td><td>${escapeHtml(L("diâmetro linear comum","common linear diameter"))}</td><td>—</td></tr><tr><td>${escapeHtml(L("Escala real combinada","Combined true scale"))}</td><td>${escapeHtml(L("um fator físico","one physical factor"))}</td><td>${escapeHtml(L("mesmo fator físico","same physical factor"))}</td></tr></tbody></table></div><p>${escapeHtml(L("Medições, gravidade, períodos e razões sempre leem o modelo físico em quilômetros, quilogramas e segundos; trocar a apresentação não muda nenhum deles.","Measurements, gravity, periods, and ratios always read the physical model in kilometers, kilograms, and seconds; changing presentation changes none of them."))}</p><div class="tool-actions"><button class="button primary" data-action="apply-main-scale">${escapeHtml(state.scaleMode==="exploration"?L("Usar distâncias relativas","Use relative distances"):L("Usar escala de exploração","Use Exploration Scale"))}</button><button class="button secondary" data-action="open-tool" data-tool="scale">${escapeHtml(L("Abrir laboratório completo","Open full laboratory"))}</button></div></div>`;}
  function renderFrameInfo(){return `<div class="article" style="margin:auto"><h2>${escapeHtml(L("Referencial não é modo de câmera","A reference frame is not a camera mode"))}</h2><p>${escapeHtml(L("A configuração física é calculada em coordenadas heliocêntricas eclípticas J2000. Seguir Marte move a câmera, mas não muda a origem das grandezas. Uma vista local centra a apresentação no planeta pai sem reescrever o estado orbital.","The physical configuration is calculated in J2000 heliocentric ecliptic coordinates. Following Mars moves the camera but does not change the origin of quantities. A local view centers presentation on the parent planet without rewriting orbital state."))}</p><div class="tool-note accent">${escapeHtml(L("Convenção da cena: X–Z representa o plano eclíptico; +Y fica ao norte do plano. A projeção converte esse mundo para a câmera em um único lugar.","Scene convention: X–Z represents the ecliptic plane; +Y is north of that plane. Projection converts this world to camera space in one place."))}</div><div class="tool-actions"><button class="button primary" data-action="set-frame" data-id="sun">${escapeHtml(L("Referencial: Sol","Frame: Sun"))}</button><button class="button secondary" data-action="set-frame" data-id="earth">${escapeHtml(L("Referencial: Terra (geométrico)","Frame: Earth (geometric)"))}</button><button class="button ghost" data-action="view-top">${escapeHtml(L("Vista superior da eclíptica","Top ecliptic view"))}</button></div><p>${escapeHtml(L("A opção Terra apenas rotula e recentra a interpretação geométrica; não inclui tempo-luz, aberração nem perspectiva topocêntrica.","The Earth option only labels and recenters geometric interpretation; it omits light-time, aberration, and topocentric perspective."))}</p></div>`;}

  function rerenderWorkspace(){if(state.workspaceKind)renderWorkspace();}

  function handleToolAction(action,node,event){
    const id=node.dataset.id, value=node.dataset.value, tool=node.dataset.tool;
    if(action==="open-tool"){if(tool==="photo")enterPhotoMode();else setWorkspace(tool);return true;}
    if(action==="add-compare"){const next=D.bodies.find(b=>!state.comparison.ids.includes(b.id));if(next)state.comparison.ids.push(next.id);rerenderWorkspace();return true;}
    if(action==="remove-compare"){const i=Number(node.dataset.index);if(state.comparison.ids.length>2)state.comparison.ids.splice(i,1);if(!state.comparison.ids.includes(state.comparison.reference))state.comparison.reference=state.comparison.ids[0];rerenderWorkspace();return true;}
    if(action==="move-compare"){const i=Number(node.dataset.index),j=S.clamp(i+Number(node.dataset.direction),0,state.comparison.ids.length-1);[state.comparison.ids[i],state.comparison.ids[j]]=[state.comparison.ids[j],state.comparison.ids[i]];rerenderWorkspace();return true;}
    if(action==="comparison-preset"){const presets={"earth-mars":["earth","mars"],"earth-moon":["earth","moon"],"jupiter-saturn":["jupiter","saturn"]};state.comparison.ids=presets[node.dataset.preset]||state.comparison.ids;state.comparison.reference=state.comparison.ids[0];rerenderWorkspace();return true;}
    if(action==="export-comparison-csv"){exportComparisonCsv();return true;}
    if(action==="export-comparison-svg"){exportComparisonSvg();return true;}
    if(action==="swap-measure"){[state.measurement.a,state.measurement.b]=[state.measurement.b,state.measurement.a];state.measurement.frozen=null;rerenderWorkspace();return true;}
    if(action==="freeze-measure"){state.measurement.frozen=calculateMeasurement();state.measurement.live=false;rerenderWorkspace();return true;}
    if(action==="pin-measure"){state.measurement.pinned=!state.measurement.pinned;rerenderWorkspace();return true;}
    if(action==="save-measurement"){saveMeasurement();return true;}
    if(action==="export-measurements"){exportMeasurements();return true;}
    if(action==="focus-measure-a"){closeWorkspace();focusBody(state.measurement.a);return true;}
    if(action==="focus-measure-b"){closeWorkspace();focusBody(state.measurement.b);return true;}
    if(action==="scale-view"){state.scaleLab.view=node.dataset.view;rerenderWorkspace();return true;}
    if(action==="scale-axis"){state.scaleLab.axis=node.dataset.axis;rerenderWorkspace();return true;}
    if(action==="reset-scale-lab"){state.scaleLab={view:"sizes",ids:["earth","moon","jupiter","sun"],earthSizeCm:1,axis:"linear"};rerenderWorkspace();return true;}
    if(action==="apply-main-scale"){toggleMainScale();rerenderWorkspace();return true;}
    if(action==="season-preset"){state.seasonsLab.longitude=Number(value);rerenderWorkspace();return true;}
    if(action==="season-zero"){state.seasonsLab.tilt=0;rerenderWorkspace();return true;}
    if(action==="reset-seasons"){state.seasonsLab={tilt:23.439,latitude:-15,longitude:90,baseline:23.439};rerenderWorkspace();return true;}
    if(action==="eclipse-preset"){state.moonLab.eclipse=value;if(value==="solar")state.moonLab.phase=0;else if(value==="lunar")state.moonLab.phase=180;rerenderWorkspace();return true;}
    if(action==="moon-step"){state.moonLab.phase=S.mod(state.moonLab.phase+Number(node.dataset.step),360);state.moonLab.eclipse="none";rerenderWorkspace();return true;}
    if(action==="reset-moon-lab"){state.moonLab={phase:90,inclination:true,eclipse:"none"};rerenderWorkspace();return true;}
    if(action==="orbit-run"){state.orbitLab.running=!state.orbitLab.running;rerenderWorkspace();return true;}
    if(action==="reset-orbit"){state.orbitLab={massEarths:1,semiMajorKm:42000,eccentricity:.25,testMass:10,running:false,phase:0};rerenderWorkspace();return true;}
    if(action==="orbit-preset"){state.orbitLab.eccentricity=value==="circle"?0:.62;state.orbitLab.semiMajorKm=value==="circle"?42000:90000;rerenderWorkspace();return true;}
    if(action==="save-experiment"){saveExperiment();return true;}
    if(action==="outer-prev"){state.outerStep=Math.max(0,state.outerStep-1);rerenderWorkspace();return true;}
    if(action==="outer-next"){state.outerStep=Math.min(6,state.outerStep+1);rerenderWorkspace();return true;}
    if(action==="outer-focus"){closeWorkspace();focusBody(id);return true;}
    if(action==="outer-return"){closeWorkspace();overview();return true;}
    if(action==="mission-filter"){state.workspaceData.missionTarget=node.dataset.target;rerenderWorkspace();return true;}
    if(action==="mission-focus"){closeWorkspace();focusBody(id);return true;}
    if(action==="start-tour"){startTour(id);return true;}
    if(action==="tour-prev"){tourMove(-1);return true;}
    if(action==="tour-next"){tourMove(1);return true;}
    if(action==="tour-toggle"){if(state.tour){state.tour.paused=!state.tour.paused;state.tour.suspended=false;state.tour.enteredAt=performance.now();if(!state.tour.paused)applyTourStop();renderTourHud();}return true;}
    if(action==="tour-restart"){if(state.tour){state.tour.enteredAt=performance.now();state.tour.suspended=false;applyTourStop();}return true;}
    if(action==="tour-exit"){exitTour();return true;}
    if(action==="tour-narrate"){narrateTour();return true;}
    if(action==="tour-auto"){if(state.tour){state.tour.auto=!state.tour.auto;state.tour.enteredAt=performance.now();renderTourHud();}return true;}
    if(action==="start-activity"){startActivity(id);return true;}
    if(action==="answer-activity"){answerActivity(id,node.dataset.answer);return true;}
    if(action==="back-activities"){state.workspaceData={};rerenderWorkspace();return true;}
    if(action==="check-activity"){checkActivity(node.dataset.check);return true;}
    if(action==="reset-activities"){if(confirm(L("Redefinir somente o progresso das atividades?","Reset activity progress only?"))){D.activities.forEach(a=>delete state.activityProgress[a.id]);safeSave();rerenderWorkspace();}return true;}
    if(action==="open-article"){state.workspaceData.article=id;rerenderWorkspace();return true;}
    if(action==="glossary-tool"){const mapped={comparison:"comparison",measurement:"measurement",scale:"scale",orbit:"orbit",time:"time",seasons:"seasons",moon:"moon"};setWorkspace(mapped[tool]||"orbit");return true;}
    if(action==="collection-tab"){state.workspaceData.collectionTab=node.dataset.tab;rerenderWorkspace();return true;}
    if(action==="restore-viewpoint"){restoreViewpoint(id);return true;}
    if(action==="duplicate-viewpoint"){duplicateViewpoint(id);return true;}
    if(action==="delete-viewpoint"){deleteCollectionItem("viewpoints",id,L("Excluir este ponto de vista?","Delete this viewpoint?"));return true;}
    if(action==="add-bookmark"){addBookmark();return true;}
    if(action==="restore-bookmark"){restoreBookmark(id);return true;}
    if(action==="delete-bookmark"){deleteCollectionItem("bookmarks",id,L("Excluir somente este instante marcado?","Delete only this bookmarked instant?"));return true;}
    if(action==="save-note"){saveNote();return true;}
    if(action==="edit-note"){editNote(id);return true;}
    if(action==="delete-note"){deleteCollectionItem("notes",id,L("Excluir somente esta anotação?","Delete only this note?"));return true;}
    if(action==="collection-focus"){closeWorkspace();focusBody(id);return true;}
    if(action==="clear-measurements"){if(confirm(L("Limpar somente o histórico de medições?","Clear measurement history only?"))){state.collections.measurements=[];safeSave();rerenderWorkspace();}return true;}
    if(action==="export-data"){exportLocalData();return true;}
    if(action==="preview-import"){previewImport();return true;}
    if(action==="apply-import"){applyImport();return true;}
    if(action==="clear-local-data"){clearLocalCollections();return true;}
    if(action==="settings-tab"){state.workspaceData.settingsTab=node.dataset.tab;rerenderWorkspace();return true;}
    if(action==="visual-preset"){applyVisualPreset(node.dataset.preset);return true;}
    if(action==="open-data-control"){state.workspaceKind="collections";state.workspaceData={collectionTab:"data"};renderWorkspace();return true;}
    if(action==="reset-visuals"){resetVisualPreferences();return true;}
    if(action==="restart-tutorial"){state.onboardingDone=false;safeSave();closeWorkspace();$("#welcome").hidden=false;return true;}
    if(action==="time-step"){stepTime(Number(node.dataset.seconds));rerenderWorkspace();return true;}
    if(action==="set-rate"){state.speed=Number(value);state.previousSpeed=state.speed;state.playing=true;updateTimeUI();rerenderWorkspace();return true;}
    if(action==="reset-simulation"){state.dateMs=sessionStartMs;state.playing=true;state.direction=1;state.speed=86400;runtime.orbitCache.clear();updateTimeUI();toast(L("Simulação redefinida ao início desta edição.","Simulation reset to this edition's session start."),"success");rerenderWorkspace();return true;}
    if(action==="reset-view"){overview();rerenderWorkspace();return true;}
    if(action==="go-now"){state.dateMs=Date.now();state.playing=false;updateTimeUI();runtime.orbitCache.clear();rerenderWorkspace();return true;}
    if(action==="session-start"){state.dateMs=sessionStartMs;state.playing=false;runtime.orbitCache.clear();rerenderWorkspace();return true;}
    if(action==="j2000"){state.dateMs=S.J2000_MS;state.playing=false;runtime.orbitCache.clear();runtime.overlayCache.clear();updateTimeUI();rerenderWorkspace();return true;}
    if(action==="apply-date"){applyDateInput();return true;}
    if(action==="set-frame"){setReferenceFrame(id);return true;}
    if(action==="photo-capture"){capturePhoto();return true;}
    if(action==="photo-exit"){exitPhotoMode();return true;}
    if(action==="photo-preset"){applyPhotoPreset(node.dataset.preset);return true;}
    if(action==="share-scene"){shareScene();return true;}
    return false;
  }

  function handleToolControl(control,value,node,event,isInput){
    if(control==="compare-body"){state.comparison.ids[Number(node.dataset.index)]=value;if(!state.comparison.ids.includes(state.comparison.reference))state.comparison.reference=value;rerenderWorkspace();return;}
    if(control==="compare-reference"){state.comparison.reference=value;rerenderWorkspace();return;}
    if(control==="compare-sync"){state.comparison.synchronized=!!value;rerenderWorkspace();return;}
    if(control==="measure-a"||control==="measure-b"){state.measurement[control.slice(-1)]=value;state.measurement.frozen=null;rerenderWorkspace();return;}
    if(control==="measure-observer"){state.measurement.observer=value;state.measurement.frozen=null;rerenderWorkspace();return;}
    if(control==="measure-live"){state.measurement.live=!!value;if(!value)state.measurement.frozen=calculateMeasurement();rerenderWorkspace();return;}
    if(control==="measure-pulse"){state.measurement.pulse=!!value;rerenderWorkspace();return;}
    if(control==="earth-size"){state.scaleLab.earthSizeCm=Number(value);if(!isInput)rerenderWorkspace();return;}
    if(control==="scale-preset"){const sets={inner:["mercury","venus","earth","mars"],giants:["jupiter","saturn","uranus","neptune"],"earth-moon":["earth","moon"],"all-planets":["mercury","venus","earth","mars","jupiter","saturn","uranus","neptune"]};if(sets[value])state.scaleLab.ids=sets[value];rerenderWorkspace();return;}
    if(control==="season-tilt"){state.seasonsLab.tilt=Number(value);if(!isInput)rerenderWorkspace();return;}
    if(control==="season-lat"){state.seasonsLab.latitude=Number(value);if(!isInput)rerenderWorkspace();return;}
    if(control==="season-lon"){state.seasonsLab.longitude=Number(value);if(!isInput)rerenderWorkspace();return;}
    if(control==="moon-phase"){state.moonLab.phase=Number(value);state.moonLab.eclipse="none";if(!isInput)rerenderWorkspace();return;}
    if(control==="moon-inclination"){state.moonLab.inclination=!!value;rerenderWorkspace();return;}
    if(control==="orbit-mass"){state.orbitLab.massEarths=Number(value);if(!isInput)rerenderWorkspace();return;}
    if(control==="orbit-a"){state.orbitLab.semiMajorKm=Number(value);if(!isInput)rerenderWorkspace();return;}
    if(control==="orbit-e"){state.orbitLab.eccentricity=Number(value);if(!isInput)rerenderWorkspace();return;}
    if(control==="test-mass"){const v=Number(value);if(Number.isFinite(v)&&v>=0)state.orbitLab.testMass=v;if(!isInput)rerenderWorkspace();return;}
    if(control==="date-scrub"){const check=S.validDateMs(Number(value));if(check.ok){state.dateMs=check.value;state.playing=false;runtime.orbitCache.clear();runtime.overlayCache.clear();updateTimeUI();if(!isInput)rerenderWorkspace();}return;}
    if(control==="glossary-search"){const q=String(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");$$('.article-nav button[data-action="open-article"]').forEach(b=>{const a=D.glossary.find(x=>x.id===b.dataset.id);const h=`${a.title.pt} ${a.title.en} ${a.short.pt} ${a.short.en}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");b.hidden=!h.includes(q);});return;}
    if(control==="presentation"){state.presentation=value;applyPreferences();safeSave();rerenderWorkspace();return;}
    if(control==="quality"){state.quality=value;state.effectiveQuality=value==="auto"?"high":value;applyPreferences();resizeCanvas();safeSave();rerenderWorkspace();return;}
    if(control==="background"){state.background=Number(value);applyPreferences();safeSave();if(!isInput)rerenderWorkspace();return;}
    if(control==="panel-opacity"){state.panelOpacity=Number(value);applyPreferences();safeSave();if(!isInput)rerenderWorkspace();return;}
    if(control==="language"){state.lang=value;applyTranslations();renderNavigator();renderInspector();updateStatus();updateTimeUI();safeSave();rerenderWorkspace();renderTourHud();return;}
    if(control==="main-scale"){setMainScale(value);rerenderWorkspace();return;}
    if(control==="labels"){state.labels=value;safeSave();rerenderWorkspace();return;}
    if(control==="orbits"){state.orbitMode=value;runtime.orbitCache.clear();safeSave();rerenderWorkspace();return;}
    if(control.startsWith("overlay-")){const key=control.slice(8);if(Object.prototype.hasOwnProperty.call(state.overlays,key)){state.overlays[key]=!!value;runtime.overlayCache.clear();safeSave();rerenderWorkspace();}return;}
    if(control==="units"){state.units=value;safeSave();rerenderWorkspace();return;}
    if(control==="reduced-motion"){state.reducedMotion=!!value;applyPreferences();safeSave();rerenderWorkspace();return;}
    if(control==="high-contrast"){state.highContrast=!!value;applyPreferences();safeSave();rerenderWorkspace();return;}
    if(control==="simple-mode"){state.simpleMode=!!value;applyPreferences();safeSave();rerenderWorkspace();return;}
    if(control==="ui-scale"){state.uiScale=Number(value);applyPreferences();safeSave();if(!isInput)rerenderWorkspace();return;}
    if(control==="audio"){state.audio=!!value;if(!state.audio)stopNarration();safeSave();rerenderWorkspace();return;}
    if(control==="narration"){state.narration=!!value;safeSave();rerenderWorkspace();return;}
    if(control==="custom-rate"){const v=Number(value);if(Number.isFinite(v)&&v>=1&&v<=1e8){state.speed=v;state.previousSpeed=v;updateTimeUI();}return;}
    if(control==="date-value"){state.workspaceData.pendingDate=value;return;}
    if(control==="photo-ratio"){runtime.photoOptions.ratio=value;return;}
    if(control==="photo-multiplier"){runtime.photoOptions.multiplier=Number(value);return;}
    if(control==="photo-labels"){runtime.photoOptions.labels=!!value;return;}
    if(control==="photo-date"){runtime.photoOptions.date=!!value;return;}
    if(control==="photo-scale"){runtime.photoOptions.scale=!!value;return;}
  }

  function setMainScale(mode){if(!["exploration","relative"].includes(mode))return;state.scaleMode=mode;runtime.orbitCache.clear();runtime.physical=S.allPhysicalPositions(state.dateMs,D);runtime.positions=S.allDisplayPositions(state.dateMs,D,state.scaleMode,runtime.physical);const target=runtime.positions.get(state.selectedId);if(target)transitionCamera({target:{...target},distance:state.scaleMode==="relative"?Math.max(70,runtime.camera.distance):Math.min(315,runtime.camera.distance)},L("Escala visual alterada; estado físico preservado.","Visual scale changed; physical state preserved."));safeSave();updateStatus();toast(L("A escala mudou; tempo, medições e razões físicas foram preservados.","Scale changed; time, measurements, and physical ratios were preserved."));}
  function toggleMainScale(){setMainScale(state.scaleMode==="exploration"?"relative":"exploration");}

  function saveMeasurement(){const m=currentMeasurement();if(!m)return;state.collections.measurements.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),a:state.measurement.a,b:state.measurement.b,observer:m.observer,km:m.km,au:m.au,lightSeconds:m.lightSeconds,angularDeg:m.angularDeg,dateMs:m.dateMs});safeSave();toast(L("Medição salva localmente.","Measurement saved locally."),"success");rerenderWorkspace();}
  function saveExperiment(){const v=state.orbitLab;state.collections.experiments.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),label:L("Modelo hipotético de dois corpos","Hypothetical two-body model"),massEarths:v.massEarths,semiMajorKm:v.semiMajorKm,eccentricity:v.eccentricity,testMass:v.testMass,assumptions:"spherical central mass; negligible test mass; bound Keplerian ellipse",createdAt:new Date().toISOString()});safeSave();toast(L("Predefinição hipotética salva; o Sistema Solar não foi alterado.","Hypothetical preset saved; the Solar System was not changed."),"success");}

  function applyVisualPreset(preset){const presets={cinematic:{presentation:"enhanced",background:.9,labels:"selected",orbitMode:"selected",quality:"high"},classroom:{presentation:"natural",background:.35,labels:"major",orbitMode:"all",highContrast:true},study:{presentation:"natural",background:.65,labels:"system",orbitMode:"all",quality:"high"},low:{presentation:"natural",background:.35,labels:"major",orbitMode:"selected",quality:"low"}};Object.assign(state,presets[preset]||{});state.effectiveQuality=state.quality==="auto"?state.effectiveQuality:state.quality;applyPreferences();resizeCanvas();safeSave();rerenderWorkspace();toast(L("Predefinição aplicada; você ainda pode ajustar cada opção.","Preset applied; every option remains adjustable."),"success");}
  function resetVisualPreferences(){Object.assign(state,{quality:defaultPreferences.quality,effectiveQuality:"high",presentation:defaultPreferences.presentation,background:defaultPreferences.background,labels:defaultPreferences.labels,orbitMode:defaultPreferences.orbitMode,overlays:Object.assign({},defaultPreferences.overlays),highContrast:false,simpleMode:false,uiScale:1,panelOpacity:.86,reducedMotion:matchMedia("(prefers-reduced-motion: reduce)").matches});runtime.overlayCache.clear();applyPreferences();safeSave();rerenderWorkspace();toast(L("Preferências visuais redefinidas; coleções foram preservadas.","Visual preferences reset; collections were preserved."),"success");}

  function downloadBlob(name,content,type="text/plain;charset=utf-8"){
    const blob=content instanceof Blob?content:new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function csvCell(value){const text=String(value==null?"":value);return /[",\n]/.test(text)?`"${text.replace(/"/g,'""')}"`:text;}
  function exportComparisonCsv(){const bodies=state.comparison.ids.map(D.getBody);const fields=[["diameter","Mean diameter"],["mass","Mass"],["gravity","Reference gravity"],["density","Mean density"],["rotation","Sidereal rotation"],["orbit","Orbital period"],["temperature","Temperature context"]];const lines=[["Quantity",...bodies.map(b=>b.name.en)],...fields.map(([k,label])=>[label,...bodies.map(b=>comparisonField(b,k))])];downloadBlob("solar-comparison.csv",lines.map(r=>r.map(csvCell).join(",")).join("\n"),"text/csv;charset=utf-8");toast(L("Tabela de comparação exportada.","Comparison table exported."),"success");}
  function exportComparisonSvg(){const bodies=state.comparison.ids.map(D.getBody),max=Math.max(...bodies.map(b=>b.radiusKm));const width=900,height=520,spacing=width/(bodies.length+1);const circles=bodies.map((b,i)=>{const raw=b.radiusKm/max*150,r=Math.max(2,raw);return `<g><circle cx="${spacing*(i+1)}" cy="260" r="${r}" fill="${b.color}"/><circle cx="${spacing*(i+1)}" cy="260" r="${raw<3?7:0}" fill="none" stroke="#59d7f7"/><text x="${spacing*(i+1)}" y="445" text-anchor="middle" fill="#f1f6fd" font-family="system-ui" font-size="18">${escapeHtml(b.name[state.lang])}</text><text x="${spacing*(i+1)}" y="472" text-anchor="middle" fill="#91a4b9" font-family="monospace" font-size="13">${escapeHtml(S.formatDistance(b.radiusKm*2,localeOf()))}</text></g>`;}).join("");const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#050911"/><text x="28" y="38" fill="#f1f6fd" font-family="system-ui" font-size="22" font-weight="600">${escapeHtml(L("Comparação linear de diâmetros","Linear diameter comparison"))}</text><text x="28" y="64" fill="#7e91a8" font-family="system-ui" font-size="12">Solar System Observatory · ${D.sourceDate}</text>${circles}<line x1="40" y1="415" x2="860" y2="415" stroke="#334457"/></svg>`;downloadBlob("solar-diameter-comparison.svg",svg,"image/svg+xml;charset=utf-8");toast(L("Imagem SVG exportada com unidades e escala comum.","SVG image exported with units and common scale."),"success");}
  function exportMeasurements(){const rows=[["endpoint_a","endpoint_b","angular_observer","distance_km","distance_au","one_way_light_seconds","angular_separation_deg","utc"]].concat(state.collections.measurements.map(m=>[D.getBody(m.a)?.name.en||m.a,D.getBody(m.b)?.name.en||m.b,D.getBody(m.observer)?.name.en||m.observer||"",m.km,m.au,m.lightSeconds,Number.isFinite(m.angularDeg)?m.angularDeg:"",new Date(m.dateMs).toISOString()]));downloadBlob("solar-measurements.csv",rows.map(r=>r.map(csvCell).join(",")).join("\n"),"text/csv;charset=utf-8");toast(L("Histórico de medições exportado.","Measurement history exported."),"success");}

  function restoreViewpoint(id){const v=state.collections.viewpoints.find(x=>x.id===id);if(!v)return;state.selectedId=v.targetId;if(v.restoreDate&&Number.isFinite(v.dateMs))state.dateMs=v.dateMs;setMainScale(v.scaleMode);state.labels=v.labels||state.labels;state.orbitMode=v.orbits||state.orbitMode;if(v.overlays&&typeof v.overlays==="object")state.overlays=Object.assign({},state.overlays,v.overlays);runtime.overlayCache.clear();closeWorkspace();transitionCamera({target:{...v.camera.target},distance:v.camera.distance,yaw:v.camera.yaw,pitch:v.camera.pitch},L("Ponto de vista restaurado.","Viewpoint restored."));renderNavigator();renderInspector();}
  function duplicateViewpoint(id){const v=state.collections.viewpoints.find(x=>x.id===id);if(!v)return;state.collections.viewpoints.push(Object.assign({},v,{id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),title:`${v.title} · ${L("cópia","copy")}`,createdAt:new Date().toISOString()}));safeSave();rerenderWorkspace();}
  function deleteCollectionItem(kind,id,message){if(!confirm(message))return;state.collections[kind]=state.collections[kind].filter(x=>x.id!==id);safeSave();rerenderWorkspace();toast(L("Item removido.","Item removed."));}
  function addBookmark(){const body=D.getBody(state.selectedId);state.collections.bookmarks.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),title:`${bodyName(body)} · ${new Date(state.dateMs).toISOString().slice(0,10)}`,dateMs:state.dateMs,targetId:body.id,scaleMode:state.scaleMode});safeSave();rerenderWorkspace();toast(L("Instante marcado localmente.","Instant bookmarked locally."),"success");}
  function restoreBookmark(id){const b=state.collections.bookmarks.find(x=>x.id===id);if(!b)return;state.dateMs=b.dateMs;state.playing=false;state.selectedId=b.targetId;runtime.orbitCache.clear();closeWorkspace();focusBody(b.targetId);toast(L("Instante restaurado; reprodução pausada.","Instant restored; playback paused."),"success");}
  function saveNote(){const title=$("#note-title")?.value.trim(),body=$("#note-body")?.value.trim();if(!title||!body){toast(L("Título e anotação são necessários.","Title and note are required."),"error");return;}if(title.length>80||body.length>2000){toast(L("A anotação excede o limite local.","The note exceeds the local limit."),"error");return;}const editId=state.workspaceData.editNoteId;if(editId){const item=state.collections.notes.find(n=>n.id===editId);if(item){item.title=title;item.body=body;item.updatedAt=new Date().toISOString();}}else state.collections.notes.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),title,body,targetId:state.selectedId,dateMs:state.dateMs,createdAt:new Date().toISOString()});state.workspaceData={collectionTab:"notes"};safeSave();rerenderWorkspace();toast(L("Anotação confirmada no armazenamento local.","Note confirmed in local storage."),"success");}
  function editNote(id){const item=state.collections.notes.find(n=>n.id===id);if(!item)return;state.workspaceData={collectionTab:"notes",editNoteId:id,noteTitle:item.title,noteBody:item.body};rerenderWorkspace();setTimeout(()=>$("#note-body")?.focus(),0);}
  function exportLocalData(){const payload={schema:"solar-observatory-export",version:1,exportedAt:new Date().toISOString(),sourceDate:D.sourceDate,preferences:{lang:state.lang,quality:state.quality,presentation:state.presentation,scaleMode:state.scaleMode,labels:state.labels,orbitMode:state.orbitMode,overlays:Object.assign({},state.overlays),background:state.background,reducedMotion:state.reducedMotion,highContrast:state.highContrast,simpleMode:state.simpleMode,uiScale:state.uiScale,panelOpacity:state.panelOpacity,units:state.units},collections:state.collections,activityProgress:state.activityProgress};downloadBlob("solar-observatory-data.json",JSON.stringify(payload,null,2),"application/json");toast(L("Dados locais exportados; nenhuma nota foi enviada à rede.","Local data exported; no note was sent to the network."),"success");}
  function validateImport(parsed){const errors=[];if(!parsed||parsed.schema!=="solar-observatory-export"||parsed.version!==1)errors.push(L("Esquema ou versão incompatível.","Incompatible schema or version."));const c=parsed&&parsed.collections;if(!c||typeof c!=="object")errors.push(L("Coleções ausentes.","Collections missing."));else{["favorites","bookmarks","viewpoints","notes","measurements","experiments"].forEach(k=>{if(!Array.isArray(c[k]))errors.push(`${k}: ${L("deve ser uma lista","must be a list")}`);if(Array.isArray(c[k])&&c[k].length>1000)errors.push(`${k}: ${L("muitos itens","too many items")}`);});if(Array.isArray(c.favorites)&&c.favorites.some(id=>!D.getBody(id)))errors.push(L("Favorito contém identificador desconhecido.","Favorites contain an unknown identifier."));if(Array.isArray(c.notes)&&c.notes.some(n=>typeof n.title!=="string"||typeof n.body!=="string"||n.title.length>80||n.body.length>2000||!D.getBody(n.targetId)))errors.push(L("Anotação inválida ou longa demais.","Invalid or oversized note."));if(Array.isArray(c.bookmarks)&&c.bookmarks.some(b=>!D.getBody(b.targetId)||!S.validDateMs(b.dateMs).ok))errors.push(L("Instante marcado inválido.","Invalid bookmark."));if(Array.isArray(c.viewpoints)&&c.viewpoints.some(v=>!D.getBody(v.targetId)||!v.camera||![v.camera.distance,v.camera.yaw,v.camera.pitch].every(Number.isFinite)))errors.push(L("Ponto de vista inválido.","Invalid viewpoint."));}return errors;}
  function previewImport(){const input=$("#import-file"),file=input&&input.files&&input.files[0],target=$("#import-preview");if(!file){toast(L("Escolha um arquivo JSON.","Choose a JSON file."),"error");return;}if(file.size>2_000_000){toast(L("Arquivo excede 2 MB.","File exceeds 2 MB."),"error");return;}const reader=new FileReader();reader.onload=()=>{try{const parsed=JSON.parse(reader.result);const errors=validateImport(parsed);if(errors.length){state.workspaceData.importCandidate=null;target.innerHTML=`<div class="tool-note">${escapeHtml(errors.join(" · "))}</div>`;}else{state.workspaceData.importCandidate=parsed;const c=parsed.collections;target.innerHTML=`<div class="tool-note accent"><strong>${escapeHtml(L("Prévia válida","Valid preview"))}</strong><br>${escapeHtml(`${c.favorites.length} ${L("favoritos","favorites")}, ${c.viewpoints.length} ${L("vistas","views")}, ${c.bookmarks.length} ${L("instantes","instants")}, ${c.notes.length} ${L("anotações","notes")}.`)}</div><button class="button primary" data-action="apply-import">${escapeHtml(L("Substituir coleções por esta prévia","Replace collections with this preview"))}</button>`;}}catch(error){target.innerHTML=`<div class="tool-note">${escapeHtml(L("JSON malformado; nada foi importado.","Malformed JSON; nothing was imported."))}</div>`;}};reader.onerror=()=>toast(L("Não foi possível ler o arquivo selecionado.","Could not read the selected file."),"error");reader.readAsText(file);}
  function applyImportedPreferences(p){if(!p||typeof p!=="object")return;if(["pt","en"].includes(p.lang))state.lang=p.lang;if(["auto","low","medium","high"].includes(p.quality)){state.quality=p.quality;state.effectiveQuality=p.quality==="auto"?"high":p.quality;}if(["natural","enhanced"].includes(p.presentation))state.presentation=p.presentation;if(["exploration","relative"].includes(p.scaleMode))state.scaleMode=p.scaleMode;if(["major","system","selected","favorites","none"].includes(p.labels))state.labels=p.labels;if(["all","selected","system","none"].includes(p.orbitMode))state.orbitMode=p.orbitMode;if(Number.isFinite(p.background))state.background=S.clamp(p.background,0,1);if(Number.isFinite(p.panelOpacity))state.panelOpacity=S.clamp(p.panelOpacity,.55,1);if(Number.isFinite(p.uiScale))state.uiScale=S.clamp(p.uiScale,.9,1.3);if(["metric","familiar"].includes(p.units))state.units=p.units;["reducedMotion","highContrast","simpleMode"].forEach(key=>{if(typeof p[key]==="boolean")state[key]=p[key];});if(p.overlays&&typeof p.overlays==="object")Object.keys(state.overlays).forEach(key=>{if(typeof p.overlays[key]==="boolean")state.overlays[key]=p.overlays[key];});}
  function applyImport(){const candidate=state.workspaceData.importCandidate;if(!candidate)return;const errors=validateImport(candidate);if(errors.length){toast(L("A prévia deixou de ser válida; nada foi alterado.","Preview is no longer valid; nothing changed."),"error");return;}if(!confirm(L("Substituir as coleções locais e aplicar as preferências validadas?","Replace local collections and apply validated preferences?")))return;state.collections=JSON.parse(JSON.stringify(candidate.collections));state.activityProgress=Object.assign({},candidate.activityProgress||{});applyImportedPreferences(candidate.preferences);runtime.orbitCache.clear();runtime.overlayCache.clear();applyTranslations();applyPreferences();safeSave();state.workspaceData={collectionTab:"data"};rerenderWorkspace();renderNavigator();renderInspector();updateStatus();updateTimeUI();toast(L("Importação concluída após validação.","Import completed after validation."),"success");}
  function clearLocalCollections(){if(!confirm(L("Limpar favoritos, vistas, instantes, notas, medições e experimentos? Preferências visuais serão preservadas.","Clear favorites, views, instants, notes, measurements, and experiments? Visual preferences will be preserved.")))return;state.collections=JSON.parse(JSON.stringify(defaultCollections));safeSave();state.workspaceData={collectionTab:"data"};rerenderWorkspace();renderNavigator();toast(L("Coleções locais removidas; preferências preservadas.","Local collections removed; preferences preserved."));}

  function applyDateInput(){const value=$("#date-input")?.value;const check=S.validDateMs(value?`${value}:00Z`:NaN);const error=$("#date-error");if(!check.ok){error.hidden=false;error.textContent=check.reason==="range"?L("Escolha uma data entre 1800 e 2050.","Choose a date from 1800 through 2050."):L("Data inválida.","Invalid date.");return;}state.dateMs=check.value;state.playing=false;runtime.orbitCache.clear();error.hidden=true;updateTimeUI();toast(L("Data aplicada; a simulação ficou pausada.","Date applied; simulation is paused."),"success");rerenderWorkspace();}
  function setReferenceFrame(id){if(!["sun","earth"].includes(id))return;state.referenceFrame=id;if(id==="earth")focusBody("earth",{system:true});else overview();closeWorkspace();updateStatus();toast(id==="earth"?L("Interpretação geométrica centrada na Terra; estado físico preservado.","Earth-centered geometric interpretation; physical state preserved."):L("Referencial heliocêntrico restaurado.","Heliocentric frame restored."));}

  function startTour(id){const tour=D.tours.find(t=>t.id===id);if(!tour)return;closeWorkspace();const previousProgress=Number(state.activityProgress[`tour:${id}`])||0;const index=Math.min(tour.stops.length-1,Math.floor(previousProgress*tour.stops.length));state.tour={id,index,paused:false,suspended:false,auto:false,enteredAt:performance.now(),restore:{scaleMode:state.scaleMode,labels:state.labels,orbitMode:state.orbitMode,playing:state.playing,direction:state.direction,speed:state.speed,followingId:state.followingId,camera:{target:{...runtime.camera.target},distance:runtime.camera.distance,yaw:runtime.camera.yaw,pitch:runtime.camera.pitch},selectedId:state.selectedId}};state.labels="system";state.orbitMode="selected";applyTourStop();renderTourHud();}
  function applyTourStop(){if(!state.tour)return;const tour=D.tours.find(t=>t.id===state.tour.id),stop=tour.stops[state.tour.index];state.tour.enteredAt=performance.now();state.tour.paused=false;state.tour.suspended=false;selectBody(stop[0]);focusBody(stop[0],{system:D.childrenOf(stop[0]).length>0});renderTourHud();if(state.audio&&state.narration)narrateTour();}
  function renderTourHud(){const hud=$("#tour-hud");if(!state.tour){hud.hidden=true;return;}const tour=D.tours.find(t=>t.id===state.tour.id),stop=tour.stops[state.tour.index],last=state.tour.index===tour.stops.length-1;hud.innerHTML=`<div class="tour-hud-head"><div><span class="eyebrow">${escapeHtml(tour.title[state.lang])} · ${state.tour.index+1}/${tour.stops.length}</span><h3>${escapeHtml(stop[1][state.lang])}</h3></div><button class="icon-button compact" data-action="tour-exit" aria-label="${escapeHtml(L("Sair do tour","Exit tour"))}">×</button></div><p>${escapeHtml(stop[2][state.lang])}${state.tour.suspended?` <strong>${escapeHtml(L("Exploração manual: retome quando quiser.","Manual exploration: resume when ready."))}</strong>`:""}</p><div class="tour-controls"><button class="button compact ghost" data-action="tour-prev" ${state.tour.index===0?"disabled":""}>←</button><button class="button compact primary" data-action="tour-toggle">${escapeHtml(state.tour.paused||state.tour.suspended?L("Retomar","Resume"):L("Pausar","Pause"))}</button><button class="button compact secondary" data-action="tour-next">${escapeHtml(last?L("Concluir","Finish"):L("Próxima","Next"))} →</button><div class="progress-track" style="--progress:${(state.tour.index+1)/tour.stops.length*100}%"><i></i></div><button class="button compact ghost" data-action="tour-auto" aria-pressed="${state.tour.auto}">${escapeHtml(state.tour.auto?L("Auto ligado","Auto on"):L("Manual","Manual"))}</button>${"speechSynthesis" in window?`<button class="button compact ghost" data-action="tour-narrate" aria-label="${escapeHtml(L("Narrar parada","Narrate stop"))}">♬</button>`:""}</div>`;hud.hidden=false;}
  function tourMove(delta){if(!state.tour)return;const tour=D.tours.find(t=>t.id===state.tour.id);if(delta>0&&state.tour.index===tour.stops.length-1){state.activityProgress[`tour:${tour.id}`]=1;safeSave();const optional=state.tour.id==="earth-moon"?"phase":state.tour.id==="scale"?"emptiness":null;exitTour();toast(L("Tour concluído.","Tour completed."),"success");if(optional&&confirm(L("Deseja abrir uma atividade relacionada?","Open a related activity?")))startActivity(optional);return;}state.tour.index=S.clamp(state.tour.index+delta,0,tour.stops.length-1);state.activityProgress[`tour:${tour.id}`]=state.tour.index/tour.stops.length;safeSave();applyTourStop();}
  function updateTour(now){if(!state.tour||state.tour.paused||state.tour.suspended||!state.tour.auto)return;const tour=D.tours.find(t=>t.id===state.tour.id),stop=tour.stops[state.tour.index],duration=Math.max(7000,stop[2][state.lang].length*55);if(now-state.tour.enteredAt>duration)tourMove(1);}
  function suspendTourForManual(){if(!state.tour)return;state.tour.suspended=true;state.tour.paused=true;stopNarration();renderTourHud();}
  function exitTour(){if(!state.tour)return;const r=state.tour.restore;stopNarration();state.scaleMode=r.scaleMode;state.labels=r.labels;state.orbitMode=r.orbitMode;state.playing=r.playing;state.direction=r.direction;state.speed=r.speed;state.followingId=r.followingId;state.selectedId=r.selectedId;runtime.orbitCache.clear();transitionCamera(r.camera,L("Estado anterior ao tour restaurado.","Pre-tour state restored."));state.tour=null;renderTourHud();renderNavigator();renderInspector();updateStatus();safeSave();}
  function narrateTour(){if(!("speechSynthesis" in window)){toast(L("Narração não suportada; o texto permanece completo.","Narration unsupported; text remains complete."),"error");return;}if(!state.audio||!state.narration){toast(L("Ative Áudio mestre e Narração nas configurações.","Enable Master audio and Narration in settings."));return;}const tour=D.tours.find(t=>t.id===state.tour.id),stop=tour.stops[state.tour.index];stopNarration();const utter=new SpeechSynthesisUtterance(`${stop[1][state.lang]}. ${stop[2][state.lang]}`);utter.lang=state.lang==="pt"?"pt-BR":"en-US";speechSynthesis.speak(utter);}
  function stopNarration(){if("speechSynthesis" in window)speechSynthesis.cancel();}

  function startActivity(id){const a=D.activities.find(x=>x.id===id);if(!a)return;state.activeActivity={id,progress:[]};if(a.kind==="choice"||a.kind==="text-choice"){state.workspaceKind="activities";state.workspaceData={activityQuestion:id};$("#workspace").hidden=false;renderWorkspace();return;}if(a.kind==="sequence"){closeWorkspace();toast(`${a.objective[state.lang]} ${L("Use a cena ou o catálogo.","Use the scene or catalog.")}`,"info",6000);return;}if(a.kind==="lab"){setWorkspace(a.tool);toast(a.objective[state.lang],"info",5500);return;}if(a.kind==="scene"){closeWorkspace();focusBody("saturn");toast(a.objective[state.lang],"info",5500);return;}}
  function answerActivity(id,answer){const a=D.activities.find(x=>x.id===id);if(!a)return;const expected=String(a.answer),correct=answer===expected;if(correct)completeActivity(id);else{toast(L("Ainda não. Use os dados e tente novamente.","Not yet. Use the data and try again."),"error");const buttons=$$("[data-action='answer-activity']");buttons.forEach(b=>b.disabled=false);}}
  function trackActivitySelection(id){const active=state.activeActivity;if(!active)return;const a=D.activities.find(x=>x.id===active.id);if(!a||a.kind!=="sequence")return;const expected=a.answer[active.progress.length];if(id===expected){active.progress.push(id);toast(L(`Etapa ${active.progress.length}/${a.answer.length} correta.`,`Step ${active.progress.length}/${a.answer.length} correct.`),"success");if(active.progress.length===a.answer.length)completeActivity(a.id);}else{active.progress=[];toast(L("Sequência reiniciada; volte ao primeiro mundo.","Sequence restarted; return to the first world."),"error");}}
  function checkActivity(check){if(check==="tilt-zero"&&Math.abs(state.seasonsLab.tilt)<.01){completeActivity("seasons");return;}if(check==="earth-weight"&&Math.abs(state.orbitLab.massEarths-1)<.01&&Math.abs(state.orbitLab.testMass-10)<.01){completeActivity("gravity");return;}if(check==="combined-scale"&&state.scaleLab.view==="combined"){completeActivity("emptiness");return;}toast(L("O estado ainda não corresponde ao objetivo. Ajuste os controles e tente outra vez.","The state does not yet match the objective. Adjust the controls and try again."),"error");}
  function completeActivity(id){state.activityProgress[id]=true;state.activeActivity=null;safeSave();toast(L("Atividade concluída — resultado verificado pelo estado atual.","Activity complete — result verified from current state."),"success",4500);if(state.workspaceKind==="activities"){state.workspaceData={};rerenderWorkspace();}}

  function photoToolbarHtml(){return `<div class="photo-toolbar glass"><button class="button compact ghost" data-action="photo-exit">← ${escapeHtml(L("Sair","Exit"))}</button><label>${escapeHtml(L("Formato","Ratio"))}<select data-control="photo-ratio"><option value="viewport">${escapeHtml(L("Janela","Viewport"))}</option><option value="16:9">16:9</option><option value="1:1">1:1</option><option value="4:5">4:5</option></select></label><label>${escapeHtml(L("Resolução","Resolution"))}<select data-control="photo-multiplier"><option value="1">1×</option><option value="2">2×</option></select></label><label><input type="checkbox" data-control="photo-labels" ${runtime.photoOptions.labels?"checked":""}> ${escapeHtml(L("Rótulos","Labels"))}</label><label><input type="checkbox" data-control="photo-date" ${runtime.photoOptions.date?"checked":""}> UTC</label><label><input type="checkbox" data-control="photo-scale" ${runtime.photoOptions.scale?"checked":""}> ${escapeHtml(L("Escala","Scale"))}</label><button class="button compact secondary" data-action="photo-preset" data-preset="terminator">${escapeHtml(L("Terminador","Terminator"))}</button><button class="button compact secondary" data-action="photo-preset" data-preset="rings">${escapeHtml(L("Anéis","Rings"))}</button><button class="button compact ghost" data-action="share-scene">↗ ${escapeHtml(L("Compartilhar cena","Share scene"))}</button><button class="button compact primary" data-action="photo-capture">⌾ ${escapeHtml(L("Capturar PNG","Capture PNG"))}</button></div>`;}
  function enterPhotoMode(){if(state.photoMode)return;closeWorkspace();state.photoMode=true;runtime.photoRestore={playing:state.playing,navigatorOpen:state.navigatorOpen,inspectorOpen:state.inspectorOpen,labels:state.labels,orbitMode:state.orbitMode};state.playing=false;$("#app").classList.add("photo-mode");$("#app").insertAdjacentHTML("beforeend",photoToolbarHtml());toast(L("Simulação congelada para composição; será restaurada ao sair.","Simulation frozen for composition; it will be restored on exit."));}
  function exitPhotoMode(){if(!state.photoMode)return;state.photoMode=false;const r=runtime.photoRestore||{};state.playing=!!r.playing;state.navigatorOpen=r.navigatorOpen;state.inspectorOpen=r.inspectorOpen;state.labels=r.labels||state.labels;state.orbitMode=r.orbitMode||state.orbitMode;$("#app").classList.remove("photo-mode");$(".photo-toolbar")?.remove();setPanels();}
  function applyPhotoPreset(preset){if(preset==="terminator"){selectBody("earth");focusBody("earth");runtime.camera.yaw=-1.35;runtime.camera.pitch=.2;}else{selectBody("saturn");focusBody("saturn");runtime.camera.yaw=-.7;runtime.camera.pitch=.28;}toast(L("Ponto cinematográfico aplicado à cena real.","Cinematic preset applied to the live scene."));}
  function capturePhoto(){if(!runtime.rendererOk){toast(L("Captura indisponível sem canvas.","Capture unavailable without canvas."),"error");return;}const baseW=Math.round(runtime.width),baseH=Math.round(runtime.height);let ratio=baseW/baseH;if(runtime.photoOptions.ratio==="16:9")ratio=16/9;else if(runtime.photoOptions.ratio==="1:1")ratio=1;else if(runtime.photoOptions.ratio==="4:5")ratio=.8;let w=baseW*runtime.photoOptions.multiplier,h=Math.round(w/ratio);if(h>baseH*runtime.photoOptions.multiplier&&runtime.photoOptions.ratio!=="viewport"){h=baseH*runtime.photoOptions.multiplier;w=Math.round(h*ratio);}const max=4096,shrink=Math.min(1,max/Math.max(w,h));w=Math.max(640,Math.round(w*shrink));h=Math.max(480,Math.round(h*shrink));const canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;const ctx=canvas.getContext("2d");const old={width:runtime.width,height:runtime.height,labels:state.labels};runtime.width=w;runtime.height=h;if(!runtime.photoOptions.labels)state.labels="none";const body=D.getBody(state.selectedId);const caption={title:bodyName(body),meta:[runtime.photoOptions.date?new Date(state.dateMs).toISOString():null,runtime.photoOptions.scale?(state.scaleMode==="relative"?L("distâncias relativas; discos localizadores","relative distances; locator disks"):L("escala de exploração","Exploration Scale")):null,"≈ JPL 1800–2050"].filter(Boolean).join(" · ")};renderScene(ctx,w,h,{photo:true,caption});runtime.width=old.width;runtime.height=old.height;state.labels=old.labels;canvas.toBlob(blob=>{if(!blob){toast(L("O navegador bloqueou a captura.","The browser blocked capture."),"error");return;}downloadBlob(`solar-${body.id}-${new Date(state.dateMs).toISOString().slice(0,10)}.png`,blob,"image/png");toast(L(`PNG salvo em ${w}×${h}.`,`PNG saved at ${w}×${h}.`),"success");},"image/png");}
  function shareScene(){const config={schema:"solar-observatory-scene",version:1,targetId:state.selectedId,dateMs:state.dateMs,scaleMode:state.scaleMode,labels:state.labels,orbitMode:state.orbitMode,overlays:Object.assign({},state.overlays),camera:{target:runtime.camera.target,distance:runtime.camera.distance,yaw:runtime.camera.yaw,pitch:runtime.camera.pitch}};const text=JSON.stringify(config);if(navigator.share&&isSecureContext){navigator.share({title:L("Cena do Observatório Solar","Solar Observatory scene"),text}).then(()=>toast(L("Cena entregue ao compartilhamento do sistema; notas não foram incluídas.","Scene handed to system sharing; notes were excluded."),"success")).catch(error=>{if(error&&error.name!=="AbortError")downloadBlob("solar-scene.json",text,"application/json");});}else if(navigator.clipboard&&isSecureContext)navigator.clipboard.writeText(text).then(()=>toast(L("Configuração pública copiada; notas não foram incluídas.","Public configuration copied; notes were excluded."),"success")).catch(()=>downloadBlob("solar-scene.json",text,"application/json"));else downloadBlob("solar-scene.json",text,"application/json");}

  init();
})();
