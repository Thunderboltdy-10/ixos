# Product/UX Pragmatist Critique (Cycle 2)

## Top 3 Objections
1. Users still cannot see why the restricted file disappeared from results.
2. Remaining flash miss (`results streamed`) means trust pain persists in a high-salience case.
3. Feature flag is engineering-visible, not user-explainable.

## Falsification Experiments
1. Add “witness strength” and “safety filter applied” badges to top results in debug UI.
2. Run short user-task simulation to measure whether badge improves confidence.
3. Compare click rank distribution with and without guard.

## If You Change One Thing
- Surface a debug explanation payload per result before considering wider rollout.
