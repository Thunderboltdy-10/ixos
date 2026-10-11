---
name: ixos-retrieval
description: Retrieve local code or document evidence with the Ixos CPU CLI. Use concept search to locate files, exact grep for identifiers or regex, and bounded read to inspect source. Applies when Ixos is installed; it does not authorize edits or publication.
---

# Ixos retrieval

Use the installed `ixos` executable (or the built executable in a checkout). Run `ixos search --help` once if the installed version is uncertain. This skill describes the restored engine with code/documents/lexical profiles, not the archived Flash/Pro skill.

## Choose the smallest useful operation

| Need | Operation |
|---|---|
| Concept, unfamiliar naming, cross-file discovery | `ixos search "query" --dir ROOT --json` |
| Exact symbol, path fragment, regular expression | `ixos grep 'PATTERN' --dir ROOT` (`-F` for literal) |
| Inspect known source | `ixos read PATH --dir ROOT --start LINE --lines COUNT` |
| Model-free ranked lexical retrieval | `ixos search "terms" --profile lexical --dir ROOT --json` |
| General dense documents | Add `--profile documents` to search |
| Many related requests | Resident JSONL `serve`; choose history policy explicitly |

Start with the configured code profile and compact output. Query flags override editable retrieval settings. Change `--limit`, `--context` and `--max-output-bytes` for the current question instead of returning whole files by default. For a persistent preference, use `ixos config --set retrieval.context=1` (and `retrieval.limit`, `retrieval.output_bytes`, `retrieval.io_workers`, `retrieval.profile`, `retrieval.model_path`, `retrieval.persist`, `retrieval.typo_correction`, `retrieval.session`). `ixos config --list` shows the actual file settings. `IXOS_MODEL_PATH` can override the configured model path.

Default profiles use 10 result slots, two context lines, a 6,000-byte JSON budget and native caching. The byte budget can retain fewer than ten views. Code stores bounded representatives; documents pool full token input. Lexical mode needs no model. If a semantic model is absent, use the explicit lexical profile or install the pinned model from the source checkout with `python scripts/setup_models.py --profile code` / `documents`. Do not silently substitute a stub or claim lexical output is semantic.

## Retrieve, verify, expand

1. Search with a concrete concept and useful domain terms. Preserve exact identifiers when known; do not gratuitously rewrite them.
2. Inspect the returned path and view. Scores are rankings, not confidence probabilities. A plausible file with the wrong view needs inspection, not acceptance as an answer.
3. Read a tight range around the returned source lines or grep the symbol. Use multiple bounded reads for a long function rather than consuming a whole source file.
4. If the result is unhelpful, refine the query, switch to exact/lexical search or broaden the result count. Search silence or a user's lack of feedback is not negative training data.

Example:

```sh
ixos search "how cached vectors are invalidated after equal-length edits" --dir . --json --limit 5
ixos grep 'raw_hash|source_hash' --dir src/retrieval -C 2 --limit 5
ixos grep --dir ROOT -F -- '--literal-option'
ixos read src/retrieval/mod.rs --dir . --start 300 --lines 35 --max-output-bytes 6000
```

Grep and read always return JSON and do not accept `--json`. Use returned coordinates rather than assuming that the example's line number remains current. JSON `view.text` is the actual displayed source. `evidence_omitted:true` is an intentional file-only result; do not invent its source span. An oversized line can be read using `--characters 1000 --character-offset 0`; the response supplies exact UTF-8 byte locators and the next character offset.

When repeated matches from one file fill a small grep result limit, use `--max-matches-per-file 1` to spread displayed rows across files, or `"max_matches_per_file":1` on a resident grep request. Omit/null preserves all within-file matches up to the total limit. A cap can hide the useful later match in a file; inspect that source or omit the cap for within-file work. Exact matching and total matching-line stats stay unchanged, and the option adds no relevance ranking.

A single identifier with an underscore/path separator or mixed case requires a literal path/text occurrence. A matching outer ASCII quote pair is identifier notation even inside JSON (`"query":"\"raw_hash\""`); tabs/newlines/Unicode whitespace separate multiple terms. General phrase syntax is unsupported. Use `grep -F` for exact phrases or punctuation, including quote characters themselves.

For concept searches where returned files are plausible but their excerpts are misplaced, try `--evidence-policy bounded-rerank`. This experimental policy selects a passage using semantic/local lexical evidence, reusing stored vectors and embedding up to eight extra chunks/file. It requires semantic/hybrid mode and `--limit` at most ten. File ranking is unchanged; the extra inference is still charged on cache hits. Keep `global-line` for the default behavior, model-free lexical retrieval or larger result counts. Persist a preference with `retrieval.evidence_policy`; explicit flags override it. Do not treat this option as proof the shown passage answers the question.

