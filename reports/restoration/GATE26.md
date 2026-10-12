# Gate26 — actual retrieval-assisted repairs and retained failures

Ixos finds useful source, but the first executable synthetic actor pilot does **not** establish complete repair success. Two source-only repair proposals fix6 of 12labeled regressions, preserve44 other labeled passing tests, and resolve0 of 2complete tasks. Reference repairs resolve both tasks through the same official environments. All7 mutated nonblank code lines were displayed in subsequent Ixos reads. Missing source visibility alone therefore cannot explain these incomplete repairs; intended defaults and fallback behavior were not fully established.

This is a single current Codex actor's exploratory pilot on two prospectively selected SWE-smith training cases. It is not an independent agent A/B, a human SWE-bench score, a broad failure-rate estimate or evidence of commercial superiority. Individual tests and repeated requests are not independent tasks. Production source, models and defaults remain Gate23.

## Selection, original sources and freeze

[Protocol](gate26/protocol.json) and [metadata-only selection](gate26/selection.json) precede actor access. Canonical family exclusions include prior observed families, prepared RepoQA/public source families and reserved common human SWE-bench families. The first six remaining families by SHA256 order are split into three development and three reserved validation cases; each family's first SHA256 instance is selected without loading problem/patch/test fields.126 canonical families are eligible under this V1 metadata rule.

Official task-branch containers export their complete tracked working source with `git archive`, excluding Git history and tests already removed upstream. Original tracked state, actual branch commits, image IDs/RepoDigests, TAR hashes and container removal are recorded. All actor corpus file bytes, inventory and mtimes are unchanged after search/read/grep and replay; no ordinary cache sidecars appear. Full sources remain ignored.

| Case | Source files / bytes | Actual source commit | Outcome |
|---|---:|---|---|
| S01 line_profiler |96 /367301|`4a5d2a2d69f1d68235d5db350ea949785b3ba18f`|Incomplete repair; target file initially rank1 |
| S02 boltons |110 /884775|`0ec2404c94ce1d862be95392c533f71a2da48a74`|Empty supplied issue; no scored repair |
| S03 drf-nested-routers |39 /80161|`0159ece8e7191560b44569afc959225f18240f60`|Incomplete repair; target file initially rank4 |

S02 exposes a selection-contract gap: the metadata rule never checked prompt availability. The CLI correctly rejects its empty query. A later aggregate-only check finds39,471 nonblank UTF-8 query descriptors of at most65,536 bytes among50,908 test-labeled rows;11,437 are blank/missing. No replacement task or fabricated prompt is introduced after selection. S02 remains in the failures and wire costs, outside the valid repair denominator. Gate25's executable-label availability is qualified by this finding.

The actor uses the actual selected code parent, intro-uniform representatives, bounded-rerank previews, limit 5 / context 2 / 6,000 serialized-output bytes and an explicit combined session. Existing `agent_shell.py` records actual source views and validates citations. Before any reference/test access, [freeze.json](gate26/freeze.json) binds both proposals, all four original/recovery sessions, original source identities and the pregrade S03 formatting amendment. Reserved validation problem/reference fields remain unopened.

## Full-profile executable results

The pinned official SWE-smith runner uses its normal profiles and swebench4.1.0 compatibility environment from Gate25. Its public-mirror/source/image preflight succeeds. Unique V2 run IDs prevent cached report reuse. Base adds only a harmless marker; gold reverses upstream corruption; actor applies the exact frozen source-only proposals in disposable containers. All six patches apply cleanly. Identical evaluation scripts run per case, labeled test sets are checked exactly, and containers are removed. There are no infrastructure errors/timeouts in the successful V2 grading runs.

| Case | Buggy regressions pass / fail | Reference regressions pass / fail | Actor regressions pass / fail | Other labeled tests passing in each arm | Actor resolved |
|---|---:|---:|---:|---:|---|
| S01 |0 /7|7 /0|2 /5|26|false |
| S03 |0 /5|5 /0|4 /1|18|false |

S01 repairs the implicit enable sentinel and inverted decorator branch, but leaves corrupted text-output and strip-zero defaults. Five labeled regressions remain. S03 repairs the full parent lookup chain and request forwarding, but preserves a `return None` missing-attribute fallback whose intended superclass behavior was not established; one labeled regression remains. Generated descriptions are not guaranteed complete specifications. Reference inspection now explains those omissions; no post-reference correction is counted as a fresh actor success.

Initial previews expose0/4S01 and0/3S03mutated nonblank code lines. Subsequent reads expose4/4and3/3. These seven positions are a source-visibility proxy, not seven independent defects or semantic correctness. Source-citation validity and patch application are separately verified. The pilot did not include actor-authored regression execution or an iterative repair/test cycle; it cannot establish how a complete development agent would perform.

