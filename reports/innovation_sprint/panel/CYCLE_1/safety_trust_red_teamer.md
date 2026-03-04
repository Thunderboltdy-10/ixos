# Safety/Trust Red-Teamer Critique (Cycle 1)

## Top 3 Objections
1. Restricted-path penalty relies on path heuristics (`/restricted/`) and can be bypassed by naming tricks.
2. No explicit leakage taxonomy yet (content leak, path leak, snippet leak, ranking leak).
3. The guard may suppress legitimate sensitive retrieval when user intent is implicit, not explicit.

## Falsification Experiments
1. Add synthetic leak cases where sensitive files are renamed to non-obvious paths.
2. Test snippet-only leakage: verify forbidden files do not leak in snippets even when path excluded.
3. Build intent ambiguity cases (`security incident notes`) to measure false suppression of legitimate sensitive results.

## If You Change One Thing
- Move from path-name heuristics to policy-aware evidence gating (path + query intent + witness confidence).
