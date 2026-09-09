# Solar System benchmark scorecard

> Status: the four current Frontier V2 contenders are fully archived. Sun Max V2 has partial provisional evaluation values recorded; the remaining categories and contenders are still pending.

## Current arena

| Model | Effort | Snapshot | Prompt | Evaluation state |
| --- | --- | --- | --- | --- |
| GPT-5.6 Sun Max | Max | `93d43ae…` | [`frontier-v2.md`](../prompts/frontier-v2.md) | Partial evaluation |
| GPT-6 Astra Max | Max | `fca2ef51…` | [`frontier-v2.md`](../prompts/frontier-v2.md) | Ready |
| Grok 4.6 | **XHIGH** | archive `5d77eeb509…` | [`frontier-v2.md`](../prompts/frontier-v2.md) | Ready |
| Fable 5.1 | **Max** | `7e079669e41b…` | [`frontier-v2.md`](../prompts/frontier-v2.md) | Ready |

The four current runs use the exact same archived prompt. SHA-256: `7c2833a0486938c38671139807bd4a8c16371c3740175376ad02a6c0c3c06d65`.

Reasoning labels are recorded as run metadata and are not normalized across vendors. Grok 4.6 is the XHIGH run; Fable 5.1 is the Max run.

<details>
<summary><strong>Historical baseline</strong></summary>

GPT-5.6 Sun Max V1 (`67eb9fc…`) is preserved for prompt-leverage analysis, but it is excluded from the current weighted Frontier V2 arena because it used `sun-original.md`.

</details>

## Scoring scale

Each dimension is rated from **0 to 10**, with **0.5-point increments allowed**. The rating is then converted into weighted points:

`weighted points = (rating / 10) × dimension weight`

Required benchmark behavior drives **Feature completeness**. Optional extras can improve polish or help in a tie-break, but they do not compensate for missing core requirements and cannot push a category above its maximum weight.

Cells show the raw 0–10 rating followed by the weighted contribution.

## Weighted score — current Frontier V2 arena

| Dimension | Weight | Sun Max V2 | Astra Max | Grok 4.6 XHIGH | Fable 5.1 Max |
| --- | ---: | ---: | ---: | ---: | ---: |
| Feature completeness | 20 | **9.5/10 → 19.0/20** | — | — | — |
| Interaction / UX | 15 | **8.0/10 → 12.0/15** | — | — | — |
| Visual execution | 15 | — | — | — | — |
| Scientific / simulation fidelity | 15 | — | — | — | — |
| Robustness | 10 | — | — | — | — |
| Performance | 10 | **7.5/10 → 7.5/10** | — | — | — |
| Code / architecture | 10 | **8.0/10 → 8.0/10*** | — | — | — |
| Accessibility / responsive behavior | 5 | — | — | — | — |
| **Total** | **100** | **46.5/55 scored so far** | **—** | **—** | **—** |

\* `Code / architecture` is a provisional technical evaluator score. The project has clear separation between data, science, tests and browser QA, no runtime dependency stack, and reproducible validation; however, much of the application/UI/rendering logic is concentrated in a very large `app.js`, which limits maintainability and modularity.

The Sun Max V2 user-entered ratings currently recorded are: Feature completeness **9.5/10**, Interaction / UX **8.0/10**, and Performance **7.5/10**. Categories not explicitly rated by the user remain pending unless clearly marked as evaluator-provisional.

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
**Strengths:** partial evaluation in progress

**Weaknesses:** partial evaluation in progress

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
