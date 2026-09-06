# Solar System Observatory

## Execution boundary

Project root: E:\GPT-6-ASTRA. The folder was empty at inspection on 2026-09-06 UTC. No .git directory was present; there is no starting branch or commit. The sole external local input is the explicitly authorized solar-system-master-prompt.md. No account memories, skills, plugins, unrelated files, or credentials are inputs. All code, downloaded public assets, package caches, browser binaries, temporary browser profiles, and verification artifacts belong inside this project. No remote publication is authorized or performed.

## Stack

ES modules, semantic HTML, CSS, Three.js, Vite. A single render loop owns the scientific clock and renderer. Pure model functions use kilometers, kilograms, seconds and radians. Playwright uses a newly installed project-local Chromium with a new isolated profile.

## Delivered experience

The explorer contains 32 modeled bodies: the Sun, eight planets, sixteen moons, five dwarf planets, Vesta and the hypothetical Comet Aurora. The catalog additionally exposes three schematic regions. It includes PT-BR and English content, search and commands, context-sensitive inspectors, adjustable layers, orbit/follow/free cameras, camera history and local systems.

Independent tools cover two-to-four-body comparison, sizes/distances/combined-scale rulers, physical distance and one-way light-time, angular separation, seasons, lunar phases/eclipses, a two-body orbit sandbox, gravity, reference frames and outer-system context. Five tours, twelve state-checked activities, twenty-one encyclopedia entries and six historical mission timelines connect those tools to the explorer. Local notes, favorites, dates, experiments and camera views have versioned export/import. Photography produces an actual rendered PNG, with optional labels and credits; supported browsers also record a short silent WebM.

## Modules and state ownership

| Module | Responsibility |
| --- | --- |
| `data.js`, `content.js` | Scientific constants, dated catalog, bilingual educational content and source links. |
| `model.js` | Pure orbital, scale, measurement, gravity and illumination calculations; deterministic clock. |
| `scene.js`, `materials.js` | One Three.js renderer, camera, physical-to-display transform, textures, rings, picking and PNG rendering. |
| `app.js` | One animation loop, actions, input ownership, tour/activity state and restoration. |
| `tools.js`, `diagrams.js`, `ui.js`, `styles.css` | Semantic interface, SVG laboratories, responsive layout and accessibility. |
| `storage.js` | Versioned, bounded local data validation and private-data-free scene exports. |

Laboratories store their own hypothetical parameters. Opening a laboratory that freezes the clock records its previous pause state; closing restores that state. Photo mode restores the prior camera, visual preferences and pause state. Tour pause/resume retains the stop; exit restores the prior explorer target, camera and rate. Saved cameras use offsets relative to the target, with explicit saved-date/current-date behavior.

## Scientific model

Physical positions use kilometres; masses use kilograms; period metadata uses Earth days. The gravitational calculation converts radii to metres and JPL satellite GM from km³/s² to SI as needed. One AU is exactly 149,597,870.7 km; one day is 86,400 s; light speed is 299,792.458 km/s. Temperature values are rounded reference temperatures in kelvin, with context, and are not weather estimates.