## Context cost and session/lexical controls

Across the actor's original sessions, including empty input, invalid grep flags, repeated first search and all ready/error records:11 attempted CLI requests,2 error responses,9 successful calls. Exact cl100k_base wire totals are **1143request /4843stdout /1728diagnostic stderr tokens**. These exclude actor reasoning, surrounding orchestration prompts, proposal text and terminal echo; they are not full billed agent context.

After freeze, fixed observed calls are replayed in ten processes / 40 requests. Eight hybrid processes compare off/search feedback/remembered-inspection silence/inspection feedback; two model-free lexical processes use global-line previews and session off. Explicit grep/read views are identical across all arms. Every hybrid first search has89 S01 or34 S03native hits and zero writes; the S01 follow-up has89 RAM hits. Lexical diagnostics show no model fingerprint or passage embeddings.

| Fixed-call arm | S01 request / stdout / diagnostics tokens | S03 request / stdout / diagnostics tokens |
|---|---:|---:|
| Hybrid off |410 /2955 /898|384 /1278 /376|
| Hybrid search feedback |423 /2948 /885|384 /1278 /382|
| Hybrid inspection silence |422 /2979 /938|388 /1283 /384|
| Hybrid inspection feedback |435 /2979 /930|388 /1283 /384|
| Lexical off |410 /2888 /703|384 /1271 /312|

For S01 every arm ranks the same target first and shows lines 310–314 on the follow-up, missing the affected defaults. Explicit feedback changes some lower rows but adds no target-preview improvement here. Inspection feedback is actually consumed and lazily embeds one accepted view; silence embeds none. The two inspection arms produce the same displayed search paths/spans, although scores/diagnostics can differ. S03 has no follow-up search, so it cannot test feedback effectiveness. Its initial target ranks3under lexical and4under hybrid, and both previews omit the three mutated lines. These are descriptive consumed-case observations; no quality gain/default promotion or timing optimization follows.

The first-fill and resident timings retained in actor receipts are single-request diagnostics, not a new benchmark distribution. Model startup, fresh native fill, native warm and resident warm remain distinct. The earlier Gate10 ranking gains and Gate23 cost study retain their original conditions; these results do not overwrite them.

## Failures, audit and next work

Retained failures include the first source-preparation helper passing raw TAR into a gzip reader; invalid grep request fields followed by an explicit restart; S02 empty input; original S03 overlapping diff hunks corrected before reference/test access without semantic changes; V1 runner input using list JSON where the official parser expects JSONL/mapping; and V1 audit treating already-decoded test lists as JSON strings. Original helpers/tracebacks and original actor wire remain. V2 preparation/grading/audit succeed; none of these failures is erased or counted as a new independent sample.

[Audit](gate26/audit.json) verifies46 exact captured files, frozen submissions/citations/source views/budgets, full labeled grades, source/image bindings, identical inspection views, real cache hits, current model/binary identities and119 unchanged normalized core/manifests/catalog files. Windows/Linux binaries and frozen evaluator retain Gate23 identities. [Capture](gate26/capture.json) and [notices](gate26/ATTRIBUTION.md) bind native logs and licensed source/test excerpts. Full data/weights/images and private records stay excluded.

Original recipes are under [gate26](gate26/): `select_metadata.py`, `materialize_actor_inputs.py`, `export-linux.sh`, `prepare_actor_sources.py`, `freeze.py`, `prepare_grading.py`, `grade-linux.sh`, `replay.py`, `replay_lexical.py`, `capture.py`, `analysis.py`, `audit.py`. Prospective selection/freeze/materialization helpers intentionally refuse overwriting prior results. Reproducing changed experiments requires a new directory/protocol/run IDs; audit checks the original ignored inputs. Current core correctness was not rerun merely for an evidence-only change.

Authored files pass the staged whitespace check. Five exact captured files retain original trailing spaces and are excluded from that check: `licenses/LINE-PROFILER-PYTHON-NOTICE.txt` and both actor/gold `S01/patch.diff` and `S03/patch.diff` files under `linux/`. Their bytes remain hash verified. All six runner `.log` files are explicitly staged within the public receipt whitelist.

**KEEP:** honest executable actor grading, strict source/citation/wire-cost evidence and lexical/session controls. **FIX NEXT:** filter prompt eligibility prospectively before selection; develop a contract-aware retrieve/read/test workflow on consumed development cases, with independent new development labels for comparisons. Separate file discovery, relevant passage exposure, complete repair and all context costs. Preserve both negative proposals; test-backed feedback should improve the workflow without introducing reference leakage or forced ranking. No new model/default selection, commercial superiority claim, Mac proof, public push, history rewrite or release is made.
