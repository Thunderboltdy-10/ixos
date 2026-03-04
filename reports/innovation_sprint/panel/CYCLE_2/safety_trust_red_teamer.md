# Safety/Trust Red-Teamer Critique (Cycle 2)

## Top 3 Objections
1. Sensitive-path detection by token match is brittle to path obfuscation.
2. Guard does not yet guarantee presence of the strongest non-sensitive witness.
3. Existing atlas has only one explicit sensitive-allowed case.

## Falsification Experiments
1. Add obfuscated sensitive files (`vault/data.txt`, `private_notes.bin`) to test bypass.
2. Add counterfactual tests where sensitive file is semantically close but should remain hidden.
3. Expand explicit-allow cases (`secret`, `confidential`, `credentials`) and verify no false suppression.

## If You Change One Thing
- Replace path-token heuristic with policy tags derived at candidate generation time.
