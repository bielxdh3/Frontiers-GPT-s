import { STORAGE_KEY, STORAGE_VERSION } from '../core/constants'
import { state } from './store'
import type { Bookmark, JournalEntry, SavedViewpoint } from '../core/types'

export type PersistBlob = {
  v: number
  prefs: typeof state.prefs
  favorites: string[]
  viewpoints: SavedViewpoint[]
  bookmarks: Bookmark[]
  journal: JournalEntry[]
  onboarding: typeof state.onboarding
  visited: string[]
}

export function canStore(): boolean {
  try {
    const k = STORAGE_KEY + '-ping'
    localStorage.setItem(k, '1')
    localStorage.removeItem(k)
    return true
  } catch {
    return false
  }
}

export function loadPersisted(): { ok: boolean; note: string | null } {
  if (!canStore()) return { ok: false, note: 'storage-unavailable' }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ok: true, note: null }
    const data = JSON.parse(raw) as PersistBlob
    if (!data || data.v !== STORAGE_VERSION) return { ok: true, note: 'version-mismatch' }
    if (data.prefs) Object.assign(state.prefs, sanitizePrefs(data.prefs))
    state.favorites = Array.isArray(data.favorites) ? data.favorites.filter((x) => typeof x === 'string').slice(0, 80) : []
    state.viewpoints = Array.isArray(data.viewpoints) ? data.viewpoints.slice(0, 80) : []
    state.bookmarks = Array.isArray(data.bookmarks) ? data.bookmarks.slice(0, 80) : []
    state.journal = Array.isArray(data.journal) ? data.journal.slice(0, 80) : []
    if (data.onboarding) state.onboarding = { ...state.onboarding, ...data.onboarding }
    state.visited = Array.isArray(data.visited) ? data.visited.slice(0, 80) : []
    return { ok: true, note: null }
  } catch {
    return { ok: false, note: 'malformed' }
  }
}

function sanitizePrefs(p: Record<string, unknown>): Partial<typeof state.prefs> {
  const out: Partial<typeof state.prefs> = {}
  if (p.lang === 'en' || p.lang === 'pt-BR') out.lang = p.lang
  if (p.presentation === 'natural' || p.presentation === 'enhanced') out.presentation = p.presentation
  if (typeof p.labels === 'string') out.labels = p.labels as typeof state.prefs.labels
  if (typeof p.orbits === 'string') out.orbits = p.orbits as typeof state.prefs.orbits
  if (typeof p.scaleMode === 'string') out.scaleMode = p.scaleMode as typeof state.prefs.scaleMode
  if (typeof p.backgroundIntensity === 'number') out.backgroundIntensity = p.backgroundIntensity
  if (typeof p.panelOpacity === 'number') out.panelOpacity = p.panelOpacity
  if (typeof p.soundMaster === 'boolean') out.soundMaster = p.soundMaster
  if (typeof p.quality === 'string') out.quality = p.quality as typeof state.prefs.quality
  return out
}

export function savePersisted(): boolean {
  if (!canStore()) return false
  const blob: PersistBlob = {
    v: STORAGE_VERSION,
    prefs: state.prefs,
    favorites: state.favorites,
    viewpoints: state.viewpoints,
    bookmarks: state.bookmarks,
    journal: state.journal,
    onboarding: state.onboarding,
    visited: state.visited,
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(blob))
    return true
  } catch {
    return false
  }
}

export function exportLocalJson(): string {
  return JSON.stringify(
    {
      v: STORAGE_VERSION,
      kind: 'sso-observatory-export',
      prefs: state.prefs,
      favorites: state.favorites,
      viewpoints: state.viewpoints,
      bookmarks: state.bookmarks,
      journal: state.journal,
    },
    null,
    2,
  )
}

export function importLocalJson(text: string): { ok: boolean; summary: string } {
  try {
    const data = JSON.parse(text) as PersistBlob & { kind?: string }
    if (data.v !== STORAGE_VERSION) return { ok: false, summary: 'version' }
    if (data.kind && data.kind !== 'sso-observatory-export') return { ok: false, summary: 'kind' }
    if (data.favorites) state.favorites = data.favorites.filter((x) => typeof x === 'string').slice(0, 80)
    if (data.viewpoints) state.viewpoints = data.viewpoints.slice(0, 80)
    if (data.bookmarks) state.bookmarks = data.bookmarks.slice(0, 80)
    if (data.journal) {
      state.journal = data.journal.filter((j) => typeof j.body === 'string' && j.body.length < 8000).slice(0, 80)
    }
    if (data.prefs) Object.assign(state.prefs, sanitizePrefs(data.prefs))
    savePersisted()
    return { ok: true, summary: 'ok' }
  } catch {
    return { ok: false, summary: 'parse' }
  }
}

export function downloadText(filename: string, text: string, mime = 'application/json'): void {
  const blob = new Blob([text], { type: mime })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1500)
}
