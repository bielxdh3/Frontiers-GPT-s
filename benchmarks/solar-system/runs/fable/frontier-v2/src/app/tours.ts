import { effect, signal } from '@preact/signals';
import { TOUR_MAP, type Tour, type TourStop } from '../content/tours';
import { locale, tx } from '../i18n';
import * as S from '../state/store';
import { clock } from '../state/store';
import { collections, updateCollections } from '../state/persistence';
import { app } from './controller';
import { audio } from './audio';

export type TourStatus = 'playing' | 'paused' | 'suspended';

export interface TourRun {
  tourId: string;
  stop: number;
  status: TourStatus;
  auto: boolean;
  /** Remaining auto-advance time (ms) for the current stop. */
  remainingMs: number;
  totalMs: number;
  narrating: boolean;
  visited: number[];
}

export const tourRun = signal<TourRun | null>(null);

interface SavedSettings { labelsMode: S.LabelsMode; orbitsMode: S.OrbitsMode; overlays: S.Overlays; scaleMode: S.Prefs['scaleMode']; rate: number; direction: 1 | -1; playing: boolean }

function readingMs(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return 3500 + words * 380;
}

class TourRunner {
  private saved: SavedSettings | null = null;
  private applying = false;
  private userTouched = new Set<keyof SavedSettings>();
  private prevPrefs: S.Prefs | null = null;
  private installed = false;

  private install(): void {
    if (this.installed) return;
    this.installed = true;
    app.tickListeners.add((dt) => this.tick(dt));
    app.manualCameraListeners.add(() => this.onManualCamera());
    app.toolListeners.add((tool) => { if (tool && tourRun.value?.status === 'playing') this.pause(); });
    // Track settings the user changes explicitly during a tour: those are not restored on exit.
    effect(() => {
      const p = S.prefs.value;
      const prev = this.prevPrefs;
      this.prevPrefs = p;
      if (!tourRun.value || this.applying || !prev) return;
      if (p.labelsMode !== prev.labelsMode) this.userTouched.add('labelsMode');
      if (p.orbitsMode !== prev.orbitsMode) this.userTouched.add('orbitsMode');
      if (p.overlays !== prev.overlays) this.userTouched.add('overlays');
      if (p.scaleMode !== prev.scaleMode) this.userTouched.add('scaleMode');
    });
  }

  get current(): { tour: Tour; stop: TourStop } | null {
    const r = tourRun.value; if (!r) return null;
    const tour = TOUR_MAP[r.tourId]; if (!tour) return null;
    return { tour, stop: tour.stops[r.stop] };
  }

  start(tourId: string, stopIndex = 0, auto = true): void {
    this.install();
    const tour = TOUR_MAP[tourId]; if (!tour) return;
    if (tourRun.value) this.exit(false);
    const p = S.prefs.value;
    this.saved = { labelsMode: p.labelsMode, orbitsMode: p.orbitsMode, overlays: p.overlays, scaleMode: p.scaleMode, rate: clock.rate, direction: clock.direction, playing: clock.playing };
    this.userTouched.clear();
    if (S.activeTool.value) app.closeTool();
    S.welcomeOpen.value = false;
    tourRun.value = { tourId, stop: Math.min(stopIndex, tour.stops.length - 1), status: 'playing', auto, remainingMs: 0, totalMs: 0, narrating: false, visited: [] };
    this.applyStop();
  }

  private applyStop(): void {
    const cur = this.current; const r = tourRun.value;
    if (!cur || !r) return;
    const { stop } = cur;
    this.applying = true;
    try {
      if (stop.labelsMode && !this.userTouched.has('labelsMode')) S.updatePrefs({ labelsMode: stop.labelsMode });
      if (stop.orbitsMode && !this.userTouched.has('orbitsMode')) S.updatePrefs({ orbitsMode: stop.orbitsMode });
      if (stop.overlays && !this.userTouched.has('overlays')) S.updateOverlays(stop.overlays);
      if (stop.rate !== undefined) { if (stop.rate === 0) clock.pause(); else { clock.setSignedRate(stop.rate); clock.play(); } }
    } finally {
      this.applying = false;
    }
    app.select(stop.target, { silent: true });
    const scene = app.scene;
    if (scene) {
      const instant = S.reducedMotion.value;
      if (stop.camera.kind === 'overview') scene.overview({ instant });
      else if (stop.camera.kind === 'system') scene.fitSystem(stop.target, { instant });
      else {
        scene.focus(stop.target, { zoom: stop.camera.zoom, theta: stop.camera.theta, phi: stop.camera.phi, instant, keepOffset: stop.camera.theta === undefined && stop.camera.phi === undefined });
        if (stop.camera.preset) setTimeout(() => { if (tourRun.value?.stop === r.stop) scene.preset(stop.camera.preset!); }, instant ? 0 : 1600);
      }
    }
    const text = tx(stop.text);
    const total = readingMs(text) + (S.reducedMotion.value ? 300 : 2600);
    const visited = r.visited.includes(r.stop) ? r.visited : [...r.visited, r.stop];
    tourRun.value = { ...r, status: 'playing', remainingMs: total, totalMs: total, narrating: false, visited };
    this.narrate(`${tx(stop.title)}. ${text}`);
    S.announce(`${tx(stop.title)}. ${text}`);
  }

