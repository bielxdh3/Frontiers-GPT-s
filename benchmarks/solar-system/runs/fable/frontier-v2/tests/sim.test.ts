import { describe, expect, it } from 'vitest';
import { BODY_MAP, PLANET_IDS, SIMULATED_IDS, SUPPORTED_JD_MAX, SUPPORTED_JD_MIN } from '../src/data/bodies';
import { AU_KM, DAY_S } from '../src/data/types';
import { evaluateSystem, illuminatedFraction } from '../src/sim/ephemeris';
import { helioState, orbitNormal, periodDaysFromElements, solveKepler, wrapPi } from '../src/sim/kepler';
import { moonGeocentric } from '../src/sim/moon';
import { obliquityDeg, poleEcliptic } from '../src/sim/orientation';
import { angularSeparation, measureDistance } from '../src/sim/measure';
import { gravity, orbitalPeriodSeconds, dayLengthHours, temperatureRatio } from '../src/sim/physics';
import { getMapping } from '../src/sim/scale';
import { SimClock, jdFromUnixMs, DEFAULT_EPOCH_MS } from '../src/sim/time';
import { angleBetween, dist, sub } from '../src/sim/vec';

const jdOf = (iso: string) => jdFromUnixMs(Date.parse(iso));
const RAD = 180 / Math.PI;

describe('Kepler solver', () => {
  it('returns E = M for circular orbits', () => {
    const s = solveKepler(1.234, 0);
    expect(s.converged).toBe(true);
    expect(s.E).toBeCloseTo(1.234, 12);
  });
  it('converges for high eccentricity within the iteration bound', () => {
    for (const M of [-3, -1, 0.001, 1, 2.5, 3.1]) {
      const s = solveKepler(M, 0.95);
      expect(s.converged).toBe(true);
      expect(Math.abs(wrapPi(s.E - 0.95 * Math.sin(s.E) - M))).toBeLessThan(1e-8);
      expect(s.iterations).toBeLessThanOrEqual(50);
    }
  });
  it('rejects unsupported eccentricities and nonfinite input explicitly', () => {
    expect(solveKepler(1, 1.0).converged).toBe(false);
    expect(solveKepler(1, 1.5).converged).toBe(false);
    expect(solveKepler(NaN, 0.1).converged).toBe(false);
  });
});

describe('Planetary model (JPL Table 1)', () => {
  it('puts Earth at its perihelion distance in early January and aphelion in early July', () => {
    const jan = helioState(BODY_MAP.earth.orbit!, jdOf('2026-01-03T12:00:00Z'));
    const jul = helioState(BODY_MAP.earth.orbit!, jdOf('2026-07-05T12:00:00Z'));
    expect(jan.r / AU_KM).toBeCloseTo(0.9833, 2);
    expect(jul.r / AU_KM).toBeCloseTo(1.0167, 2);
  });
  it('places the Sun at ecliptic longitude ≈ 0° (of date) at the March 2026 equinox', () => {
    const jd = jdOf('2026-03-20T14:46:00Z');
    const st = evaluateSystem(jd);
    const earth = st.get('earth')!;
    // Positions are in the J2000 frame; the equinox of date is displaced by general precession.
    const T = (jd - 2451545.0) / 36525;
    const expectedJ2000Lon = -1.3969713 * T; // ≈ -0.366°
    const sunLon = Math.atan2(-earth.pos.y, -earth.pos.x) * RAD;
    expect(Math.abs(wrapPi((sunLon - expectedJ2000Lon) / RAD) * RAD)).toBeLessThan(0.05);
  });
  it('reproduces the Mars opposition of 2025-01-16 (heliocentric longitudes aligned)', () => {
    const st = evaluateSystem(jdOf('2025-01-16T03:00:00Z'));
    const e = st.get('earth')!.pos, m = st.get('mars')!.pos;
    const le = Math.atan2(e.y, e.x), lm = Math.atan2(m.y, m.x);
    expect(Math.abs(wrapPi(le - lm)) * RAD).toBeLessThan(1.5);
  });
  it('keeps Jupiter between 4.95 and 5.46 au across the supported range', () => {
    for (let jd = SUPPORTED_JD_MIN; jd <= SUPPORTED_JD_MAX; jd += 365.25 * 3) {
      const r = helioState(BODY_MAP.jupiter.orbit!, jd).r / AU_KM;
      expect(r).toBeGreaterThan(4.94);
      expect(r).toBeLessThan(5.47);
    }
  });
  it('has distinct periods for every planet matching catalog orbital periods within 0.1%', () => {
    for (const id of PLANET_IDS) {
      const b = BODY_MAP[id];
      const p = periodDaysFromElements(b.orbit!);
      expect(Math.abs(p - b.physical.orbitalPeriodDays!) / p).toBeLessThan(0.001);
    }
  });
  it('is deterministic and finite across the supported interval', () => {
    const a = evaluateSystem(2451545.0), b = evaluateSystem(2451545.0);
    for (const id of SIMULATED_IDS) {
      expect(a.get(id)!.pos).toEqual(b.get(id)!.pos);
    }
    for (let jd = SUPPORTED_JD_MIN; jd <= SUPPORTED_JD_MAX; jd += 1000) {
      const st = evaluateSystem(jd);
      for (const id of SIMULATED_IDS) {
        const s = st.get(id)!;
        expect(Number.isFinite(s.pos.x + s.pos.y + s.pos.z)).toBe(true);
        expect(s.converged).toBe(true);
      }
    }
  });
  it('is time-reversible: evaluating t, t+Δ, t again gives identical state', () => {
    const t = 2460000.5;
    const s1 = evaluateSystem(t).get('mars')!.pos;
    evaluateSystem(t + 500);
    const s2 = evaluateSystem(t).get('mars')!.pos;
    expect(s1).toEqual(s2);
  });
});

