# CLI reference

The default `search` and `serve` use the measured document engine. Install the pinned code model first. Use `--profile lexical` for model-free retrieval. `--retrieval legacy` explicitly selects the retained progressive pipeline; old Flash/Pro, Ask/deep, CSV and stub flags require it.

## Installation diagnostics

```sh
ixos doctor --json
ixos doctor --profile documents --dir ROOT --json --verbose
ixos --config SETTINGS.toml doctor --model-path MODEL_FOLDER --json
ixos doctor --profile lexical --json
```

Doctor uses the current effective profile and the same model-path precedence as search. Semantic/hybrid profiles perform actual encoded-row inference; lexical mode requires no model. An isolated temporary witness tests current lexical evidence and, when persistent caching is enabled and a model is available, a signed document-cache round trip. The record and probe folder are removed; existing source files are not scanned/modified. Native and application-DB outcomes are distinct. Cache capability concerns the selected filesystem, not every file. Inability to create a probe in a read-only folder is a warning, since source search may still work. FAIL checks produce nonzero exit status with either JSON or human output. Malformed configuration fails before diagnostics. These authored checks do not establish relevance quality, platform release readiness or desktop progressive behavior.

## Search and profiles

```sh
ixos search "meaningful concept" --dir ROOT --json
ixos search "research about a subject" --dir ROOT --profile documents --json
ixos search "specific terms" --dir ROOT --profile lexical --json
ixos search "meaningful concept" --dir ROOT --retrieval semantic --json
```

| Profile | Model | Semantic representation |
|---|---|---|
| code (default) | Attributed Potion code parent, unbounded tokenizer variant | Introduction plus length-dependent 4/8 representatives; all when shorter |
| documents | Attributed Potion general parent, row-int8 storage variant | One full-token centroid |
| lexical | None | Full-source BM25 only |

Common query flags: `--limit` (default 10), `--context` (2 lines), `--max-output-bytes` (6,000 JSON bytes), `--io-workers` (4, max 8), `--show-scores`, `--stats`, `--cache-mode native-cache|ephemeral`, `--min-score` (semantic candidate floor, default 0.25), `--typo-correction [true|false]`, `--model-path`, `--representation intro-uniform|whole-token-centroid`. `--format human|json` and `--json` are supported by the default engine. Context and count are ceilings; the budget can retain fewer views. Scores are not calibrated confidence.

Single identifiers containing an underscore/path separator or mixed case use a case-insensitive literal guard: a returned file must contain that identifier in its path or extracted text. One matching outer pair of ASCII single/double quotes is identifier notation, including when quote characters arrive inside a JSON string. Spaces, tabs, newlines and Unicode whitespace separate multi-term queries. This is not a general quoted-phrase query language; use `grep -F` when exact punctuation or phrase matching matters.

`--stats` prints one JSON diagnostic on stderr: file counts, source bytes, actual native/application/RAM hits, recomputed passages, tokenizer/model identity, phase timings and output work. Full request time includes fresh model loading. I/O worker times are summed work; `ioBatchWallMs` is the batch wall measure. Omit routine diagnostics to save context. Human output renders the same selected evidence; the precise byte ceiling describes serialized JSON.

`--evidence-policy global-line|bounded-rerank` controls where a result preview starts. `global-line` remains the default: the best lexical line anywhere in the file, or the strongest stored passage when no lexical line matches. The experimental `bounded-rerank` combines local lexical evidence with semantic similarity over stored representatives plus up to eight query-selected chunks per returned file. It requires semantic/hybrid retrieval and a result limit of at most ten. It does not change file scores or ordering; changed excerpt sizes can affect which trailing rows fit the byte budget. A correct file can still contain a missed topic or an unhelpful preview.

```sh
ixos search "concept and useful domain words" --dir ROOT --json --evidence-policy bounded-rerank --stats
ixos config --set retrieval.evidence_policy=bounded-rerank
ixos search "another query" --dir ROOT --json --evidence-policy global-line
```

