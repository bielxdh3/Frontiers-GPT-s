import { DEFAULT_RATE, SESSION_START_MS } from '../core/constants'
import { createClock, type ClockState } from '../core/clock'
import type { AppState, BodyId, Lang, Prefs, ToolId } from '../core/types'

export function defaultPrefs(): Prefs {
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  return {
    lang: 'pt-BR',
    presentation: 'natural',
    quality: 'classroom',
    pixelRatioCap: 1.75,
    labels: 'major',
    orbits: 'all',
    trails: false,
    trailDurationDays: 60,
    backgroundIntensity: 0.7,
    cleanBackground: false,
    ecliptic: false,
    grid: false,
    axes: false,
    uiScale: 1,
    panelOpacity: 0.92,
    highContrast: false,
    reducedMotion: reduce ? true : 'system',
    units: 'metric',
    dateFormat: 'locale',
    soundMaster: false,
    ambience: false,
    uiSounds: false,
    narration: false,
    illuminationBoost: 0.06,
    scaleMode: 'exploration',
    distractionFree: false,
  }
}

export function createState(): AppState {
  return {
    simMs: SESSION_START_MS,
    playing: true,
    direction: 1,
    rate: DEFAULT_RATE,
    previousRate: DEFAULT_RATE,
    sessionStartMs: SESSION_START_MS,
    pausedByHidden: false,
    catchUpBackground: false,
    atValidityBound: false,
    boundMessage: null,
    selectedId: null,
    hoveredId: null,
    cameraMode: 'free',
    followOffset: { radius: 28, phi: 1.05, theta: 0.55 },
    viewHistory: [],
    viewIndex: -1,
    mode: 'explore',
    tool: 'none',
    layers: [],
    compare: { ids: [], referenceId: 'earth' },
    measure: null,
    measureHistory: [],
    tour: null,
    activityId: null,
    encyclopediaId: null,
    photo: { fov: 50, exposure: 1, labels: false, orbits: false, guides: true, aspect: '16:9', freeze: true, prevPlaying: null },
    inspectorTab: 'overview',
    labView: 'sizes',
    explorerSnap: null,
    lightPulse: false,
    panel: 'nav',
    onboarding: {
      dismissed: false,
      hintStep: 0,
      checklist: { planet: false, moon: false, reverse: false, compare: false, scale: false },
    },
    favorites: [],
    viewpoints: [],
    bookmarks: [],
    journal: [],
    visited: [],
    experiment: null,
    prefs: defaultPrefs(),
    status: '',
    webgl: true,
    storageOk: true,
    lastError: null,
  }
}

type Fn = (hint: string) => void
const listeners = new Set<Fn>()

export const state: AppState = createState()
export const clock: ClockState = createClock()

export function subscribe(fn: Fn): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function notify(hint = 'ui'): void {
  syncClockToState()
  for (const fn of listeners) fn(hint)
}

function syncClockToState(): void {
  state.simMs = clock.simMs
  state.playing = clock.playing
  state.direction = clock.direction
  state.rate = clock.rate
  state.previousRate = clock.previousRate
  state.atValidityBound = clock.atBound
}

export function pushLayer(id: string, kind: AppState['layers'][number]['kind']): void {
  state.layers = state.layers.filter((l) => l.id !== id)
  state.layers.push({ id, kind })
  notify('layers')
}

export function popLayer(): boolean {
  if (!state.layers.length) return false
  state.layers.pop()
  notify('layers')
  return true
}

export function topLayer(): AppState['layers'][number] | undefined {
  return state.layers[state.layers.length - 1]
}

export function setTool(tool: ToolId): void {
  const prev = state.tool
  if (prev === 'photo' && tool !== 'photo' && state.photo.prevPlaying != null) {
    clock.playing = state.photo.prevPlaying
    state.photo.prevPlaying = null
  }
  state.tool = tool
  if (tool === 'none') {
    state.layers = state.layers.filter((l) => l.kind !== 'tool')
  } else {
    state.layers = state.layers.filter((l) => l.id !== tool)
    state.layers.push({ id: tool, kind: 'tool' })
  }
  notify('tool')
}

export function selectBody(id: BodyId | null, silent = false): void {
  state.selectedId = id
  if (id) state.panel = 'ins'
  if (id && !state.visited.includes(id)) state.visited = [...state.visited, id].slice(-40)
  if (id && ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'].includes(id)) {
    state.onboarding.checklist.planet = true
  }
  if (!silent) notify('select')
}

export function setLang(lang: Lang): void {
  state.prefs.lang = lang
  document.documentElement.lang = lang === 'pt-BR' ? 'pt-BR' : 'en'
  notify('i18n')
}

export function wantsReducedMotion(): boolean {
  const p = state.prefs.reducedMotion
  if (p === true) return true
  if (p === false) return false
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
}
