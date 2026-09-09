import { computed, signal } from '@preact/signals';
import type { BodyId } from '../data/types';
import type { ScaleMode } from '../sim/scale';
import type { ClockSnapshot } from '../sim/time';
import { SimClock } from '../sim/time';

export type Tool =
  | 'compare' | 'measure' | 'scale-lab' | 'seasons-lab' | 'moon-lab' | 'orbit-lab' | 'beyond'
  | 'photo' | 'missions' | 'learn' | 'encyclopedia' | 'collections' | 'tours' | 'settings' | 'help' | 'share';

export type LabelsMode = 'major' | 'system' | 'selected' | 'favorites' | 'none';
export type OrbitsMode = 'all' | 'selected' | 'system' | 'none';
export type CameraMode = 'free' | 'follow' | 'overview' | 'transition';
export type Quality = 'auto' | 'low' | 'medium' | 'high';
export type EffectiveQuality = 'low' | 'medium' | 'high';
export type Presentation = 'natural' | 'enhanced';
export type ReducedMotionPref = 'system' | 'on' | 'off';

export interface Overlays {
  trails: boolean;
  trailDays: number;
  ecliptic: boolean;
  grid: boolean;
  axes: boolean;
  velocity: boolean;
  apsides: boolean;
  cardinal: boolean;
  belts: boolean;
  kuiper: boolean;
  comet: boolean;
  moons: 'auto' | 'all' | 'none';
  markers: boolean;
  milkyWay: boolean;
  missions: boolean;
}

export interface Prefs {
  version: 1;
  locale: 'pt-BR' | 'en';
  quality: Quality;
  presentation: Presentation;
  uiScale: number;          // 0.9–1.3
  panelOpacity: number;     // 0.6–1
  reducedMotion: ReducedMotionPref;
  familiarUnits: boolean;
  tempUnit: 'K' | 'C' | 'F';
  background: number;       // 0–1 starfield intensity
  bloom: boolean;
  highContrast: boolean;
  simplified: boolean;
  labelSize: number;        // 0.85–1.3
  labelDensity: number;     // 0.4–1
  exposure: number;         // 0.6–2
  autoRotate: boolean;
  scaleMode: ScaleMode;
  labelsMode: LabelsMode;
  orbitsMode: OrbitsMode;
  overlays: Overlays;
  audio: { master: boolean; ambience: number; ui: number; narration: boolean };
}

export const DEFAULT_OVERLAYS: Overlays = {
  trails: false, trailDays: 30, ecliptic: false, grid: false, axes: false, velocity: false, apsides: false, cardinal: false,
  belts: true, kuiper: true, comet: true, moons: 'auto', markers: true, milkyWay: true, missions: false,
};

export const DEFAULT_PREFS: Prefs = {
  version: 1, locale: 'pt-BR', quality: 'auto', presentation: 'natural', uiScale: 1, panelOpacity: 0.88, reducedMotion: 'system',
  familiarUnits: false, tempUnit: 'K', background: 0.75, bloom: true, highContrast: false, simplified: false, labelSize: 1, labelDensity: 0.8,
  exposure: 1, autoRotate: false, scaleMode: 'exploration', labelsMode: 'major', orbitsMode: 'all', overlays: { ...DEFAULT_OVERLAYS },
  audio: { master: false, ambience: 0.5, ui: 0.5, narration: false },
};

/* ---------- Core singletons ---------- */
export const clock = new SimClock();

/* ---------- Reactive state ---------- */
export const prefs = signal<Prefs>({ ...DEFAULT_PREFS, overlays: { ...DEFAULT_OVERLAYS } });
export const selectedId = signal<BodyId | null>(null);
export const cameraTarget = signal<BodyId | null>('sun');
export const cameraMode = signal<CameraMode>('overview');
export const activeTool = signal<Tool | null>(null);
export const navigatorOpen = signal<boolean>(false);
export const inspectorOpen = signal<boolean>(false);
export const distractionFree = signal<boolean>(false);
export const paletteOpen = signal<boolean>(false);
export const welcomeOpen = signal<boolean>(true);
export const effectiveQuality = signal<EffectiveQuality>('high');
export const fps = signal<number>(0);
export const webglAvailable = signal<boolean>(true);
export const contextLost = signal<boolean>(false);
export const loadingStage = signal<'preparing' | 'bodies' | 'refining' | 'ready'>('preparing');
export const storageAvailable = signal<boolean>(true);
export const isTouch = signal<boolean>(false);
export const viewport = signal<{ w: number; h: number }>({ w: 1280, h: 720 });
export const frameCenter = signal<BodyId>('sun'); // reference frame for readouts (Sun or body-centered)

/** Throttled clock snapshot for UI (updated ~10 Hz by the app loop). */
export const clockState = signal<ClockSnapshot>(clock.snapshot());
/** Throttled instant for readouts (Unix ms), ~4 Hz. */
export const readoutMs = signal<number>(clock.simMs);

/** Per-body visibility override from the user (hide/show). */
export const hiddenBodies = signal<Set<BodyId>>(new Set());
/** Live sort toggle in the navigator. */
export const visited = signal<BodyId[]>([]);
export const recentBodies = signal<BodyId[]>([]);

export interface Toast { id: number; text: string; kind?: 'info' | 'success' | 'error' | 'warning'; ttl?: number }
export const toasts = signal<Toast[]>([]);
let toastSeq = 1;
export function toast(text: string, kind: Toast['kind'] = 'info', ttl = 3500): void {
  const id = toastSeq++;
  toasts.value = [...toasts.value, { id, text, kind, ttl }];
  if (ttl > 0) setTimeout(() => { toasts.value = toasts.value.filter((x) => x.id !== id); }, ttl);
}

/** Polite live-region announcements for assistive tech. */
export const announcement = signal<string>('');
let announceTimer: ReturnType<typeof setTimeout> | undefined;
export function announce(text: string): void {
  announcement.value = '';
  clearTimeout(announceTimer);
  announceTimer = setTimeout(() => { announcement.value = text; }, 30);
}

/** Stack of dismissible layers (topmost last) for Escape handling. */
export const layerStack = signal<string[]>([]);
export function pushLayer(id: string): void {
  if (!layerStack.value.includes(id)) layerStack.value = [...layerStack.value, id];
}
export function popLayer(id: string): void {
  layerStack.value = layerStack.value.filter((x) => x !== id);
}

/* ---------- Derived ---------- */
export const reducedMotion = computed(() => {
  const p = prefs.value.reducedMotion;
  if (p === 'on') return true;
  if (p === 'off') return false;
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
});

export const isNarrow = computed(() => viewport.value.w < 900);
export const isPhone = computed(() => viewport.value.w < 640);

/* ---------- Helpers ---------- */
export function updatePrefs(patch: Partial<Prefs>): void {
  prefs.value = { ...prefs.value, ...patch };
}
export function updateOverlays(patch: Partial<Overlays>): void {
  prefs.value = { ...prefs.value, overlays: { ...prefs.value.overlays, ...patch } };
}

export function markVisited(id: BodyId): void {
  if (!visited.value.includes(id)) visited.value = [...visited.value, id];
  recentBodies.value = [id, ...recentBodies.value.filter((x) => x !== id)].slice(0, 8);
}

/** Text-input ownership: when true, scene shortcuts are suppressed. */
export function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === 'INPUT') {
    const type = (el as HTMLInputElement).type;
    return !['checkbox', 'radio', 'button', 'range', 'submit'].includes(type);
  }
  return tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}
