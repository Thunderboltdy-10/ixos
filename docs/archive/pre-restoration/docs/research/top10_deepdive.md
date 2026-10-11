# Top 10 Deep Dives: Behavior-Aware Directions For Ixos

Date: 2026-02-23
Context: grounded to current Ixos pipeline and constraints in `src/ixos_rank/progressive.rs`, `src/ixos_rank/candidate_generator/mod.rs`, and Tauri `search_progressive`.

## Shared benchmark command set (copied from `docs/engineering/BENCHMARKING.md`)

```bash
cargo build --release
python scripts/ixos_eval.py --suite both --output models/lab/results_<stamp>.json ...
./target/release/ixos-bench --dir dataset --runs 10 --cache-mode native-cache --model <model_id>
./target/release/ixos-profile --dir dataset --model <model_id> --cache-mode native-cache
```

Shared metrics for every idea:
- TTFR p50/p95
- Total latency p50/p95
- Stage breakdown (directory walk, ripgrep, embedding, ranking)
- Top-k within N sec (from progressive stream events)
- Optional quality: MRR@10 / nDCG@10 from `scripts/ixos_eval.py`

---

## 1) Budgeted Hawkes Folder Router (recommended candidate)

Safe novelty claim:
- "We apply temporal point-process priors to **filesystem scope routing under explicit latency budgets** in a progressive local search pipeline."

Core idea:
- Learn folder-level intensity from local events (`result_clicked`, `file_opened`, `search_query`) and use it to order folder traversal and cap expensive scans.

Math sketch:
- For folder \(f\), intensity:
  \[
  \lambda_f(t)=\mu_f+\sum_{i:t_i<t}\alpha_{m_i,f}\exp(-\beta_{m_i,f}(t-t_i))
  \]
  where event mark \(m_i\in\{\text{shown,clicked,opened}\}\).
- Budgeted routing score:
  \[
  s_f=\log(1+\lambda_f(t)) + w_q\cdot \text{query\_folder\_affinity}(q,f) - c_f
  \]
  where \(c_f\) approximates scan cost.

Algorithm sketch:
```text
on query q:
  load top folders F from local intensity table
  score each f in F with s_f
  visit folders in descending s_f until IO budget B reached
  run ripgrep/document scan only in selected scope first
  emit lexical batches immediately
  if uncertainty high -> continue fallback over broader scope
```

Integration points:
- Scope ordering before ripgrep in candidate generation:
  - `src/ixos_rank/candidate_generator/mod.rs:340`
  - `src/ixos_rank/candidate_generator/mod.rs:413`
- Auto refine and uncertainty gate:
  - `src/ixos_rank/progressive.rs:872`
  - `src/ixos_rank/progressive.rs:1335`
- Behavior telemetry ingestion:
  - `src/activity_ledger/mod.rs:44`
  - `src-tauri/src/commands/activity.rs:258`

Telemetry + local-first storage:
- Required: `(timestamp, action_type, query_hash, folder_hash, file_hash, workstream_id?)`.
- Storage: local encrypted append-only ledger + compact folder stats table under app config.
- Journalist/deep-search behavior:
  - Disable persistent updates when deep-search/journalist flag is active.
  - Fall back to static priors (no behavior boost), preserving current lexical-first pipeline.

Evaluation plan:
- Run shared benchmark command set above for:
  1) baseline current,
  2) recency heuristic,
  3) Hawkes router.
- Add ablations:
  - No cost term \(c_f\),
  - No query-folder affinity term,
  - Different budget \(B\).

Closest work and differences:
- Xu et al. 2024 Hawkes personalized search (ranking-centric, no filesystem budgeting): https://doi.org/10.1109/TBDATA.2024.3403392
- Stuff I've Seen desktop PIR (domain close, no TPP router): https://www.microsoft.com/en-us/research/publication/stuff-ive-seen-a-system-for-personal-information-retrieval-and-re-use/
- zoxide frecency (heuristic routing, no semantic cascade): https://github.com/ajeetdsouza/zoxide

Risks and mitigations:
- Overfitting to recent bursts -> cap per-folder intensity and add refractory penalty.
- Cold start -> default to existing path/ripgrep behavior.
- Privacy concern -> store hashed query/folder identifiers only; no cloud sync.

