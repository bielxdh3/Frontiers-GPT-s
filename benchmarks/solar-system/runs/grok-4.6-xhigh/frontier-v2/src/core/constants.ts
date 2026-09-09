/** Scientific and simulation constants. Identifiers stay in English. */

export const AU_KM = 149_597_870.7
export const C_KMS = 299_792.458
export const G_SI = 6.6743e-11
export const GM_SUN_M3_S2 = 1.32712440018e20
export const J2000_JD = 2_451_545.0
export const UNIX_JD_OFFSET = 2_440_587.5
export const JULIAN_YEAR_DAYS = 365.25
export const DAY_S = 86_400
export const WEEK_S = DAY_S * 7
export const DEMO_MONTH_S = DAY_S * 30
export const JULIAN_YEAR_S = JULIAN_YEAR_DAYS * DAY_S
export const MAX_FRAME_DT_S = 0.25

/** JPL Table 1 validity (approx_pos.html). */
export const VALID_START_ISO = '1800-01-01T00:00:00.000Z'
export const VALID_END_ISO = '2050-12-31T23:59:59.000Z'
export const VALID_START_MS = Date.parse(VALID_START_ISO)
export const VALID_END_MS = Date.parse(VALID_END_ISO)

/** Deterministic session-start epoch for verification. */
export const SESSION_START_ISO = '2026-01-01T00:00:00.000Z'
export const SESSION_START_MS = Date.parse(SESSION_START_ISO)

export const DEFAULT_RATE = 86_400
export const DATA_REFERENCE_DATE = '2026-07-31'
export const CATALOG_VERSION = '1.0.0'
export const STORAGE_VERSION = 1
export const STORAGE_KEY = 'sso-observatory-v1'

export const EARTH_MEAN_RADIUS_KM = 6371.0084
export const EARTH_MASS_KG = 5.97217e24
export const SUN_MEAN_RADIUS_KM = 695_700
export const SUN_MASS_KG = 1.98847e30

export const OBLIQUITY_J2000_DEG = 23.43928

export const SPEED_PRESETS = [1, 10, 100, 1_000, 3_600, 86_400, 604_800, 2_592_000] as const

export const SCHEMA_NOTES = {
  diameter: 'mean',
  timeScale: 'UTC displayed; orbital model uses TDB-equivalent Julian date as JPL approx_pos (T_eph ≈ JD). Light-time is not applied.',
  frame: 'Heliocentric mean ecliptic and equinox of J2000. Renderer uses Z-up = north ecliptic pole, X = equinox.',
  earthOrbit: 'JPL Table 1 Earth/Moon barycenter (EMB), labeled as an EMB approximation — not an Earth-center ephemeris.',
} as const
