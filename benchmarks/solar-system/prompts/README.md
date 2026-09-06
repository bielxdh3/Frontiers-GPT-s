# Prompt archive

Prompts are immutable benchmark inputs. A run is only considered fully auditable when the exact prompt used for that run is stored here verbatim and its provenance is explicit.

| Prompt | Used by | Status |
| --- | --- | --- |
| [`sun-original.md`](./sun-original.md) | GPT-5.6 Sun Max — original run | ✅ Archived verbatim |
| [`frontier-v2.md`](./frontier-v2.md) | GPT-5.6 Sun Max — rebuild; GPT-6 Astra Max | ✅ Archived verbatim + integrity verified |

## Frontier V2 integrity record

The shared Frontier V2 prompt was supplied as `solar-system-master-prompt.md` and archived without summarization, normalization, rewriting, or reconstruction.

| Property | Verified value |
| --- | --- |
| Repository path | `benchmarks/solar-system/prompts/frontier-v2.md` |
| SHA-256 | `7c2833a0486938c38671139807bd4a8c16371c3740175376ad02a6c0c3c06d65` |
| Size | `115,983 bytes` |
| Lines | `1,153` |
| First heading | `SOLAR SYSTEM OBSERVATORY — COMPLETE INTERACTIVE EXPERIENCE` |
| Consumers | Sun Max rebuild + Astra Max challenger |
| Integrity check | GitHub Actions byte-for-byte verification passed |

The import process reconstructed the file from temporary transport chunks, compared SHA-256, byte count, and line count against the uploaded source, and committed the Markdown only after every check passed. The temporary chunks were then removed.

## Benchmark meaning

`frontier-v2.md` is the crucial shared input for the direct model comparison:

```text
                         exact same Frontier V2 prompt
                       ↙                               ↘
          GPT-5.6 Sun Max rebuild              GPT-6 Astra Max
```

The older `sun-original.md` remains separately preserved because it answers a different question: how much the same model's output changed when the specification became dramatically stronger.

## Integrity rule

Prompt text must never be reconstructed from memory, summarized, improved after the fact, or inferred from a produced application. If an exact source cannot be recovered, the benchmark must say so rather than fabricate certainty.

## Why prompts live outside run folders

The run folders contain model-produced artifacts. Prompt inputs live here so that:

- the same input can be linked to multiple runs without duplication drift;
- comparisons can distinguish **prompt quality** from **model output quality**;
- a later reviewer can reproduce the experiment without inspecting unrelated source files;
- prompt revisions are explicit benchmark versions rather than hidden edits inside model code;
- integrity metadata can be checked independently of the projects that consumed the prompt.
