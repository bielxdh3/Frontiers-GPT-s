/**
 * Core data types for the celestial catalog.
 * Raw scientific values live here (SI / km / days); localized display strings
 * are produced by the i18n and formatting layers, never stored in the catalog.
 */

export type BodyId =
  | 'sun'
  | 'mercury' | 'venus' | 'earth' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune'
  | 'moon'
  | 'phobos' | 'deimos'
  | 'io' | 'europa' | 'ganymede' | 'callisto'
  | 'titan' | 'enceladus'
  | 'miranda' | 'ariel' | 'umbriel' | 'titania' | 'oberon'
  | 'triton'
  | 'pluto' | 'charon'
  | 'ceres' | 'eris' | 'haumea' | 'makemake'
  | 'vesta'
  | 'comet-observatory'
  | 'asteroid-belt' | 'kuiper-belt' | 'oort-cloud';

export type BodyKind =
  | 'star' | 'planet' | 'dwarf-planet' | 'moon' | 'asteroid' | 'comet' | 'region';

/** How faithfully the object is represented in the scene. */
export type SimulationLevel =
  | 'simulated'   // full body with modeled position and orientation
  | 'schematic'   // contextual structure with representative geometry (belts, cloud)
  | 'reference';  // informational only

export interface SourceRef {
  id: string;
  label: string;
  url: string;
  /** Date the source was consulted or the dataset epoch, ISO YYYY-MM-DD. */
  accessed: string;
}

/**
 * JPL "Keplerian elements for approximate positions" style element set.
 * Angles in degrees, a in au, rates per Julian century (T from J2000.0).
 */
export interface HelioElements {
  a: number; aDot: number;
  e: number; eDot: number;
  i: number; iDot: number;
  L: number; LDot: number;
  wBar: number; wBarDot: number;
  Omega: number; OmegaDot: number;
  /** Optional additional terms (JPL Table 2b) for the mean anomaly. */
  b?: number; c?: number; s?: number; f?: number;
  /** Validity interval as Julian Dates (TDB ≈ TT ≈ UTC at this accuracy). */
  validFromJd: number;
  validToJd: number;
  /** Description of the element source / model. */
  model: 'jpl-table1' | 'jpl-table2' | 'mean-elements' | 'hypothetical';
  sourceId: string;
}

/**
 * Simplified satellite orbit. Geometry (a, e, period, inclination) is sourced;
 * the phase at epoch is schematic unless `phaseIsReal` is true.
 */
export interface SatelliteOrbit {
  aKm: number;
  e: number;
  /** Sidereal orbital period in days; negative means retrograde. */
  periodDays: number;
  /** Inclination in degrees to the reference plane. */
  inclinationDeg: number;
  /** Longitude of ascending node (deg) in the reference plane. Schematic if phaseIsReal is false. */
  nodeDeg: number;
  /** Argument of pericenter (deg). */
  periDeg: number;
  /** Mean anomaly at J2000 (deg). */
  meanAnomalyAtEpochDeg: number;
  plane: 'parent-equator' | 'ecliptic';
  phaseIsReal: boolean;
  sourceId: string;
}

export interface RotationModel {
  /** Sidereal rotation period in hours. Negative = retrograde (relative to the pole defined by RA/Dec, right-hand rule). */
  periodHours: number;
  /** Pole direction in J2000 equatorial coordinates (degrees). */
  poleRA: number;
  poleDec: number;
  /** Prime meridian angle W at J2000 (degrees). Optional; schematic zero if missing. */
  w0Deg?: number;
  /** Rate of W in deg/day if different from 360/period conversions (IAU tables). */
  wRateDegPerDay?: number;
  /** If true, orientation is derived from the parent direction (synchronous rotation). */
  synchronous?: boolean;
}

export type GravityReference = 'surface' | 'one-bar' | 'photosphere' | 'none';

export interface PhysicalData {
  meanRadiusKm: number;
  equatorialRadiusKm?: number;
  /** Optional triaxial dimensions for irregular bodies (km). */
  dimensionsKm?: [number, number, number];
  massKg?: number;
  densityGcm3?: number;
  gravityMs2?: number;
  gravityRef: GravityReference;
  escapeVelocityKms?: number;
  /** Temperature context in kelvin. */
  tempMeanK?: number;
  tempMinK?: number;
  tempMaxK?: number;
  /** Which level the temperature refers to (i18n key suffix). */
  tempRef?: 'surface' | 'one-bar' | 'photosphere' | 'cloud-top' | 'estimated';
  /** Obliquity to the orbit, in degrees. */
  axialTiltDeg?: number;
  solarDayHours?: number;
  knownMoons?: number;
  knownMoonsAsOf?: string;
  geometricAlbedo?: number;
  /** Heliocentric orbital period in days (for informational entries and cross-checks). */
  orbitalPeriodDays?: number;
  /** Semi-major axis in au (informational). */
  semiMajorAxisAu?: number;
  eccentricity?: number;
  inclinationDeg?: number;
}

export interface RingBand {
  /** Inner and outer radius in km from the planet center. */
  innerKm: number;
  outerKm: number;
  /** Peak opacity 0–1 (illustrative, based on optical depth classes). */
  opacity: number;
  /** Base color as CSS hex. */
  color: string;
  /** Label key or name (e.g. "A", "B", "Cassini Division"). */
  name: string;
}

export interface RingSpec {
  bands: RingBand[];
  /** Whether visibility is exaggerated relative to natural brightness. */
  enhanced: boolean;
}

export type TextureKind =
  | 'sun' | 'mercury' | 'venus' | 'earth' | 'moon' | 'mars'
  | 'jupiter' | 'saturn' | 'uranus' | 'neptune'
  | 'icy' | 'rocky' | 'io' | 'europa' | 'titan' | 'triton' | 'pluto' | 'charon'
  | 'dwarf' | 'asteroid' | 'comet';

export interface Appearance {
  texture: TextureKind;
  /** Base color used for markers, labels, comparison discs and fallbacks. */
  color: string;
  /** Secondary color for procedural generation (bands, maria, etc.). */
  accent?: string;
  atmosphere?: { color: string; intensity: number };
  clouds?: boolean;
  nightLights?: boolean;
  rings?: RingSpec;
  emissive?: boolean;
  irregular?: boolean;
  /** Random seed for procedural generation. */
  seed: number;
  /** Whether the visual is illustrative (no detailed surface imagery available). */
  illustrative: boolean;
}

export interface LocalizedText {
  pt: string;
  en: string;
}

export interface BodyDef {
  id: BodyId;
  kind: BodyKind;
  level: SimulationLevel;
  parent?: BodyId;
  names: { pt: string; en: string; aliases: string[] };
  physical: PhysicalData;
  orbit?: HelioElements;
  satellite?: SatelliteOrbit;
  rotation?: RotationModel;
  appearance: Appearance;
  summary: LocalizedText;
  facts: LocalizedText[];
  /** Explanation of classification or special status. */
  classificationNote?: LocalizedText;
  sourceIds: string[];
  /** Reference date for the factual dataset (ISO). */
  dataAsOf: string;
}

/** Physical constants (SI). */
export const G = 6.6743e-11; // m^3 kg^-1 s^-2
export const AU_KM = 149597870.7;
export const C_KM_S = 299792.458;
export const DAY_S = 86400;
export const JULIAN_YEAR_D = 365.25;
export const J2000_JD = 2451545.0;
export const OBLIQUITY_J2000_DEG = 23.439291;
