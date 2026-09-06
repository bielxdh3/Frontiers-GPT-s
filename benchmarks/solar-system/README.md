<div align="center">

# Solar System / Orbitarium Benchmark

**A full-product generation test for frontier models**

`3D / Canvas` · `simulation` · `product design` · `scientific honesty` · `responsive UX` · `robustness`

</div>

---

## What this benchmark tests

This is not a small coding exercise. The task asks a model to turn a dense product specification into a complete browser-based Solar System experience: celestial bodies, orbital behavior, time controls, camera navigation, object inspection, comparison tools, guided learning, responsive UI, performance work and scientific caveats.

It therefore stresses several capabilities at once:

- interpreting a long product specification;
- choosing an implementation strategy without hand-holding;
- integrating visual design, interaction and simulation state;
- maintaining coherence across moving nested objects such as Earth and Moon;
- balancing scientific fidelity against usable visualization scale;
- building a product that works beyond the happy path;
- validating the result instead of stopping once it renders.

## Run map

| Generation | Model | Input | Snapshot | Role |
| --- | --- | --- | --- | --- |
| **Original** | GPT-5.6 Sun Max | [`sun-original.md`](./prompts/sun-original.md) | `67eb9fc51f…` | Historical baseline |
| **Frontier V2 rebuild** | GPT-5.6 Sun Max | `frontier-v2.md` | `93d43ae62f…` | Same model, much stronger prompt |
| **Frontier V2 challenger** | GPT-6 Astra Max | `frontier-v2.md` | pending | Same V2 input, different frontier model |

The exact Frontier V2 prompt has not yet been recovered into this repository. It will be archived verbatim before the V2-vs-V2 comparison is considered complete.

## Why the original Sun run is kept

The original run is useful for more than nostalgia. It creates a control point for a different question:

> How much can the same model improve when the specification itself becomes substantially better?

The original project was a React/TypeScript/Three.js experience with procedural planets, camera travel, exploration/relative scale modes, time controls, search, object data, comparison mode, guided tour, responsive behavior and a WebGL fallback.

The rebuild takes a dramatically different implementation route: a dependency-free local browser application with procedural Canvas rendering, a larger body catalog, UTC time semantics, approximate JPL planetary elements, a bounded Kepler solver, scale/measurement tools, tours, activities, bilingual UI, exports, accessibility features and extensive browser QA artifacts.

That makes the archive capable of answering **two different comparisons**:

1. **Sun Original → Sun Rebuild:** prompt/specification leverage plus another generation attempt.
2. **Sun Rebuild ↔ Astra Max:** model comparison under the same Frontier V2 prompt.

## Snapshot policy

Model output is imported into `runs/` without evaluator edits.

```text
runs/
├─ gpt-5.6-sun-max/
│  ├─ original/
│  └─ rebuild/
└─ gpt-6-astra-max/
   └─ frontier-v2/
```

Evaluator material lives separately in `comparison/`.

## Evaluation

The shared scorecard uses eight weighted dimensions:

| Dimension | Weight |
| --- | ---: |
| Feature completeness | 20 |
| Interaction / UX | 15 |
| Visual execution | 15 |
| Scientific / simulation fidelity | 15 |
| Robustness | 10 |
| Performance | 10 |
| Code / architecture | 10 |
| Accessibility / responsive behavior | 5 |

See [`comparison/SCORECARD.md`](./comparison/SCORECARD.md) for the detailed evidence checklist and [`../../docs/METHODOLOGY.md`](../../docs/METHODOLOGY.md) for repository-wide evaluation rules.

## Scientific expectations

The benchmark rewards scientific honesty, not fake precision. A strong solution should clearly distinguish between real astronomical values, approximate orbital models, compressed distances, exaggerated radii and schematic educational behavior.

The model is not required to build a high-precision N-body ephemeris. It is required to avoid presenting a visual convenience as physical truth.

## Reproducibility

Every run must ultimately have all of the following:

- exact prompt text;
- exact upstream commit SHA;
- vendored project snapshot;
- model label / run label;
- evaluation evidence;
- evaluator scorecard;
- explicit caveats for anything that could not be reproduced.

The machine-readable provenance lives in [`RUNS.json`](./RUNS.json).

---

<div align="center">

**The model should not know the opponent's implementation or score while generating its own project.**

That separation is intentional: generation first, evaluation second.

</div>
