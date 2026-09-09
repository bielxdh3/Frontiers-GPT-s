import { effect, signal } from '@preact/signals';
import { BODY_MAP, PLANET_IDS } from '../data/bodies';
import type { BodyId } from '../data/types';
import { DAY_S } from '../data/types';
import { locale, setLocale, t, tx, fmtDateTimeUtc } from '../i18n';
import { SceneManager, type VisualSettings } from '../render/scene';
import type { ViewState } from '../render/camera';
import type { ScaleMode } from '../sim/scale';
import { periodDaysFromElements } from '../sim/kepler';
import * as S from '../state/store';
import { clock } from '../state/store';
import { collections, updateCollections, uiMemory, updateUiMemory, savePrefs, newId, type Viewpoint, type Bookmark } from '../state/persistence';
import { audio } from './audio';

/* ------------------------------------------------------------------ */
/* Feature state (single owner for each concept)                       */
/* ------------------------------------------------------------------ */

export interface CompareState { ids: BodyId[]; reference: BodyId; log: boolean; sync: boolean }
export const compareState = signal<CompareState>({ ids: ['earth', 'mars'], reference: 'earth', log: false, sync: false });

export interface FrozenMeasurement { a: BodyId; b: BodyId; simMs: number; km: number; lightS: number }
export interface MeasureHistoryItem { id: string; label: string; km: number; lightS: number; simMs: number; createdAt: number }
export interface MeasureState {
  a: BodyId | null; b: BodyId | null;
  observer: BodyId; c: BodyId;
  frozen: FrozenMeasurement | null;
  /** Light pulse: real-time start and duration in seconds (accelerated animation). */
  pulse: { startedAt: number; durationS: number; lightS: number } | null;
  history: MeasureHistoryItem[];
  showSurface: boolean;
}
export const measureState = signal<MeasureState>({ a: 'sun', b: 'earth', observer: 'earth', c: 'mars', frozen: null, pulse: null, history: [], showSurface: false });

/** When set, the next scene pick is routed here instead of changing the selection. */
export const pickRequest = signal<{ label: string; onPick: (id: BodyId) => void } | null>(null);
export const disambiguation = signal<{ ids: BodyId[]; x: number; y: number } | null>(null);
export const hintState = signal<string | null>(null);
export const checklistOpen = signal<boolean>(true);
export const orbitWatch = signal<{ id: BodyId; startMs: number; periodMs: number } | null>(null);

export interface PhotoState {
  active: boolean; fov: number; guides: boolean; aspect: 'free' | '16:9' | '4:3' | '1:1' | '9:16'; labels: boolean; orbits: boolean;
  freeze: boolean; caption: boolean; hires: boolean; recording: boolean; result: { url: string; w: number; h: number; kind: 'png' | 'video' } | null; background: number; exposure: number;
}
export const photoState = signal<PhotoState>({ active: false, fov: 45, guides: false, aspect: 'free', labels: false, orbits: false, freeze: true, caption: true, hires: false, recording: false, result: null, background: 0.75, exposure: 1 });

export const WORKSPACE_TOOLS = new Set<S.Tool>(['compare', 'scale-lab', 'seasons-lab', 'moon-lab', 'orbit-lab', 'beyond', 'missions', 'learn', 'encyclopedia']);
export const DIALOG_TOOLS = new Set<S.Tool>(['settings', 'help', 'share', 'tours', 'collections']);

export function bodyName(id: BodyId): string {
  const n = BODY_MAP[id]?.names;
  if (!n) return id;
  return locale.value === 'pt-BR' ? n.pt : n.en;
}

interface Layer { id: string; close: () => void }

class AppController {
  scene: SceneManager | null = null;
  private lastLabels: S.LabelsMode = 'major';
  private lastOrbits: S.OrbitsMode = 'all';
  private savedToolView: ViewState | null = null;
  toolMovedCamera = false;
  private layers: Layer[] = [];
  private uiTimer = 0;
  private tickCount = 0;
  private prefsSaveTimer = 0;
  private photoPrev: { playing: boolean; background: number; exposure: number; fov: number } | null = null;
  private recorder: MediaRecorder | null = null;
  private recorderChunks: Blob[] = [];
  private recorderTimer = 0;
  readonly manualCameraListeners = new Set<() => void>();
  readonly transitionEndListeners = new Set<() => void>();
  readonly tickListeners = new Set<(dtMs: number) => void>();
  readonly toolListeners = new Set<(tool: S.Tool | null) => void>();
  private lastTick = 0;
  private hadFirstCamera = false;

