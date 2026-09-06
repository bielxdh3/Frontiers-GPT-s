# Benchmark methodology

Frontiers GPTs is an archive of model-produced projects and the evidence needed to compare them fairly. The repository is designed around one principle: **evaluation should happen after generation, not inside the model's working context**.

## 1. Experimental isolation

Each model receives the intended benchmark prompt without being told about the opponent's output, score, implementation choices, or evaluator commentary. Model repositories and run folders therefore contain project artifacts, not hidden benchmark guidance.

## 2. Immutable run snapshots

Every evaluated run is pinned to an exact source commit. A comparison must cite that commit rather than a floating branch name. If a model is asked to rebuild the same task, the rebuild is a new run even when it comes from the same model family.

## 3. Prompt provenance

The exact prompt text is archived separately under the benchmark's `prompts/` directory. Prompts are copied verbatim. A prompt that cannot be recovered exactly is marked pending rather than reconstructed.

## 4. Evaluation dimensions

### Product quality
- visual hierarchy and first impression
- completeness of the requested experience
- interaction design and discoverability
- responsive behavior and accessibility
- error states, onboarding and polish

### Technical quality
- architecture and maintainability
- correctness of state and simulation logic
- performance characteristics
- dependency discipline
- robustness and graceful degradation
- testability and validation evidence

### Domain fidelity
For the Solar System benchmark this includes orbital behavior, time semantics, scale explanations, astronomical data handling, scientific caveats, object hierarchy, Moon/Earth behavior and the distinction between visualization and precise ephemerides.

### Instruction fidelity
A feature is not rewarded merely because it is impressive. The evaluator checks whether it was actually requested, whether required behavior works, and whether optional additions damage usability or correctness.

## 5. Evidence before score

Scores should be derived from inspectable evidence: source files, screenshots, reproducible test reports, console/runtime checks, responsive captures and direct interaction. Claims without evidence are marked unverified.

## 6. Suggested scoring model

Use a 100-point scale when a numerical result is useful:

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

The weights are intentionally public. If a future benchmark uses different priorities, record a separate rubric instead of silently changing these numbers.

## 7. Tie-breaking

When total scores are close, prefer the run with fewer critical defects, stronger instruction fidelity and more reproducible evidence. Avoid using subjective visual preference as the sole tie-breaker.

## 8. Historical comparisons

An older run may remain valuable even after a stronger rebuild exists. Historical runs document how much improvement came from the prompt, the model, or both. They should not be overwritten.

## 9. Repository hygiene

- keep generated runs separate from evaluator-authored files;
- preserve historical source commit IDs while keeping the archived run self-contained;
- do not edit a model's files merely to make the archive prettier;
- put screenshots and scorecards in evaluation directories, not inside the model snapshot unless they were originally produced by that model;
- record missing information explicitly.

## 10. Interpretation

This repository measures performance on the documented tasks and conditions. It is not a universal ranking of model intelligence. A frontier model may dominate one benchmark and lose another because the tasks stress different capabilities.
