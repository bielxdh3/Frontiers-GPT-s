# Solar System benchmark scorecard

> Status: the four current Frontier V2 contenders are fully archived. Sun Max V2, Astra Max and Grok 4.6 XHIGH now have complete preliminary weighted evaluations recorded; Fable 5.1 Max is still pending.

## Current arena

| Model | Effort | Snapshot | Prompt | Evaluation state |
| --- | --- | --- | --- | --- |
| GPT-5.6 Sun Max | Max | `93d43ae…` | [`frontier-v2.md`](../prompts/frontier-v2.md) | Preliminary scored |
| GPT-6 Astra Max | Max | `fca2ef51…` | [`frontier-v2.md`](../prompts/frontier-v2.md) | Preliminary scored |
| Grok 4.6 | **XHIGH** | archive `5d77eeb509…` | [`frontier-v2.md`](../prompts/frontier-v2.md) | Preliminary scored |
| Fable 5.1 | **Max** | `7e079669e41b…` | [`frontier-v2.md`](../prompts/frontier-v2.md) | Ready |

The four current runs use the exact same archived prompt. SHA-256: `7c2833a0486938c38671139807bd4a8c16371c3740175376ad02a6c0c3c06d65`.

Reasoning labels are recorded as run metadata and are not normalized across vendors. Grok 4.6 is the XHIGH run; Fable 5.1 is the Max run.

<details>
<summary><strong>Historical baseline</strong></summary>

GPT-5.6 Sun Max V1 (`67eb9fc…`) is preserved for prompt-leverage analysis, but it is excluded from the current weighted Frontier V2 arena because it used `sun-original.md`.

</details>

## Scoring scale

Each dimension is rated from **0 to 10**. Decimal ratings are allowed to preserve the evaluator's intended precision. The rating is then converted into weighted points:

`weighted points = (rating / 10) × dimension weight`

Required benchmark behavior drives **Feature completeness**. Optional extras can improve polish or help in a tie-break, but they do not compensate for missing core requirements and cannot push a category above its maximum weight.

Cells show the raw 0–10 rating followed by the weighted contribution.

> ***AVALIAÇÃO PESSOAL NÃO 100% CONFIÁVEL E NÃO PROFUNDA SUFICIENTE.*** As notas atuais de Sun Max V2, Astra Max e Grok 4.6 XHIGH foram feitas principalmente por **um único usuário**, em **poucos dispositivos/ambientes**, e carregam inevitavelmente **viés pessoal e subjetividade**. Elas devem ser tratadas como avaliações preliminares, não como medições definitivas ou revisões profissionais exaustivas.

## Weighted score — current Frontier V2 arena

| Dimension | Weight | Sun Max V2 | Astra Max | Grok 4.6 XHIGH | Fable 5.1 Max |
| --- | ---: | ---: | ---: | ---: | ---: |
| Feature completeness | 20 | **8.6/10 → 17.2/20** | **10/10 → 20/20** | **1.0/10 → 2.0/20** | — |
| Interaction / UX | 15 | **8.0/10 → 12.0/15** | **9.8/10 → 14.7/15** | **0.3/10 → 0.45/15** | — |
| Visual execution | 15 | **6.0/10 → 9.0/15** | **9.9/10 → 14.85/15** | **1.1/10 → 1.65/15** | — |
| Scientific / simulation fidelity | 15 | **4.0/10 → 6.0/15** | **9.9/10 → 14.85/15** | **5.0/10 → 7.5/15** | — |
| Robustness | 10 | **8.0/10 → 8.0/10** | **10/10 → 10/10** | **2.0/10 → 2.0/10** | — |
| Performance | 10 | **7.5/10 → 7.5/10** | **9.5/10 → 9.5/10** | **8.0/10 → 8.0/10** | — |
| Code / architecture | 10 | **8.0/10 → 8.0/10*** | **9.2/10 → 9.2/10*** | **8.7/10 → 8.7/10*** | — |
| Accessibility / responsive behavior | 5 | **7.0/10 → 3.5/5** | **9.0/10 → 4.5/5** | **7.0/10 → 3.5/5** | — |
| **Total** | **100** | **71.2/100** | **97.6/100** | **33.8/100** | **—** |

\* `Code / architecture` uses provisional technical evaluator scores rather than user-entered hands-on ratings. Sun Max V2 scores **8.0/10**: it has clear separation between data, science, tests and browser QA with reproducible validation, but much application/UI/rendering logic is concentrated in a very large `app.js`. Astra Max scores **9.2/10**: its implementation is split across dedicated data, model, scene, materials, tools, UI, content and storage modules and includes multiple automated test/acceptance/recovery/control paths; some major modules remain relatively large, so the architecture is strong rather than perfect. Grok 4.6 XHIGH scores **8.7/10**: its TypeScript implementation is cleanly separated across core, data, rendering, simulation, state and UI layers, but `ui/app.ts` still concentrates a substantial amount of logic and its automated test coverage is more limited than Astra's.

The Sun Max V2 user-entered ratings currently recorded are: Feature completeness **8.6/10**, Interaction / UX **8.0/10**, Visual execution **6.0/10**, Scientific / simulation fidelity **4.0/10**, Robustness **8.0/10**, Performance **7.5/10**, and Accessibility / responsive behavior **7.0/10**. `Code / architecture` is evaluator-provisional.

The Astra Max user-entered ratings currently recorded are: Feature completeness **10/10**, Interaction / UX **9.8/10**, Visual execution **9.9/10**, Scientific / simulation fidelity **9.9/10**, Robustness **10/10**, Performance **9.5/10**, and Accessibility / responsive behavior **9.0/10**. `Code / architecture` is evaluator-provisional.

The Grok 4.6 XHIGH user-entered ratings currently recorded are: Feature completeness **1.0/10**, Interaction / UX **0.3/10**, Visual execution **1.1/10**, Scientific / simulation fidelity **5.0/10**, Robustness **2.0/10**, Performance **8.0/10**, and Accessibility / responsive behavior **7.0/10**. `Code / architecture` is evaluator-provisional at **8.7/10**.

> **Feature completeness note — Grok 4.6 XHIGH:** some requested features were technically implemented, but many were delivered in a lazy, broken or loophole-driven way that satisfied the wording of parts of the prompt without delivering the intended behavior well. Those implementations therefore received heavy penalties rather than full credit merely for existing.

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
**Strengths:** quantitative preliminary evaluation complete; qualitative summary pending

**Weaknesses:** qualitative summary pending

**Critical defects:** pending qualitative evaluation

### GPT-6 Astra Max
**Strengths:** quantitative preliminary evaluation complete; qualitative summary pending

**Weaknesses:** qualitative summary pending

**Critical defects:** pending qualitative evaluation

### Grok 4.6 — XHIGH
**Strengths:** good raw performance and relatively solid underlying code organization

**Weaknesses:** very poor interaction/UX and visual execution; major feature-completeness penalties for shallow, broken or loophole-driven implementations

**Critical defects:** qualitative defect inventory still pending

### Fable 5.1 — Max
**Strengths:** pending evaluation

**Weaknesses:** pending evaluation

**Critical defects:** pending evaluation

## Final ranking

Pending the complete evidence-backed evaluation pass for Fable 5.1 Max. Among the three currently scored runs, the preliminary weighted ranking is **1. Astra Max — 97.6/100**, **2. Sun Max V2 — 71.2/100**, **3. Grok 4.6 XHIGH — 33.8/100**.
