<div align="center">

# Solar System / Orbitarium Benchmark

**Frontier Models · complete-product generation benchmark**

`3D / Canvas` · `simulation` · `product design` · `scientific honesty` · `responsive UX` · `robustness`

[Português (Brasil)](./README.pt-BR.md)

</div>

## ⚔️ Current Frontier V2 arena

| Model | Effort | Live project | Snapshot |
| --- | --- | --- | --- |
| ☀️ **GPT-5.6 Sun Max** | Max | [Open Sun V2](https://gpt-5.6-sun-v2.biel.dev.br) | `93d43ae62f…` |
| ✦ **GPT-6 Astra Max** | Max | [Open Astra](https://gpt-6-astra.biel.dev.br) | `fca2ef51b4…` |
| 𝕏 **Grok 4.6** | **XHIGH** | [Open Grok 4.6](https://grok-4-6-solar-system.vercel.app) | archive `5d77eeb509…` |
| ◆ **Fable 5.1** | **Max** | [Open Fable 5.1](https://fable-solar-system.vercel.app) | `7e079669e41b…` |

All four current contenders use the exact same [`frontier-v2.md`](./prompts/frontier-v2.md) input.

> Reasoning labels are preserved exactly as run metadata. `Max` and `XHIGH` are vendor/run settings and are not treated as directly equivalent compute scales.

<details>
<summary><strong>Historical baseline — GPT-5.6 Sun Max V1</strong></summary>

GPT-5.6 Sun Max V1 is preserved only for prompt-leverage history. It is deliberately excluded from the current arena because it used [`sun-original.md`](./prompts/sun-original.md), not Frontier V2.

- [Open Sun V1](https://gpt-5.6-sun-v1.biel.dev.br)
- Snapshot: `67eb9fc51f…`
- Archive: [`runs/gpt-5.6-sun-max/original`](./runs/gpt-5.6-sun-max/original/)

</details>

## What this benchmark tests

The task asks a model to turn a dense product specification into a complete browser-based Solar System experience rather than a thin demo. It stresses:

- interpretation of a long product specification;
- visual hierarchy and product judgment;
- simulation, time and orbital state;
- nested systems such as Earth–Moon;
- camera, selection and navigation behavior;
- scale, measurement and educational tools;
- performance and reliability;
- responsive and accessibility behavior;
- scientific honesty and explicit approximation boundaries;
- testing and restoration behavior.

## Shared Frontier V2 input

```text
SHA-256  7c2833a0486938c38671139807bd4a8c16371c3740175376ad02a6c0c3c06d65
Size     115,983 bytes
Lines    1,153
```

```text
                       EXACT SAME FRONTIER V2 PROMPT
               ↙                ↓               ↓               ↘
      SUN MAX V2         ASTRA MAX        GROK 4.6          FABLE 5.1
         MAX                MAX              XHIGH               MAX
```

## Run map

| Run | Model | Prompt | Provenance | Arena |
| --- | --- | --- | --- | --- |
| Historical baseline | GPT-5.6 Sun Max V1 | `sun-original.md` | commit `67eb9fc51f…` | hidden |
| Frontier V2 | GPT-5.6 Sun Max | `frontier-v2.md` | commit `93d43ae62f…` | current |
| Frontier V2 | GPT-6 Astra Max | `frontier-v2.md` | commit `fca2ef51b4…` | current |
| Frontier V2 / XHIGH | Grok 4.6 | `frontier-v2.md` | archive SHA-256 `5d77eeb509…` | current |
| Frontier V2 / Max | Fable 5.1 | `frontier-v2.md` | commit `7e079669e41b…` | current |

Machine-readable provenance lives in [`RUNS.json`](./RUNS.json).

## Current snapshots

### GPT-5.6 Sun Max — Frontier V2
A complete rebuild under the stronger Frontier V2 specification. The run is archived under [`runs/gpt-5.6-sun-max/rebuild`](./runs/gpt-5.6-sun-max/rebuild/).

### GPT-6 Astra Max
A full challenger generated from the same V2 prompt, archived under [`runs/gpt-6-astra-max/frontier-v2`](./runs/gpt-6-astra-max/frontier-v2/).

### Grok 4.6 — XHIGH
A complete Vite/TypeScript Solar System project with rendering, science/orbit core, catalogs, learning content, localization, state and persistence. The supplied source archive had no `.git`, so the source ZIP SHA-256 is the provenance anchor. See [`GROK-4.6-PROVENANCE.md`](./GROK-4.6-PROVENANCE.md).

### Fable 5.1 — Max
A complete Vite/Preact/Three.js observatory with simulation, rendering, catalogs, tours, activities, localization, state and persistence. It is archived from commit `7e079669e41b633057dd3dc9ae2cdeca4a4d17fb`. See [`FABLE-5.1-PROVENANCE.md`](./FABLE-5.1-PROVENANCE.md).

## Snapshot policy

Model-produced files are preserved inside `runs/` without evaluator edits.

```text
runs/
├─ gpt-5.6-sun-max/
│  ├─ original/             # historical only
│  └─ rebuild/              # current arena
├─ gpt-6-astra-max/
│  └─ frontier-v2/
├─ grok-4.6/
│  └─ frontier-v2/
└─ fable/
   └─ frontier-v2/
```

Evaluator-authored material lives outside those snapshots in `comparison/`, provenance files and repository documentation.

## Evaluation

Each dimension is scored from **0 to 10**, then converted to weighted points. A defect belongs in the category it actually violates, not simply where it was noticed during use.

| Dimension | Weight | Objective and criterion |
| --- | ---: | --- |
| **Feature completeness** | 20 | **Objective:** measure whether required prompt capabilities exist and deliver the intended end-to-end behavior.<br>**Criterion:** deduct for missing, fake, shallow or loophole-driven features; ordinary breakage belongs to Robustness unless the feature is effectively absent or unusable. |
| **Interaction / UX** | 15 | **Objective:** measure clarity, discoverability, ergonomics, navigation/control flow and feedback when the product behaves as designed.<br>**Criterion:** deduct for confusing or unnecessarily difficult interaction design, not implementation/state failures that merely appear while interacting. |
| **Visual execution** | 15 | **Objective:** measure visual hierarchy, readability, coherence, rendering quality and overall polish of the interface and scene.<br>**Criterion:** deduct persistent visual/design defects; functional failures count here only when they independently damage the visual result. |
| **Scientific / simulation fidelity** | 15 | **Objective:** measure correctness and coherence of orbital, time, scale and astronomical behavior, including honest approximation boundaries.<br>**Criterion:** deduct scientifically wrong data, semantics or models; runtime breakage belongs to Robustness unless the underlying scientific logic itself is wrong. |
| **Robustness** | 10 | **Objective:** measure whether core behaviors remain reliable through normal, repeated and edge-case interaction, state changes, resets and high-speed use.<br>**Criterion:** bugs, desynchronization, broken follow/camera state, exceptions, corrupted state and behaviors that stop working are penalized here. |
| **Performance** | 10 | **Objective:** measure responsiveness, frame pacing, loading behavior and resource efficiency in intended environments.<br>**Criterion:** deduct measurable slowness, jank, stalls or excessive resource use; confusing controls and correctness belong elsewhere. |
| **Code / architecture** | 10 | **Objective:** measure maintainability, modularity, typing/state boundaries, dependency discipline, testability and validation quality from source evidence.<br>**Criterion:** deduct structural engineering weaknesses; a user-visible bug is not also an architecture penalty without independent source evidence. |
| **Accessibility / responsive behavior** | 5 | **Objective:** measure keyboard/focus access, reduced-motion support, semantic usability and layout adaptation across target viewport sizes.<br>**Criterion:** deduct concrete accessibility or responsive failures; generic UX friction and unrelated functional bugs stay in their primary categories. |

**Category-boundary rule:** do not double-penalize the same defect across categories unless it independently violates more than one criterion. Secondary deductions require separate evidence of a distinct failure.

**Example:** if the Sun incorrectly follows the user/camera while moving around the orbitarium because follow, camera or scene state is broken, that is **Robustness**, not **Interaction / UX**. It affects UX only if the interaction design itself is confusing even when functioning correctly.

See [`comparison/SCORECARD.md`](./comparison/SCORECARD.md) for scores and evidence, and [`../../docs/METHODOLOGY.md`](../../docs/METHODOLOGY.md) for repository-wide rules.

## Fairness

A contender should not receive another contender's implementation, score, critique or post-hoc hints while generating its own project. The benchmark is **generation first, evaluation second**.

---

<div align="center">

**Frontier Models · same task, inspectable outputs, explicit evidence.**

</div>