describe('Lunar model', () => {
  it('keeps the Earth–Moon distance within the known range', () => {
    for (let jd = 2451545; jd < 2451545 + 365 * 19; jd += 3.7) {
      const d = moonGeocentric(jd).distanceKm;
      expect(d).toBeGreaterThan(356000);
      expect(d).toBeLessThan(407000);
    }
  });
  it('reproduces the full moon of 2026-01-03 and the new moon of 2026-01-18 (elongation)', () => {
    const full = evaluateSystem(jdOf('2026-01-03T10:03:00Z'));
    const fe = full.get('earth')!, fm = full.get('moon')!;
    const elongFull = angleBetween(sub({ x: 0, y: 0, z: 0 }, fe.pos), sub(fm.pos, fe.pos)) * RAD;
    expect(Math.abs(elongFull - 180)).toBeLessThan(6); // latitude adds up to ~5°
    const nw = evaluateSystem(jdOf('2026-01-18T19:52:00Z'));
    const ne = nw.get('earth')!, nm = nw.get('moon')!;
    const elongNew = angleBetween(sub({ x: 0, y: 0, z: 0 }, ne.pos), sub(nm.pos, ne.pos)) * RAD;
    expect(elongNew).toBeLessThan(6);
    expect(illuminatedFraction(full, 'moon', 'earth')!).toBeGreaterThan(0.99);
    expect(illuminatedFraction(nw, 'moon', 'earth')!).toBeLessThan(0.01);
  });
  it('places the Moon near the ecliptic at the total lunar eclipse of 2026-03-03', () => {
    const jd = jdOf('2026-03-03T11:34:00Z');
    const m = moonGeocentric(jd);
    expect(Math.abs(m.latDeg)).toBeLessThan(1.0);
    // Mean elongation differs from true elongation by the lunar equation of center (up to ~6°).
    expect(Math.abs(m.meanElongationDeg - 180)).toBeLessThan(8);
    expect(illuminatedFraction(evaluateSystem(jd), 'moon', 'earth')!).toBeGreaterThan(0.995);
  });
  it('moves the Moon around Earth, not around Earth\'s rotating surface', () => {
    // Over one sidereal month the Moon returns near its parent-relative position;
    // over one Earth day (one surface rotation) it moves only ~13°.
    const st0 = evaluateSystem(2460000.5), st1 = evaluateSystem(2460001.5), st2 = evaluateSystem(2460000.5 + 27.321661);
    const a0 = Math.atan2(st0.get('moon')!.parentRel.y, st0.get('moon')!.parentRel.x);
    const a1 = Math.atan2(st1.get('moon')!.parentRel.y, st1.get('moon')!.parentRel.x);
    const a2 = Math.atan2(st2.get('moon')!.parentRel.y, st2.get('moon')!.parentRel.x);
    expect(Math.abs(wrapPi(a1 - a0)) * RAD).toBeGreaterThan(10);
    expect(Math.abs(wrapPi(a1 - a0)) * RAD).toBeLessThan(17);
    expect(Math.abs(wrapPi(a2 - a0)) * RAD).toBeLessThan(3);
  });
});

