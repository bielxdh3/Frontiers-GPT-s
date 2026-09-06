# Repository architecture

The repository is organized by **benchmark → inputs → runs → evaluation**, not by branches per model.

```text
Frontiers-GPT-s/
├─ README.md
├─ assets/
│  └─ frontiers-gpts-hero.svg
├─ docs/
│  ├─ METHODOLOGY.md
│  └─ REPOSITORY-ARCHITECTURE.md
└─ benchmarks/
   └─ solar-system/
      ├─ README.md
      ├─ RUNS.json
      ├─ prompts/
      │  ├─ README.md
      │  ├─ sun-original.md
      │  └─ frontier-v2.md          # added only from exact source text
      ├─ runs/
      │  ├─ gpt-5.6-sun-max/
      │  │  ├─ original/
      │  │  └─ rebuild/
      │  └─ gpt-6-astra-max/
      │     └─ frontier-v2/
      └─ comparison/
         └─ SCORECARD.md
```

## Why folders instead of model branches?

Branches are development lines. Using them as permanent model categories makes the archive harder to browse, link and compare. Here, every run is visible from `main`, which gives visitors one canonical view of the benchmark corpus.

Branches remain available for normal repository work: staging a migration, reviewing a large evaluator change, or testing infrastructure.

## Run folders are immutable snapshots

A run folder is a vendored copy of the model output at a pinned upstream commit. Evaluator-authored notes do not belong inside that snapshot. This keeps the boundary between **what the model produced** and **what the evaluator concluded** obvious.

## Provenance

`RUNS.json` records the upstream repository, commit, model label, role and prompt reference for every imported run. A human-readable explanation lives in the benchmark README.

## Adding future benchmarks

Add a sibling under `benchmarks/`, for example:

```text
benchmarks/
├─ solar-system/
├─ full-stack-app/
├─ coding-agent/
├─ game-development/
└─ data-analysis/
```

Each benchmark should preserve the same conceptual contract even when its rubric changes: exact input, exact run, explicit evidence, explicit comparison.
