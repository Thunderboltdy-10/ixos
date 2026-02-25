# Recommendation: Best Single Direction

Date: 2026-02-23
Selected direction: **Budgeted Hawkes Folder Router + existing lexical-consensus veto**

## Why this one

- It directly targets the measured bottlenecks (`directory walk`, `ripgrep`, `refine tail`) rather than only rerank quality.
- It fits current Ixos architecture with minimal invasive changes (candidate-generation routing + refine gate features).
- It is defensible after novelty audit: not claiming Hawkes-in-search novelty, claiming **budgeted local routing integration under privacy/progressive constraints**.

## Final research question (CS style)

"In a local-first progressive file-search engine, can a temporal point-process behavior prior improve latency-quality tradeoffs by routing filesystem scope and refinement decisions under explicit latency budgets and privacy-mode constraints?"

## Hypothesis (measurable)

H1:
- Relative to current Ixos Auto mode, a budgeted Hawkes folder router will reduce `TTFR p95` and `total p95` by at least 10% while maintaining `MRR@10` within -1% on local evaluation suites.

H2:
- Relative to a simple recency-decay heuristic, Hawkes routing will improve top-k-in-1s hit rate by at least 5% at matched I/O budget.

## Baselines (minimal but strong)

1. Current Ixos behavior (no behavior prior):
   - Existing path/ripgrep/doc merge + current `should_refine` gate.
2. Simple recency-decay heuristic:
   - Folder score = exponential decay over recent opens/clicks only.
   - No self-excitation cross-effects, no marked events.
3. Proposed method:
   - Folder-level marked Hawkes intensity + query-folder affinity + cost term.
   - Existing lexical-consensus veto retained.

## MVP prototype spec (1-week version)

Feature flag:
- `IXOS_BEHAVIOR_ROUTER=hawkes_v1` (default off).

MVP components:
1. Local signal extractor from existing activity ledger:
   - Use `timestamp`, `action_type`, `query_hash`, `file_path` parent folder.
2. Folder intensity table:
   - Keep top-N folders with decayed intensities in local compact file.
3. Budgeted scope ordering:
   - Before ripgrep, sort candidate folders by behavior score.
   - Scan top scopes first; fallback to normal breadth if confidence low.
4. Gate augmentation:
   - Add temporal uncertainty bit to `should_refine` input features.
5. Privacy/deep-search behavior:
   - If deep-search/journalist mode active: no persistent updates; use baseline behavior.

MVP integration files:
- `src/ixos_rank/candidate_generator/mod.rs`
- `src/ixos_rank/progressive.rs`
- `src/activity_ledger/mod.rs`
- `src-tauri/src/commands/search.rs`

## 6-week roadmap (build -> bench -> ablate -> write)

Week 1:
- Implement feature-flagged router skeleton + local stat store + tests.

Week 2:
- Integrate into candidate generation order and budget constraints.
- Add telemetry counters (scopes visited, skipped IO, gate decisions).

Week 3:
- Add refine-gate temporal feature.
- Validate correctness and fallback behavior in deep-search/journalist mode.

Week 4:
- Run full benchmark matrix (baseline vs recency vs Hawkes).
- Capture artifacts in `reports/` and `models/lab/`.

Week 5:
- Ablations:
  - no cost term,
  - no mark differentiation,
  - no gate augmentation,
  - varying budget levels.

Week 6:
- Finalize analysis + write EE and paper draft.
- Produce reproducibility package and final figures.

## Evaluation protocol (exact command set from BENCHMARKING.md)

```bash
cargo build --release
python scripts/ixos_eval.py --suite both --output models/lab/results_<stamp>.json ...
./target/release/ixos-bench --dir dataset --runs 10 --cache-mode native-cache --model <model_id>
./target/release/ixos-profile --dir dataset --model <model_id> --cache-mode native-cache
```

Required reporting:
- Before/after + recency baseline table:
  - TTFR p50/p95
  - Total p50/p95
  - Stage p50/p95
  - Top-k within 1s
  - I/O ops touched
- Artifact paths:
  - `reports/baseline_*`
  - `reports/v2_*` (or experiment-specific equivalent)
  - `models/lab/results_*.json`

## Data/traces plan (local-only, no upload)

Trace generation:
- Use existing local activity ledger + workstreams.
- Synthetic replay for cold-start and heavy-switch workloads from local scripts.
- No query plaintext export required; use hashed query IDs.

Privacy handling:
- Keep all traces on device.
- In deep-search/journalist mode:
  - disable persistence writes for behavior model,
  - clear in-memory buffers after query,
  - revert to non-personalized routing.

## Claim language to stay defensible

Use:
- "to our knowledge, we did not find prior work combining these constraints in one desktop local-search routing system."
- "we evaluate a Hawkes-based prior as one temporal model among baselines."

Avoid:
- "first Hawkes search system"
- "novel Hawkes personalization"

## Paper outline (10 sections)

1. Introduction and problem framing
2. System constraints (local-first, privacy mode, progressive stream)
3. Related work and novelty audit
4. Ixos baseline architecture
5. Budgeted Hawkes router design
6. Integration with refine gate and fallback logic
7. Experimental setup and reproducibility
8. Results and ablations
9. Failure cases, privacy/security implications
10. Conclusion and future work

EE vs paper scope split:
- EE includes:
  - system build,
  - reproducible benchmark suite,
  - baseline comparisons,
  - practical deployment constraints.
- Paper adds:
  - formal model derivation,
  - stronger ablations/statistical tests,
  - explicit novelty positioning and discussion.

## Go/No-go criteria

Go if:
- >=10% p95 latency gain with <=1% MRR loss vs baseline
- beats recency heuristic on top-k-in-1s and IO efficiency
- deep-search/journalist fallback verified

No-go if:
- gains only on warm cache and regresses cold-start
- unstable under context shifts
- privacy-mode behavior cannot be made deterministic and safe

