# Solar System benchmark scorecard

> Status: benchmark inputs and all three project snapshots are fully archived. The remaining work is the evidence-backed evaluation itself.

## Runs

| Run | Snapshot | Prompt | Evaluation state |
| --- | --- | --- | --- |
| GPT-5.6 Sun Max — Original | `67eb9fc…` | [`sun-original.md`](../prompts/sun-original.md) | Historical baseline archived |
| GPT-5.6 Sun Max — Rebuild | `93d43ae…` | [`frontier-v2.md`](../prompts/frontier-v2.md) | Ready for evaluation |
| GPT-6 Astra Max | `fca2ef51…` | [`frontier-v2.md`](../prompts/frontier-v2.md) | Ready for evaluation |

The two Frontier V2 runs use the same archived prompt. Its SHA-256 is `7c2833a0486938c38671139807bd4a8c16371c3740175376ad02a6c0c3c06d65`.

## Weighted score

| Dimension | Weight | Sun Original | Sun Rebuild | Astra Max |
| --- | ---: | ---: | ---: | ---: |
| Feature completeness | 20 | — | — | — |
| Interaction / UX | 15 | — | — | — |
| Visual execution | 15 | — | — | — |
| Scientific / simulation fidelity | 15 | — | — | — |
| Robustness | 10 | — | — | — |
| Performance | 10 | — | — | — |
| Code / architecture | 10 | — | — | — |
| Accessibility / responsive behavior | 5 | — | — | — |
| **Total** | **100** | **—** | **—** | **—** |

## Evidence checklist

### First-run experience
- [ ] visually strong initial state
- [ ] onboarding is understandable
- [ ] no broken or placeholder UI
- [ ] important actions are discoverable

### Solar System scene
- [ ] Sun and eight planets are present
- [ ] Earth–Moon hierarchy behaves coherently
- [ ] Saturn's rings remain attached/oriented correctly
- [ ] orbit visualization does not overwhelm the scene
- [ ] labels remain useful at different distances

### Simulation
- [ ] pause / resume
- [ ] reverse time
- [ ] multiple time rates
- [ ] high-speed behavior remains stable
- [ ] reset behavior is deterministic
- [ ] orbital state does not visibly break after time changes

### Camera
- [ ] orbit / rotate
- [ ] zoom
- [ ] pan where supported
- [ ] object selection
- [ ] smooth travel/focus
- [ ] follow moving body
- [ ] return to overview

### Information architecture
- [ ] searchable object navigation
- [ ] body details
- [ ] comparison mode
- [ ] guided tour
- [ ] scientific caveats / model explanation

### Responsive and access
- [ ] desktop
- [ ] tablet / medium viewport
- [ ] mobile portrait
- [ ] short landscape viewport
- [ ] keyboard navigation
- [ ] visible focus
- [ ] reduced-motion behavior where relevant

### Reliability
- [ ] no runtime errors during core flow
- [ ] no severe console errors
- [ ] fallback behavior is sensible
- [ ] local persistence does not corrupt the app
- [ ] export/download features, if present, produce valid data

## Prompt-specific acceptance expansion

The Frontier V2 prompt is much broader than the original baseline. The detailed evaluator should additionally verify the explicit areas defined by the prompt, including:

- curated moons, dwarf planets, small bodies, asteroid belt, Kuiper Belt and outer-system context;
- deterministic clock semantics, date validity boundaries and approximate orbital model transparency;
- physical-vs-display coordinate separation;
- scale laboratory, measurement tools, seasons, Moon phases/eclipses and hypothetical orbit laboratory;
- reference frames, orientation map and motion trails;
- mission-history layer, multiple guided tours and at least twelve learning activities;
- glossary/encyclopedia, favorites, journal, bookmarks and saved viewpoints;
- photography/capture behavior and local export/import boundaries;
- Portuguese/English localization, keyboard ownership, reduced motion and responsive layouts;
- loading/recovery paths, resource behavior and the integrated restoration scenarios specified by the prompt.

A feature receives credit only when the requested behavior is actually present and supported by appropriate evidence.

## Qualitative verdict

### GPT-5.6 Sun Max — Original
**Strengths:** pending evaluation

**Weaknesses:** pending evaluation

**Critical defects:** pending evaluation

### GPT-5.6 Sun Max — Rebuild
**Strengths:** pending evaluation

**Weaknesses:** pending evaluation

**Critical defects:** pending evaluation

### GPT-6 Astra Max
**Strengths:** pending evaluation

**Weaknesses:** pending evaluation

**Critical defects:** pending evaluation

## Final ranking

Pending the complete evidence-backed evaluation pass. Benchmark provenance is complete; no input or snapshot is currently missing.
