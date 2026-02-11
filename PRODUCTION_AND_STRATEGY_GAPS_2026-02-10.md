# Ixos Production and Strategy Gaps (2026-02-10)

## Current State
- Core builds and tests pass:
  - `cargo test -q` PASS
  - `npm --prefix ui run build` PASS
  - `npm --prefix ixos-site run build` PASS
  - `python scripts/run_settings_matrix.py` PASS
  - `cargo run --quiet --bin ixos -- doctor --json` PASS
- Security hardening landed in this pass:
  - strict bearer-token handling in control-plane request auth
  - command-level Pro gating for personal ranking actions
  - Pro lock overlay wired to real status conditions

## Gaps to Close Before Production
1. Auth and billing end-to-end adversarial coverage is incomplete.
- Missing dedicated matrix for invalid bearer, stale lease, replay-like webhook sequences, and transfer race conditions.

2. Pro capability mapping is still coarse.
- Multiple features rely on broad capability checks (`ask_mode_plus`/`automation_actions`) instead of feature-specific claims.

3. Landing Strategy section needs explicit low-end regression harness.
- Behavior is improved, but there is no automated pin/scroll drift test for constrained hardware profiles.

4. Recommendation feature is v1 (read-only recommendations).
- No accept/dismiss feedback action yet.
- No confidence recalibration based on explicit user feedback.

5. Evidence discipline across all roadmap checkpoints is uneven.
- Some historical reports conflict (old matrix fail vs new pass).
- Need one authoritative release gate artifact per deployment candidate.

## Product Gaps (Adoption and Retention)
1. Daily loop exists but is still fragile for new users.
- Today/Workstreams require enough activity history; early sessions can feel empty.

2. Pro value messaging is not fully tied to measurable outcomes.
- Need clear "time saved / fewer misses / faster resume" framing in app and landing.

3. Upgrade timing can be improved.
- Prompts are present, but contextual upgrade triggers after repeated pain are limited.

## Recommended Business Model (Given Current Product Shape)
- Recommended default: **Open Core**
  - Open-source: CLI + skills + transparent local processing guarantees.
  - Closed-source: desktop UX shell, entitlement orchestration, Pro product layers.
- Why:
  - maximizes trust and adoption where "local-first" credibility matters
  - preserves monetizable value in integrated desktop experience and Pro workflow features
  - avoids pure subscription skepticism by allowing users to verify core behavior in open CLI

## Monetization Direction (Pragmatic)
1. Keep subscription, but pair it with non-sub fallback options.
- Monthly/annual Pro for ongoing productivity features.
- Optional lower-friction entry option: yearly plan discount or limited one-time "lifetime-lite" tier with fewer Pro modules.

2. Price communication should focus on workflow outcomes, not feature lists.
- "Resume work instantly, reduce re-search, keep local context organized."

3. Trust posture should be explicit.
- Publish what is local vs remote for each flow.
- Keep desktop control-plane requests narrowly scoped and documented.

## Next 30-Day Execution
1. Build and run a formal auth/billing/entitlement abuse matrix and publish a signed-off report.
2. Add feature-granular capability claims and enforce them consistently backend-side.
3. Add explicit feedback loop for reorganization recommendations (accept/dismiss) and tune confidence weights.
4. Add landing Strategy low-end test cases and enforce pass criteria in release checklist.
5. Publish a single "release gate" report per candidate with links to all required artifacts.
