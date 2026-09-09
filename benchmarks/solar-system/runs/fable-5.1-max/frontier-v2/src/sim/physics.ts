import { AU_KM, C_KM_S, DAY_S, G, JULIAN_YEAR_D } from '../data/types';

/** Surface gravity of a spherical body: g = GM / r² (m/s²). Inputs: kg, km. */
export function gravity(massKg: number, radiusKm: number): number {
  if (!(massKg > 0) || !(radiusKm > 0)) return NaN;
  const r = radiusKm * 1000;
  return (G * massKg) / (r * r);
}

/** Weight in newtons of a mass (kg) under acceleration g (m/s²). */
export function weight(massKg: number, g: number): number {
  return massKg * g;
}

/** Orbital period (seconds) for a negligible test mass: T = 2π √(a³ / GM). Inputs: km, kg. */
export function orbitalPeriodSeconds(aKm: number, centralMassKg: number): number {
  if (!(aKm > 0) || !(centralMassKg > 0)) return NaN;
  const a = aKm * 1000;
  return 2 * Math.PI * Math.sqrt((a * a * a) / (G * centralMassKg));
}

/** Mean orbital speed for a circular orbit (km/s). */
export function circularSpeedKmS(aKm: number, centralMassKg: number): number {
  return Math.sqrt((G * centralMassKg) / (aKm * 1000)) / 1000;
}

/** Vis-viva speed (km/s) at distance r for semi-major axis a (km). */
export function visVivaKmS(rKm: number, aKm: number, centralMassKg: number): number {
  return Math.sqrt(G * centralMassKg * (2 / (rKm * 1000) - 1 / (aKm * 1000))) / 1000;
}

export function escapeVelocityKmS(massKg: number, radiusKm: number): number {
  return Math.sqrt((2 * G * massKg) / (radiusKm * 1000)) / 1000;
}

/** Mean density (g/cm³) from mass (kg) and mean radius (km). */
export function densityGcm3(massKg: number, radiusKm: number): number {
  const r = radiusKm * 1e5; // cm
  const vol = (4 / 3) * Math.PI * r * r * r;
  return (massKg * 1000) / vol;
}

export const kmToAu = (km: number): number => km / AU_KM;
export const auToKm = (au: number): number => au * AU_KM;
export const kmToMiles = (km: number): number => km * 0.621371192;
export const lightSeconds = (km: number): number => km / C_KM_S;
export const secondsToDays = (s: number): number => s / DAY_S;
export const daysToYears = (d: number): number => d / JULIAN_YEAR_D;
export const hoursToDays = (h: number): number => h / 24;

/** Kelvin → Celsius / Fahrenheit. */
export const kToC = (k: number): number => k - 273.15;
export const kToF = (k: number): number => (k - 273.15) * 1.8 + 32;

/**
 * Ratio of absolute temperatures. Ratios only make sense in kelvin;
 * callers must never divide Celsius values.
 */
export function temperatureRatio(aK: number, bK: number): number {
  if (!(aK > 0) || !(bK > 0)) return NaN;
  return aK / bK;
}

/** Diameter in km from a mean radius in km. */
export const diameterKm = (radiusKm: number): number => radiusKm * 2;

/** Angular diameter (radians) of a sphere of radius R seen from distance d. */
export function angularDiameterRad(radiusKm: number, distanceKm: number): number {
  if (!(distanceKm > radiusKm)) return NaN;
  return 2 * Math.asin(radiusKm / distanceKm);
}

/**
 * Day length for a given latitude and solar declination (degrees), assuming a
 * spherical body and ignoring refraction and the finite solar disk.
 * Returns hours in [0, hoursInDay] and a flag for polar day/night.
 */
export function dayLengthHours(latitudeDeg: number, declinationDeg: number, hoursInDay = 24): { hours: number; polar: 'day' | 'night' | null } {
  const lat = (latitudeDeg * Math.PI) / 180;
  const dec = (declinationDeg * Math.PI) / 180;
  const x = -Math.tan(lat) * Math.tan(dec);
  if (x <= -1) return { hours: hoursInDay, polar: 'day' };
  if (x >= 1) return { hours: 0, polar: 'night' };
  const h0 = Math.acos(x); // half-day arc
  return { hours: (h0 / Math.PI) * hoursInDay, polar: null };
}

/**
 * Solar declination (degrees) for a body with axial tilt ε and orbital angle θ
 * measured from the northern-spring equinox (simplified circular orbit).
 */
export function solarDeclinationDeg(tiltDeg: number, orbitAngleDeg: number): number {
  const eps = (tiltDeg * Math.PI) / 180;
  const th = (orbitAngleDeg * Math.PI) / 180;
  return (Math.asin(Math.sin(eps) * Math.sin(th)) * 180) / Math.PI;
}
