# Current restoration decisions

## 2026-10-10

- KEEP monorepo: separate engine, desktop, sites and experiments remain organized independently.
- KEEP ADS/xattr as native cache. No cache files beside source documents; optional database storage must live under Ixos application-cache locations.
- KEEP explicit JIT and configurable retrieval. Do not decide final defaults/presets before benchmarks.
- FIX production correctness before optimizing: dynamic cache dimensions, real model identity, source freshness, consistent ignores, evidence locations/Unicode and parser/error handling.
- COMPARE length-dependent representative passages, full-text centroid and all-passage reference. Introduction is a candidate anchor; selection must be informative/diverse and tested for rare-fact misses.
- ITERATE bounded intelligent/session retrieval and model-policy interactions; preserve baseline quality and disclose negative results.
- DEFER image embedding to a later optional capability; not a current experiment priority.
- REMOVE active payment/device/account feature restrictions; retain necessary source/cache synchronization.
- PRESERVE historical source and process evidence; contribution/application records are private and Git-excluded.
- COMMIT once per completed gate; no remote publication or history rewriting without the corresponding release work.
- KEEP full-content hash validation as the correctness baseline; measure source I/O before adopting faster invalidation. Hash and parsed text come from the same file snapshot.
- FIX path-bound cache freshness until path augmentation is separated experimentally. Include extraction budgets/preparation behaviour in identity; never reuse silently incompatible vectors.
- REPLACE the shared temporary fallback with a persistent application-cache database. Use one slot per file, matching native metadata; no edit-key accumulation or automatic deletion of shared storage.
- REBUILD discovery each query until a measured watcher-backed manifest is justified; correctness for new files/ignore changes precedes directory-list reuse.
- REMOVE the fast-mode wrapper's hidden 2,048-character truncation. Preserve explicit protected-mode behaviour separately; expose the dependency's remaining 512-token limit as experiment work.
- KEEP output budget validity over byte truncation: reduce displayed results/evidence, never cut serialized JSON midway. Whole-stream progressive budgets need a later contract.
- SHARE cache identities and traversal with cache-management utilities. Report present versus valid entries, warm actual vectors on index, and clear only entries under the requested directory.
- REMOVE account/subscription/lease controls and the desktop instance restriction entirely. Retain installation identity only where needed for existing encrypted local state.
- SERIALIZE first key creation and state-file I/O with short OS locks in application directories. Running multiple instances remains permitted; these locks do not merge independent state snapshots.
- ENFORCE site TypeScript checking and use the verified Webpack build. Repair source errors instead of hiding them behind `ignoreBuildErrors`.
- VERIFY scroll-triggered content before full-page screenshot capture. A passing screenshot-update run alone is insufficient visual evidence.
- FREEZE every ordinary corpus file, including hidden files; refuse preparer merges into old corpus folders. Allow native ADS/xattr, never adjacent embedding sidecars. Exclude downloaded corpus content from Git.
- COUNT file-only no-answer results as false positives. Missing or invalid displayed coordinates cannot masquerade as abstention or receive fabricated span credit.
- FILTER session feedback to actual earlier displayed results; unavailable feedback is disclosed. Silence remains unknown and stateless baselines pay no invented feedback-input cost.
- SEPARATE real CLI request latency, candidate-pipeline latency, persistent retrieval math and embedding-bridge inference time. The observed dense-document bottleneck is discovery/merge/startup, so faster embedding alone cannot justify a fast-search claim.
- KEEP the production 512-token inference identity as a baseline; explicit full-token experiment behaviour has a separate preparation recipe. No arbitrary dimension truncation or naming a third-party model an Ixos invention.

