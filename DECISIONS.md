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