  private narrate(text: string): void {
    audio.stopSpeech();
    const p = S.prefs.value;
    if (!p.audio.master || !p.audio.narration || !audio.caps().speech) return;
    const ok = audio.speak(text, locale.value === 'pt-BR' ? 'pt-BR' : 'en-US', () => {
      const r = tourRun.value;
      if (r && r.narrating) { tourRun.value = { ...r, narrating: false, remainingMs: Math.min(r.remainingMs, 1200) }; }
    });
    if (ok && tourRun.value) tourRun.value = { ...tourRun.value, narrating: true };
  }

  private tick(dt: number): void {
    const r = tourRun.value; if (!r) return;
    if (r.status !== 'playing' || !r.auto || r.narrating || S.activeTool.value) return;
    const remaining = r.remainingMs - dt;
    if (remaining <= 0) { this.next(); return; }
    tourRun.value = { ...r, remainingMs: remaining };
  }

  private onManualCamera(): void {
    const r = tourRun.value;
    if (r && r.status === 'playing') { tourRun.value = { ...r, status: 'suspended' }; audio.pauseSpeech(); }
  }

  pause(): void { const r = tourRun.value; if (r && r.status !== 'paused') { tourRun.value = { ...r, status: 'paused' }; audio.pauseSpeech(); } }

  resume(): void {
    const r = tourRun.value; if (!r) return;
    if (S.activeTool.value) app.closeTool();
    if (r.status === 'suspended') { this.applyStop(); return; }
    tourRun.value = { ...r, status: 'playing' };
    if (r.narrating) audio.resumeSpeech();
  }

  setAuto(auto: boolean): void { const r = tourRun.value; if (r) tourRun.value = { ...r, auto }; }

  goTo(index: number): void {
    const cur = this.current; const r = tourRun.value; if (!cur || !r) return;
    if (index < 0) return;
    if (index >= cur.tour.stops.length) { this.exit(true); return; }
    tourRun.value = { ...r, stop: index };
    this.applyStop();
  }
  next(): void { const r = tourRun.value; if (r) this.goTo(r.stop + 1); }
  prev(): void { const r = tourRun.value; if (r) this.goTo(Math.max(0, r.stop - 1)); }
  restartStop(): void { this.applyStop(); }

  exit(completed: boolean): void {
    const r = tourRun.value; if (!r) return;
    const tour = TOUR_MAP[r.tourId];
    audio.stopSpeech();
    // Restore temporarily changed settings, except those the user explicitly changed during the tour.
    const s = this.saved;
    if (s) {
      this.applying = true;
      try {
        const patch: Partial<S.Prefs> = {};
        if (!this.userTouched.has('labelsMode')) patch.labelsMode = s.labelsMode;
        if (!this.userTouched.has('orbitsMode')) patch.orbitsMode = s.orbitsMode;
        if (!this.userTouched.has('overlays')) patch.overlays = s.overlays;
        if (!this.userTouched.has('scaleMode')) patch.scaleMode = s.scaleMode;
        S.updatePrefs(patch);
        clock.setRate(s.rate); clock.setDirection(s.direction);
        if (s.playing) clock.play(); else clock.pause();
      } finally { this.applying = false; }
    }
    const meaningful = r.visited.length >= Math.ceil(tour.stops.length / 2);
    updateCollections((c) => ({
      ...c,
      toursCompleted: completed && meaningful && !c.toursCompleted.includes(r.tourId) ? [...c.toursCompleted, r.tourId] : c.toursCompleted,
      tourResume: completed ? Object.fromEntries(Object.entries(c.tourResume).filter(([k]) => k !== r.tourId)) : { ...c.tourResume, [r.tourId]: r.stop },
    }));
    tourRun.value = null;
    this.saved = null;
    if (completed) S.toast(S.prefs.value.locale === 'pt-BR' ? 'Tour concluído.' : 'Tour completed.', 'success');
  }

  resumeIndexFor(tourId: string): number | undefined { return collections.value.tourResume[tourId]; }
}

export const tours = new TourRunner();
