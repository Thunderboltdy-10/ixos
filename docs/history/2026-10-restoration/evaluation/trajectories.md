# Search, read and grep development pilot

A file-ranking result does not establish how much useful task evidence an agent receives. This pilot follows the same bounded tool schedule from each initial retrieval method, then measures the evidence actually displayed across the complete sequence. It is a reproducible **deterministic retrieval diagnostic**, not a run of an autonomous coding agent or the official ContextBench trajectory leaderboard.

## Frozen schedule and information boundary

`eval/trajectory.py` defines `inspect-top3-inline-cue-top2-v1`:

1. Search the verbatim issue, at most10 results, context2 and6,000 serialized bytes.
2. Read up to three distinct returned files, centered on the shown line anchor. Request61 lines per read, with the same byte ceiling. A file-only result starts at line1; the runtime can return fewer lines to fit.
3. If the issue contains a qualifying inline-backtick identifier or option, grep the first such cue literally and case-sensitively. Fenced reproductions do not supply the cue. Request at most10 matches/context2/6,000bytes.
4. Read up to two distinct grep-returned files/anchors, using the same window. Skip a range already fully covered by an actual earlier read; a truncated request does not imply its whole requested range was shown.

Maximum seven calls /42,000 stdout bytes. A missing cue or empty results consumes fewer calls. These are pilot parameters, not new production defaults. No feedback is submitted: visiting a result does not prove it was useful. The policy receives only `Task(id, issue)` and returned JSON. It cannot access the source catalog, gold, answerability, solution patch, hints or scores. Gold annotations score the sequence after follow-ups finish; they cannot choose an anchor, trigger another call, provide acceptance or stop early.

The development A/B also defines `--policy top6` (`inspect-top6-no-cue-v1`): read up to six distinct initial ranked results and disable the cue/grep stage, under the same seven-call/per-response ceilings. This changes the navigation schedule as one explicit experimental factor, not the model/search recipe. It was proposed after inspecting the first pilot's missed evidence, so the comparison remains exploratory development evidence. No production default is selected from it.

## Matched controls

Run actual hybrid JIT CLI, actual model-free lexical CLI, prepared in-memory BM25 and ranked fresh rg for the initial search. All four arms use the **same fresh model-free Ixos read and grep** afterwards. This isolates the initial retrieval method under one follow-up policy; it does not establish that Ixos beats an expert agent selecting arbitrary rg commands, or compare complete products. First-search timing conditions remain different: BM25 preparation is separately recorded, and rg uses source windows from the loaded frozen corpus.

The existing eight ContextBench development tasks/corpora/coordinate policy remain fixed. No new model, passage, session or fusion selection occurs. The runtime's full discovery and exact displayed evidence guards apply. The pilot refuses partial preparation, existing output paths, non-development/sequence datasets, source/model edits and invalid claimed views. Failures and raw commands/stdout/stderr are retained. Raw issue/source traces stay in ignored experiment folders; public aggregate receipts contain IDs and numbers.

```sh
python -m eval.trajectory_run --preparation PREPARATION.json --binary target/release/ixos --model-path CODE_MODEL --backend hybrid --output NEW_RAW_FOLDER --receipt NEW_SUMMARY.json
```

Repeat with `lexical`, `bm25` and `rg`, using fresh outputs; use `ixos.exe` on Windows. Requirements are in `eval/requirements.txt`. Run numerical trials sequentially after compilation/profiling work finishes.

## Metrics and honest limits

Validate every shown view against pinned physical source lines. Union overlapping ranges across **all** calls; never truncate cumulative credit to the first ten views or count repeat reads as new evidence. Report annotated-line recall/precision, unique shown lines, duplicate shown lines, calls, source bytes and stdout/diagnostic stderr/request tokens. Requests use canonical tool JSON as a common token-cost proxy; vendor-specific wrappers, system prompts and reasoning tokens are excluded.

Record the first call with any annotated overlap and the sum of tool execution time up to that point. A sequence with no overlap has a missing/censored time, not a fast success. Annotation overlap is weaker than useful evidence or an answer. Whole-file gold and base-content mismatches inherit the earlier limitations; these remain line metrics, not official byte/symbol/edit metrics. Tool time excludes source preparation, controller validation/logging and LLM reasoning. It does not represent end-to-end autonomous-agent latency.

Next evaluation layers should use fresh repository families, verified function/symbol-level spans, blinded real agent tool selection, cumulative context budgets, no-answer cases, topic drift and edits. Separately compare resident/native-warm/JIT operation and bounded optional feedback. The pilot establishes a testable starting point for those improvements without gold-assisted navigation or a claim that a fixed heuristic solves coding tasks.
