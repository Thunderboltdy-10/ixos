# Evaluation

The harness evaluates file retrieval on RepoQA function descriptions and SciFact scientific claims. It drives the actual `ixos mcp` process, keeping one engine resident per corpus, or runs prepared full-text BM25 and ranked ripgrep over identical sources. Every query runs once. This is retrieval evaluation, not RepoQA's generated-function scoring or an agent task-completion score.

Install `eval/requirements.txt`, build with `cargo build --release --locked -p ixos-cli`, and build the models with `python scripts/models.py build`. Ripgrep must be on PATH for its baseline. On Windows use `target/release/ixos.exe`; other platforms use `target/release/ixos`.

Download the pinned [RepoQA archive](https://raw.githubusercontent.com/evalplus/repoqa_release/e3a571033de99d0b9dcaccd25577a75d4b1c70b1/repoqa-2024-06-23.json.gz) and [SciFact archive](https://public.ukp.informatik.tu-darmstadt.de/thakur/BEIR/datasets/scifact.zip) into `eval/runs/`. Preparation verifies their SHA-256 hashes and every corpus file against the committed suites.

```sh
python -m eval.prepare --suite repoqa --split dev --archive eval/runs/repoqa-2024-06-23.json.gz --destination eval/runs/repoqa-dev
python -m eval.prepare --suite repoqa --split test --archive eval/runs/repoqa-2024-06-23.json.gz --destination eval/runs/repoqa-test
python -m eval.prepare --suite scifact --archive eval/runs/scifact.zip --destination eval/runs/scifact
python -m eval.run --suite repoqa --split test --sources eval/runs/repoqa-test --method hybrid --model models/code --output eval/runs/repoqa-hybrid --result eval/results/repoqa-hybrid.json
python -m eval.run --suite scifact --split test --sources eval/runs/scifact --method hybrid --model models/documents --output eval/runs/scifact-hybrid --result eval/results/scifact-hybrid.json
python -m unittest discover -s eval -p 'test_*.py'
```

Use new output paths for each run. Change `--method` to `bm25` or `rg` for the baselines, and `--split dev` with the development corpus to reproduce development results. Lexical Ixos is also available as a direct baseline.

RepoQA has 180 development queries in 18 repository families and 260 held-out queries in 26 families. The original split assigned families by metadata before reading descriptions. All ten supplied function targets per family remain; descriptions and source snapshots are unchanged. SciFact has 460 development and all 300 official test queries over 5,183 title/abstract files. Development queries sharing relevant-paper components with test were excluded before selection.

Responses have a 6,000-byte ceiling, limit 10 and context 2. Metrics give equal weight to repository families or relevant-paper components. Scores include nDCG@10, MRR@10, file recall@10 and line recall when source spans exist. Only exact serialized source lines earn line credit. Token costs use `cl100k_base`. Results contain per-query metrics, configuration, binary and model hashes, and suite hashes; raw payloads stay in ignored `eval/runs/`.

These held-out sets were evaluated earlier during development; no cleanup choice is tuned on them. RepoQA descriptions are generated, pretraining overlap is unknown, and SciFact text does not test PDF or Office extraction. The snippet decision is recorded in [EXPERIMENTS.md](EXPERIMENTS.md); final results are in [docs/RESULTS.md](../docs/RESULTS.md).