- KEEP for further validation: code parent with intro-uniform bounded passages; compressed general centroid for documents. Actual CLI agrees with quality screen. These remain opt-in until held-out selection and evidence checks finish.
- KEEP bounded topic anchors for short anaphoric follow-ups: v1 drift threshold erased needed context, v2 improves authored follow-ups in both lab and Rust without hurting explicit topic switches. Broad real-task generalization remains unproven; session state is explicit, bounded and resettable.
- KEEP compact regular JSON; reserve routine breakdowns for --show-scores and diagnostics for --stats. Measure stderr tokens as well as stdout tokens. No automatic acceptance from silence or external tool use.
- KEEP storage-only row quantization of general parent for validation. Preserve upstream attribution; this is not distillation or integer inference.
- Add exact source/binary snapshots to future benchmark runs. Early baseline receipts identify binaries/diffs but do not retain every intermediate source state, a reproducibility limitation to state openly.

- PIVOT coverage assumption: max_tokens=None is insufficient when tokenizer.json carries truncation. Record artifact rules explicitly, preserve original numeric baselines as capped-artifact results, and compare separately fingerprinted tokenizer-normalized variants. Do not silently rewrite originals or claim complete semantic coverage before checking tokenization and batch invariance.

- KEEP (Gate 3 discovery): do not exclude all `env/` directories. Require `pyvenv.cfg` for that virtual-environment exclusion; enforce complete frozen inventory in new-engine evaluations.
- KEEP (Gate 3 runtime): compare monotonic elapsed durations for hotness expiry; avoid Instant subtraction that can underflow on recently started Windows hosts.
- KEEP (experimental options): conservative ordinary-word transposition correction and bounded lexical topic context remain opt-in. Their authored/derived development gains are not evidence of universal agent-task success.
- REJECT (evidence default): naive window scoring reduced labeled span recall; retain exact line anchors and explicit bounded read for expanding evidence.

- KEEP (frozen Gate 3): normalized attributed Potion code parent + intro/spaced representatives and compressed attributed general parent + whole-token centroid, normalized hybrid, source-verified compact JSON. These were selected on dev/validation before test; held-out code/docs confirm gains over lexical baselines in the restricted suites.
- KEEP lexical/exact tools: new lexical mode matches the strong code BM25 ranking and is much faster than hybrid for literal work. Standalone native rg remains useful. Do not force slow semantic search for a known identifier.
- LIMIT claims: only two held-out code repositories; incomplete spans; SciFact is clean text; fresh CLI/rg and prepared BM25 timings differ. No autonomous-agent task success, worst-device guarantee, new training or matched Cursor/Augment superiority claim.

- KEEP Gate4 measured code/documents/lexical CLI profiles as defaults after frozen selection; persistent retrieval overrides and query flags remain explicit. Retain default stateless history and optional correction/context until broader independent evidence supports defaults.
- KEEP strict configuration failures and desktop-owned-section updates; never discard CLI preferences or silently overwrite malformed files.
- KEEP free source setup with exact pinned parent/derivative fingerprints and cards; minimal package reproduces models without repository checkout. Storage transforms are not new training or integer inference.
- RETIRE force-pushed partial mirror/private Pro/Blob publication paths; preserve original code under legacy. Prepared CI/draft packaging is not executed native-platform/release proof.
- PRESERVE raw receipts/archive bytes through -text attributes and explicit path/hash maps. Keep failed/negative results; current docs distinguish historical claims and feature parity.
- MEASURE actual working set, not artifact size: current small-code resident peak131/203MiB. Direct pooling from compressed mapped rows is a future measured memory experiment, not assumed benefit.

- KEEP (Gate4 reproduction): export only staged source and use a fresh target plus independent pinned downloads to verify source install. Explicit temporary config/custom model path isolates algorithm/model preferences; record reused OS key/cache/toolchain facilities instead of claiming a clean OS. Separate binary path/hash is expected, actual frozen-fixture output equivalence is required. Clarify that grep/read always emit JSON after an agent smoke command incorrectly assumed a search-only flag.

- KEEP (Gate5 correctness): source folders named build must remain discoverable; repository ignore rules exclude generated build outputs. When a Git boundary exists, require Git semantics to stop unrelated outer .gitignore rules; outside Git, continue respecting ordinary local .gitignore. This fixes discovery, not scoring/model selection.
- KEEP (Gate5 evidence): strict ContextBench audits remain the default and preserve seven selected failures. Explicit upstream-compatible EOF coordinate interpretation permits matched development retrieval while separately exposing annotation/base-source content mismatch. Never silently replace difficult tasks, infer spans from model output, or relabel single-query line metrics as official byte/agent leaderboard scores.

