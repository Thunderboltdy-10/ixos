# DECISIONS

## 2026-03-03 19:36 UTC - Initialization
- Decision: Use `reports/innovation/` as isolated workspace for innovation artifacts.
- Options: existing root docs vs dedicated folder.
- Why: reversible, explicit, and easy to audit.
- Evidence: user directive requiring workspace files.
- Risks: temporary duplication with root planning docs.
- Follow-ups: keep final outputs consolidated in `reports/innovation/FINAL.md`.

## 2026-03-03 19:45 UTC - Failure Suite Scope
- Decision: Use `results streamed` on `corpus_tiny` as canonical short-loop failure seed.
- Options:
  - Existing golden suite only.
  - Build new synthetic fixture corpus.
  - Reuse corpus_tiny with targeted cases.
- Why: existing corpus reproduces both failure classes quickly.
- Evidence: Flash/Auto miss `corpus_tiny/logs/app.log`; Auto includes `corpus_tiny/restricted/secret.txt`.
- Risks: overfitting to one query family.
- Follow-ups: grow suite to 10+ cases.

## 2026-03-03 19:52 UTC - Isolation Harness
- Decision: Run failure/prototype scripts in isolated temp config/data homes.
- Options:
  - Use ambient user profile.
  - Isolate env + bootstrap consent/index.
- Why: removes personalization and consent-state drift.
- Evidence: stable repeated suite outputs after isolation.
- Risks: bootstrap overhead per run.
- Follow-ups: cache temp env for batched experiments.

## 2026-03-03 19:59 UTC - Prototype Positioning
- Decision: Keep anchor-guard as feasibility signal only (no production merge).
- Options:
  - Conceptual-only report.
  - Minimal reports-only simulation.
- Why: needed an empirical check that trustfulness constraints can shift bad rankings.
- Evidence: prototype improved suite hit@k and MRR.
- Risks: tiny-suite optimism.
- Follow-ups: validate against broader suite before code integration.

## 2026-03-03 20:00 UTC - Candidate Strategy Pivot
- Decision: prioritize certificate/witness architecture principles over speed-only heuristics.
- Options:
  - Continue latency-only candidates.
  - Center novelty on explicit guarantees and truthfulness contracts.
- Why: reproduced failures were trust-calibration failures, not just runtime issues.
- Evidence: observed false negative + false positive in top-5 under Flash/Auto.
- Risks: stronger constraints may reduce semantic recall on paraphrases.
- Follow-ups: evaluate trustfulness-latency-recall Pareto on expanded suite.
