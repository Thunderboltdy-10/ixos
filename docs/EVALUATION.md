# Evaluation

[eval/README.md](../eval/README.md) contains reproduction commands and the frozen suite definitions. [RESULTS.md](RESULTS.md) reports the final binary's results, the single speed check, and cache sizes.

RepoQA evaluates supplied-source file and function-line retrieval: 180 development descriptions in 18 repository families and 260 held-out descriptions in 26 families. SciFact evaluates 460 development and all 300 official test claims over 5,183 title/abstract files. Family assignments and source hashes are fixed; development paper components sharing test answers were excluded before selection.

The harness drives `ixos mcp` with one resident engine per corpus, prepared full-text BM25, or ranked ripgrep. Limit 10, context 2 and a 6,000-byte response ceiling are shared. It verifies every displayed snippet against the source and records per-query metrics, configuration, binary and model hashes. Metrics give equal weight to repository families or relevant-paper components. Raw payloads are ignored; small results are committed under `eval/results/`.

The only cleanup experiment tested up to three definition-aligned code snippets on development data. It improved line recall but exceeded the token-cost threshold, so its implementation was deleted. [Plan and decision](../eval/EXPERIMENTS.md).

The held-out sets were evaluated earlier during development; no cleanup choice was tuned on them. Generated RepoQA descriptions and unknown pretraining overlap limit interpretation. Clean SciFact text does not test PDF/Office parsing, and neither suite measures agent task completion.
