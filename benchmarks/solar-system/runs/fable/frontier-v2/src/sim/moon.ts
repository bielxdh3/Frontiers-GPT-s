/**
 * Simplified geocentric lunar position: truncated series from Meeus,
 * "Astronomical Algorithms" (2nd ed.), chapter 47, itself derived from
 * ELP-2000/82. Only the leading terms are kept; typical accuracy is of order
 * 0.05°–0.1° in longitude and a few hundred km in distance — adequate for
 * phases and educational geometry, not an ephemeris.
 */
import { DEG } from './kepler';
import type { Vec3 } from './kepler';
import { centuriesSinceJ2000 } from './time';

// [D, M, M', F, Σl (1e-6 deg), Σr (1e-3 km)]
const LR: number[][] = [
  [0, 0, 1, 0, 6288774, -20905355], [2, 0, -1, 0, 1274027, -3699111], [2, 0, 0, 0, 658314, -2955968],
  [0, 0, 2, 0, 213618, -569925], [0, 1, 0, 0, -185116, 48888], [0, 0, 0, 2, -114332, -3149],
  [2, 0, -2, 0, 58793, 246158], [2, -1, -1, 0, 57066, -152138], [2, 0, 1, 0, 53322, -170733],
  [2, -1, 0, 0, 45758, -204586], [0, 1, -1, 0, -40923, -129620], [1, 0, 0, 0, -34720, 108743],
  [0, 1, 1, 0, -30383, 104755], [2, 0, 0, -2, 15327, 10321], [0, 0, 1, 2, -12528, 0],
  [0, 0, 1, -2, 10980, 79661], [4, 0, -1, 0, 10675, -34782], [0, 0, 3, 0, 10034, -23210],
  [4, 0, -2, 0, 8548, -21636], [2, 1, -1, 0, -7888, 24208], [2, 1, 0, 0, -6766, 30824],
  [1, 0, -1, 0, -5163, -8379], [1, 1, 0, 0, 4987, -16675], [2, -1, 1, 0, 4036, -12831],
  [2, 0, 2, 0, 3994, -10445], [4, 0, 0, 0, 3861, -11650], [2, 0, -3, 0, 3665, 14403],
  [0, 1, -2, 0, -2689, -7003], [2, 0, -1, 2, -2602, 0], [2, -1, -2, 0, 2390, 10056],
  [1, 0, 1, 0, -2348, 6322], [2, -2, 0, 0, 2236, -9884], [0, 1, 2, 0, -2120, 5751],
  [0, 2, 0, 0, -2069, 0], [2, -2, -1, 0, 2048, -4950], [2, 0, 1, -2, -1773, 4130],
  [2, 0, 0, 2, -1595, 0], [4, -1, -1, 0, 1215, -3958], [0, 0, 2, 2, -1110, 0],
  [3, 0, -1, 0, -892, 3258], [2, 1, 1, 0, -810, 2616], [4, -1, -2, 0, 759, -1897],
  [0, 2, -1, 0, -713, -2117], [2, 2, -1, 0, -700, 2354], [2, 1, -2, 0, 691, 0],
  [2, -1, 0, -2, 596, 0], [4, 0, 1, 0, 549, -1423], [0, 0, 4, 0, 537, -1117],
  [4, -1, 0, 0, 520, -1571], [1, 0, -2, 0, -487, -1739], [0, 0, 2, -2, -381, -4421],
  [0, 2, 1, 0, -323, 1165], [2, 0, -1, -2, 0, 8752],
];

// [D, M, M', F, Σb (1e-6 deg)]
const B: number[][] = [
  [0, 0, 0, 1, 5128122], [0, 0, 1, 1, 280602], [0, 0, 1, -1, 277693], [2, 0, 0, -1, 173237],
  [2, 0, -1, 1, 55413], [2, 0, -1, -1, 46271], [2, 0, 0, 1, 32573], [0, 0, 2, 1, 17198],
  [2, 0, 1, -1, 9266], [0, 0, 2, -1, 8822], [2, -1, 0, -1, 8216], [2, 0, -2, -1, 4324],
  [2, 0, 1, 1, 4200], [2, 1, 0, -1, -3359], [2, -1, -1, 1, 2463], [2, -1, 0, 1, 2211],
  [2, -1, -1, -1, 2065], [0, 1, -1, -1, -1870], [4, 0, -1, -1, 1828], [0, 1, 0, 1, -1794],
  [0, 0, 0, 3, -1749], [0, 1, -1, 1, -1565], [1, 0, 0, 1, -1491], [0, 1, 1, 1, -1475],
  [0, 1, 1, -1, -1410], [0, 1, 0, -1, -1344], [1, 0, 0, -1, -1335], [0, 0, 3, 1, 1107],
  [4, 0, 0, -1, 1021], [4, 0, -1, 1, 833], [0, 0, 1, -3, 777], [4, 0, -2, 1, 671],
  [2, 0, 0, -3, 607], [2, 0, 2, -1, 596], [2, -1, 1, -1, 491], [2, 0, -2, 1, -451],
  [0, 0, 3, -1, 439], [2, 0, 2, 1, 422], [2, 0, -3, -1, 421], [2, 1, -1, 1, -366],
  [2, 1, 0, 1, -351], [4, 0, 0, 1, 331], [2, -1, 1, 1, 315], [2, -2, 0, -1, 302],
  [0, 0, 1, 3, -283], [2, 1, 1, -1, -229], [1, 1, 0, -1, 223], [1, 1, 0, 1, 223],
];

