import { describe, expect, it } from 'vitest';
import { BODIES, BODY_MAP } from '../src/data/bodies';
import { SOURCES } from '../src/data/sources';
import { densityGcm3, gravity } from '../src/sim/physics';

describe('Catalog integrity', () => {
  it('has unique identifiers and resolvable parents', () => {
    const ids = new Set<string>();
    for (const b of BODIES) {
      expect(ids.has(b.id)).toBe(false);
      ids.add(b.id);
      if (b.parent) expect(BODY_MAP[b.parent]).toBeDefined();
      if (b.kind === 'moon') expect(b.parent).toBeDefined();
    }
  });
  it('references only known sources and has non-empty localized content', () => {
    for (const b of BODIES) {
      expect(b.sourceIds.length).toBeGreaterThan(0);
      for (const s of b.sourceIds) expect(SOURCES[s]).toBeDefined();
      expect(b.summary.pt.length).toBeGreaterThan(10);
      expect(b.summary.en.length).toBeGreaterThan(10);
      expect(b.names.pt.length).toBeGreaterThan(0);
      expect(b.names.en.length).toBeGreaterThan(0);
      expect(/^\d{4}-\d{2}-\d{2}$/.test(b.dataAsOf)).toBe(true);
    }
  });
  it('has no duplicated summaries between different bodies', () => {
    const seen = new Set<string>();
    for (const b of BODIES) {
      expect(seen.has(b.summary.pt)).toBe(false);
      seen.add(b.summary.pt);
    }
  });
  it('keeps mass, radius and density mutually consistent (within 6%) where all are given', () => {
    for (const b of BODIES) {
      const p = b.physical;
      if (p.massKg && p.densityGcm3 && p.meanRadiusKm > 0 && !p.dimensionsKm) {
        const d = densityGcm3(p.massKg, p.meanRadiusKm);
        expect(Math.abs(d - p.densityGcm3) / p.densityGcm3).toBeLessThan(0.06);
      }
    }
  });
  it('keeps surface gravity consistent with GM/R² (within 8%) for spherical bodies', () => {
    for (const b of BODIES) {
      const p = b.physical;
      if (p.massKg && p.gravityMs2 && p.gravityRef === 'surface' && !p.dimensionsKm && p.meanRadiusKm > 100) {
        const g = gravity(p.massKg, p.equatorialRadiusKm ?? p.meanRadiusKm);
        expect(Math.abs(g - p.gravityMs2) / p.gravityMs2).toBeLessThan(0.08);
      }
    }
  });
  it('gives simulated bodies either heliocentric elements or a satellite orbit (except the Sun)', () => {
    for (const b of BODIES) {
      if (b.level !== 'simulated' || b.id === 'sun') continue;
      expect(!!b.orbit || !!b.satellite).toBe(true);
      if (b.satellite) expect(b.satellite.aKm).toBeGreaterThan(BODY_MAP[b.parent!].physical.meanRadiusKm);
    }
  });
  it('declares moon counts with a reference date', () => {
    for (const b of BODIES) {
      if (b.physical.knownMoons !== undefined) expect(b.physical.knownMoonsAsOf).toBeDefined();
    }
  });
  it('orders ring bands outward without overlap', () => {
    for (const b of BODIES) {
      const rings = b.appearance.rings;
      if (!rings) continue;
      let last = 0;
      for (const band of rings.bands) {
        expect(band.innerKm).toBeGreaterThanOrEqual(last);
        expect(band.outerKm).toBeGreaterThan(band.innerKm);
        last = band.outerKm;
      }
    }
  });
});