  /* ---------------- boot ---------------- */

  init(container: HTMLElement): boolean {
    try {
      this.scene = new SceneManager(container, this.buildSettings(), {
        onPick: (ids, x, y) => this.handlePick(ids, x, y),
        onDoublePick: (id) => { if (id) { this.select(id); this.focus(id); } },
        onManualCamera: () => this.onManualCamera(),
        onTransitionEnd: () => {
          const id = this.scene?.anchorId;
          if (id) S.announce(t('status.arrived', { name: bodyName(id) }));
          for (const l of this.transitionEndListeners) l();
        },
        onQualityChange: (q) => { S.effectiveQuality.value = q; },
        onContextLost: (lost) => { S.contextLost.value = lost; if (lost) S.toast(t('error.contextLost'), 'warning', 6000); else S.toast(t('error.contextRestored'), 'success'); },
        onFrame: (info) => { S.fps.value = Math.round(info.fps); },
        onTexturesReady: () => { if (S.loadingStage.value !== 'ready') { S.loadingStage.value = 'refining'; setTimeout(() => { S.loadingStage.value = 'ready'; }, 350); } },
        labelText: (id) => bodyName(id),
      });
    } catch (e) {
      console.error('WebGL init failed', e);
      S.webglAvailable.value = false;
      return false;
    }
    const scene = this.scene;
    effect(() => { scene.updateSettings(this.buildSettings()); });
    effect(() => {
      const p = S.prefs.value;
      if (locale.value !== p.locale) setLocale(p.locale);
      const root = document.documentElement;
      root.style.setProperty('--ui-scale', String(p.uiScale));
      root.style.setProperty('--panel-alpha', String(p.panelOpacity));
      root.style.setProperty('--label-scale', String(p.labelSize));
      root.classList.toggle('high-contrast', p.highContrast);
      root.classList.toggle('simplified', p.simplified);
      root.classList.toggle('reduce-motion', S.reducedMotion.value);
      clearTimeout(this.prefsSaveTimer);
      this.prefsSaveTimer = window.setTimeout(() => savePrefs(), 400);
    });
    effect(() => { document.documentElement.classList.toggle('touch', S.isTouch.value); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) clock.onHidden(); else clock.onVisible(); });
    window.addEventListener('keydown', this.onKey);
    this.lastTick = performance.now();
    this.uiTimer = window.setInterval(() => this.uiTick(), 100);
    scene.overview({ instant: true });
    scene.start();
    S.loadingStage.value = 'bodies';
    // Safety net: never hold the app behind the loader if a texture never arrives.
    setTimeout(() => { if (S.loadingStage.value !== 'ready') S.loadingStage.value = 'ready'; }, 6000);
    return true;
  }

  private buildSettings(): VisualSettings {
    const p = S.prefs.value;
    const ph = photoState.value;
    return {
      scaleMode: p.scaleMode, labelsMode: p.labelsMode, orbitsMode: ph.active && !ph.orbits ? 'none' : p.orbitsMode, overlays: p.overlays, presentation: p.presentation,
      background: ph.active ? ph.background : p.background, bloom: p.bloom, exposure: ph.active ? ph.exposure : p.exposure, labelSize: p.labelSize, labelDensity: p.labelDensity,
      highContrast: p.highContrast, autoRotate: p.autoRotate, reducedMotion: S.reducedMotion.value, quality: p.quality,
      hidden: S.hiddenBodies.value, favorites: collections.value.favorites, photoLabels: ph.active ? ph.labels : undefined,
    };
  }

  /* ---------------- periodic UI sync (10 Hz) ---------------- */

  private uiTick(): void {
    const scene = this.scene;
    if (!scene) return;
    const now = performance.now();
    const dt = now - this.lastTick; this.lastTick = now;
    this.tickCount++;
    const snap = clock.snapshot();
    const cur = S.clockState.value;
    if (snap.simMs !== cur.simMs || snap.playing !== cur.playing || snap.direction !== cur.direction || snap.rate !== cur.rate) S.clockState.value = snap;
    if (this.tickCount % 3 === 0) S.readoutMs.value = snap.simMs;
    const anchor = scene.anchor;
    const mode: S.CameraMode = scene.cameraCtl.isTransitioning ? 'transition' : anchor.type === 'point' ? 'free' : (anchor.id === 'sun' && scene.focusedSystem === null && scene.cameraDistance > scene.mapping.auToDisplay(1.5)) ? 'overview' : 'follow';
    if (S.cameraMode.value !== mode) S.cameraMode.value = mode;
    const target = scene.anchorId;
    if (S.cameraTarget.value !== target) S.cameraTarget.value = target;
    // Checklist detection
    if (mode === 'follow' && target) {
      const def = BODY_MAP[target];
      if (def.kind === 'moon') this.checklist('followMoon');
      else if (def.kind === 'planet') this.checklist('visitPlanet');
    }
    if (snap.playing && snap.direction === -1) this.checklist('reverseTime');
    // Orbit observation
    const ow = orbitWatch.value;
    if (ow && Math.abs(snap.simMs - ow.startMs) >= ow.periodMs) { clock.pause(); orbitWatch.value = null; S.toast(t('time.completeOrbitDesc', { name: bodyName(ow.id) }), 'info'); }
    // Light pulse progress
    const ms = measureState.value;
    if (ms.pulse) {
      const tt = (now - ms.pulse.startedAt) / 1000 / ms.pulse.durationS;
      scene.measure.pulseT = tt >= 1 ? null : tt;
      if (tt >= 1) measureState.value = { ...ms, pulse: null };
    }
    for (const l of this.tickListeners) l(dt);
  }

  /* ---------------- selection & camera ---------------- */

  private handlePick(ids: BodyId[], x: number, y: number): void {
    disambiguation.value = null;
    const req = pickRequest.value;
    if (req) { if (ids[0]) { req.onPick(ids[0]); pickRequest.value = null; } return; }
    if (ids.length === 0) return;
    if (ids.length > 1) { disambiguation.value = { ids: ids.slice(0, 5), x, y }; return; }
    this.select(ids[0]);
  }

  select(id: BodyId | null, opts: { focus?: boolean; silent?: boolean } = {}): void {
    const scene = this.scene;
    if (S.selectedId.value !== id) {
      S.selectedId.value = id;
      if (scene) scene.selected = id;
      if (id) {
        S.inspectorOpen.value = true;
        S.markVisited(id);
        if (!uiMemory.value.visited.includes(id)) updateUiMemory({ visited: [...uiMemory.value.visited, id] });
        scene?.refine(id);
        if (!opts.silent) S.announce(t('status.selectionAnnounce', { name: bodyName(id), type: t(`kind.${BODY_MAP[id].kind}`) }));
        this.dismissHint('select');
      }
    }
    if (id && opts.focus) this.focus(id);
  }

  focus(id: BodyId, opts: { zoom?: number; instant?: boolean; theta?: number; phi?: number } = {}): void {
    const scene = this.scene; if (!scene) return;
    scene.focus(id, { zoom: opts.zoom, instant: opts.instant ?? S.reducedMotion.value, theta: opts.theta, phi: opts.phi, keepOffset: opts.theta === undefined });
    if (S.activeTool.value && WORKSPACE_TOOLS.has(S.activeTool.value)) this.toolMovedCamera = true;
  }

  follow(id: BodyId): void { this.focus(id); }

  toggleFollow(): void {
    const scene = this.scene; if (!scene) return;
    if (scene.anchor.type === 'body' && S.cameraMode.value !== 'overview') { scene.freeCamera(); S.toast(t('camera.free'), 'info', 1800); }
    else { const id = S.selectedId.value ?? 'earth'; this.focus(id); }
  }

  freeCamera(): void { this.scene?.freeCamera(); }
  overview(): void { this.scene?.overview({ instant: S.reducedMotion.value }); }
  resetView(): void { const s = this.scene; if (!s) return; s.cameraCtl.resetPan(); s.overview({ instant: S.reducedMotion.value }); }
  recoverCamera(): void { this.scene?.recover(); }
  exploreMoons(parent: BodyId): void {
    const s = this.scene; if (!s) return;
    if (S.prefs.value.overlays.moons === 'none') S.updateOverlays({ moons: 'auto' });
    s.fitSystem(parent, { instant: S.reducedMotion.value });
  }
  preset(kind: 'top' | 'low' | 'equatorial' | 'polar' | 'terminator'): void { this.scene?.preset(kind); }
  back(): void { this.scene?.back(); }
  forward(): void { this.scene?.forward(); }

  private onManualCamera(): void {
    if (!this.hadFirstCamera) {
      this.hadFirstCamera = true;
      if (hintState.value === 'orbit') { this.dismissHint('orbit'); setTimeout(() => this.showHint('select'), 900); }
    }
    for (const l of this.manualCameraListeners) l();
  }

  /* ---------------- scale, labels, orbits ---------------- */

  setScaleMode(mode: ScaleMode): void {
    if (S.prefs.value.scaleMode === mode) return;
    S.updatePrefs({ scaleMode: mode });
    this.checklist('inspectScale');
    if (mode === 'relative') this.showHint('relativeScale', true);
    S.announce(t('scale.switched', { mode: t(`scale.${mode}`) }));
  }
  toggleScale(): void { this.setScaleMode(S.prefs.value.scaleMode === 'relative' ? 'exploration' : 'relative'); }

  toggleLabels(): void {
    const cur = S.prefs.value.labelsMode;
    if (cur !== 'none') { this.lastLabels = cur; S.updatePrefs({ labelsMode: 'none' }); }
    else S.updatePrefs({ labelsMode: this.lastLabels });
  }
  toggleOrbits(): void {
    const cur = S.prefs.value.orbitsMode;
    if (cur !== 'none') { this.lastOrbits = cur; S.updatePrefs({ orbitsMode: 'none' }); }
    else S.updatePrefs({ orbitsMode: this.lastOrbits });
  }

  /* ---------------- time ---------------- */

  togglePlay(): void { if (clock.rate === 0) clock.resume(); else clock.toggle(); }
  reverse(): void { clock.reverse(); }
  step(seconds: number): void { clock.step(seconds); }
  goToNow(): void { clock.goToNow(); if (!clock.isWithinSupported(Date.now())) S.toast(t('time.boundaryReached'), 'warning'); }
  resetSimulation(): void { clock.resetSimulation(); orbitWatch.value = null; }
  setRate(rate: number): boolean { return clock.setRate(rate); }
  fasterSlower(dir: 1 | -1): void {
    const r = clock.resumeRate;
    const next = dir > 0 ? r * 10 : r / 10;
    clock.setRate(Math.max(1, next));
  }

  /** Observe one orbit of a body: run at a rate that completes it in ~8 real seconds, then pause. */
  observeOrbit(id: BodyId): void {
    const def = BODY_MAP[id];
    let periodDays: number | undefined;
    if (def.orbit) periodDays = periodDaysFromElements(def.orbit);
    else if (def.satellite) periodDays = Math.abs(def.satellite.periodDays);
    else if (id === 'moon') periodDays = 27.321661;
    if (!periodDays) return;
    const periodMs = periodDays * DAY_S * 1000;
    clock.setRate((periodDays * DAY_S) / 8);
    clock.setDirection(1);
    orbitWatch.value = { id, startMs: clock.simMs, periodMs };
    clock.play();
  }

  /* ---------------- tools & layers ---------------- */

  openTool(tool: S.Tool): void {
    const scene = this.scene;
    if (S.activeTool.value === tool) return;
    if (S.activeTool.value) this.closeTool();
    if (tool === 'photo') this.enterPhoto();
    if (WORKSPACE_TOOLS.has(tool) && scene) { this.savedToolView = scene.cameraCtl.getView(); this.toolMovedCamera = false; scene.idle = true; }
    S.activeTool.value = tool;
    S.paletteOpen.value = false;
    for (const l of this.toolListeners) l(tool);
  }

  closeTool(): void {
    const tool = S.activeTool.value;
    if (!tool) return;
    const scene = this.scene;
    if (tool === 'photo') this.exitPhoto();
    if (scene) {
      scene.idle = false;
      if (this.savedToolView && this.toolMovedCamera) scene.cameraCtl.setView(this.savedToolView, true);
    }
    this.savedToolView = null;
    S.activeTool.value = null;
    for (const l of this.toolListeners) l(null);
  }

  toggleTool(tool: S.Tool): void { if (S.activeTool.value === tool) this.closeTool(); else this.openTool(tool); }

  registerLayer(id: string, close: () => void): () => void {
    this.layers = [...this.layers.filter((l) => l.id !== id), { id, close }];
    S.pushLayer(id);
    return () => { this.layers = this.layers.filter((l) => l.id !== id); S.popLayer(id); };
  }

  /** Close the topmost dismissible layer. Returns true if something was closed. */
  escape(): boolean {
    if (disambiguation.value) { disambiguation.value = null; return true; }
    if (pickRequest.value) { pickRequest.value = null; return true; }
    const top = this.layers[this.layers.length - 1];
    if (top) { top.close(); return true; }
    if (S.paletteOpen.value) { S.paletteOpen.value = false; return true; }
    if (S.activeTool.value) { this.closeTool(); return true; }
    if (S.distractionFree.value) { S.distractionFree.value = false; return true; }
    return false;
  }

  toggleDistractionFree(): void { S.distractionFree.value = !S.distractionFree.value; if (S.distractionFree.value) S.toast(t('distraction.hint'), 'info', 4000); }

  /* ---------------- hints & checklist ---------------- */

  showHint(id: string, force = false): void {
    if (!force && uiMemory.value.hintsSeen[id]) return;
    if (hintState.value && hintState.value !== id && !force) return;
    hintState.value = id;
  }
  dismissHint(id: string): void {
    if (hintState.value === id) hintState.value = null;
    if (!uiMemory.value.hintsSeen[id]) updateUiMemory({ hintsSeen: { ...uiMemory.value.hintsSeen, [id]: true } });
  }
  restartTutorial(): void {
    updateUiMemory({ hintsSeen: {}, welcomeDismissed: false });
    updateCollections((c) => ({ ...c, checklist: {} }));
    S.welcomeOpen.value = true;
    checklistOpen.value = true;
  }
  checklist(key: string): void {
    if (collections.value.checklist[key]) return;
    updateCollections((c) => ({ ...c, checklist: { ...c.checklist, [key]: true } }));
  }

  /* ---------------- collections ---------------- */

  toggleFavorite(id: BodyId): void {
    const fav = collections.value.favorites.includes(id);
    const ok = updateCollections((c) => ({ ...c, favorites: fav ? c.favorites.filter((f) => f !== id) : [...c.favorites, id] }));
    this.persistToast(ok, fav ? t('toast.favoriteRemoved', { name: bodyName(id) }) : t('toast.favoriteAdded', { name: bodyName(id) }));
  }

  saveViewpoint(title: string, restoreDate: boolean): Viewpoint | null {
    const scene = this.scene; if (!scene) return null;
    const vp = scene.getViewpoint();
    const p = S.prefs.value;
    const v: Viewpoint = { id: newId(), title: title || bodyName(vp.target), target: vp.target, distance: vp.distance, theta: vp.theta, phi: vp.phi, scaleMode: p.scaleMode, simMs: clock.simMs, restoreDate, labels: p.labelsMode, orbits: p.orbitsMode, createdAt: Date.now() };
    const ok = updateCollections((c) => ({ ...c, viewpoints: [v, ...c.viewpoints].slice(0, 100) }));
    this.persistToast(ok, t('toast.viewpointSaved'));
    return ok ? v : null;
  }

  applyViewpoint(v: Viewpoint): void {
    const scene = this.scene; if (!scene) return;
    if (v.scaleMode !== S.prefs.value.scaleMode) S.updatePrefs({ scaleMode: v.scaleMode });
    if (v.restoreDate) clock.setSimMs(v.simMs);
    this.select(v.target);
    scene.applyViewpoint({ target: v.target, distance: v.distance, theta: v.theta, phi: v.phi }, S.reducedMotion.value);
    if (S.activeTool.value) this.closeTool();
  }

  addBookmark(title: string): void {
    const b: Bookmark = { id: newId(), title: title || fmtDateTimeUtc(clock.simMs), simMs: clock.simMs, body: S.selectedId.value ?? undefined, scaleMode: S.prefs.value.scaleMode, createdAt: Date.now() };
    const ok = updateCollections((c) => ({ ...c, bookmarks: [...c.bookmarks, b].sort((x, y) => x.simMs - y.simMs).slice(0, 200) }));
    this.persistToast(ok, t('toast.bookmarkAdded'));
  }

  goToBookmark(b: Bookmark): void {
    clock.setSimMs(b.simMs);
    if (b.body) this.select(b.body);
  }

  persistToast(ok: boolean, successText: string): void {
    if (ok) S.toast(successText, 'success');
    else S.toast(t('coll.saveFailed'), 'error', 5000);
  }

  hideBody(id: BodyId): void { const s = new Set(S.hiddenBodies.value); s.add(id); S.hiddenBodies.value = s; }
  showBody(id: BodyId): void { const s = new Set(S.hiddenBodies.value); s.delete(id); S.hiddenBodies.value = s; }

  /* ---------------- photo ---------------- */

  private enterPhoto(): void {
    const scene = this.scene; if (!scene) return;
    const p = S.prefs.value;
    this.photoPrev = { playing: clock.playing, background: p.background, exposure: p.exposure, fov: scene.fov };
    photoState.value = { ...photoState.value, active: true, background: p.background, exposure: p.exposure, fov: scene.fov, result: null };
    if (photoState.value.freeze) clock.pause();
    scene.photoMode = true;
  }

  private exitPhoto(): void {
    const scene = this.scene;
    this.stopRecording();
    if (scene) { scene.photoMode = false; if (this.photoPrev) scene.setFov(this.photoPrev.fov); }
    if (this.photoPrev?.playing && !clock.playing) clock.play();
    const r = photoState.value.result;
    if (r) URL.revokeObjectURL(r.url);
    photoState.value = { ...photoState.value, active: false, result: null, recording: false };
    this.photoPrev = null;
  }

  setPhoto(patch: Partial<PhotoState>): void {
    const prev = photoState.value;
    photoState.value = { ...prev, ...patch };
    const scene = this.scene;
    if (scene && patch.fov !== undefined) scene.setFov(patch.fov);
    if (patch.freeze !== undefined && prev.active) { if (patch.freeze) clock.pause(); else if (this.photoPrev?.playing) clock.play(); }
  }

  async capture(opts: { hires?: boolean; labels?: boolean; caption?: boolean } = {}): Promise<boolean> {
    const scene = this.scene; if (!scene) return false;
    const ph = photoState.value;
    const captionLines: string[] = [];
    if (opts.caption ?? ph.caption) {
      if (S.selectedId.value) captionLines.push(bodyName(S.selectedId.value));
      captionLines.push(fmtDateTimeUtc(clock.simMs));
      captionLines.push(t(`scale.short.${S.prefs.value.scaleMode}`));
      captionLines.push(t('photo.captionCredit'));
    }
    try {
      const blob = await scene.capture({ scale: (opts.hires ?? ph.hires) ? 2 : 1, labels: opts.labels ?? ph.labels, caption: captionLines });
      const url = URL.createObjectURL(blob);
      if (ph.active) {
        if (ph.result) URL.revokeObjectURL(ph.result.url);
        const img = new Image();
        img.onload = () => { photoState.value = { ...photoState.value, result: { url, w: img.naturalWidth, h: img.naturalHeight, kind: 'png' } }; };
        img.src = url;
      } else {
        const a = document.createElement('a'); a.href = url; a.download = `observatorio-${new Date(clock.simMs).toISOString().slice(0, 10)}.png`; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        S.toast(t('photo.result'), 'success');
      }
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      S.toast(/exceeds/.test(msg) ? t('photo.tooLarge') : t('photo.failed', { reason: msg }), 'error', 6000);
      return false;
    }
  }

  recordingSupported(): boolean {
    return typeof MediaRecorder !== 'undefined' && !!this.scene && typeof (this.scene.canvas as HTMLCanvasElement & { captureStream?: unknown }).captureStream === 'function';
  }

  startRecording(maxSeconds = 20): boolean {
    const scene = this.scene;
    if (!scene || !this.recordingSupported() || this.recorder) return false;
    try {
      const stream = (scene.canvas as HTMLCanvasElement & { captureStream: (fps: number) => MediaStream }).captureStream(30);
      const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find((m) => MediaRecorder.isTypeSupported(m));
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      this.recorderChunks = [];
      rec.ondataavailable = (ev) => { if (ev.data.size) this.recorderChunks.push(ev.data); };
      rec.onstop = () => {
        const blob = new Blob(this.recorderChunks, { type: rec.mimeType || 'video/webm' });
        const url = URL.createObjectURL(blob);
        const prev = photoState.value.result; if (prev) URL.revokeObjectURL(prev.url);
        photoState.value = { ...photoState.value, recording: false, result: { url, w: scene.canvas.width, h: scene.canvas.height, kind: 'video' } };
        this.recorder = null;
        stream.getTracks().forEach((tr) => tr.stop());
      };
      rec.onerror = () => { this.stopRecording(); S.toast(t('photo.failed', { reason: 'recorder' }), 'error'); };
      rec.start(250);
      this.recorder = rec;
      photoState.value = { ...photoState.value, recording: true };
      this.recorderTimer = window.setTimeout(() => this.stopRecording(), maxSeconds * 1000);
      return true;
    } catch {
      return false;
    }
  }

  stopRecording(): void {
    clearTimeout(this.recorderTimer);
    if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop();
    else if (photoState.value.recording) photoState.value = { ...photoState.value, recording: false };
  }

  /* ---------------- share ---------------- */

  encodeShare(): string {
    const scene = this.scene;
    const p = S.prefs.value;
    const q = new URLSearchParams();
    q.set('v', '1');
    if (S.selectedId.value) q.set('sel', S.selectedId.value);
    q.set('t', String(Math.round(clock.simMs)));
    q.set('play', clock.playing ? '1' : '0');
    q.set('rate', String(clock.rate));
    q.set('dir', String(clock.direction));
    q.set('scale', p.scaleMode);
    q.set('labels', p.labelsMode);
    q.set('orbits', p.orbitsMode);
    if (scene) { const v = scene.getViewpoint(); q.set('cam', [v.target, v.distance.toPrecision(6), v.theta.toFixed(4), v.phi.toFixed(4)].join(',')); }
    return `${location.origin}${location.pathname}#${q.toString()}`;
  }

  applyShare(hash: string): boolean {
    if (!hash || hash.length < 3) return false;
    const q = new URLSearchParams(hash.replace(/^#/, ''));
    if (q.get('v') !== '1') return false;
    const isId = (v: string | null): v is BodyId => !!v && v in BODY_MAP;
    const tms = Number(q.get('t'));
    if (Number.isFinite(tms) && clock.isWithinSupported(tms)) clock.setSimMs(tms);
    const rate = Number(q.get('rate')); if (Number.isFinite(rate) && rate >= 0) clock.setRate(rate);
    clock.setDirection(q.get('dir') === '-1' ? -1 : 1);
    if (q.get('play') === '1') clock.play(); else clock.pause();
    const scale = q.get('scale'); const labels = q.get('labels'); const orbits = q.get('orbits');
    const patch: Partial<S.Prefs> = {};
    if (scale === 'relative' || scale === 'exploration') patch.scaleMode = scale;
    if (labels && ['major', 'system', 'selected', 'favorites', 'none'].includes(labels)) patch.labelsMode = labels as S.LabelsMode;
    if (orbits && ['all', 'selected', 'system', 'none'].includes(orbits)) patch.orbitsMode = orbits as S.OrbitsMode;
    if (Object.keys(patch).length) S.updatePrefs(patch);
    const sel = q.get('sel'); if (isId(sel)) this.select(sel, { silent: true });
    const cam = q.get('cam')?.split(',');
    if (cam && cam.length === 4 && isId(cam[0])) {
      const [d, th, ph] = [Number(cam[1]), Number(cam[2]), Number(cam[3])];
      if ([d, th, ph].every(Number.isFinite) && d > 0 && d < 1e7) this.scene?.applyViewpoint({ target: cam[0], distance: d, theta: th, phi: ph }, true);
    }
    return true;
  }

  /* ---------------- keyboard ---------------- */

  private onKey = (ev: KeyboardEvent): void => {
    if (ev.key === 'Escape') { if (this.escape()) ev.preventDefault(); return; }
    if (S.isTypingTarget(ev.target)) return;
    const key = ev.key;
    if ((ev.ctrlKey || ev.metaKey) && key.toLowerCase() === 'k') { ev.preventDefault(); S.paletteOpen.value = !S.paletteOpen.value; return; }
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const tool = S.activeTool.value;
    const modal = S.paletteOpen.value || (tool !== null && (DIALOG_TOOLS.has(tool) || WORKSPACE_TOOLS.has(tool))) || S.welcomeOpen.value;
    if (modal) {
      if (key === '?' && !S.paletteOpen.value) { ev.preventDefault(); this.toggleTool('help'); }
      return;
    }
    const canvasFocused = document.activeElement === this.scene?.canvas;
    const toggles = new Set([' ', 'o', 'O', 'l', 'L', 'h', 'H', 'g', 'G', 'p', 'P', 'n', 'N', 'i', 'I', 'x', 'X', 'r', 'R', 'm', 'M', 'c', 'C', 'f', 'F', '/', '?', 'b', 'B']);
    if (ev.repeat && toggles.has(key)) return;
    const scene = this.scene;
    switch (key) {
      case ' ': ev.preventDefault(); this.togglePlay(); break;
      case 'r': case 'R': ev.preventDefault(); this.resetView(); break;
      case 'o': case 'O': this.toggleOrbits(); break;
      case 'l': case 'L': this.toggleLabels(); break;
      case '/': ev.preventDefault(); S.paletteOpen.value = true; break;
      case '?': ev.preventDefault(); this.toggleTool('help'); break;
      case 'f': case 'F': if (S.selectedId.value) this.focus(S.selectedId.value); break;
      case 'g': case 'G': this.toggleFollow(); break;
      case 'c': case 'C': this.openCompareWith(S.selectedId.value); break;
      case 'm': case 'M': this.toggleTool('measure'); break;
      case 'p': case 'P': void this.capture({ labels: S.prefs.value.labelsMode !== 'none', caption: true }); break;
      case 'h': case 'H': this.toggleDistractionFree(); break;
      case 'n': case 'N': S.navigatorOpen.value = !S.navigatorOpen.value; break;
      case 'i': case 'I': S.inspectorOpen.value = !S.inspectorOpen.value; break;
      case 'x': case 'X': this.reverse(); break;
      case 'b': case 'B': this.addBookmark(''); break;
      case '[': this.step(-DAY_S); break;
      case ']': this.step(DAY_S); break;
      case ',': this.fasterSlower(-1); break;
      case '.': this.fasterSlower(1); break;
      case 'ArrowLeft': if (canvasFocused && scene) { ev.preventDefault(); scene.cameraCtl.rotateBy(-0.08, 0); } break;
      case 'ArrowRight': if (canvasFocused && scene) { ev.preventDefault(); scene.cameraCtl.rotateBy(0.08, 0); } break;
      case 'ArrowUp': if (canvasFocused && scene) { ev.preventDefault(); scene.cameraCtl.rotateBy(0, -0.06); } break;
      case 'ArrowDown': if (canvasFocused && scene) { ev.preventDefault(); scene.cameraCtl.rotateBy(0, 0.06); } break;
      case '+': case '=': if (canvasFocused && scene) { ev.preventDefault(); scene.cameraCtl.zoomBy(0.8); } break;
      case '-': case '_': if (canvasFocused && scene) { ev.preventDefault(); scene.cameraCtl.zoomBy(1.25); } break;
      default: {
        const n = Number(key);
        if (Number.isInteger(n) && n >= 0 && n <= 8 && key.length === 1) {
          const id: BodyId = n === 0 ? 'sun' : PLANET_IDS[n - 1];
          this.select(id);
        }
      }
    }
  };

  openCompareWith(id: BodyId | null): void {
    if (id) {
      const cs = compareState.value;
      if (!cs.ids.includes(id)) compareState.value = { ...cs, ids: [id, ...cs.ids].slice(0, 4) };
    }
    this.openTool('compare');
  }

  startMeasureFrom(id: BodyId): void {
    measureState.value = { ...measureState.value, a: id, frozen: null };
    this.openTool('measure');
  }

  dispose(): void {
    clearInterval(this.uiTimer);
    window.removeEventListener('keydown', this.onKey);
    this.scene?.dispose();
    this.scene = null;
  }
}

export const app = new AppController();