Complexity estimate:
- Engineering: Medium (2-3 weeks MVP).
- Math: Medium.
- Writing cost: Moderate (strong ablation section required).

---

## 2) Workstream Semi-Markov Router

Safe novelty claim:
- "Workstream-state transitions can improve scope routing under local-only constraints."

Core idea:
- Use current/previous workstream (already clustered by time gaps) as latent state; route candidate scope by state transition probabilities.

Math sketch:
- Hidden state \(z_t\) = workstream.
- Semi-Markov transition:
  \[
  P(z_t=j|z_{t-1}=i,\Delta t) \propto A_{ij}\exp(-\gamma_{ij}\Delta t)
  \]
- Folder relevance:
  \[
  r(f)=\sum_j P(z_t=j)\cdot P(f|z_t=j)
  \]

Algorithm sketch:
```text
infer current workstream z_t from recent activity
predict next likely workstream distribution
rank folders by P(folder | z_t) mixed with lexical query match
route ripgrep to top scopes first
```

Integration points:
- Workstream stats source:
  - `src/workstreams/mod.rs:225`
  - `src/workstreams/mod.rs:384`
- Search command bridge:
  - `src-tauri/src/commands/search.rs:445`
- Candidate scope routing:
  - `src/ixos_rank/candidate_generator/mod.rs:340`

Telemetry + local-first storage:
- Required: workstream id, folder counts, transitions, query_hash.
- Journalist/deep-search:
  - disable persistence (`src-tauri/src/commands/workstreams.rs:454`)
  - use transient in-memory transition matrix only.

Evaluation plan:
- Run shared benchmark command set.
- Compare with:
  - no-workstream baseline
  - recency-only folder boost.

Closest work and differences:
- Raycast root/file search docs (workspace behavior hints): https://manual.raycast.com/root-search
- SIS paper (desktop PIR context): https://www.microsoft.com/en-us/research/publication/stuff-ive-seen-a-system-for-personal-information-retrieval-and-re-use/
- TGN as adjacent temporal-memory baseline: https://arxiv.org/abs/2006.10637

Risks and mitigations:
- Poor clustering quality hurts routing -> confidence threshold before applying state prior.
- State oscillation -> sticky transitions with minimum dwell time.

Complexity estimate:
- Engineering: Medium.
- Math: Low-medium.
- Writing: Moderate.

---

## 3) Marked TPP For Candidate Multiplier Control

Safe novelty claim:
- "Temporal behavior can drive adaptive candidate breadth in progressive local search."

Core idea:
- Instead of fixed `candidate_multiplier`, adapt multiplier using recent event intensity and query ambiguity.

Math sketch:
- Let \(m_t\in\{\text{easy,hard}\}\) be latent query hardness.
- Candidate multiplier:
  \[
  k_t = k_0 + a\cdot \lambda_{\text{hard}}(t) - b\cdot \lambda_{\text{easy}}(t)
  \]
  clamped to safe bounds.

Algorithm sketch:
```text
estimate hard/easy intensities from prior outcomes
set candidate_multiplier for this query
run lexical phase with adapted limit
```

Integration points:
- Multiplier definition:
  - `src/ixos_rank/progressive.rs:445`
- Candidate generation cap:
  - `src/ixos_rank/candidate_generator/mod.rs:390`

Telemetry + local-first storage:
- Required: query outcome labels (clicked@k, refine-needed, zero-hit).
- Journalist/deep-search: force default `candidate_multiplier`.

Evaluation plan:
- Shared benchmark commands.
- Report added metric: average candidates embedded.

Closest work and differences:
- Instant Search via Query Segmentation: https://www.microsoft.com/en-us/research/publication/instant-search-via-query-segmentation/
- Hawkes personalized search (not multiplier control): https://doi.org/10.1109/TBDATA.2024.3403392
- Ixos bottlenecks report (internal baseline): `reports/PERF_BOTTLENECKS.md`

Risks and mitigations:
- Candidate underflow on hard queries -> lower bound floor + uncertainty override.
- Latency regressions -> p95 guardrail rollback flag.

Complexity estimate:
- Engineering: Low-medium.
- Math: Low.
- Writing: Low.

---

## 4) Conformal Auto-Refine Gate With Behavior Features

Safe novelty claim:
- "Behavior-aware uncertainty calibration can reduce unnecessary Pro refinement."