- KEEP existing selected code recipe after ContextBench diagnostic; do not tune from eight inspected task cases or replace ranking metrics with an after-the-fact normalization. Hybrid has higher file recall but slightly worse first-hit rank than BM25; broad annotations and compact previews expose the next trajectory-evidence question. Preserve zero/negative outcomes, intervals crossing zero and actual stdout+stderr cost.
- KEEP (Gate 6 source safety): suppress Windows cache-handle time updates before truncation/deletion; never restore an old primary timestamp after a cache write. Open the existing primary first and hold it during the short cache write, rejecting missing sources. Share this across current and retained ADS facilities. Primary bytes/mtime and concurrent edits are tested; filesystem events/Unix ctime are not hidden.
- KEEP (Gate 6 platform proof): isolate Linux toolchain/app/source directories on ext4, verify real artifacts and exact native/fallback hit counters, and retain source-only failures. Do not count a vanished /tmp build receipt or cross-build as detailed native proof. Native Mac remains a distinct deferred check.
- KEEP (Gate 6 evaluation): follow-ups receive only issue/returned observations; labels score completed trajectories. Count every call and request/stdout/stderr cost, union all exact displayed lines and censor missing first-overlap times. These eight-task deterministic development line metrics are not agent success or official leaderboard scores.
- REJECT as default (Gate 6): widening three-result inspection to six results adds roughly1,579hybrid stdout tokens for only1.24percentage-points coverage, lower precision and no new hybrid task with overlap. Preserve both policies/results; investigate missing-file/query and wrong-anchor problems separately, with fresh held-out families before selection.

- KEEP (Gate7 control): byte-identical original actual search response; fixed candidate order/scores and bounded context. Revalidate any alternative's displayed text, budget and retained file metrics. Never guide an anchor/read/feedback using labels.
- KEEP (Gate7 candidates): winning-local and stored-passage fusion as lab alternatives; neither needs new cached vectors. The latter modestly improves inspected-dev coverage, with uncertainty including zero and unresolved misses. No default promotion from this evidence.
- DEFER (Gate7 rerank): bounded extra query embeddings do not beat stored fusion in this pilot; retain implementation/negative results for fresh-span testing, not mandatory production cost. Avoid solving weak previews by blindly returning more text.
- PIVOT next evaluation toward exact verified function spans/fresh repository families. RepoQA source-derived generated descriptions are a different task from human issues; attribute and score them accordingly, with metadata-frozen splits and no official leaderboard equivalence.

- KEEP (Gate8 integrity): exact supplied-source/function local byte+LFline/catalog consistency, metadata-derived frozen repository assignment, query-independent zero-content exclusions with every target retained. Generated descriptions/source snippets are upstream labels, not independently human-authored tasks; no global offset repair or target-driven filtering.
- KEEP stronger matched lexical controls and complete UTF-8 raw runs. Aggregator decoding repair reuses all successful records; do not selectively rerun/drop non-ASCII cases.
- RECONSIDER (Gate8 rerank): bounded extra-query passages now outperform preview controls on larger function-description development data at small output cost, while6queries/Java regress. Preserve Gate7's weaker issue-pilot results. Advance unchanged candidates to validation; do not extrapolate product/task superiority or promote a default from dev.
- DEFER production cost/default selection until exact-runtime JIT/native/resident measurements and new held-out family freeze. Shared bridge union-preparation time is not a per-arm latency improvement. Reserve no-answer/drift/low-resource and real-agent evaluation.