The eight planetary positions use [JPL Table 1](https://ssd.jpl.nasa.gov/planets/approx_pos.html), with six elements and rates in centuries from J2000. The supported interval is January 1, 1800 through January 1, 2050. The eccentric-anomaly solver has a finite iteration limit and explicit failure. Coordinates are geometric heliocentric ecliptic J2000. UTC is treated as TDB for this educational approximation. Earth is represented by the Earth–Moon barycenter supplied by the table.

Satellite positions are parent translation plus an independent local ellipse; parent surface rotation never changes their orbital position. The Moon uses fixed J2000 mean elements. The other curated moons use mean sizes/periods with illustrative phases and orientations, oriented approximately with their parent system. These satellite elements are **not ephemerides**. Dwarfs and Vesta also use fixed educational ellipses with illustrative phases. Comet Aurora is entirely hypothetical. No N-body integration, aberration, light-time position correction, eclipse prediction or precise rotational attitude is claimed.

The shader lights each body's world-space normal from its physical direction to the Sun. Cloud lighting uses the same direction. Rings are equatorial geometry with an analytic planet shadow; Saturn's main visible span is 1.24–2.33 displayed planet radii. Faint giant-planet rings are illustrative. Planet-to-planet shadowing is explained in the dedicated eclipse diagram, rather than presented as a precision eclipse simulation. Fixed pole orientations and sphere/ellipsoid surfaces simplify real shapes.

Ordinary lunar phases use `(1 − cos(elongation))/2`; eclipse presets separately align schematic shadow cones. The displayed phase fraction is geometric. Seasons use solar declination from tilt and orbital position, ideal-horizon day length and explicit polar cases; there is no refraction. The orbit sandbox uses `T = 2π√(a³/GM)` and vis-viva for bound ellipses; the test object's mass is negligible. Its motion is a twelve-second demonstration, separate from the explorer clock.

## Display scales

For a physical radius `r` and heliocentric distance `d`, in kilometres:

| Presentation | Mapping |
| --- | --- |
| Relative | Both radii and coordinates use exactly `4 / AU` scene units per kilometre. Tiny objects may only be discoverable via locator labels or the catalog. |
| Exploration, heliocentric | Radial position is `18 + 28 ln(1 + 1.8 d/AU)`, preserving direction. |
| Exploration, ordinary body radius | `1.1 + 1.4 √(r / 6371.0084)`; Sun radius is 9; comet radius is 0.6. |
| Exploration, moon radius | `max(0.26, 0.85 √(r / 1737.4))`. |
| Exploration, moon distance | `2.9 parentDisplayRadius + 3.4 ln(1 + d/max(5000,parentRadiusKm))`, added to the parent's displayed position. |

The coordinate rotation into Three.js is `(x,y,z) → (x,z,−y)`. Measurements always use physical coordinates before mapping. Comparison disks use one common linear diameter factor. The scale laboratory can enlarge/scroll the whole ruler or restrict it to rocky/giant planets; it never rescales individual bodies independently. Its distance values are semi-major axes, not instantaneous separations. Combined true scale always forces a linear axis.

## Time and discontinuities

At 1×, one real second advances one simulated second; the default 86,400× advances one simulated day per real second. Pause, direction and speed are separate. A zero custom rate pauses while preserving the last nonzero speed. Reverse while paused changes direction only. Date/step actions pause, and reaching a supported boundary pauses. Hidden-page events suspend advancement and reset the wall-clock baseline on return. A frame-delta cap also limits unexpected stalls.

Reset View changes only the camera. Reset Simulation restores the starting date and clock settings. Trails are recomputed samples of the past physical model, not accumulated screen points, so a date jump does not draw a false bridge. Light pulses use fixed endpoints and a disclosed five-real-second schematic animation; numeric light-time is physical distance divided by light speed.

Observe One Orbit stops at one modeled period and restores the previous speed/direction. Explicit pause, rate/date/step commands or a new dated journey release its pending endpoint, so a later manual date is never pulled back to that demonstration's end.

## Sources and dates

Source consultation date: **2026-09-06 UTC**. Data rows have different original publication/reference epochs; this is not a live dataset.

| Dataset | Primary source and use |
| --- | --- |
| Planet radii, masses, density, rotation, periods and reference gravity | [JPL physical parameters](https://ssd.jpl.nasa.gov/planets/phys_par.html). Giant gravity is a reference-level value, not a solid surface. |
| Planetary elements and error scales | [JPL approximate positions](https://ssd.jpl.nasa.gov/planets/approx_pos.html), Table 1, 1800–2050. |
| Satellite physical values and mean orbits | [JPL physical parameters](https://ssd.jpl.nasa.gov/sats/phys_par/) and [mean elements](https://ssd.jpl.nasa.gov/sats/elem/). Derived mass, density and spherical gravity are calculated in consistent units. |
| Recognized moon counts | [JPL discovery table](https://ssd.jpl.nasa.gov/sats/discovery.html), dated snapshot; counts exceed this app's curated selection. |
| Temperatures | [NASA reference temperatures](https://science.nasa.gov/resource/solar-system-temperatures/), article published 2022 and updated 2024. Giant values refer to a pressure level. |
| Eris | [Sicardy et al., 2011](https://www.nature.com/articles/nature10550): spherical radius 1,163 ± 6 km from the 2010 occultation. |
| Haumea | [Ortiz et al., 2017](https://www.nature.com/articles/nature24051): adopted volume-equivalent radius ≈797.5 km from 1,161 × 852 × 513 km semi-axes. This is a dated shape model. |
| Makemake | [Ortiz et al., 2012](https://www.nature.com/articles/nature11597): projected axes 1,430 ± 9 and 1,502 ± 45 km. A 715 km spherical radius is an explicit model choice; mass, density and gravity are omitted. |
| Small-body rotation | [JPL SBDB](https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html), LCDB reference snapshot, including the uncertainty notes. Makemake uses 22.8266 h. |
| Seasons, eclipses and comet behavior | [NASA Earth tilt](https://science.nasa.gov/learn/heat/resource/earths-spin-tilt-and-orbit/), [Moon eclipses](https://science.nasa.gov/moon/eclipses/), [comets](https://science.nasa.gov/solar-system/comets/facts/). |
| Missions and descriptive entries | Individual NASA pages linked within each entry. Mission dates are historical milestones, not current spacecraft telemetry or trajectories. |

`tests/fixtures/horizons-j2000.json` contains independent public JPL Horizons reference vectors and exact query URLs for Earth–Moon, Mars and Jupiter barycenters at J2000 TDB. The app never calls Horizons at runtime. `test-results/sources.json` records 46 public source routes checked; all returned HTTP 200 after correcting four obsolete routes. HTTP availability does not by itself certify a scientific value.

## Assets, licensing and loading

Eleven 2048 × 1024 color/cloud images are stored under `public/assets`. They are from [Solar System Scope / INOVE](https://www.solarsystemscope.com/textures/), licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), based on NASA imagery. Full original URLs, roles, sizes and attribution are recorded in `public/assets/manifest.json`. Images use enhanced colors and reconstructed areas; they are not live observations. Other surfaces and stars are seeded procedural illustrations. The Sun's texture is a stylized representation, not visible-light detail at this scale.

The initial scene renders with body-specific fallback materials while public assets load locally. A failed texture retains the fallback and appears in diagnostics with a Retry action. A separate fallback supports Earth clouds. Texture replacement disposes the superseded resource. Major spheres share geometry, comet tails update existing buffers, and orbit/trail geometries dispose replaced buffers. In a paused modal laboratory the unchanged background scene is reused; SVG controls continue responding independently.

## Storage and recovery

The application uses only origin-local `localStorage`, key `observatory.v1`. JSON version is 1, import limit 2 MB, each collection has at most 200 entries, titles are bounded and notes have at most 4,000 characters. Known identifiers, dates, camera vectors/FOV, visual preferences, activity identifiers and experiment parameter ranges are checked. Imported text is escaped and never executed. Imports show a summary before merging; matching entry identifiers are not duplicated. A portable scene file exports only public camera/target/date/scale/layer state, excluding notes, private paths and browser identifiers.

Storage denial or malformed data starts a usable session and explains the inability to restore/persist. WebGL failure exposes a diagram/catalog explorer while comparison, laboratories, missions and collections remain usable. Context loss preserves state and offers recovery. PNG captures render at the requested bounded resolution rather than merely upscaling an old screenshot; the renderer returns to its previous size afterwards. Blob previews are replaced with URL cleanup. MediaRecorder stops its stream tracks on completion/exit.

No account, analytics, location, microphone, cloud API or service worker is required. Speech is explicitly enabled, uses browser voices and has full text fallback. Clipboard failure leaves selectable scene text and JSON download. Fullscreen has an in-page alternative. WebM depends on MediaRecorder; PNG remains available. There is no offline installation or prerecorded audio. Optional APIs are not represented as universally supported.

## Local preview and maintenance

The production preview runs on `http://127.0.0.1:4173/`. It serves only the compiled `dist` application. No public host was created. To restart from this directory with the existing local dependencies:

```powershell
node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173 --strictPort
```

Build: `node node_modules/vite/bin/vite.js build`. Numerical tests: `node --test tests/model.test.js tests/storage.test.js`. Browser suites: `node tests/browser.mjs`, `node tests/acceptance.mjs`, `node tests/recovery.mjs`, `node tests/controls.mjs`, against the running preview. They set their browser binaries, temporary files and fresh profiles inside `.tooling` and write evidence under `test-results`. One-time implementation scripts are retained only in `.tooling/build-history`.

See `VALIDATION.md` for the completed acceptance evidence, performance measurements and limitations.
