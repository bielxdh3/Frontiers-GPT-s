export type Lang = 'pt-BR' | 'en'
export type AppMode = 'explore' | 'learn' | 'tools'
export type ScaleMode = 'exploration' | 'relative'
export type Presentation = 'natural' | 'enhanced'
export type QualityPreset = 'cinematic' | 'classroom' | 'study' | 'low-power' | 'custom'
export type LabelMode = 'major' | 'system' | 'selected' | 'favorites' | 'none'
export type OrbitVis = 'all' | 'selected' | 'system' | 'none'
export type CameraMode = 'free' | 'follow' | 'overview-system' | 'overview-parent'
export type ToolId =
  | 'none'
  | 'compare'
  | 'measure'
  | 'scale-lab'
  | 'seasons-lab'
  | 'moon-lab'
  | 'orbit-lab'
  | 'outer'
  | 'photo'
  | 'encyclopedia'
  | 'missions'
  | 'activities'
  | 'journal'
  | 'help'
  | 'settings'
  | 'share'
  | 'command'
  | 'tour'
  | 'hub'

export type BodyKind =
  | 'star'
  | 'planet'
  | 'moon'
  | 'dwarf-planet'
  | 'asteroid'
  | 'comet'
  | 'region'

export type SimClass = 'full' | 'schematic' | 'informational'
export type BodyId = string

export type Vec3 = { x: number; y: number; z: number }

export type KeplerElements = {
  a0: number
  adot: number
  e0: number
  edot: number
  i0: number
  idot: number
  L0: number
  Ldot: number
  varpi0: number
  varpidot: number
  Omega0: number
  Omegadot: number
  b?: number
  c?: number
  s?: number
  f?: number
}

export type HelioOrbit = {
  kind: 'jpl-table1'
  planet: 'mercury' | 'venus' | 'emb' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune'
  validityNote: string
} | {
  kind: 'kepler-j2000'
  aAu: number
  e: number
  iDeg: number
  OmegaDeg: number
  omegaDeg: number
  M0Deg: number
  periodDays: number
  validityNote: string
}

export type SatOrbit = {
  parentId: BodyId
  aKm: number
  e: number
  iDeg: number
  OmegaDeg: number
  omegaDeg: number
  M0Deg: number
  periodDays: number
  frame: 'ecliptic' | 'parent-equator'
  validityNote: string
}

export type RingsSpec = {
  innerKm: number
  outerKm: number
  divisions: { innerKm: number; outerKm: number }[]
  opacity: number
  faint: boolean
}

export type BodyRecord = {
  id: BodyId
  kind: BodyKind
  simClass: SimClass
  parentId: BodyId | null
  names: { en: string; 'pt-BR': string }
  aliases: string[]
  meanRadiusKm: number | null
  equatorialRadiusKm: number | null
  diameterDefinition: 'mean' | 'equatorial' | 'not-applicable'
  massKg: number | null
  densityGCm3: number | null
  gravityMs2: number | null
  gravityDefinition: string
  siderealRotationDays: number | null
  solarDayDays: number | null
  siderealOrbitDays: number | null
  axialTiltDeg: number | null
  poleRaDeg: number | null
  eccentricity: number | null
  semiMajorAxisKm: number | null
  temperature: { meanK?: number; minK?: number; maxK?: number; note: string } | null
  knownMoons: number | null
  knownMoonsAsOf: string | null
  renderedMoons: number
  helioOrbit: HelioOrbit | null
  satOrbit: SatOrbit | null
  rings: RingsSpec | null
  tidallyLocked: boolean
  facts: { en: [string, string, string]; 'pt-BR': [string, string, string] }
  overview: { en: string; 'pt-BR': string }
  sources: { field: string; ref: string }[]
  visual: {
    type: 'star' | 'rocky' | 'cloudy' | 'earth' | 'ice' | 'gas' | 'rings-host' | 'irregular' | 'comet' | 'haze' | 'schematic'
    palette: string[]
    enhancedNote?: string
  }
}

