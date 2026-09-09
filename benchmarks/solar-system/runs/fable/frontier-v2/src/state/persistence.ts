import { signal } from '@preact/signals';
import { BODY_MAP } from '../data/bodies';
import type { BodyId } from '../data/types';
import type { ScaleMode } from '../sim/scale';
import { DEFAULT_OVERLAYS, DEFAULT_PREFS, prefs, storageAvailable, type Prefs } from './store';

export const SCHEMA_VERSION = 1;
const KEY_PREFS = 'sso.prefs.v1';
const KEY_COLLECTIONS = 'sso.collections.v1';
const KEY_UI = 'sso.ui.v1';

export interface Viewpoint {
  id: string;
  title: string;
  target: BodyId;
  /** Spherical offset relative to the target in display units. */
  distance: number;
  theta: number;
  phi: number;
  scaleMode: ScaleMode;
  simMs: number;
  restoreDate: boolean;
  labels: string;
  orbits: string;
  createdAt: number;
}

export interface Bookmark {
  id: string;
  title: string;
  simMs: number;
  body?: BodyId;
  scaleMode: ScaleMode;
  createdAt: number;
}

export interface JournalEntry {
  id: string;
  text: string;
  body?: BodyId;
  simMs?: number;
  measurement?: string;
  screenshotRef?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Collections {
  version: number;
  favorites: BodyId[];
  viewpoints: Viewpoint[];
  bookmarks: Bookmark[];
  journal: JournalEntry[];
  /** Activity progress: id → 'done' | 'started' */
  progress: Record<string, 'done' | 'started'>;
  toursCompleted: string[];
  tourResume: Record<string, number>;
  orbitPresets: { id: string; name: string; centralMassKg: number; aKm: number; e: number; createdAt: number }[];
  checklist: Record<string, boolean>;
}

export interface UiMemory {
  version: number;
  hintsSeen: Record<string, boolean>;
  welcomeDismissed: boolean;
  visited: BodyId[];
  checklistCollapsed: boolean;
}

export const EMPTY_COLLECTIONS: Collections = {
  version: SCHEMA_VERSION, favorites: [], viewpoints: [], bookmarks: [], journal: [], progress: {}, toursCompleted: [], tourResume: {}, orbitPresets: [], checklist: {},
};

export const collections = signal<Collections>({ ...EMPTY_COLLECTIONS });
export const uiMemory = signal<UiMemory>({ version: SCHEMA_VERSION, hintsSeen: {}, welcomeDismissed: false, visited: [], checklistCollapsed: false });
export const recoveryNotice = signal<string | null>(null);

/* ---------- storage access with capability detection ---------- */

function storage(): Storage | null {
  try {
    const s = window.localStorage;
    const k = '__sso_probe__';
    s.setItem(k, '1');
    s.removeItem(k);
    return s;
  } catch {
    return null;
  }
}

export function detectStorage(): boolean {
  const ok = storage() !== null;
  storageAvailable.value = ok;
  return ok;
}

function readJson(key: string): unknown {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Returns true only when persistence actually succeeded. */
function writeJson(key: string, value: unknown): boolean {
  const s = storage();
  if (!s) return false;
  try {
    s.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/* ---------- validation ---------- */

const isBodyId = (v: unknown): v is BodyId => typeof v === 'string' && v in BODY_MAP;
const isFiniteNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const str = (v: unknown, max = 200): string | null => (typeof v === 'string' && v.length <= max ? v : null);
const genId = (): string => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export interface ValidationResult<T> { value: T; skipped: number }

export function validateCollections(raw: unknown): ValidationResult<Collections> {
  let skipped = 0;
  const out: Collections = { ...EMPTY_COLLECTIONS, favorites: [], viewpoints: [], bookmarks: [], journal: [], progress: {}, toursCompleted: [], tourResume: {}, orbitPresets: [], checklist: {} };
  if (!raw || typeof raw !== 'object') return { value: out, skipped: 1 };
  const r = raw as Record<string, unknown>;
  if (Array.isArray(r.favorites)) for (const f of r.favorites) { if (isBodyId(f) && !out.favorites.includes(f)) out.favorites.push(f); else skipped++; }
  if (Array.isArray(r.viewpoints)) for (const v of r.viewpoints as Record<string, unknown>[]) {
    if (v && isBodyId(v.target) && isFiniteNum(v.distance) && isFiniteNum(v.theta) && isFiniteNum(v.phi) && v.distance > 0 && v.distance < 1e7) {
      out.viewpoints.push({
        id: str(v.id, 64) ?? genId(), title: str(v.title, 120) ?? '', target: v.target, distance: v.distance, theta: v.theta, phi: v.phi,
        scaleMode: v.scaleMode === 'relative' ? 'relative' : 'exploration', simMs: isFiniteNum(v.simMs) ? v.simMs : 0, restoreDate: !!v.restoreDate,
        labels: str(v.labels, 20) ?? 'major', orbits: str(v.orbits, 20) ?? 'all', createdAt: isFiniteNum(v.createdAt) ? v.createdAt : Date.now(),
      });
    } else skipped++;
  }
  if (Array.isArray(r.bookmarks)) for (const b of r.bookmarks as Record<string, unknown>[]) {
    if (b && isFiniteNum(b.simMs)) {
      out.bookmarks.push({ id: str(b.id, 64) ?? genId(), title: str(b.title, 120) ?? '', simMs: b.simMs, body: isBodyId(b.body) ? b.body : undefined, scaleMode: b.scaleMode === 'relative' ? 'relative' : 'exploration', createdAt: isFiniteNum(b.createdAt) ? b.createdAt : Date.now() });
    } else skipped++;
  }
  if (Array.isArray(r.journal)) for (const j of r.journal as Record<string, unknown>[]) {
    const text = str(j?.text, 5000);
    if (j && text !== null) {
      out.journal.push({ id: str(j.id, 64) ?? genId(), text, body: isBodyId(j.body) ? j.body : undefined, simMs: isFiniteNum(j.simMs) ? j.simMs : undefined, measurement: str(j.measurement, 500) ?? undefined, screenshotRef: str(j.screenshotRef, 200) ?? undefined, createdAt: isFiniteNum(j.createdAt) ? j.createdAt : Date.now(), updatedAt: isFiniteNum(j.updatedAt) ? j.updatedAt : Date.now() });
    } else skipped++;
  }
  if (r.progress && typeof r.progress === 'object') for (const [k, v] of Object.entries(r.progress as Record<string, unknown>)) {
    if (k.length <= 64 && (v === 'done' || v === 'started')) out.progress[k] = v; else skipped++;
  }
  if (Array.isArray(r.toursCompleted)) for (const tId of r.toursCompleted) { const s = str(tId, 64); if (s) out.toursCompleted.push(s); else skipped++; }
  if (r.tourResume && typeof r.tourResume === 'object') for (const [k, v] of Object.entries(r.tourResume as Record<string, unknown>)) {
    if (k.length <= 64 && isFiniteNum(v) && v >= 0 && v < 100) out.tourResume[k] = v; else skipped++;
  }
  if (Array.isArray(r.orbitPresets)) for (const p of r.orbitPresets as Record<string, unknown>[]) {
    if (p && isFiniteNum(p.centralMassKg) && isFiniteNum(p.aKm) && isFiniteNum(p.e) && p.e >= 0 && p.e < 0.95 && p.aKm > 0 && p.centralMassKg > 0) {
      out.orbitPresets.push({ id: str(p.id, 64) ?? genId(), name: str(p.name, 80) ?? '', centralMassKg: p.centralMassKg, aKm: p.aKm, e: p.e, createdAt: isFiniteNum(p.createdAt) ? p.createdAt : Date.now() });
    } else skipped++;
  }
  if (r.checklist && typeof r.checklist === 'object') for (const [k, v] of Object.entries(r.checklist as Record<string, unknown>)) { if (k.length <= 40 && typeof v === 'boolean') out.checklist[k] = v; }
  return { value: out, skipped };
}

export function validatePrefs(raw: unknown): Prefs {
  const base: Prefs = { ...DEFAULT_PREFS, overlays: { ...DEFAULT_OVERLAYS }, audio: { ...DEFAULT_PREFS.audio } };
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Record<string, unknown>;
  const num = (k: keyof Prefs, min: number, max: number) => { const v = r[k]; if (isFiniteNum(v) && v >= min && v <= max) (base as unknown as Record<string, unknown>)[k] = v; };
  const bool = (k: keyof Prefs) => { if (typeof r[k] === 'boolean') (base as unknown as Record<string, unknown>)[k] = r[k]; };
  const oneOf = <K extends keyof Prefs>(k: K, opts: readonly Prefs[K][]) => { if (opts.includes(r[k] as Prefs[K])) base[k] = r[k] as Prefs[K]; };
  oneOf('locale', ['pt-BR', 'en']); oneOf('quality', ['auto', 'low', 'medium', 'high']); oneOf('presentation', ['natural', 'enhanced']);
  oneOf('reducedMotion', ['system', 'on', 'off']); oneOf('tempUnit', ['K', 'C', 'F']); oneOf('scaleMode', ['exploration', 'relative']);
  oneOf('labelsMode', ['major', 'system', 'selected', 'favorites', 'none']); oneOf('orbitsMode', ['all', 'selected', 'system', 'none']);
  num('uiScale', 0.8, 1.4); num('panelOpacity', 0.5, 1); num('background', 0, 1); num('labelSize', 0.8, 1.4); num('labelDensity', 0.2, 1); num('exposure', 0.5, 2.5);
  bool('familiarUnits'); bool('bloom'); bool('highContrast'); bool('simplified'); bool('autoRotate');
  if (r.overlays && typeof r.overlays === 'object') {
    const o = r.overlays as Record<string, unknown>;
    for (const k of Object.keys(DEFAULT_OVERLAYS) as (keyof typeof DEFAULT_OVERLAYS)[]) {
      if (k === 'moons') { if (o.moons === 'auto' || o.moons === 'all' || o.moons === 'none') base.overlays.moons = o.moons; }
      else if (k === 'trailDays') { if (isFiniteNum(o.trailDays) && o.trailDays > 0 && o.trailDays <= 3650) base.overlays.trailDays = o.trailDays; }
      else if (typeof o[k] === 'boolean') (base.overlays as unknown as Record<string, unknown>)[k] = o[k];
    }
  }
  if (r.audio && typeof r.audio === 'object') {
    const a = r.audio as Record<string, unknown>;
    if (typeof a.master === 'boolean') base.audio.master = a.master;
    if (typeof a.narration === 'boolean') base.audio.narration = a.narration;
    if (isFiniteNum(a.ambience) && a.ambience >= 0 && a.ambience <= 1) base.audio.ambience = a.ambience;
    if (isFiniteNum(a.ui) && a.ui >= 0 && a.ui <= 1) base.audio.ui = a.ui;
  }
  return base;
}

/* ---------- load / save ---------- */

export function loadAll(): void {
  detectStorage();
  const p = readJson(KEY_PREFS);
  if (p) prefs.value = validatePrefs(p);
  const c = readJson(KEY_COLLECTIONS);
  if (c) {
    const { value, skipped } = validateCollections(c);
    collections.value = value;
    if (skipped > 0) recoveryNotice.value = String(skipped);
  }
  const u = readJson(KEY_UI) as Partial<UiMemory> | null;
  if (u && typeof u === 'object') {
    uiMemory.value = {
      version: SCHEMA_VERSION,
      hintsSeen: u.hintsSeen && typeof u.hintsSeen === 'object' ? (u.hintsSeen as Record<string, boolean>) : {},
      welcomeDismissed: !!u.welcomeDismissed,
      visited: Array.isArray(u.visited) ? (u.visited as unknown[]).filter(isBodyId) : [],
      checklistCollapsed: !!u.checklistCollapsed,
    };
  }
}

export function savePrefs(): boolean { return writeJson(KEY_PREFS, prefs.value); }
export function saveCollections(): boolean { return writeJson(KEY_COLLECTIONS, collections.value); }
export function saveUi(): boolean { return writeJson(KEY_UI, uiMemory.value); }

export function updateCollections(fn: (c: Collections) => Collections): boolean {
  collections.value = fn(collections.value);
  return saveCollections();
}

export function updateUiMemory(patch: Partial<UiMemory>): void {
  uiMemory.value = { ...uiMemory.value, ...patch };
  saveUi();
}

export function newId(): string { return genId(); }

/* ---------- export / import ---------- */

export interface ExportBundle {
  app: 'solar-system-observatory';
  version: number;
  exportedAt: string;
  prefs: Prefs;
  collections: Collections;
}

export function exportBundle(includeNotes: boolean): ExportBundle {
  const c = collections.value;
  return {
    app: 'solar-system-observatory', version: SCHEMA_VERSION, exportedAt: new Date().toISOString(),
    prefs: prefs.value,
    collections: includeNotes ? c : { ...c, journal: [] },
  };
}

export interface ImportPreview {
  ok: boolean;
  reason?: string;
  prefs?: Prefs;
  collections?: Collections;
  skipped: number;
  counts: { fav: number; vp: number; bm: number; jn: number };
}

export function previewImport(text: string): ImportPreview {
  if (text.length > 5_000_000) return { ok: false, reason: 'file too large', skipped: 0, counts: { fav: 0, vp: 0, bm: 0, jn: 0 } };
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return { ok: false, reason: 'not valid JSON', skipped: 0, counts: { fav: 0, vp: 0, bm: 0, jn: 0 } }; }
  if (!raw || typeof raw !== 'object') return { ok: false, reason: 'unexpected structure', skipped: 0, counts: { fav: 0, vp: 0, bm: 0, jn: 0 } };
  const r = raw as Record<string, unknown>;
  if (r.app !== 'solar-system-observatory') return { ok: false, reason: 'not an observatory export', skipped: 0, counts: { fav: 0, vp: 0, bm: 0, jn: 0 } };
  if (!isFiniteNum(r.version) || r.version > SCHEMA_VERSION) return { ok: false, reason: `unsupported schema version ${String(r.version)}`, skipped: 0, counts: { fav: 0, vp: 0, bm: 0, jn: 0 } };
  const { value, skipped } = validateCollections(r.collections);
  const p = r.prefs ? validatePrefs(r.prefs) : undefined;
  return { ok: true, prefs: p, collections: value, skipped, counts: { fav: value.favorites.length, vp: value.viewpoints.length, bm: value.bookmarks.length, jn: value.journal.length } };
}

export function applyImport(preview: ImportPreview, mode: 'merge' | 'replace'): boolean {
  if (!preview.ok || !preview.collections) return false;
  const inc = preview.collections;
  if (mode === 'replace') {
    collections.value = inc;
  } else {
    const cur = collections.value;
    const mergeById = <T extends { id: string }>(a: T[], b: T[]) => { const m = new Map(a.map((x) => [x.id, x])); for (const x of b) m.set(x.id, x); return [...m.values()]; };
    collections.value = {
      ...cur,
      favorites: [...new Set([...cur.favorites, ...inc.favorites])],
      viewpoints: mergeById(cur.viewpoints, inc.viewpoints),
      bookmarks: mergeById(cur.bookmarks, inc.bookmarks),
      journal: mergeById(cur.journal, inc.journal),
      progress: { ...cur.progress, ...inc.progress },
      toursCompleted: [...new Set([...cur.toursCompleted, ...inc.toursCompleted])],
      tourResume: { ...cur.tourResume, ...inc.tourResume },
      orbitPresets: mergeById(cur.orbitPresets, inc.orbitPresets),
      checklist: { ...cur.checklist, ...inc.checklist },
    };
  }
  if (preview.prefs) { prefs.value = preview.prefs; savePrefs(); }
  return saveCollections();
}

export function clearAllLocalData(): void {
  collections.value = { ...EMPTY_COLLECTIONS, favorites: [], viewpoints: [], bookmarks: [], journal: [], progress: {}, toursCompleted: [], tourResume: {}, orbitPresets: [], checklist: {} };
  uiMemory.value = { version: SCHEMA_VERSION, hintsSeen: {}, welcomeDismissed: false, visited: [], checklistCollapsed: false };
  const s = storage();
  if (s) { s.removeItem(KEY_COLLECTIONS); s.removeItem(KEY_UI); }
}

/** Download a text blob; returns false when the browser blocks it. */
export function downloadText(filename: string, text: string, mime = 'application/json'): boolean {
  try {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch {
    return false;
  }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
  } catch { /* fall through */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
