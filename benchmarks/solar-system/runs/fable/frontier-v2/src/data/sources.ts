import type { SourceRef } from './types';

/** Primary references used by the catalog, missions and educational content. */
export const SOURCES: Record<string, SourceRef> = {
  'jpl-phys': {
    id: 'jpl-phys',
    label: 'JPL SSD — Planetary Physical Parameters',
    url: 'https://ssd.jpl.nasa.gov/planets/phys_par.html',
    accessed: '2026-09-08',
  },
  'jpl-approx': {
    id: 'jpl-approx',
    label: 'JPL SSD — Approximate Positions of the Planets (Keplerian elements, Table 1, 1800–2050)',
    url: 'https://ssd.jpl.nasa.gov/planets/approx_pos.html',
    accessed: '2026-09-08',
  },
  'standish-1992': {
    id: 'standish-1992',
    label: 'Standish & Williams (1992) — Keplerian elements 3000 BC–3000 AD (earlier edition of the JPL table, Pluto row)',
    url: 'https://ssd.jpl.nasa.gov/planets/approx_pos.html',
    accessed: '2026-09-08',
  },
  'iau-wg-2015': {
    id: 'iau-wg-2015',
    label: 'Archinal et al. 2018 — IAU/IAG WG on Cartographic Coordinates and Rotational Elements: 2015',
    url: 'https://doi.org/10.1007/s10569-017-9805-5',
    accessed: '2026-09-08',
  },
  'meeus-1998': {
    id: 'meeus-1998',
    label: 'Meeus, J. (1998) Astronomical Algorithms, 2nd ed., ch. 47 (truncated lunar series, ELP-2000/82 based)',
    url: 'https://www.willbell.com/math/mc1.htm',
    accessed: '2026-09-08',
  },
  'nasa-solar-system': {
    id: 'nasa-solar-system',
    label: 'NASA Science — Solar System Facts',
    url: 'https://science.nasa.gov/solar-system/solar-system-facts/',
    accessed: '2026-09-08',
  },
  'nasa-jupiter-moons': {
    id: 'nasa-jupiter-moons',
    label: 'NASA Science — Moons of Jupiter (115 recognized moons as of August 2026)',
    url: 'https://science.nasa.gov/jupiter/jupiter-moons/',
    accessed: '2026-09-08',
  },
  'nasa-saturn-moons': {
    id: 'nasa-saturn-moons',
    label: 'NASA Science — Saturn Moons (293 confirmed moons as of August 2026)',
    url: 'https://science.nasa.gov/saturn/moons/',
    accessed: '2026-09-08',
  },
  'nasa-uranus-moons': {
    id: 'nasa-uranus-moons',
    label: 'NASA Science — Moons of Uranus (29 known moons as of August 2026)',
    url: 'https://science.nasa.gov/uranus/moons/',
    accessed: '2026-09-08',
  },
  'nasa-neptune-moons': {
    id: 'nasa-neptune-moons',
    label: 'NASA Science — Neptune Moons (16 known moons)',
    url: 'https://science.nasa.gov/neptune/moons/',
    accessed: '2026-09-08',
  },
  'nssdc-factsheets': {
    id: 'nssdc-factsheets',
    label: 'NASA NSSDCA — Planetary Fact Sheets (planets, Sun, Moon and satellites)',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/',
    accessed: '2026-09-08',
  },
  'jpl-sbdb': {
    id: 'jpl-sbdb',
    label: 'JPL Small-Body Database (orbital geometry of dwarf planets and asteroids)',
    url: 'https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html',
    accessed: '2026-09-08',
  },
  'nasa-comets': {
    id: 'nasa-comets',
    label: 'NASA Science — Comets: Facts',
    url: 'https://science.nasa.gov/solar-system/comets/facts/',
    accessed: '2026-09-08',
  },
  'nasa-eclipses': {
    id: 'nasa-eclipses',
    label: 'NASA Science — Moon: Eclipses',
    url: 'https://science.nasa.gov/moon/eclipses/',
    accessed: '2026-09-08',
  },
  'nasa-seasons': {
    id: 'nasa-seasons',
    label: "NASA Science — Earth's Spin, Tilt, and Orbit",
    url: 'https://science.nasa.gov/learn/heat/resource/earths-spin-tilt-and-orbit/',
    accessed: '2026-09-08',
  },
  'nasa-dwarf-planets': {
    id: 'nasa-dwarf-planets',
    label: 'NASA Science — Dwarf Planets',
    url: 'https://science.nasa.gov/dwarf-planets/',
    accessed: '2026-09-08',
  },
  'nasa-kuiper-belt': {
    id: 'nasa-kuiper-belt',
    label: 'NASA Science — Kuiper Belt',
    url: 'https://science.nasa.gov/solar-system/kuiper-belt/',
    accessed: '2026-09-08',
  },
  'nasa-oort-cloud': {
    id: 'nasa-oort-cloud',
    label: 'NASA Science — Oort Cloud',
    url: 'https://science.nasa.gov/solar-system/oort-cloud/',
    accessed: '2026-09-08',
  },
  'nasa-asteroids': {
    id: 'nasa-asteroids',
    label: 'NASA Science — Asteroids',
    url: 'https://science.nasa.gov/solar-system/asteroids/',
    accessed: '2026-09-08',
  },
  hypothetical: {
    id: 'hypothetical',
    label: 'Hypothetical / illustrative model defined by this application (not an observed object)',
    url: '',
    accessed: '2026-09-08',
  },
};

export function getSource(id: string): SourceRef | undefined {
  return SOURCES[id];
}