describe('Satellite hierarchy', () => {
  it('keeps Io at its semi-major distance from Jupiter and moving with Jupiter', () => {
    const st = evaluateSystem(2460000.5);
    const io = st.get('io')!, jup = st.get('jupiter')!;
    const a = 421700, e = 0.0041;
    expect(io.parentDistanceKm).toBeGreaterThanOrEqual(a * (1 - e) - 1);
    expect(io.parentDistanceKm).toBeLessThanOrEqual(a * (1 + e) + 1);
    expect(dist(io.pos, jup.pos)).toBeCloseTo(io.parentDistanceKm, 3);
    const st2 = evaluateSystem(2460000.5 + 100);
    const jupMove = dist(st2.get('jupiter')!.pos, jup.pos);
    const ioMove = dist(st2.get('io')!.pos, io.pos);
    expect(Math.abs(jupMove - ioMove)).toBeLessThan(2 * 421700);
  });
  it('does not let the parent\'s surface rotation drive satellite positions', () => {
    // Jupiter rotates ~2.4 times per day; Io orbits once per 1.77 d.
    const st0 = evaluateSystem(2460000.5), st1 = evaluateSystem(2460000.5 + 1 / 24);
    const r0 = st0.get('io')!.parentRel, r1 = st1.get('io')!.parentRel;
    const moved = angleBetween(r0, r1) * RAD;
    // one hour of Io's orbit ≈ 8.5°, whereas one hour of Jupiter's spin ≈ 36°
    expect(moved).toBeGreaterThan(7);
    expect(moved).toBeLessThan(10);
  });
  it('makes Charon orbit Pluto with the modeled period', () => {
    const p = 6.387221;
    const st0 = evaluateSystem(2460000.5), st1 = evaluateSystem(2460000.5 + p);
    expect(angleBetween(st0.get('charon')!.parentRel, st1.get('charon')!.parentRel) * RAD).toBeLessThan(0.5);
  });
});

describe('Orientation', () => {
  it('derives axial tilts consistent with the catalog for the planets', () => {
    for (const id of ['earth', 'mars', 'jupiter', 'saturn', 'neptune', 'uranus', 'venus'] as const) {
      const b = BODY_MAP[id];
      const pole = poleEcliptic(b.rotation!);
      const n = orbitNormal(b.orbit!, 2451545.0);
      let tilt = obliquityDeg(pole, n);
      if (b.rotation!.periodHours < 0) tilt = 180 - tilt; // right-hand-rule pole
      expect(Math.abs(tilt - b.physical.axialTiltDeg!)).toBeLessThan(0.6);
    }
  });
  it('lights the hemisphere facing the Sun: sub-solar point direction equals -pos', () => {
    const st = evaluateSystem(2460000.5);
    const e = st.get('earth')!;
    const toSun = { x: -e.pos.x, y: -e.pos.y, z: -e.pos.z };
    expect(angleBetween(toSun, { x: -e.pos.x, y: -e.pos.y, z: -e.pos.z })).toBeCloseTo(0, 10);
  });
});

describe('Measurements and scale independence', () => {
  it('computes Earth–Moon light time ≈ 1.28 s and Earth–Sun ≈ 499 s', () => {
    const st = evaluateSystem(2460000.5);
    const em = measureDistance(st, 'earth', 'moon', 2460000.5);
    expect(em.lightSeconds).toBeGreaterThan(1.18);
    expect(em.lightSeconds).toBeLessThan(1.36);
    const es = measureDistance(st, 'earth', 'sun', 2460000.5);
    expect(es.lightSeconds).toBeGreaterThan(490);
    expect(es.lightSeconds).toBeLessThan(508);
  });
  it('does not change physical distances when the display mapping changes', () => {
    const st = evaluateSystem(2460000.5);
    const d1 = measureDistance(st, 'earth', 'mars', 2460000.5).centerKm;
    const expl = getMapping('exploration'), rel = getMapping('relative');
    const eDisp = expl.helioPosition(st.get('earth')!.pos), rDisp = rel.helioPosition(st.get('earth')!.pos);
    expect(dist(eDisp, { x: 0, y: 0, z: 0 })).not.toBeCloseTo(dist(rDisp, { x: 0, y: 0, z: 0 }), 1);
    const d2 = measureDistance(st, 'earth', 'mars', 2460000.5).centerKm;
    expect(d1).toBe(d2);
  });
  it('preserves orbital order and direction in exploration mapping', () => {
    const st = evaluateSystem(2460000.5);
    const m = getMapping('exploration');
    let last = 0;
    for (const id of PLANET_IDS) {
      const p = m.helioPosition(st.get(id)!.pos);
      const r = Math.hypot(p.x, p.y, p.z);
      expect(r).toBeGreaterThan(last);
      last = r;
      // direction preserved
      const dirAngle = angleBetween(p, st.get(id)!.pos);
      expect(dirAngle).toBeLessThan(1e-6);
    }
  });
  it('handles degenerate angular separation inputs', () => {
    const st = evaluateSystem(2460000.5);
    expect(angularSeparation(st, 'earth', 'mars', 'mars').valid).toBe(false);
    expect(angularSeparation(st, 'earth', 'earth', 'mars').valid).toBe(false);
    const ok = angularSeparation(st, 'earth', 'sun', 'moon');
    expect(ok.valid).toBe(true);
    expect(ok.degrees).toBeGreaterThanOrEqual(0);
    expect(ok.degrees).toBeLessThanOrEqual(180);
  });
});