- KEEP (Gate 9 correctness): deterministic unique-term lexical sums and earliest source ties; incomplete chunk-edge alphanumeric fragments cannot count as exact words. Preserve older random-control runs and disclose their sometimes luckier previews rather than treating this as a quality optimization.
- KEEP (Gate 9 opt-in): bounded query-time evidence uses stored representatives plus at most eight lexical chunks/file, ten files/sixteen candidates, cache-equivalent vector precision and separate inference diagnostics. No persistent record growth or sidecars. Explicit session history can retain selected vectors in bounded RAM.
- KEEP as prospective candidate, not default: actual 300-description dev/validation replay improves line coverage with about 37/51 extra stdout+stderr tokens. It adds resident latency (code ~15 →32ms; documents ~17 →56ms on this PC), regresses some tasks and cannot recover an omitted file. Freeze before reserved test targets, retain exact controls and all earlier negative results.

- KEEP (Gate10 integrity): prospective immutable recipe/model/binary/evaluator/policy freeze before reserved function preparation; bind complete source fingerprints separately and reject recipe/harness drift or partial families/arms.
- KEEP opt-in bounded evidence: reserved260descriptions confirm +5.258percentage points cumulative line recall with~35net stdout+stderr tokens,17improvements/2regressions; identical file ranking. Retain prospectively declared global-line default, previous negative cases and separate real-agent/no-answer/resource layers.
- DO NOT reuse consumed RepoQA targets as a fresh selection set. New inspection-driven retrieval/model tuning requires new held-out material or explicit exploratory reporting. These line/rank scores are not official syntax leaderboard values or Cursor/Augment product scores.

- KEEP (Gate10 checkout integrity): declare evaluator checkout byte endings explicitly; preserve the existing mixed-ending file without source changes so Windows/Linux clones can verify the same prospective harness hash.

- KEEP (Gate11 query correctness): one matching outer ASCII quote pair denotes a single identifier; Unicode whitespace separates terms. Exact punctuation belongs to grep -F. No general phrase grammar or score-confidence claim.
- KEEP (Gate11 installation): independently verify extracted packages/model setup without checkout imports, then record documentation-only refresh separately. CI includes real evidence/query contracts; retain native Mac and clean-OS limits.
- MEASURE NEXT: investigate eager static-table expansion/startup/RSS using real selected artifacts. Any lazy/mapped loader must preserve numerical/output behavior under a declared equivalence contract; this is not new training or an opportunity to tune on consumed retrieval tests.

- KEEP pending final integration checks (Gate12): owned encoded rows for current CLI after exact-bit/metadata contracts and measured model-memory/throughput wins. Retain eager reference for public/legacy compatibility and laboratory A/B. No unsafe mapping or identity change; invalid row/padding IDs fail before indexing.
- KEEP evidence of v1 regression: scalar half conversion lowered memory but slowed code batches38%; safe library SIMD plus scalar alignment/endianness fallback reverses that regression. Attribute inherited pooling to MinishLab MIT, not new model training.
- FOLLOW UP (Gate12 observed correctness): native-cache encoding requantizes already normalized quantized RAM vectors. Fresh JIT/native paths/views agree on this fixed probe but scores differ by ~1e-7 on both old and new loaders. Preserve receipts; require a single shared quantization round-trip and stale-recipe invalidation in the next gate. Do not weaken within-condition loader equality or claim full cache byte equality from selected passing fixtures.
- KEEP (Gate12 final): promote owned encoded rows in current CLI after exact supported-artifact bits across Windows/Linux, source rebuild/package proof, materially lower ready/resident memory and fresh latency. Resident warm remains essentially unchanged; no weak-device guarantee. Reference public/desktop remains eager.
- KEEP pending proof (Gate13): one serialization round-trip for original model output, identical RAM decode and new cache recipe. Canonical byte signed-zero semantics remove duplicate quantization; old records must be recomputed, not silently called compatible.
- KEEP (Gate13 final): exact20/20 JIT/native/resident/default/bounded/feedback outputs pass bothactualmodels onWindows/Linux after single storage round-trip; stale-recipe recomputation explicit. Keep broadsemantic own-query miss as a future evaluation example, not a reason to tune defaults from a single informed trace.
