import type { BodyId, BodyRecord } from '../core/types'
import { CATALOG } from './catalog-inner'
import { CATALOG_OUTER } from './catalog-outer'
import { CATALOG_MOONS } from './catalog-moons'
import { CATALOG_SMALL } from './catalog-small'

export const ALL_BODIES: BodyRecord[] = [...CATALOG, ...CATALOG_OUTER, ...CATALOG_MOONS, ...CATALOG_SMALL]

const byId = new Map(ALL_BODIES.map((b) => [b.id, b]))

export function getBody(id: BodyId): BodyRecord | undefined {
  return byId.get(id)
}

export function requireBody(id: BodyId): BodyRecord {
  const b = byId.get(id)
  if (!b) throw new Error(`Unknown body: ${id}`)
  return b
}

export function childrenOf(id: BodyId): BodyRecord[] {
  return ALL_BODIES.filter((b) => b.parentId === id)
}

export function selectableBodies(): BodyRecord[] {
  return ALL_BODIES.filter((b) => b.simClass !== 'informational' || b.id === 'oort-cloud')
}

export function majorPlanetIds(): BodyId[] {
  return ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']
}

export function searchBodies(query: string, lang: 'pt-BR' | 'en'): BodyRecord[] {
  const q = fold(query)
  if (!q) return []
  const scored: { b: BodyRecord; s: number }[] = []
  for (const b of ALL_BODIES) {
    const name = fold(b.names[lang])
    const en = fold(b.names.en)
    const aliases = b.aliases.map(fold)
    let s = 0
    if (name === q || en === q || aliases.includes(q)) s = 100
    else if (name.startsWith(q) || en.startsWith(q) || aliases.some((a) => a.startsWith(q))) s = 80
    else if (name.includes(q) || en.includes(q) || aliases.some((a) => a.includes(q))) s = 50
    if (s) scored.push({ b, s })
  }
  scored.sort((a, c) => c.s - a.s || a.b.names.en.localeCompare(c.b.names.en))
  return scored.map((x) => x.b)
}

export function fold(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

export function groupNavigator(): { id: string; ids: BodyId[] }[] {
  return [
    { id: 'star', ids: ['sun'] },
    { id: 'planets', ids: majorPlanetIds() },
    { id: 'moons', ids: ALL_BODIES.filter((b) => b.kind === 'moon').map((b) => b.id) },
    { id: 'dwarfs', ids: ALL_BODIES.filter((b) => b.kind === 'dwarf-planet').map((b) => b.id) },
    { id: 'small', ids: ALL_BODIES.filter((b) => b.kind === 'asteroid' || b.kind === 'comet').map((b) => b.id) },
    { id: 'regions', ids: ALL_BODIES.filter((b) => b.kind === 'region').map((b) => b.id) },
  ]
}

export function diameterKm(b: BodyRecord): number | null {
  if (b.meanRadiusKm == null && b.equatorialRadiusKm == null) return null
  if (b.diameterDefinition === 'equatorial' && b.equatorialRadiusKm != null) return 2 * b.equatorialRadiusKm
  if (b.meanRadiusKm != null) return 2 * b.meanRadiusKm
  if (b.equatorialRadiusKm != null) return 2 * b.equatorialRadiusKm
  return null
}

export function radiusKm(b: BodyRecord): number | null {
  if (b.diameterDefinition === 'equatorial' && b.equatorialRadiusKm != null) return b.equatorialRadiusKm
  return b.meanRadiusKm ?? b.equatorialRadiusKm
}