Core idea:
- Replace hand-set thresholds in `should_refine` with calibrated conformal risk score using existing gate features + behavior signals.

Math sketch:
- Feature vector \(x\): gap, entropy, lexical max, top-k avg, query length, recent success rate.
- Train nonconformity score \(A(x,y)\), derive quantile \(q_\alpha\).
- Refine iff \(\hat{p}(\text{need\_refine}|x) > q_\alpha\).

Algorithm sketch:
```text
compute x from current lexical+semantic stats
compute calibrated risk r
if r > threshold and budget allows: run Pro refine
else skip refine
```

Integration points:
- Existing gate function:
  - `src/ixos_rank/progressive.rs:1335`
- Gate callsite:
  - `src/ixos_rank/progressive.rs:875`

Telemetry + local-first storage:
- Required labels: did refine improve top-k?
- Store only aggregate calibration bins locally.
- Journalist/deep-search: use static conservative thresholds only.

Evaluation plan:
- Shared benchmark commands.
- Extra ablation: old `should_refine` vs calibrated gate.

Closest work and differences:
- Existing Ixos gate (baseline): `src/ixos_rank/progressive.rs:1335`
- Conformal risk ideas from ML systems literature (method-level adjacency).
- Hawkes personalized search for temporal personalization backdrop: https://doi.org/10.1109/TBDATA.2024.3403392

Risks and mitigations:
- Label sparsity -> bootstrap from offline replay.
- Calibration drift -> rolling recalibration windows.

Complexity estimate:
- Engineering: Medium.
- Math: Medium.
- Writing: Moderate.

---

## 5) Temporal Graph Diffusion Candidate Expansion

Safe novelty claim:
- "Temporal co-occurrence graphs can expand semantic candidates with bounded latency overhead."

Core idea:
- Build local temporal graph over files/folders from activity co-occurrence; expand top lexical hits to nearby nodes before semantic rerank.

Math sketch:
- Time-decayed edge weight:
  \[
  w_{ij}(t)=\sum_k \exp(-\delta (t-t_k^{(ij)}))
  \]
- Expansion score for node \(j\):
  \[
  g_j=\sum_{i\in S_0} w_{ij}(t)\cdot s_i
  \]
  where \(S_0\) is lexical seed set.

Algorithm sketch:
```text
take top lexical seeds S0
retrieve neighbors with highest decayed edge mass
merge into candidate pool with capped count
continue semantic rerank
```

Integration points:
- Activity co-occurrence:
  - `src/activity_ledger/co_occurrence.rs:111`
- Candidate merge path:
  - `src/ixos_rank/candidate_generator/mod.rs:364`

Telemetry + local-first storage:
- Local graph only; hashes for query/file IDs.
- Journalist/deep-search: no graph persistence; disable expansion.

Evaluation plan:
- Shared benchmark commands.
- Additional metric: incremental recall gain at fixed latency.

Closest work and differences:
- DyRep dynamic graphs: https://openreview.net/forum?id=HyePrhR5KX
- TGN: https://arxiv.org/abs/2006.10637
- SIS desktop PIR context: https://www.microsoft.com/en-us/research/publication/stuff-ive-seen-a-system-for-personal-information-retrieval-and-re-use/

Risks and mitigations:
- Graph noise from accidental clicks -> require minimum support.
- Memory growth -> capped adjacency and LRU eviction.

Complexity estimate:
- Engineering: Medium-high.
- Math: Medium.
- Writing: Moderate-high.

---

## 6) Survival-Based Early Exit For Semantic + Evidence

Safe novelty claim:
- "Predicting marginal relevance gain over time enables earlier stop decisions in progressive search."

Core idea:
- Model hazard that additional compute will improve top-k; stop semantic/evidence passes when expected gain drops below threshold.

Math sketch:
- Let \(T\) be time-to-meaningful-improvement.
  \[
  h(t|x)=h_0(t)\exp(\theta^\top x)
  \]
- Stop when:
  \[
  \mathbb{E}[\Delta \text{MRR} \mid t,x] < \epsilon
  \]

Algorithm sketch:
```text
during semantic batches, estimate expected gain
if expected gain < epsilon or budget exceeded -> stop
emit final results and skip extra evidence work
```