Extra passage vectors are not written to the document cache. Unselected vectors are discarded; an explicit session can retain selected result vectors in its bounded RAM history for feedback. Choosing this evidence policy does not change the persistent ADS/xattr record or its recipe. The current single-round-trip recipe independently invalidates older double-rounded records; the next native search recomputes them once. Diagnostics add an `evidence` object with `candidatePassages`, `extraPassagesEmbedded`, `extraEmbedMs` and `selectionMs`; the last timing includes selection and extra inference. These counters are separate from document-cache embeddings and hits. A native or resident cache hit can still incur query-time evidence inference. Lexical/legacy mode rejects this policy explicitly; override a persisted policy with `global-line` when selecting lexical mode.

## Configurations

```sh
ixos config --path
ixos config --list
ixos config --set retrieval.profile=documents
ixos config --set retrieval.context=1
ixos config --set retrieval.output_bytes=3000
ixos config --set retrieval.mode=auto
```

`retrieval.mode=auto`/`null` clears the explicit override and restores profile selection. Editable keys: `profile`, `mode`, `representation`, `model_path`, `persist`, `limit`, `context`, `output_bytes`, `semantic_floor`, `io_workers`, `typo_correction`, `session`, `evidence_policy`. `representation=auto` and `model_path=auto` clear optional overrides. Explicit configuration values override profile-derived mode/representation; query flags override configuration. Model path precedence is query flag → `IXOS_MODEL_PATH` → configured path → installed profile model. To switch model automatically between profiles, clear an explicit model path.

Use global `--config FILE` for an isolated configuration. Missing files use defaults without creating a file; malformed settings fail visibly and remain untouched. `config --reset` is an explicit recovery. The desktop owns its existing search/output/security preferences and preserves CLI retrieval settings when saving them. Legacy preferences live under `[search]`; they do not silently change current retrieval.

## Exact grep and bounded read

```sh
ixos grep 'PATTERN' --dir ROOT -C 2 --limit 10
ixos grep 'PATTERN' --dir ROOT --limit 5 --max-matches-per-file 1
ixos grep 'literal_symbol' --dir ROOT -F -i
ixos grep --dir ROOT -F -- '--literal-option'
ixos read relative/path.rs --dir ROOT --start 50 --lines 30 --max-output-bytes 6000
ixos read relative/path.txt --dir ROOT --start 1 --lines 1 --characters 1000 --character-offset 0
```

Grep and read always emit JSON; they do not take a `--json` flag. Grep uses embedded grep crates against extracted text, loads no model and honors discovery limits. It is a useful exact companion, not full syntax parity with standalone ripgrep. Read returns actual source hashes and coordinates; character mode supplies UTF-8 byte locators and the next character offset. Returned `evidence_omitted:true` is file-only evidence, never a complete answer span. PDF/Office coordinates address extracted text. Images/OCR and `.doc`/`.ppt` extraction are unsupported; raw RTF has limited fidelity.

Grep defaults to path/line order and can return several matches from the same file. `--max-matches-per-file N` (1–10,000) caps displayed matches per file so a compact result limit can cover more files. Omit it for the existing behavior. It does not rank relevance, group overlapping views or guarantee every matching file appears within the total limit/byte budget. Every eligible source is still scanned; `matchingLines` counts all matches. Optional stats report `maxMatchesPerFile` and `matchesSuppressedByFileCap`, including matches that the global budget could also omit. In `serve`, a grep request can set `"max_matches_per_file":1`; omitted/null means no per-file cap, and the setting lasts only that request.

## Caching

```sh
ixos cache warm --dir ROOT
ixos cache warm --dir ROOT --profile documents
ixos cache stats --dir ROOT --json
ixos cache clear --dir ROOT --force
```

`warm` fills current model/recipe records; lexical mode cannot warm semantic vectors. `stats` validates current source/signature records across recipes without loading a model: it does **not** assert compatibility with the selected model. Search diagnostics establish actual compatible hits. `stats --legacy` inspects the earlier vector namespace. Clear removes Ixos caches under that root, not primary content. Earlier `index`, cache `audit`/`rebuild` and model subcommands belong to the legacy pipeline.

Fresh native warm still reads/hashes complete bounded sources and rebuilds extraction/terms. Resident warm additionally reuses parsed state when raw bytes match. Every edit can cause re-embedding, including equal-length edits. ADS/xattr failure falls back to the application-cache DB; no adjacent sidecars. JIT (`ephemeral` for search or `--jit` for serve) avoids persistent embedding writes.

## Resident JSONL

```sh
ixos serve --dir ROOT --quiet-stats --session combined
```