## Cache and diagnostics

Native records live in ADS/xattr; unsupported writes fall back to the application cache DB. No ordinary embedding sidecars are created beside searched sources. Native warm still reads/hashes sources and a fresh process still loads the model. `--cache-mode ephemeral` (JIT) avoids persistent embedding writes. A resident JIT process can reuse memory between requests. Edited sources are revalidated; a cache hit is not permission to assume stale content remains correct.

Use `ixos cache warm --dir ROOT` (or `--profile documents`) to fill the current recipe, `cache stats --dir ROOT --json` to inspect source/signature-valid document records, and `cache clear --dir ROOT --force` to remove Ixos caches only. Stats does not load a model or prove recipe compatibility; search diagnostics report actual compatible hits. Older `index`, model utilities and `cache stats --legacy` address the retained pipeline.

Use `--stats` when diagnosing misses or cost. It emits detailed diagnostics on stderr: discovered/searchable/skipped files, source bytes, actual native/application/RAM hits, recomputed passages, timing phases, output size and model/recipe information. Diagnostics consume context too; omit them from routine standalone calls when not needed. `--show-scores` adds component scores to result rows. Never advertise worker-summed I/O times as wall latency.

## Resident sessions and explicit feedback

`ixos serve --dir ROOT --quiet-stats` accepts one JSON request per line and avoids routine diagnostic context. Search/grep can set `"stats":true` when needed; the ready record still appears once on stderr. Requests return bounded JSON. Use unique request IDs within task history; errors do not provide an accepted result. Start with session `off`; `related`, `feedback`, `combined` and experimental `context` are explicit alternatives. Use `reset` when starting an unrelated task. Read/grep responses do not enter feedback history or update the topic anchor. Only prior search response IDs can supply feedback. Ixos cannot observe external ripgrep operations.

Search requests may set `"evidence_policy":"bounded-rerank"` or `"global-line"` independently of the server default. An override lasts one request. With `stats:true`, its `evidence` diagnostics distinguish extra candidate inference from cached document work; `selectionMs` includes `extraEmbedMs`. Routine diagnostics can be omitted when context is more valuable than debugging detail.

```json
{"op":"search","id":"q1","query":"where is cache freshness checked"}
{"op":"search","id":"q2","query":"what happens when it changes","feedback":{"query_id":"q1","accepted":[0],"rejected":[]}}
{"op":"read","id":"r1","path":"src/retrieval/mod.rs","start":300,"lines":30}
{"op":"reset","id":"new-task"}
```

Index `0` means the first actually displayed result in response `q1`. Submit acceptance only when inspected evidence established that it was useful. Omit feedback when uncertain or when no result was correct; do not spend substantial effort classifying all results. Path strings can be used instead of indices. Stale/unknown responses, unseen indices and edited sources cannot supply valid feedback. History is bounded, and the experimental context policy may drift; reset or fall back to stateless/exact search when necessary.

For installation failures, `ixos doctor --json` checks the effective current model with actual inference and an isolated lexical/cache witness. Add the same `--profile` / `--model-path` / global `--config` as the failing search, and `--dir ROOT` for filesystem capability. Failed checks return nonzero, including JSON mode. It removes its temporary witness and does not scan existing sources; a passing doctor does not prove retrieval quality on the task. Keep this diagnostic out of the routine query loop.

## Coverage limits

The walker respects `.gitignore` and Git boundaries, and prunes hidden, symlink, dependency/cache and recognized virtual-environment sources. Source modules named `build` remain visible; ignore rules exclude generated outputs. A per-file 16 MiB primary-byte limit and 256 MiB source budget apply. Unsupported/oversized sources are skipped or explicitly rejected. PDF/Office locators refer to extracted text, not original pages. Image/OCR retrieval and perfect document-layout fidelity are not implemented.

Eight vectors cannot represent every topic in a long multi-topic file. Literal evidence remains full-source within supported limits; semantic representatives may miss an unsampled topic. Use exact/lexical operations where the needed symbol is known. Ixos does not have to replace faster native ripgrep for every workload; external exact tools remain valid when their broader syntax or performance is useful. Do not claim that a one-call retrieval benchmark establishes autonomous coding success or superiority over Cursor/Augment.

Legacy/progressive flags require `--retrieval legacy`; they use the retained earlier pipeline. Consult its own help for CSV/ripgrep-formatted output, Ask/deep search, compliance and legacy model utilities. Do not mix those flags with the current measured engine or imply that the desktop already uses the new CLI representation.