Integration points:
- Semantic stream and evidence stages:
  - `src/ixos_rank/progressive.rs:624`
  - `src/ixos_rank/progressive.rs:995`

Telemetry + local-first storage:
- Collect per-query stage gains and durations.
- Journalist/deep-search: retain only session-memory estimates.

Evaluation plan:
- Shared benchmark commands.
- Focus metric: total p95 reduction with <=1% MRR loss.

Closest work and differences:
- Instant-search interaction work: https://www.microsoft.com/en-us/research/publication/instant-search-via-query-segmentation/
- Ixos progressive architecture: `docs/flow-map.md`
- Existing stage bottlenecks: `reports/PERF_BOTTLENECKS.md`

Risks and mitigations:
- Premature stop on hard queries -> confidence floor and fallback resume.
- Label lag -> offline replay for threshold tuning.

Complexity estimate:
- Engineering: Medium.
- Math: Medium.
- Writing: Moderate.

---

## 7) Contextual Bandit Search-Mode Router

Safe novelty claim:
- "Online mode selection among Flash/Auto/Pro can optimize quality-latency tradeoff under local constraints."

Core idea:
- Use contextual bandit with reward \(R = \text{quality} - \lambda \cdot \text{latency}\) to choose mode.

Math sketch:
- Context \(x_t\): query length, lexical confidence, workstream entropy, recent click yield.
- Thompson or LinUCB:
  \[
  a_t = \arg\max_a \hat{\mu}_a(x_t) + \beta \sigma_a(x_t)
  \]

Algorithm sketch:
```text
observe context x
choose mode in {flash, auto, pro}
run search, observe reward proxy
update local bandit params
```

Integration points:
- Mode parse/resolve:
  - `src-tauri/src/commands/search.rs:386`
  - `src-tauri/src/commands/search.rs:424`
- Progressive config entry:
  - `src/ixos_rank/progressive.rs:81`

Telemetry + local-first storage:
- Persist compact bandit weights locally.
- Journalist/deep-search: disable learning updates and force deterministic mode.

Evaluation plan:
- Shared benchmark commands.
- Report cumulative regret proxy and latency-normalized quality.

Closest work and differences:
- Product mode switching UX (Raycast/Alfred analog behavior): https://manual.raycast.com/root-search, https://www.alfredapp.com/help/getting-started/what-is-alfred/
- Ixos current static mode logic in Tauri command path.

Risks and mitigations:
- Exploration cost -> conservative epsilon with rollback.
- Reward proxy noise -> smoothed reward with confidence bounds.

Complexity estimate:
- Engineering: Medium-high.
- Math: Medium.
- Writing: Moderate.

---

## 8) Debiased Local LTR For Personal Signals

Safe novelty claim:
- "Debiasing local click signals can improve personal ranking robustness in local-first systems."

Core idea:
- Keep existing personal features (`open_score`, `recency`, `pinned`, `ignored`) but learn calibrated weights using inverse propensity weighting from local impression logs.

Math sketch:
- Weighted pairwise loss:
  \[
  \mathcal{L}=\sum_{(i,j)}\frac{1}{\pi_i}\log(1+\exp(-(s_i-s_j)))
  \]
  where \(\pi_i\) is position propensity.

Algorithm sketch:
```text
collect shown/clicked pairs locally
estimate propensity by rank bucket
fit lightweight linear scorer
replace fixed personal weights in secure ranker
```

Integration points:
- Current personal score terms:
  - `src/ixos_rank/secure_ranker.rs:480`
  - `src/storage/personal_ranking.rs:31`
  - `src/ixos_rank/personal_ranker.rs:19`

Telemetry + local-first storage:
- Use existing activity events (`ResultShown`, `ResultClicked`, `FileOpened`).
- Journalist/deep-search: skip personal term entirely (current-compatible behavior).

Evaluation plan:
- Shared benchmark commands.
- Extra metric: uplift on click-through at top-5, and misranking reduction for pinned/ignored files.

Closest work and differences:
- Existing Ixos personal-ranker implementation (fixed coefficients).
- PIR behavior literature: SIS and digital traces studies.
- Hawkes personalized search is different target (web ranking vs local privacy system).

Risks and mitigations:
- Position bias instability -> minimum sample thresholds.
- Drift -> periodic decay/reset of learned weights.

