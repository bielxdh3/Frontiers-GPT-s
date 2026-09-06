# Prompt archive

Prompts are treated as immutable benchmark inputs. A run is only considered fully auditable when the exact prompt text used for that run is stored here verbatim.

| Prompt | Used by | Status |
| --- | --- | --- |
| [`sun-original.md`](./sun-original.md) | GPT-5.6 Sun Max — original run | Archived verbatim |
| `frontier-v2.md` | GPT-5.6 Sun Max — rebuild; GPT-6 Astra Max | **Pending exact source text** |

## Integrity rule

`frontier-v2.md` must contain the exact prompt supplied to both frontier runs. It must not be reconstructed from memory, summarized, improved after the fact, or inferred from the produced application.

The unified repository intentionally leaves that file absent until the exact text is available. This is preferable to silently storing an approximate benchmark input.

## Why prompts live outside run folders

The run folders contain the model-produced artifacts. Prompt inputs live here so that:

- the same input can be linked to multiple runs without duplication drift;
- comparisons can distinguish **prompt quality** from **model output quality**;
- a later reviewer can reproduce the experiment without inspecting unrelated source files;
- prompt revisions are explicit benchmark versions rather than hidden edits inside model code.