```json
{"op":"search","id":"q1","query":"cache freshness after edits"}
{"op":"search","id":"q2","query":"how does it detect this","feedback":{"query_id":"q1","accepted":[0],"rejected":[]},"stats":true}
{"op":"grep","id":"g1","pattern":"raw_hash","fixed":true}
{"op":"read","id":"r1","path":"src/retrieval/mod.rs","start":300,"lines":30}
{"op":"reset","id":"new-task"}
```

One bounded result per request is returned on stdout. A ready record appears on stderr; routine search/grep stats are suppressed by `--quiet-stats` and can be requested with `stats:true`. Protocol IDs are ≤256 UTF-8 bytes; query text ≤65,536 bytes; a request ≤1 MiB. Small malformed requests return errors without killing later requests; an oversized stream request is fatal. Ordinary IDs retain the 300-byte envelope reservation. If JSON escaping makes the ID larger, the payload budget shrinks using its actual serialized size. An ID that cannot fit with a minimal response is rejected before search/reset changes session state. A rejected response cannot create search-feedback history. Use unique IDs within active task history. Per-request limits are restored after success or error. Search diagnostics `outputBytes` describes the engine payload; the complete stdout record, including its ID, obeys the advertised budget.

`serve --evidence-policy bounded-rerank` selects its default preview policy. A search can override it with `"evidence_policy":"global-line"` or `"evidence_policy":"bounded-rerank"`; overrides apply only to that request, including after failure. Returned source/score fields retain their existing schema. With bounded reranking, optional acceptance feedback uses the selected passage vector instead of an unrelated stored representative. This is bounded session feedback, not persistent model training.

Session policies are `off` (default), `related`, `feedback`, `combined`, and experimental `context`. Accepted/rejected indices refer to actually displayed earlier results, zero-based. Ordinary grep/read calls do not enter feedback history or update the topic anchor. Paths also work. Only inspected useful results deserve acceptance. Silence is unknown; stale/unseen results cannot contribute. Search history holds at most 16 responses and four feedback turns; resets clear it. It cannot observe external tools or provide an unlimited learned user profile.

Experimental resident inspection feedback uses `"remember":true` on a read or grep request. It requires a semantic model and a `feedback`, `combined` or `context` session; lexical-only, `off` and `related` sessions reject it. The response's `remembered` array lists eligible original result indices. A read view/character slice has index zero. Grep indices retain the displayed order, including gaps when a file-only or oversized view cannot be stored. Prefer indices; a path selects the first remembered displayed view for that file.

```json
{"op":"grep","id":"g1","pattern":"source_hash","fixed":true,"max_matches_per_file":1,"remember":true}
{"op":"search","id":"q2","query":"how does it reject stale cached text","feedback":{"query_id":"g1","accepted":[0]},"stats":true}
```

Accept an index only after inspecting its text and checking that it appears in `remembered`. Marking a response alone does not steer later searches. Complete displayed text and its same-read source hash enter a separate RAM history after the output is flushed. There are at most 16 inspection responses, 16 views per response and 8,192 bytes of text/path/record allowance per response; a skipped view is never silently truncated into feedback. The next search validates the current full-source hash before using it. Only explicitly selected accepted/rejected views are embedded, and repeated feedback reuses those vectors. This changes the query vector using the existing positive/negative feedback weights, without training or a database.

Inspection age is measured in successful searches: feedback remains eligible through four intervening search turns. Reset and detected topic drift clear inspection history. Search/remembered-inspection IDs replace earlier records with the same ID; keep IDs unique across the task. Ordinary reads/greps remain untracked. Remembering reserves an additional 128 payload bytes for its bounded index list; a budget too small for that metadata returns an error before remembering anything. A displayed file-only result, empty match list or view exceeding the RAM allowance has no eligible feedback. The experimental feature is optional pending fresh ordered-task quality evaluation.

Search diagnostics add `inspection` only while inspection history exists or its feedback is examined. It reports `responses`, `storedViews`, `storedTextBytes`, `feedbackViews`, `viewsEmbedded` and `embedMs`. These embedding counts/timings are separate from document-cache and bounded-evidence inference. Grep diagnostics add `rememberedViews` when requested; grep still performs no embedding inference. The resident process already loads its selected model at startup. Retained vector memory also depends on the selected model's dimension; the text allowance is not total process RSS.
