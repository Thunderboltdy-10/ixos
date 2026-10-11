# Gate 7 — evidence-location A/B

Date: 2026-10-11. This gate adds a bounded, source-grounded evidence-location laboratory; it does not modify the production ranking/model/cache recipe or defaults. Gate 6 is `56f96cb`; Windows actual CLI SHA256 remains `21e9b3fd1aee11b6308f3f2de4344ccf2a0081bb264dbb9ec93d40a729318eee`. Original Gate 3 held-out binaries/results/selection remain unchanged.

## Question and controlled implementation

The production rule chooses the strongest lexical line anywhere in a file. The best semantic passage only supplies a fallback when no lexical line matches. Could combining local lexical evidence and the already-stored semantic locators improve the preview and subsequent reads without returning more text?

`eval/anchors.py` implements original global-line control, winning-semantic-passage/local-line selection, stored-passage normalized lexical/semantic fusion, and a bounded query-time candidate reranking experiment. It exposes only source text/query/returned paths to selection. No labels, expected files, hints, patches or feedback guide an anchor. The rerank arm adds up to8 lexical chunks to the existing4/8 representatives, capped at16/file and160/query. Partial long-line chunks cannot inherit terms outside their embedded text. Actual code-model safetensors load through the Rust bridge; unit fixture embeddings are never numerical benchmark results.

`eval/anchor_run.py` verifies the complete successful Gate 6 initial search/model/corpus identities, then replays the same two fixed schedules through actual Ixos read/grep. The control's initial wire response is byte-identical to the original: sixteen SHA256 checks across two schedules in `gate7/control-integrity.json`. Score, input candidate order, context2 and6000-byte/call ceiling remain fixed. Alternatives still undergo output fitting and full displayed-source validation; any lost trailing candidate would affect file metrics honestly. Here every arm retains the original mean nDCG0.430474.

## Development results

Eight unique ContextBench issues/eight repository families/eight languages, already inspected in Gates5/6. Two schedules×four strategies=64 trajectories, **not64 independent tasks**. One execution/style/task/schedule. Known upstream-compatible coordinate/content caveats remain. All32 runs/schedule complete, with exact evidence and unchanged source/model checks.

| Strategy | Three-plus-cue cumulative line recall | Line precision | Mean stdout tokens | Tasks with annotated overlap | Six-read recall | Six-read stdout tokens |
|---|---:|---:|---:|---:|---:|---:|
| Current global lexical line |0.086459|0.108486|3481.125|4/8|0.098848|5059.500|
| Winning semantic passage/local line |0.093938|0.141784|3309.250|4/8|0.106328|4928.625|
| Stored-passage lexical/semantic fusion |0.095309|0.150330|3519.500|5/8|0.107698|5170.375|
| Bounded extra-candidate rerank |0.094572|0.145509|3474.000|4/8|0.106962|5102.500|

Each three-plus-cue arm averages4.5calls. Frozen-reference diagnostics add342.25tokens/trajectory equally; request tokens are recorded separately. Six-read arms use7calls. This table reports newly replayed controls with the same frozen initial response for both schedules; Gate6's separately executed controls remain preserved. Initial preview line recall ranges0.008684(control) to0.010435(stored fusion).

Stored fusion improves cumulative recall by0.008850 (0.885percentage points) with38.375 additional mean stdout tokens under three-plus-cue. Its paired family bootstrap95% interval is [0,0.023810], **including zero**. Winning-local: +0.007480 [0,0.022439]. Extra-candidate rerank: +0.008114 [0,0.024341]. These intervals/small sample do not establish a general win or support statistical significance. Per-task results are in the comparison receipts.

Most improvement is `fmt`: annotated displayed lines5→64 for stored fusion,5→69 for extra rerank. Stored fusion also finds a five-line `jq` preview (no claim of useful task completion). Pytest's target file remains absent. Clap's `validator.rs` preview moves from63–67 to555–559, still outside its annotated400–501 region. CodeServer's `cli.ts` moves346–350→743–747, also missing its annotated ranges. Correct file discovery, sparse representation coverage and query interpretation remain separate problems; this A/B cannot fix them by changing preview locations alone.

The screen embeds an average88 candidate passages/query, including an average30 beyond the stored representatives (maximum136 total in these tasks, all below160). Shared source/lexical preparation, actual bridge work and characters are captured. Mean shared screen preparation is125.17ms/123.31ms for the two schedules with a resident bridge, excluding its startup and a separately prepared lexical index. The union supports all styles at once; **these times are not standalone arm latency or a production speedup**. Stored-fusion/ winning-local would use existing vectors, while extra rerank would require additional query work. No ADS/xattr payload or sidecar format changes.

## Checks, commands and decision

Commands/raw output: `gate7/top3-cue-v1/command.json`, `stdout`, `stderr`, `comparison.json`; corresponding `top6-v1` files. Ignored snapshots/raw traces/real bridge receipts: `models/lab/restoration/contextbench-anchors-{top3-cue,top6}-v1`. Protocol: `docs/evaluation/ANCHORS.md`. Evaluator checks:96tests, one Windows symlink skip (`gate7/eval-tests.stdout` / `.stderr`). Production Rust did not change; Gate6's Windows/Linux native-model/source/cache/package checks remain applicable.

Own-code actual CLI probes in `gate7/own-cli`: an attempted descriptive `cached` label exits2; the supported flags are `native-cache` and `ephemeral`. Broad preview-linking query misses the current engine in its first three results. A follow-up naming actual `Engine`, `view_at`, `idfs` and `document.passages` retrieves `retrieval/mod.rs` first with the relevant source. Both successful calls show112native hits and zero new passage embeddings. These are authored, informed navigation probes; they are not independent gold or controlled latency samples.

**KEEP** all alternatives as development experiments. Stored fusion merits fresh verified-span testing. **Do not promote** a default or require extra query embeddings from these modest inspected results. Preserve exact baseline output, low-context control and negative cases. No new model training, public push, history rewrite, CI dispatch or release.

Next evaluation preparation: [RepoQA's primary task documentation](https://github.com/evalplus/repoqa) describes function retrieval from natural-language descriptions and supplied code. Its official syntax-similarity generated-function score differs from Ixos's line/rank/tool-context metrics; no leaderboard equivalence is planned. Release metadata is pinned at `e3a571033de99d0b9dcaccd25577a75d4b1c70b1` in `gate7/repoqa-source-metadata.json`. Select fresh repository families and freeze splits by metadata before inspecting descriptions/targets, verify exact function/source spans, retain failures, then test candidates and no-answer/drift/resource behavior. Descriptions are upstream generated annotations, not independent human questions; pretraining overlap remains unknown.