export interface MoonGeocentric {
  /** Ecliptic longitude (deg), J2000 mean equinox (precession removed approximately). */
  lonDeg: number;
  /** Ecliptic latitude (deg). */
  latDeg: number;
  /** Distance Earth center to Moon center (km). */
  distanceKm: number;
  /** Geocentric position in the J2000 ecliptic frame (km). */
  pos: Vec3;
  /** Mean elongation D (deg, 0–360) — 0 near new moon, 180 near full moon. */
  meanElongationDeg: number;
}

/** General precession in ecliptic longitude, degrees per Julian century (approx). */
const PRECESSION_DEG_PER_CENTURY = 1.3969713;

export function moonGeocentric(jd: number): MoonGeocentric {
  const T = centuriesSinceJ2000(jd);
  const T2 = T * T, T3 = T2 * T, T4 = T3 * T;
  const Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T2 + T3 / 538841 - T4 / 65194000;
  const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T2 + T3 / 545868 - T4 / 113065000;
  const M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T2 + T3 / 24490000;
  const Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T2 + T3 / 69699 - T4 / 14712000;
  const F = 93.2720950 + 483202.0175233 * T - 0.0036539 * T2 - T3 / 3526000 + T4 / 863310000;
  const A1 = 119.75 + 131.849 * T;
  const A2 = 53.09 + 479264.290 * T;
  const A3 = 313.45 + 481266.484 * T;
  const E = 1 - 0.002516 * T - 0.0000074 * T2;
  const E2 = E * E;

  const d = D * DEG, m = M * DEG, mp = Mp * DEG, f = F * DEG;
  let sl = 0, sr = 0, sb = 0;
  for (const [cD, cM, cMp, cF, l, r] of LR) {
    const arg = cD * d + cM * m + cMp * mp + cF * f;
    const ef = cM === 0 ? 1 : Math.abs(cM) === 1 ? E : E2;
    sl += l * ef * Math.sin(arg);
    sr += r * ef * Math.cos(arg);
  }
  for (const [cD, cM, cMp, cF, b] of B) {
    const arg = cD * d + cM * m + cMp * mp + cF * f;
    const ef = cM === 0 ? 1 : Math.abs(cM) === 1 ? E : E2;
    sb += b * ef * Math.sin(arg);
  }
  const lp = Lp * DEG;
  sl += 3958 * Math.sin(A1 * DEG) + 1962 * Math.sin(lp - f) + 318 * Math.sin(A2 * DEG);
  sb += -2235 * Math.sin(lp) + 382 * Math.sin(A3 * DEG) + 175 * Math.sin(A1 * DEG - f) + 175 * Math.sin(A1 * DEG + f)
    + 127 * Math.sin(lp - mp) - 115 * Math.sin(lp + mp);

  const lonDate = Lp + sl / 1e6;
  const lonDeg = ((lonDate - PRECESSION_DEG_PER_CENTURY * T) % 360 + 360) % 360;
  const latDeg = sb / 1e6;
  const distanceKm = 385000.56 + sr / 1000;
  const lo = lonDeg * DEG, la = latDeg * DEG;
  const pos = {
    x: distanceKm * Math.cos(la) * Math.cos(lo),
    y: distanceKm * Math.cos(la) * Math.sin(lo),
    z: distanceKm * Math.sin(la),
  };
  return { lonDeg, latDeg, distanceKm, pos, meanElongationDeg: ((D % 360) + 360) % 360 };
}

/** Mass ratio used to place Earth relative to the Earth–Moon barycenter. */
export const MOON_EARTH_MASS_RATIO = 0.0123000371;
export const MOON_FRACTION_OF_EMB = MOON_EARTH_MASS_RATIO / (1 + MOON_EARTH_MASS_RATIO);
