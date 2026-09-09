<div align="center">

<img src="./assets/frontier-models-hero.svg" alt="Frontier Models — frontier model benchmark archive" width="100%" />

<br/>

[![Benchmark](https://img.shields.io/badge/benchmark-frontier%20models-7C3AED?style=for-the-badge)](./benchmarks)
[![Arena](https://img.shields.io/badge/Frontier%20V2-4%20current%20contenders-2563EB?style=for-the-badge)](./benchmarks/solar-system/RUNS.json)
[![Archive](https://img.shields.io/badge/archive-5%20snapshots-DB2777?style=for-the-badge)](./benchmarks/solar-system/RUNS.json)

# Frontier Models

**Exact prompts. Pinned provenance. Complete project snapshots. Explicit evidence.**

[Open benchmark](./benchmarks/solar-system/) · [Methodology](./docs/METHODOLOGY.md) · [Architecture](./docs/REPOSITORY-ARCHITECTURE.md)

</div>

## ⚔️ Frontier V2 live arena

| Model | Run / effort | Live project | Archived run |
| --- | --- | --- | --- |
| ☀️ **GPT-5.6 Sun Max** | Frontier V2 / Max | [Open Sun V2](https://gpt-5.6-sun-v2.biel.dev.br) | [`runs/gpt-5.6-sun-max/rebuild`](./benchmarks/solar-system/runs/gpt-5.6-sun-max/rebuild/) |
| ✦ **GPT-6 Astra Max** | Frontier V2 / Max | [Open Astra](https://gpt-6-astra.biel.dev.br) | [`runs/gpt-6-astra-max/frontier-v2`](./benchmarks/solar-system/runs/gpt-6-astra-max/frontier-v2/) |
| 𝕏 **Grok 4.6** | Frontier V2 / **XHIGH** | [Open Grok 4.6](https://grok-4-6-solar-system.vercel.app) | [`runs/grok-4.6/frontier-v2`](./benchmarks/solar-system/runs/grok-4.6/frontier-v2/) |
| ◆ **Fable 5.1** | Frontier V2 / **Max** | [Open Fable 5.1](https://fable-solar-system.vercel.app) | [`runs/fable/frontier-v2`](./benchmarks/solar-system/runs/fable/frontier-v2/) |

All four current contenders use the **same exact Frontier V2 master prompt**. Grok is recorded at **XHIGH**, its highest available reasoning level for this run; Fable 5.1 is recorded at **Max**.

<details>
<summary><strong>Historical baseline — GPT-5.6 Sun Max V1</strong></summary>

The original Sun build is preserved for prompt-leverage history, but it is intentionally **hidden from the current Frontier V2 arena** because it used a different prompt.

- [Open historical Sun V1](https://gpt-5.6-sun-v1.biel.dev.br)
- Archived snapshot: [`runs/gpt-5.6-sun-max/original`](./benchmarks/solar-system/runs/gpt-5.6-sun-max/original/)
- Input: [`sun-original.md`](./benchmarks/solar-system/prompts/sun-original.md)

</details>

---

## What is Frontier Models?

**Frontier Models** is a self-contained benchmark archive for comparing frontier AI systems on complete, inspectable projects rather than isolated screenshots or synthetic scores.

```text
PROMPT → MODEL RUN → PROJECT SNAPSHOT → EVIDENCE → SCORECARD → VERDICT
```

The archive is built so a reviewer can verify what each model received, what it produced, which immutable source is being judged, and what was added later by the evaluator.

## Benchmark 001 — Solar System / Orbitarium

The first benchmark asks each model to build a complete interactive Solar System product from a dense product specification. It stresses:

- visual/product design;
- simulation and orbital logic;
- camera and navigation behavior;
- time state and celestial hierarchy;
- responsive and accessibility behavior;
- performance and robustness;
- scientific honesty and caveats;
- onboarding, learning tools and QA.

The current comparison is intentionally simple: **same Frontier V2 prompt, four current contenders**.

```text
                         EXACT SAME FRONTIER V2 PROMPT
                ↙                 ↓                ↓                 ↘
      GPT-5.6 SUN MAX      GPT-6 ASTRA MAX     GROK 4.6         FABLE 5.1
           MAX                  MAX              XHIGH               MAX
```

## Current run provenance

| Model | Provenance | Status |
| --- | --- | --- |
| GPT-5.6 Sun Max V2 | commit `93d43ae62f…` | archived |
| GPT-6 Astra Max | commit `fca2ef51b4…` | archived |
| Grok 4.6 XHIGH | source ZIP SHA-256 `5d77eeb509…` | archived |
| Fable 5.1 Max | commit `7e079669e41b…` | archived |

The exact shared prompt is [`frontier-v2.md`](./benchmarks/solar-system/prompts/frontier-v2.md):

| Property | Value |
| --- | --- |
| SHA-256 | `7c2833a0486938c38671139807bd4a8c16371c3740175376ad02a6c0c3c06d65` |
| Size | `115,983 bytes` |
| Lines | `1,153` |

## Repository map

```text
Frontier-Models/
├── README.md
├── assets/
│   └── frontier-models-hero.svg
├── docs/
│   ├── METHODOLOGY.md
│   └── REPOSITORY-ARCHITECTURE.md
└── benchmarks/
    └── solar-system/
        ├── README.md
        ├── RUNS.json
        ├── GROK-4.6-PROVENANCE.md
        ├── FABLE-5.1-PROVENANCE.md
        ├── prompts/
        │   ├── sun-original.md
        │   └── frontier-v2.md
        ├── runs/
        │   ├── gpt-5.6-sun-max/
        │   │   ├── original/        ← historical only
        │   │   └── rebuild/         ← current arena
        │   ├── gpt-6-astra-max/
        │   │   └── frontier-v2/
        │   ├── grok-4.6/
        │   │   └── frontier-v2/
        │   └── fable/
        │       └── frontier-v2/
        └── comparison/
            └── SCORECARD.md
```

## Fairness rule

The competing model should not receive another contender's implementation, score, critique, or post-hoc hints while generating its own project. Generation comes first; evaluation comes afterward.

Reasoning-level labels are preserved as run metadata and are **not normalized across vendors**. `Max` and `XHIGH` describe the settings actually used, not a claim that those labels represent identical compute budgets.

## Evaluation model

| Dimension | Weight |
| --- | ---: |
| Feature completeness | 20 |
| Interaction / UX | 15 |
| Visual execution | 15 |
| Correctness / domain fidelity | 15 |
| Robustness | 10 |
| Performance | 10 |
| Code / architecture | 10 |
| Accessibility / responsive behavior | 5 |

See the full [`SCORECARD.md`](./benchmarks/solar-system/comparison/SCORECARD.md). Scores remain pending until the evidence-backed evaluation is completed.

## Archive policy

- model output stays untouched inside `runs/`;
- evaluator material stays outside run snapshots;
- exact prompts are archived separately;
- Git commits are used when source Git metadata exists;
- cryptographic source-archive hashes are used when it does not;
- historical runs remain preserved without cluttering the current arena.

---

<div align="center">

### Frontier Models

**Input · output · evidence · comparison — in one place.**

<sub>Independent benchmark archive. Model names identify the systems used for individual runs.</sub>

</div>
