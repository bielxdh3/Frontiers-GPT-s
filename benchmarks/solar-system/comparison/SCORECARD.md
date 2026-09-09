# Solar System benchmark scorecard

> Status: the four current Frontier V2 contenders are fully archived. Evaluation values remain pending until the evidence-backed pass is complete.

## Current arena

| Model | Effort | Snapshot | Prompt | Evaluation state |
| --- | --- | --- | --- | --- |
| GPT-5.6 Sun Max | Max | `93d43ae…` | [`frontier-v2.md`](../prompts/frontier-v2.md) | Ready |
| GPT-6 Astra Max | Max | `fca2ef51…` | [`frontier-v2.md`](../prompts/frontier-v2.md) | Ready |
| Grok 4.6 | **XHIGH** | archive `5d77eeb509…` | [`frontier-v2.md`](../prompts/frontier-v2.md) | Ready |
| Fable 5.1 | **Max** | `7e079669e41b…` | [`frontier-v2.md`](../prompts/frontier-v2.md) | Ready |

The four current runs use the exact same archived prompt. SHA-256: `7c2833a0486938c38671139807bd4a8c16371c3740175376ad02a6c0c3c06d65`.

Reasoning labels are recorded as run metadata and are not normalized across vendors. Grok 4.6 is the XHIGH run; Fable 5.1 is the Max run.

<details>
<summary><strong>Historical baseline</strong></summary>

GPT-5.6 Sun Max V1 (`67eb9fc…`) is preserved for prompt-leverage analysis, but it is excluded from the current weighted Frontier V2 arena because it used `sun-original.md`.

</details>

## Weighted score — current Frontier V2 arena

| Dimension | Weight | Sun Max V2 | Astra Max | Grok 4.6 XHIGH | Fable 5.1 Max |
| --- | ---: | ---: | ---: | ---: | ---: |
| Feature completeness | 20 | — | — | — | — |
| Interaction / UX | 15 | — | — | — | — |
| Visual execution | 15 | — | — | — | — |
| Scientific / simulation fidelity | 15 | — | — | — | — |
| Robustness | 10 | — | — | — | — |
| Performance | 10 | — | — | — | — |
| Code / architecture | 10 | — | — | — | — |
| Accessibility / responsive behavior | 5 | — | — | — | — |
| **Total** | **100** | **—** | **—** | **—** | **—** |

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

The Frontier V2 evaluator should additionally verify:

- curated moons, dwarf planets, small bodies, asteroid belt, Kuiper Belt and outer-system context;
- deterministic clock semantics, date validity boundaries and approximate orbital model transparency;
- physical-vs-display coordinate separation;
- scale laboratory, measurement tools, seasons, Moon phases/eclipses and hypothetical orbit laboratory;
- reference frames, orientation map and motion trails;
- mission-history layer, multiple guided tours and at least twelve learning activities;
- glossary/encyclopedia, favorites, journal, bookmarks and saved viewpoints;
- photography/capture behavior and local export/import boundaries;
- Portuguese/English localization, keyboard ownership, reduced motion and responsive layouts;
- loading/recovery paths, resource behavior and integrated restoration scenarios.

A feature receives credit only when the requested behavior is actually present and supported by evidence.

## Qualitative verdict

### GPT-5.6 Sun Max — V2
**Strengths:** pending evaluation

**Weaknesses:** pending evaluation

**Critical defects:** pending evaluation

### GPT-6 Astra Max
**Strengths:** pending evaluation

**Weaknesses:** pending evaluation

**Critical defects:** pending evaluation

### Grok 4.6 — XHIGH
**Strengths:** pending evaluation

**Weaknesses:** pending evaluation

**Critical defects:** pending evaluation

### Fable 5.1 — Max
**Strengths:** pending evaluation

**Weaknesses:** pending evaluation

**Critical defects:** pending evaluation

## Final ranking

Pending the complete evidence-backed evaluation pass. The current arena is Sun Max V2 vs Astra Max vs Grok 4.6 XHIGH vs Fable 5.1 Max.
