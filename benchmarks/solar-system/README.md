<div align="center">

# Solar System / Orbitarium Benchmark

**Frontier Models · complete-product generation benchmark**

`3D / Canvas` · `simulation` · `product design` · `scientific honesty` · `responsive UX` · `robustness`

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
<summary><strong>Historical Sun V1 baseline</strong></summary>

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

See [`comparison/SCORECARD.md`](./comparison/SCORECARD.md) for the evidence checklist and [`../../docs/METHODOLOGY.md`](../../docs/METHODOLOGY.md) for the repository-wide rules.

## Fairness

A contender should not receive another contender's implementation, score, critique or post-hoc hints while generating its own project. The benchmark is **generation first, evaluation second**.

---

<div align="center">

**Frontier Models · same task, inspectable outputs, explicit evidence.**

</div>