Complexity estimate:
- Engineering: Medium.
- Math: Medium.
- Writing: Moderate.

---

## 9) Reuse-Hazard Cache Admission For Embeddings

Safe novelty claim:
- "Temporal reuse hazard can reduce cache waste while preserving TTFR."

Core idea:
- Admit embedding/passage cache entries only when predicted near-future reuse probability is above threshold.

Math sketch:
- Reuse probability:
  \[
  P(\text{reuse}\le \tau | x)=1-\exp\left(-\int_t^{t+\tau}\lambda_u(s)\,ds\right)
  \]
  where \(\lambda_u\) is per-file/user intensity.

Algorithm sketch:
```text
on candidate embed, compute reuse score p
if p >= theta -> cache
else skip cache write
```

Integration points:
- Cache modes and embed paths:
  - `src-tauri/src/commands/search.rs:394`
  - `src/storage/personal_ranking.rs`
  - semantic cache usage in `src/ixos_rank/semantic_engine.rs`

Telemetry + local-first storage:
- Store only hashed path + last access intervals.
- Journalist/deep-search: force ephemeral cache mode and zero persistence.

Evaluation plan:
- Shared benchmark commands.
- Added metrics: cache hit rate, cache bytes, TTFR warm/cold deltas.

Closest work and differences:
- Windows indexing/cache controls (product baseline): https://support.microsoft.com/en-us/windows/indexing-in-windows-faq-da061c83-af6b-095c-0f7a-4dfecda4d15a
- zoxide/frecency heuristics as practical analog.
- Ixos current cache-mode architecture in docs.

Risks and mitigations:
- Under-caching hot files -> fallback admit if repeated misses detected.
- Complexity in cross-platform storage -> reuse existing cache abstraction only.

Complexity estimate:
- Engineering: Medium.
- Math: Low-medium.
- Writing: Low-moderate.

---

## 10) Hawkes + Lexical-Consensus Veto (Auto Refine v2)

Safe novelty claim:
- "Temporal priors can complement lexical-consensus gates for Auto refine under strict p95 budgets."

Core idea:
- Keep current lexical consensus veto in `should_refine`, but require additional temporal uncertainty from behavior intensity before firing Pro refinement.

Math sketch:
- Current uncertainty count \(U\) from `should_refine`.
- Temporal uncertainty term:
  \[
  H_t = \sigma(\lambda_{\text{context-shift}} - \lambda_{\text{stable}})
  \]
- Refine iff \(U \ge u_0\) and \(H_t \ge h_0\).

Algorithm sketch:
```text
compute existing gate signals
compute temporal shift score from recent activity stream
run Pro refine only if both static and temporal uncertainty are high
```

Integration points:
- Existing consensus skip logic:
  - `src/ixos_rank/progressive.rs:1368`
- Auto refine gate:
  - `src/ixos_rank/progressive.rs:872`
  - `src/ixos_rank/progressive.rs:1335`

Telemetry + local-first storage:
- Need only short rolling summary (no raw content).
- Journalist/deep-search: disable temporal term, keep current static gate.

Evaluation plan:
- Shared benchmark commands.
- Compare to:
  - current gate only,
  - temporal-only gate,
  - combined gate.

Closest work and differences:
- Ixos current heuristic gate (internal baseline).
- Hawkes personalized search paper (adjacent but not routing gate): https://doi.org/10.1109/TBDATA.2024.3403392
- Instant interaction literature for latency constraints.

Risks and mitigations:
- Missed refinements if temporal threshold too strict -> adaptive threshold by query length.
- Sparse telemetry for new users -> back off to current gate.

Complexity estimate:
- Engineering: Low-medium.
- Math: Low-medium.
- Writing: Low.

---

## Relative ranking of top 10 (pragmatic order)

1. Budgeted Hawkes Folder Router
2. Hawkes + Lexical-Consensus Veto
3. Conformal Auto-Refine Gate
4. Workstream Semi-Markov Router
5. Marked TPP Candidate Multiplier Control
6. Reuse-Hazard Cache Admission
7. Debiased Local LTR
8. Survival Early Exit
9. Temporal Graph Diffusion
10. Contextual Bandit Mode Router

Rationale:
- Top 1-5 have strongest fit to current Ixos bottlenecks (directory walk, ripgrep, refine p95) with minimal platform disruption.

