# IR Scientist Critique

- Hit@k alone is insufficient; track top1 correctness and stability.
- Guard against overfitting to handcrafted atlas by preserving paraphrase and ambiguous sets.
- Require agreement check against a stronger reference mode to detect regressions hidden by binary pass/fail.
- Prefer constrained objective over ad-hoc boosts.
