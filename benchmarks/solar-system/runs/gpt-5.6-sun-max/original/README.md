# GPT-5.6 SUN MAX — Solar System

An immersive, interactive Solar System experience built for the browser. Explore a cinematic 3D model, inspect celestial bodies, control simulation time, compare worlds, and follow a guided tour from the Sun to Neptune.

**Live experience:** [orbitarium-solar-system.bielxdh.chatgpt.site](https://orbitarium-solar-system.bielxdh.chatgpt.site)

## Highlights

- Procedural 3D Sun, planets, Moon, Saturn rings, atmospheres, lighting, shadows, and deep starfield
- Smooth orbit, zoom, pan, object selection, camera travel, and planet-following behavior
- Exploration and scientifically meaningful relative-size modes
- Pause, reverse, preset speeds up to 1,000×, custom speed, and simulation reset
- Searchable celestial-object navigator with detailed astronomical data
- All, selected-only, and hidden orbit-line modes
- Optional floating labels with distance-aware fading
- Visual comparison mode for diameter, mass, gravity, day, year, and temperature
- Guided tour covering the Sun, Earth, Moon, Mars, Jupiter, Saturn, Uranus, and Neptune
- Responsive desktop, tablet, and mobile interface with touch navigation
- Automatic accessible orbital-map fallback when WebGL 2 is unavailable

## Scientific scope

The model is designed to remain explorable rather than pretending the Solar System fits neatly on one screen.

- **Exploration Scale** exaggerates body sizes and compresses orbital distances independently.
- **Relative Scale** uses a common ratio for celestial-body diameters, while orbital distances remain compressed separately.
- Motion uses circularized, near-coplanar paths driven by real sidereal periods. It is not a precision ephemeris.
- At 1× speed, one real second advances one simulated hour from the J2000 epoch.

## Technology

- React 19
- TypeScript
- Three.js
- Vinext / Vite
- Tailwind CSS
- Lucide icons

## Run locally

Requirements: Node.js `>=22.13.0`.

```bash
npm install
npm run dev
```

For a production build:

```bash
npm run build
```

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `Space` | Pause or resume time |
| `R` | Return to the full-system view |
| `O` | Toggle orbit lines |
| `L` | Toggle labels |
| `Escape` | Close panels or exit the guided tour |

## License

No license has been selected yet. All rights are reserved by the repository owner unless a license is added later.