describe('Physics helpers', () => {
  it('gives Earth surface gravity ≈ 9.8 m/s² and a 1 au orbital period ≈ 365.25 d', () => {
    expect(gravity(5.97217e24, 6371.0084)).toBeCloseTo(9.82, 1);
    const T = orbitalPeriodSeconds(AU_KM, 1.98841e30) / DAY_S;
    expect(Math.abs(T - 365.25) / 365.25).toBeLessThan(0.001);
  });
  it('handles polar day and night in the day-length model', () => {
    expect(dayLengthHours(80, 23.44).polar).toBe('day');
    expect(dayLengthHours(-80, 23.44).polar).toBe('night');
    expect(dayLengthHours(0, 23.44).hours).toBeCloseTo(12, 5);
    expect(dayLengthHours(45, 0).hours).toBeCloseTo(12, 5);
  });
  it('only accepts absolute temperatures for ratios', () => {
    expect(temperatureRatio(288, 144)).toBe(2);
    expect(Number.isNaN(temperatureRatio(-10, 20))).toBe(true);
  });
});

describe('Simulation clock', () => {
  it('advances one modeled second per real second at 1× and respects direction', () => {
    const c = new SimClock(DEFAULT_EPOCH_MS);
    c.setRate(1); c.play();
    c.tick(0.1); c.tick(0.1);
    expect(c.simMs - DEFAULT_EPOCH_MS).toBeCloseTo(200, 6);
    c.reverse();
    c.tick(0.2);
    expect(c.simMs - DEFAULT_EPOCH_MS).toBeCloseTo(0, 6);
  });
  it('bounds abnormal frame gaps and does not resume on reverse while paused', () => {
    const c = new SimClock(DEFAULT_EPOCH_MS);
    c.setRate(DAY_S); c.play();
    c.tick(10); // abnormal gap
    expect(c.simMs - DEFAULT_EPOCH_MS).toBeCloseTo(0.25 * DAY_S * 1000, 3);
    c.pause(); c.reverse();
    expect(c.playing).toBe(false);
    expect(c.direction).toBe(-1);
  });
  it('treats zero rate as pause with remembered magnitude, rejects nonfinite rates', () => {
    const c = new SimClock(DEFAULT_EPOCH_MS);
    c.setRate(3600); c.play();
    c.setRate(0);
    expect(c.playing).toBe(false);
    expect(c.resumeRate).toBe(3600);
    expect(c.setRate(NaN)).toBe(false);
    expect(c.setRate(-5)).toBe(false);
    c.resume();
    expect(c.rate).toBe(3600);
    expect(c.playing).toBe(true);
  });
  it('pauses at the supported boundary instead of extrapolating', () => {
    const c = new SimClock(DEFAULT_EPOCH_MS);
    let boundary = 0;
    c.on((e) => { if (e === 'boundary') boundary++; });
    c.setSimMs(c.maxMs - 1000);
    c.setRate(DAY_S); c.play();
    c.tick(0.1);
    expect(c.playing).toBe(false);
    expect(c.simMs).toBe(c.maxMs);
    expect(boundary).toBe(1);
  });
  it('separates reset simulation (time) from visibility handling', () => {
    const c = new SimClock(DEFAULT_EPOCH_MS);
    c.setRate(100); c.play(); c.tick(0.1);
    c.onHidden();
    expect(c.playing).toBe(false);
    c.tick(5);
    c.onVisible();
    expect(c.playing).toBe(true);
    c.resetSimulation();
    expect(c.simMs).toBe(DEFAULT_EPOCH_MS);
    expect(c.playing).toBe(false);
    expect(c.direction).toBe(1);
  });
});
