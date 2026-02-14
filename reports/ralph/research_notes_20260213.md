# Research Notes - 2026-02-13 (Ralph Loop)

## Scope
- Retrieval quality/performance evaluation standards
- Adaptive retrieval/cascade ideas relevant to Ask Mode and model routing
- CI/workflow reliability guidance for GitHub + Next.js/Tauri pipeline

## Sources consulted
- MTEB benchmark paper: https://arxiv.org/abs/2210.07316
- BEIR benchmark paper: https://arxiv.org/abs/2104.08663
- Self-RAG (adaptive retrieval): https://arxiv.org/abs/2310.11511
- FLARE (active retrieval): https://arxiv.org/abs/2305.06983
- GitHub CLI auth in Actions (`GH_TOKEN`): https://docs.github.com/actions/using-workflows/using-github-cli-in-workflows
- Next.js Turbopack root configuration: https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack#root-directory

## Practical takeaways for Ixos
1. Use dual-track evaluation (quality + latency) every iteration.
- Quality: at least MRR@10 + Recall@10 on synthetic and real slices.
- Latency: TTFR p50/p95 + stage p95 (walk/ripgrep/embed/rank).

2. Keep hard gates for latency and add stricter stage budgets.
- Tier-C harsh gate should remain active in CI/Ralph loops.
- Query-level regression table is essential to catch local hotspots that aggregate metrics hide.

3. Route expensive reasoning adaptively.
- Self-RAG/FLARE support the strategy of retrieving/refining only when uncertainty is high.
- For Ixos this maps to: Flash-first, escalate to Pro/Ask evidence path when confidence or agreement signals are weak.

4. Make CI identity and build roots explicit.
- Use `GH_TOKEN` for `gh` CLI in workflows.
- Configure Next.js Turbopack `root` to remove lockfile ambiguity and stabilize CI logs.

## Proposed stricter objectives (next iteration)
- Tier C (harsh): cold TTFR p50 <= 100ms, cold total p95 <= 4.5s, warm total p95 <= 2.0s.
- Stage p95: ripgrep <= 60ms, embed <= 30ms, rank <= 60ms.
- Quality floor guard: any optimization pass must keep MRR@10 delta >= -0.005 on the canonical suite.

## Caveat
- Current quality comparison in `reports/ralph/comparison_turn_20260213_181435.md` compares different suite scopes (baseline file includes broader runs while latest file is synthetic-only). Use same-suite files for release-quality signoff.
