# ContextBench development protocol

This adds independent human-annotated coding-task context to the earlier restricted Semble file-ranking results. It is a **development retrieval diagnostic**, not a full coding-agent run or ContextBench leaderboard submission. All eight selected tasks remain in the final comparison. No model, fusion, passage or session setting was selected from these results.

## Frozen inputs and query construction

`eval/contextbench-dev-v1.json` selects eight repositories/eight languages from the 450-row verified training partition at Hugging Face revision `c2855792b006af41c67202d33883fb9d46362853`. Within each explicitly chosen repository, the lowest SHA256 of the declared seed plus task ID was chosen using metadata only, before reading issue text or gold. The adapter verifies the Parquet size/SHA256 and selected metadata. No held-out partition has been downloaded or scored here.

The query is the **verbatim problem statement**. It receives no solution patch, test patch, hints, passing/failing test list or annotation content. The source corpus is prepared independently from each exact base commit, before relevance processing. Regular UTF-8 code/text files follow an explicit extension/dependency policy; source hashes, input byte limits and every excluded category are recorded. Root license/notice files are preserved. Downloads and original sources/labels stay ignored; adapter/process/plan/results are versioned.

A new empty Git boundary on the evaluation **container**, outside every source corpus, isolates the host project's ignore rules. Runtime Ixos never creates Git metadata in user folders. Production discovered/searchable counts must equal the complete frozen inventory. This guard rejected the early incomplete runs; they are preserved and excluded from all comparisons.

## Gold coordinate interpretation

The first strict coordinate/content audit failed seven of eight tasks. Several annotations extend beyond the pinned base file's physical lines; some captured content differs from that revision. The strict adapter requires valid base coordinates and exact content after declared line-number/whitespace presentation handling. It remains the default.

For the separate compatibility run, `--coordinate-policy upstream-compatible` follows [the pinned upstream file reader](https://github.com/EuniAI/ContextBench/blob/1436c28a8eb95496da4ea69ad458b9f8a8eb7d61/contextbench/core/fileio.py): start is at least one; end is at least start; an end past EOF covers the remaining base file. An out-of-file span retains file relevance without inventing source lines. Captured-content mismatches remain counted separately. The adapter never moves a span to find a convenient text match or alters source bytes.

Upstream ContextBench uses byte/symbol/edit/trajectory metrics. This adapter uses the existing Ixos **line-span and ranked-file** metrics. These values must not be compared directly with its published agent leaderboard. Human context relevance is inherited; inconsistent captured content has not been independently re-annotated. One issue per language is also insufficient for language-specific accuracy claims.

## Reproduction

Install `eval/requirements.txt` and optional `eval/contextbench-requirements.txt` (`pyarrow==21.0.0`). Download the exact file named in the plan from its pinned Hugging Face revision; its SHA256 is `cd1bc4ddefa69271d4f073f31d54bf33a1c5671800211d9db7e6a3c24435a75d`, size15,081,815bytes. Git is required for the evaluation-container boundary.

```sh
python -m eval.contextbench --plan eval/contextbench-dev-v1.json --parquet PARQUET --destination NEW_CORPUS_CONTAINER --receipt PREPARATION.json
python -m eval.contextbench --plan eval/contextbench-dev-v1.json --parquet PARQUET --destination ANOTHER_NEW_CONTAINER --coordinate-policy upstream-compatible --receipt COMPATIBLE.json
python -m eval.contextbench_run --preparation COMPATIBLE.json --binary target/release/ixos --model-path CODE_MODEL --output-root NEW_RUN_FOLDER --receipts NEW_REPORT_FOLDER
```

On Windows use `target/release/ixos.exe`. The runner executes the existing code hybrid recipe, prepared BM25 and ranked bounded-context rg sequentially, one repetition per task, count10/context2/6,000bytes, with actual CPU safetensors and JIT for Ixos. Model/binary/source/config/corpus identities and exact wire/token costs are captured. It refuses incomplete preparation, duplicate tasks, missing runs or invalid displayed evidence. Previous outputs are never overwritten. Repeated fresh-Ixos and prepared-baseline timing conditions differ and are disclosed.

## What the first run means

See `reports/restoration/GATE5.md`. File recall improves in the small diagnostic, while first-hit rank is slightly below BM25 and both paired ranking intervals include zero. Preview span recall is below1%; whole-file annotations make the denominator large, but missed targets and wrong previews also occur. Search provides one small view per file. An ideal five-line view cannot return an entire annotated function or file. A recorded upper-bound diagnostic explains this ceiling without replacing the actual metric.

The next evaluation should measure a full search/read/grep trajectory: source-span coverage, useful evidence, cumulative response/request tokens, tool calls, time to first useful span, task drift, edits and feedback. Query construction and follow-up policy must use only the issue and returned source, never gold. Add new independently held-out repository families before further selection. Preserve stateless/strong lexical controls and no-answer cases. These diagnostics do not justify a claim that Ixos replaces every retrieval tool or solves coding tasks autonomously.

References: [ContextBench project](https://github.com/EuniAI/ContextBench), [pinned dataset](https://huggingface.co/datasets/Contextbench/ContextBench/tree/c2855792b006af41c67202d33883fb9d46362853), [upstream metric definitions](https://github.com/EuniAI/ContextBench/blob/1436c28a8eb95496da4ea69ad458b9f8a8eb7d61/docs/source/metrics.rst).
