# Solar System Observatory — implementation note

Stack: Vite 8, TypeScript, Three.js r182. No backend, no API keys. Preview: `npm run dev` → http://localhost:5173/

## Time
- 1× = 1 simulated second per real second. Default playback 86,400× (1 day/s).
- Validity: 1800-01-01 … 2050-12-31 (JPL Table 1). Playback pauses at the bound.
- Hidden tab: pause; no catch-up of the hidden interval. Frame dt capped at 0.25 s.

## Orbits
- Planets: JPL approximate positions Table 1, Keplerian, heliocentric mean ecliptic J2000. Earth uses EMB, labeled as such.
- Moons: simplified Kepler in the parent **positional** frame (not surface spin). Moon inclination to the ecliptic; most other moons parent-equator.
- No N-body, light-time, aberration, or precession.

## Scale (display only)
- Exploration: radius power 0.46, distance power 0.64.
- Relative: true linear radii; log-compressed distances.
- Combined true scale exists only in the scale laboratory.
- Measurements and gravity use physical kilometres, never display coordinates.

## Data
- Physical parameters: JPL phys_par, retrieved 2026-09-09.
- Moon counts dated (NASA Space Place 2026-07-31 / Jupiter Aug 2026).
- Educational comet `edu-comet` is hypothetical. Ion tail anti-sun; dust tail offset. Visual activity is educational, not a brightness forecast.
- Procedural canvas textures; starfield seeded, not an observational catalog.
- Asteroid / Kuiper particles are representative samples.

## Renderer
- Z-up = north ecliptic pole. Camera spherical offset uses that convention.
- Sun is the only real illumination; fill light is labeled educational.
- Rings live on the axial group (equatorial plane).

## Persistence
- `localStorage` key `sso-observatory-v1`, schema v1. Malformed data is skipped; the explorer still starts.
- No service worker. Audio off until enabled; no bundled soundtrack. Video recording is unsupported (download PNG instead).

## Recovery
- WebGL failure: catalog/panels remain.
- Context-lost: message + restore listener.
- Import validates version/kind/text length.
