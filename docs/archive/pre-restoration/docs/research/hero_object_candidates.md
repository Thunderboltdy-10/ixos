# Hero Object Candidates for Ixos
Date: 2026-02-25

## Step 0 - Ixos foundations and bottlenecks (required docs)

Required docs read:
- `reports/PERF_BOTTLENECKS.md`
- `docs/flow-map.md`
- `docs/PROJECT_GUIDE.md`
- `docs/engineering/BENCHMARKING.md`
- `docs/Ixos_Master_Roadmap.md`

### 0.1 Stage breakdown, TTFR, and p95 bottlenecks

From `reports/PERF_BOTTLENECKS.md`:

Current measured summary (JIT):
- Flash v2: TTFR p50/p95 = 46/68 ms; Total p50/p95 = 132/315 ms.
- Potion: TTFR p50/p95 = 51/61 ms; Total p50/p95 = 70/195 ms.

Flash v2 stage p50/p95:
- Directory walk: 68.0 / 68.0 ms
- Path scoring: 0.0 / 0.75 ms
- Ripgrep scan: 43.5 / 54.5 ms
- Candidate selection: 1.5 / 7.5 ms
- Embedding: 12.5 / 81.25 ms
- Ranking: 0.5 / 70.0 ms

Potion stage p50/p95:
- Directory walk: 67.0 / 67.0 ms
- Path scoring: 0.0 / 0.75 ms
- Ripgrep scan: 47.5 / 53.75 ms
- Candidate selection: 1.5 / 7.25 ms
- Embedding: 5.0 / 35.5 ms
- Ranking: 0.0 / 38.0 ms

Interpretation:
- Dominant costs remain directory walk and ripgrep scan.
- Tail latency spikes remain in embedding and ranking for Flash.
- A large win requires removing expensive work (files touched, candidates escalated), not just changing order.

### 0.2 "No-little DB" expectations (quotes)

From `docs/Ixos_Master_Roadmap.md`:
- "no giant DB" by default.
- "No global DB; just a tiny per-root token."
- "Lexical signatures (micro-index, not a DB)"

Additional architecture expectations in the same roadmap:
- Cache path is ADS -> xattr -> LMDB fallback -> Null (JIT).
- Daemon in-memory state is valid and preferred for warm desktop behavior.
- Optional indexing can exist only as bounded, gated, and opt-in.

From `docs/PROJECT_GUIDE.md`:
- Cache backends are ADS on Windows and xattr on Unix via `get_cache_for_path`.
- Progressive streaming exists in core and desktop.
- Background indexer exists but is partially implemented.

### 0.3 Pipeline stages and knobs available now

From `docs/flow-map.md` and `docs/PROJECT_GUIDE.md`:
- Pipeline: Query -> Candidate generation -> Semantic rerank -> Evidence extraction -> Results
- Progressive streaming path exists.

Current knobs and switches:
- `--dir`
- `--limit`
- `--format`
- `--progressive`
- `--show-scores`
- `--cache-mode` (`ephemeral` / `native-cache`; legacy aliases accepted)
- `--model`
- `--secure-timing`
- `index --watch --clear`
- `daemon` (partially implemented in background mode)

Measurement policy from `docs/engineering/BENCHMARKING.md`:
- Use real artifacts, baseline before optimization, reproducible artifacts.
- Required commands include `cargo build --release`, `scripts/ixos_eval.py`, `ixos-bench`, `ixos-profile`.

Constraint for this research iteration:
- Journalist/privacy modes are intentionally excluded, per user instruction.

---

## Step 1 - Exactly 3 hero-object approaches

## Candidate A - Probe-Miss Risk Certificate Planner (PMRCP)

### Core object (formal definition)

Inputs:
- Query `q`
- Stage set `S = {path, lexical, semantic, evidence}`
- Action budget vector `b = (b_1, ..., b_|S|)`
- Probe family `P(q) = {p_1, ..., p_m}` (cheap lexical/path probes)
- Risk target `alpha` and recall target `tau`

Outputs:
- Plan `pi(q)` deciding stage effort under budget
- Certificate `C(q) = (L_recall, alpha, tau, cost)` where `L_recall` is a lower confidence bound

Optimization:
- Minimize expected latency `E[T(pi)]`
- Subject to `Pr(Recall@K < tau) <= alpha`

### Math intuition

- Use probe outcomes as sequential evidence of miss-risk.
- Maintain an anytime-valid lower bound `L_t` on recall under current explored scope.
- Escalate expensive stages only when `L_t < tau`.
- Stop/de-escalate when certificate is strong enough.

### Mechanism for BIG speedup

- Removes expensive downstream work on low-risk queries.
- Converts fixed heavy processing into selective processing.
- Directly reduces file touches, scans, embedding calls, and rerank operations.

---

## Candidate B - Anytime Top-k Stability Certificate (ATSC)

### Core object (formal definition)

Inputs:
- Progressive candidate stream
- For document `d` at step `t`: score interval `[l_d(t), u_d(t)]`
- Cutoff `k`, confidence `1-delta`

Output:
- Stop flag `S_t` meaning top-k is stable with confidence `1-delta`

Stopping rule:
- Let `theta_k(t)` be kth largest lower bound among current top-k.
- Let `U_rest(t)` be max upper bound over non-top-k / unseen items.
- Stop when `theta_k(t) - U_rest(t) > beta_t(delta)`.

### Math intuition

- `beta_t(delta)` from concentration or anytime confidence sequences.
- Once the gap exceeds uncertainty margin, rank inversion probability is bounded.

### Mechanism for BIG speedup

- Terminates long-tail candidate expansion and rerank early.
- Avoids unnecessary late-stage compute once rank outcome is statistically stable.

---

## Candidate C - Certified Mandatory-Anchor Signature (CMAS)

### Core object (formal definition)

Per-file hero object:
- `S_f = (E_f, B_f, h_f)`
- `E_f`: exact compact set for rare mandatory anchors
- `B_f`: probabilistic sketch for broader token presence
- `h_f`: optional tiny similarity hash

Query decision:
- `g(q, S_f) -> {reject, uncertain, pass}`

Guarantees:
- Zero false negatives for mandatory rare anchors represented in `E_f`.
- Bounded false-positive rate for sketch checks in `B_f`.
- "Uncertain" path prevents unsafe hard rejection.

### Math intuition

- Mandatory rare anchors are checked exactly from `E_f`.
- Non-rare anchors use bounded-error membership via `B_f`.
- Expected scan reduction follows from reject/pass/uncertain distribution.

### Mechanism for BIG speedup

- Eliminates most file opens and ripgrep scans before expensive parsing/semantic stages.
- Fits no-global-DB rule: tiny per-file token in xattr/ADS/flat metadata, optional daemon memory cache.

---

## Candidate summary

Ranking by research fit (speed + rigor + generality + defensible novelty potential):
1. Candidate A (PMRCP)
2. Candidate C (CMAS)
3. Candidate B (ATSC)
