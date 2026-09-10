<div align="center">

<img src="./assets/frontier-models-hero.svg" alt="Frontier Models — frontier model benchmark archive" width="100%" />

<br/>

[![Benchmark](https://img.shields.io/badge/benchmark-frontier%20models-7C3AED?style=for-the-badge)](./benchmarks)
[![Arena](https://img.shields.io/badge/Frontier%20V2-4%20current%20contenders-2563EB?style=for-the-badge)](./benchmarks/solar-system/RUNS.json)
[![Archive](https://img.shields.io/badge/archive-5%20snapshots-DB2777?style=for-the-badge)](./benchmarks/solar-system/RUNS.json)

# Frontier Models

**Exact prompts. Pinned provenance. Complete project snapshots. Explicit evidence.**

[Português (Brasil)](./README.pt-BR.md) · [Open benchmark](./benchmarks/solar-system/) · [Methodology](./docs/METHODOLOGY.md) · [Architecture](./docs/REPOSITORY-ARCHITECTURE.md)

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

The first benchmark asks each model to build a complete interactive Solar System product from a dense product specification. It stresses visual/product design, simulation and orbital logic, camera/navigation, time state, accessibility, performance, robustness, scientific honesty, learning tools and QA.

## Current run provenance

| Model | Provenance | Status |
| --- | --- | --- |
| GPT-5.6 Sun Max V2 | commit `93d43ae62f…` | archived |
| GPT-6 Astra Max | commit `fca2ef51b4…` | archived |
| Grok 4.6 XHIGH | source ZIP SHA-256 `5d77eeb509…` | archived |
| Fable 5.1 Max | commit `7e079669e41b…` | archived |

The exact shared prompt is [`frontier-v2.md`](./benchmarks/solar-system/prompts/frontier-v2.md), SHA-256 `7c2833a0486938c38671139807bd4a8c16371c3740175376ad02a6c0c3c06d65`.

## Evaluation model

Each dimension is rated from **0 to 10** and converted into weighted points. The same defect should not be charged twice unless independent evidence shows that it genuinely violates two separate criteria.

| Dimension | Weight | Objective and criterion |
| --- | ---: | --- |
| **Feature completeness** | 20 | **Objective:** verify that required capabilities exist and deliver the intended end-to-end behavior.<br>**Criterion:** deduct for missing, fake, shallow or loophole-driven features; ordinary breakage belongs to Robustness unless the feature is effectively unusable. |
| **Interaction / UX** | 15 | **Objective:** measure clarity, discoverability, ergonomics, navigation/control flow and feedback when behavior works as designed.<br>**Criterion:** deduct confusing interaction design, not implementation or state failures that merely surface during interaction. |
| **Visual execution** | 15 | **Objective:** measure hierarchy, readability, coherence, rendering quality and overall polish.<br>**Criterion:** deduct persistent visual/design defects; functional failures count only when they independently damage the visual result. |
| **Scientific / simulation fidelity** | 15 | **Objective:** measure correctness of orbital, temporal, scale and astronomical behavior and honest approximation boundaries.<br>**Criterion:** deduct wrong data, semantics or models; runtime breakage belongs to Robustness unless the underlying scientific logic is also wrong. |
| **Robustness** | 10 | **Objective:** measure reliability through normal, repeated and edge-case interaction, state changes, resets and high-speed use.<br>**Criterion:** bugs, desynchronization, broken follow/camera state, exceptions, corrupted state and behaviors that stop working belong here. |
| **Performance** | 10 | **Objective:** measure responsiveness, frame pacing, loading and resource efficiency.<br>**Criterion:** deduct measurable slowness, jank, stalls or excessive resource use; correctness and control design belong elsewhere. |
| **Code / architecture** | 10 | **Objective:** measure maintainability, modularity, state boundaries, dependency discipline, testability and validation quality.<br>**Criterion:** deduct structural engineering weaknesses; a user-visible bug is not also an architecture penalty without independent source evidence. |
| **Accessibility / responsive behavior** | 5 | **Objective:** measure keyboard/focus access, reduced motion, semantic usability and layout adaptation across target viewports.<br>**Criterion:** deduct concrete accessibility/responsive failures; generic UX friction and unrelated bugs stay in their primary categories. |

**Boundary example:** if the Sun incorrectly follows the user/camera while moving around the orbitarium because follow, camera or scene state is broken, that is **Robustness**, not **Interaction / UX**. UX is penalized only if the interaction itself is confusing even when working correctly.

See the full [`SCORECARD.md`](./benchmarks/solar-system/comparison/SCORECARD.md) and the benchmark [`README`](./benchmarks/solar-system/README.md).

## Archive policy

- model output stays untouched inside `runs/`;
- evaluator material stays outside run snapshots;
- exact prompts are archived separately and verbatim;
- Git commits are used when source Git metadata exists;
- cryptographic source-archive hashes are used when it does not;
- historical runs remain preserved without cluttering the current arena.

---

<div align="center">

### Frontier Models

**Input · output · evidence · comparison — in one place.**

<sub>Independent benchmark archive. Model names identify the systems used for individual runs.</sub>

</div>