export type LayerState = {
  id: string
  kind: 'welcome' | 'dialog' | 'sheet' | 'menu' | 'tooltip' | 'tour' | 'tool' | 'disambiguation'
}

export type SavedViewpoint = {
  id: string
  title: string
  targetId: BodyId
  radius: number
  phi: number
  theta: number
  scaleMode: ScaleMode
  restoreDate: boolean
  simMs?: number
  overlays?: { labels: LabelMode; orbits: OrbitVis }
}

export type Bookmark = {
  id: string
  title: string
  simMs: number
  bodyId: BodyId | null
  viewpointId?: string
}

export type JournalEntry = {
  id: string
  title: string
  body: string
  bodyId: BodyId | null
  simMs: number
  createdMs: number
}

export type Measurement = {
  id: string
  a: BodyId
  b: BodyId
  live: boolean
  frozenMs?: number
  frozenKm?: number
}

export type CompareState = {
  ids: BodyId[]
  referenceId: BodyId
}

export type TourProgress = {
  tourId: string
  stopIndex: number
  paused: boolean
  auto: boolean
  saved: {
    scaleMode: ScaleMode
    labelMode: LabelMode
    orbitVis: OrbitVis
    rate: number
    playing: boolean
  } | null
}

export type Prefs = {
  lang: Lang
  presentation: Presentation
  quality: QualityPreset
  pixelRatioCap: number
  labels: LabelMode
  orbits: OrbitVis
  trails: boolean
  trailDurationDays: number
  backgroundIntensity: number
  cleanBackground: boolean
  ecliptic: boolean
  grid: boolean
  axes: boolean
  uiScale: number
  panelOpacity: number
  highContrast: boolean
  reducedMotion: boolean | 'system'
  units: 'metric' | 'familiar'
  dateFormat: 'iso' | 'locale'
  soundMaster: boolean
  ambience: boolean
  uiSounds: boolean
  narration: boolean
  illuminationBoost: number
  scaleMode: ScaleMode
  distractionFree: boolean
}

export type AppState = {
  simMs: number
  playing: boolean
  direction: 1 | -1
  rate: number
  previousRate: number
  sessionStartMs: number
  pausedByHidden: boolean
  catchUpBackground: boolean
  atValidityBound: boolean
  boundMessage: string | null
  selectedId: BodyId | null
  hoveredId: BodyId | null
  cameraMode: CameraMode
  followOffset: { radius: number; phi: number; theta: number }
  viewHistory: SavedViewpoint[]
  viewIndex: number
  mode: AppMode
  tool: ToolId
  layers: LayerState[]
  compare: CompareState
  measure: Measurement | null
  measureHistory: Measurement[]
  tour: TourProgress | null
  activityId: string | null
  encyclopediaId: string | null
  photo: {
    fov: number
    exposure: number
    labels: boolean
    orbits: boolean
    guides: boolean
    aspect: '16:9' | '4:3' | '1:1' | 'canvas'
    freeze: boolean
    prevPlaying: boolean | null
  }
  inspectorTab: 'overview' | 'data' | 'moons' | 'sources'
  labView: 'sizes' | 'distances' | 'combined'
  explorerSnap: {
    followId: BodyId | null
    radius: number
    phi: number
    theta: number
    tx: number
    ty: number
    tz: number
    cameraMode: CameraMode
  } | null
  lightPulse: boolean
  panel: 'nav' | 'ins'
  onboarding: {
    dismissed: boolean
    hintStep: number
    checklist: Record<string, boolean>
  }
  favorites: BodyId[]
  viewpoints: SavedViewpoint[]
  bookmarks: Bookmark[]
  journal: JournalEntry[]
  visited: BodyId[]
  experiment: Record<string, unknown> | null
  prefs: Prefs
  status: string
  webgl: boolean
  storageOk: boolean
  lastError: string | null
}
