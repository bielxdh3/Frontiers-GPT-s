# Solar System evaluation criteria

This rubric defines what each weighted category is intended to measure. A defect should be scored in the category it actually violates, not wherever it happens to be noticed during use.

## Category objectives and scoring criteria

| Dimension | Weight | Objective and criterion |
| --- | ---: | --- |
| **Feature completeness** | 20 | **Objective:** measure whether the required prompt capabilities exist and deliver their intended end-to-end behavior.<br>**Criterion:** deduct for missing, fake, shallow or loophole-driven features; ordinary breakage belongs to Robustness unless the feature is effectively absent/unusable. |
| **Interaction / UX** | 15 | **Objective:** measure clarity, discoverability, ergonomics, navigation/control flow and feedback when the product behaves as designed.<br>**Criterion:** deduct for confusing or unnecessarily difficult interaction design, not for implementation/state failures that merely occur while interacting. |
| **Visual execution** | 15 | **Objective:** measure visual hierarchy, readability, coherence, rendering quality and overall polish of the interface and scene.<br>**Criterion:** deduct persistent visual/design defects; do not automatically charge functional failures here unless they independently damage the visual result. |
| **Scientific / simulation fidelity** | 15 | **Objective:** measure correctness and coherence of orbital, time, scale and astronomical behavior, including honest approximation boundaries.<br>**Criterion:** deduct scientifically wrong data/semantics/models; runtime breakage belongs to Robustness unless the underlying scientific logic itself is incorrect. |
| **Robustness** | 10 | **Objective:** measure whether core behaviors remain reliable through normal, repeated and edge-case interaction, state changes, resets and high-speed use.<br>**Criterion:** bugs, desynchronization, broken follow/camera state, exceptions, corrupted state and behaviors that stop working are penalized here. |
| **Performance** | 10 | **Objective:** measure responsiveness, frame pacing, loading behavior and resource efficiency in the intended environments.<br>**Criterion:** deduct measurable slowness, jank, stalls or excessive resource use; confusing controls or functional correctness are scored elsewhere. |
| **Code / architecture** | 10 | **Objective:** measure maintainability, modularity, typing/state boundaries, dependency discipline, testability and validation quality from source evidence.<br>**Criterion:** deduct structural/engineering weaknesses; a user-visible bug is not also an architecture penalty unless the source independently justifies it. |
| **Accessibility / responsive behavior** | 5 | **Objective:** measure keyboard/focus access, reduced-motion support, semantic usability and layout adaptation across target viewport sizes.<br>**Criterion:** deduct concrete accessibility or responsive failures; generic UX friction and unrelated functional bugs remain in their primary categories. |

## Category-boundary rule

**Do not double-penalize the same defect across categories unless it independently violates more than one criterion.** Score the primary defect where its actual failure belongs; secondary deductions require separate evidence of a distinct category failure.

Example: if the Sun incorrectly follows the user/camera while moving around the orbitarium because follow state, camera state or scene state is broken, that is **Robustness**, not Interaction / UX. It should affect UX only if the interaction/control design itself is confusing or poorly communicated even when functioning correctly.

Optional extras may help polish or a tie-break, but they cannot compensate for missing required behavior or push a category beyond its maximum weight.
