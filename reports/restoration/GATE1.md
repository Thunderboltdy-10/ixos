# Gate 1: cache and retrieval correctness

This gate repairs reproduced correctness failures before model or architecture experiments. It does not establish retrieval-quality superiority or a throughput benchmark.

## Before and after

| Contract | Starting implementation | Corrected implementation and evidence |
|---|---|---|
| Production cache dimensions | The serializer retained 64 values from a 512-dimensional model; unchanged warm-cache results could collapse to zero similarity. | Signed schema 3 retains native dimensions. Production Flash writes 512 float16 values in a 1,125-byte blob. The real CLI probe checks cold/warm score agreement within 0.001. |
| Candidate-only native searches | Persistent storage was initialized only by directory indexing. | Lazy cache initialization also runs on candidate reranking and cache warmup. A fresh process reads the native value without recomputing it. |
| Edits and cache identity | RAM entries were keyed only by path; local model identity hashed its directory name. | RAM and native reads validate source hashes. Weight, tokenizer and configuration contents identify the model. Preparation policy and current extraction budgets participate in cache identity. |
| Discovery | Semantic recursion bypassed ignore rules; three lexical/path walkers inverted the hidden-file setting. A shared directory cache could retain stale files and reuse a different configuration. | Shared ignore-aware traversal prunes dependencies/build trees, avoids following file links, applies `.gitignore` outside Git repositories and refreshes discovery for new files or changed ignores. |
| Unicode and passage coordinates | Display truncation could panic; character indices were presented as byte offsets and overlaps inflated line numbers. | Unicode-safe truncation and actual byte/line coordinates have regressions. Boundary trimming cannot create uncovered gaps. |
| Late lexical evidence | A hit near line 903 could show the introduction. The lexical line locations were discarded. | Locations survive candidate conversion and reranking; bounded streaming reads show the real source window. No-match lexical extraction returns no evidence. |
| Document parsing | A PDF/Office container above the text prefix budget could be embedded as raw bytes. | A stable, bounded binary snapshot is parsed as a document. Unsupported/corrupt containers yield no extractable text. UTF-16 BOM text is decoded; untagged NUL data is rejected as binary. |
| Hidden embedding input limit | Fast and protected embeddings both silently truncated/padded inputs to 2,048 characters. | Fast mode preserves caller text. The optional timing mode retains its explicit character limit and has a different cache identity. The underlying model's token limit remains a separate limitation below. |
| Agent access and repeat searches | Local search could ask for consent; recently edited/revisited files lost relevance, and edited integrity entries could exclude a file once. | Retrieval is noninteractive. Default relevance weights no longer penalize file age or repeated access; ordinary edits refresh the observed version. Optional history/compliance utilities do not gate search. |
| CLI contract | Search ignored configured limit/format/context; some errors exited zero; model failure could silently use a stub; progressive snapshots could exceed the requested result limit. | Configuration resolves before explicit overrides. Errors have a nonzero exit and formatted payload. Stubs require explicit test selection. Every emitted result batch is bounded by the requested limit. |
| Output and diagnostics | No final-output byte budget; history always recorded zero results; embedding counters were estimates. | Optional byte/snippet limits preserve valid output. `--stats` emits diagnostics on stderr: actual source embedding work, cache hits, scans, candidates, result/output counts and elapsed time. |
| Database fallback | A shared temporary cache was deleted on drop; edits accumulated different keys; delete was a no-op and presence always false. | The fallback lives under the application cache, survives exit, uses one slot per file, replaces edits, and supports actual presence/deletion. It never creates files alongside the searched corpus. |
| Cache management | Statistics/audit used incompatible identities and assumed 64 dimensions; clearing could miss ADS streams or clear the global fallback for unrelated directories; index did not warm real vectors. | Utilities share search's model/preparation/source identities. Presence opens the Windows stream, stats distinguish present from valid entries, clearing targets the selected traversal, and index warms real model vectors. The CLI probe checks valid/stale/cleared/indexed states and source preservation. |

## Reproduction and artifacts

```powershell
cargo test -p ixos-protocol --lib
cargo test -p ixos-protocol --lib roundtrip_preserves_real_model_dimensions
cargo test --locked -p ixos-protocol --lib --bin ixos --test settings_matrix
cargo check --offline -p ixos-protocol --bins
cargo build --locked --release -p ixos-protocol --bin ixos
python scripts/verify_cli_contract.py --binary target/release/ixos.exe
```

The second command failed against the original serializer, before its repair. See `gate1-cache-regression-before.*`. The starting core suite passed 487 tests with six ignored; the repaired suite passes 506 with six ignored, plus the existing integration settings matrix (48 combinations using explicit test models). See `gate1-baseline-tests.*` and `gate1-tests.*`.

The additional utility probes exposed the ADS presence bug. The stale-entry fixture edits an existing stream rather than recreating the file: on Windows a truncate-and-create write can remove ADS, which would test disappearance rather than stale validation. One local linker attempt failed to open the settings test executable; the rerun passed (`gate1-link-retry.stderr` preserves the diagnostic).

`gate1-cli-contract.json` captures exact commands, raw structured responses, diagnostics and the release binary SHA256 for real-model probes. `gate1-contract.*`, `gate1-cli-check.*` and `gate1-release-build.*` contain command outputs. Test doubles verify contracts; the CLI probes load the actual production safetensors. All fixture source bytes/names are checked where cache behaviour is tested.

## Deliberate limits before experiments

- Full-content hashes validate freshness even when only a prefix is embedded. This means cached retrieval still reads source bytes; `io_read_bytes` measures the embedding/cache-validation path, not all lexical/parser/evidence I/O. Startup and query timing must be reported separately in the evaluation harness.
- Ordinary semantic extraction still keeps a bounded prefix (normally 64 KiB / 20,000 characters). The current Model2Vec dependency further defaults to 512 tokens. Repairing those limits does not itself supply full-document semantics: gate 3 will compare length-dependent representative passages and full-coverage references.
- Path text currently contributes to the vector. A rename therefore invalidates the vector even if the native metadata travels with the file. Separating content vectors from path priors is an experiment, not an assumed improvement.
- Native metadata contains a single model/representation slot, as does the fallback database. Model switching requires rewarming. Database size remains capped at 50 MiB; eviction/maintenance policy needs measurement.
- Final-only output supports a total byte budget. Progressive output currently bounds each batch, not the whole stream; the CLI rejects combining progressive output and a byte budget. Experiments must include cumulative streaming context cost.
- Format extraction supports PDF, DOCX, spreadsheets and PPTX within input budgets. Legacy `.doc`/`.ppt` are unsupported. RTF still needs a dedicated parser; OCR/image embedding is deferred. Large extracted documents can exceed downstream evidence budgets.
- Source windows in UTF-8 code preserve true physical line locations. Parsed-document locations refer to extracted text; streaming physical-line evidence is not used for binary formats.
- This gate was executed on Windows. Unix/macOS compilation and runtime tests remain required. It does not claim reproduction of the historical Mac signup-stage desktop failure.
- Query rewrite/threshold/fusion policies, corpus-wide semantic coverage, persistent session intelligence and final presets are not selected by these correctness probes. They belong to validated held-out evaluations.
- In self-navigation, a natural-language query about cache freshness missed `semantic_engine.rs` in its first five results. An exact `memory_cache` query ranked it first with declaration evidence. These observations remain quality deficits, not a scored benchmark. Tiny fixture cold/warm wall times do not establish a cache speedup; model/process startup dominates.

Archived Ixplorer/design references and earlier working-memory documents retain their original content. Personal contribution/application records remain outside Git. No publication or Git history rewrite occurred in this gate.
