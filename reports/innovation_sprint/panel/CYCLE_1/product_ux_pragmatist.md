# Product/UX Pragmatist Critique (Cycle 1)

## Top 3 Objections
1. Users cannot see why a file moved up/down after witness rerank.
2. Trust fix is invisible without a confidence/evidence UI surface.
3. Current pass/fail metric does not map directly to “time to confident click.”

## Falsification Experiments
1. A/B a small UI label: `Lexical witness: strong/weak` and measure click-through to top-1.
2. Add “why ranked” payload for top-3 with witness terms and penalties.
3. Measure task success time on 5 representative workflows (code lookup, policy lookup, log lookup, config lookup, ambiguous note lookup).

## If You Change One Thing
- Expose witness evidence in the result card before shipping ranking changes.
