# Ixos

Local CPU retrieval for agents and people. Ixos combines full-source lexical evidence with compact semantic representations, returns bounded source views, and provides exact `grep`, `read` and a resident JSONL interface. Everything is free and open source; no account or paid feature unlock is required.

## Try the CLI

Rust 1.89+ and Python 3.11+ are required for a source installation. The default code model needs no Python packages. Document model preparation additionally needs `numpy==2.3.5`.

```sh
cargo build --release --locked --bin ixos
python scripts/setup_models.py --profile code
```

Use `target/release/ixos` on macOS/Linux or `target/release/ixos.exe` on Windows:

```sh
ixos search "how cached vectors stay fresh after source edits" --dir . --json --limit 5
ixos grep 'raw_hash|source_hash' --dir src/retrieval -C 2 --limit 5
ixos read src/retrieval/mod.rs --dir . --start 300 --lines 30
ixos search "exact identifier" --profile lexical --dir . --json
ixos cache warm --dir .
ixos serve --dir . --quiet-stats
```

Replace the example line number with the returned source coordinates. Put the executable on PATH if you want to use `ixos` directly. For document search, install `python scripts/setup_models.py --profile documents` and add `--profile documents`. [Installation and troubleshooting](docs/getting-started/INSTALLATION.md), [CLI reference](docs/CLI.md), [agent skill](skills/ixos-retrieval/SKILL.md).

Default search uses native ADS/xattr caching, with an application-cache database when native writes fail. No embedding sidecars appear beside sources. `--cache-mode ephemeral` keeps embedding persistence off. Every request verifies source bytes, including cached requests. [Architecture and limitations](docs/ARCHITECTURE.md).

## Measured behavior

Development/validation selected the models and recipes before held-out scoring. The frozen Windows CPU runs produced these file-retrieval scores:

| Held-out suite | Hybrid nDCG@10 | BM25 nDCG@10 | Hybrid fresh native-warm p50 | Hybrid fresh JIT p50 |
|---|---:|---:|---:|---:|
| Code: Requests/Axum, 40 queries | 0.6957 | 0.6397 | 244 ms | 272 ms |
| SciFact: 5,183 papers, 300 queries | 0.6974 | 0.6621 | 717 ms | 1,637 ms |

Code scores cover only two held-out repositories and use upstream LLM-derived labels with incomplete span annotations. SciFact is clean text. Prepared BM25 is much faster; these results support hybrid file-quality gains on these suites, not a universal speed win or autonomous task success. Mean hybrid stdout was about 729 code / 1,343 document tokens under a 6,000-byte budget; detailed diagnostics add context cost. [Full conditions, paired intervals, provenance and failures](reports/restoration/GATE3.md), [evaluation protocol](eval/README.md).

A separate eight-task/eight-language ContextBench development diagnostic found additional discovery errors and shows why file ranking alone is insufficient: hybrid has higher file recall, slightly lower first-hit rank than BM25, and compact previews cover less than1% of the broad annotated context. Both paired ranking intervals include zero. [Follow-up corrections, actual results and limits](reports/restoration/GATE5.md), [context protocol](docs/evaluation/CONTEXTBENCH.md). This is retrieval-only development evidence, not the official coding-agent leaderboard.

The [multi-call follow-up and native platform report](reports/restoration/GATE6.md) measures search/read/grep context costs and checks Windows plus Linux/WSL source/cache/package behavior with actual models. Broader reading raises hybrid annotated-line coverage from0.87% to8.65–9.88%, at roughly3,481–5,060 stdout tokens, while four of eight development tasks still have no annotated overlap. Correct file ranking can leave the evidence anchor wrong; these results do not select a more verbose production default. Windows native cache writes now preserve primary modification time and reject missing primaries. Mac execution remains deferred.

The [evidence-location laboratory](reports/restoration/GATE7.md) preserves current file ranking and compares four ways to choose previews. Stored-passage lexical/semantic fusion modestly improves development line coverage at similar token cost, while several wrong-region/missing-file cases persist. This remains an experiment; production defaults and frozen held-out results are unchanged. [Reproducible protocol](docs/evaluation/ANCHORS.md).

A [larger function-span development evaluation](reports/restoration/GATE8.md) uses 180 generated descriptions across18 fresh repository families, with exact source coordinates and strong lexical controls. Hybrid file ranking improves, while bounded query-selected passage reranking raises follow-up line coverage at a small output-token increase. The latter needs extra inference and has regressions; it remains a lab candidate pending validation and fresh held-out evaluation. [Pinned source/splits/protocol](docs/evaluation/REPOQA.md).

## Monorepo map

| Location | Responsibility |
|---|---|
| `src/retrieval/` | Current CLI engine, signed compact records, exact evidence, sessions |
| `src/ixos_embed/`, `src/parsers/`, `src/storage/` | Model runtime, extraction, shared/legacy storage |
| `src/ixos_rank/` | Retained progressive desktop pipeline and shared traversal |
| `ixos-search/src-tauri/`, `ixos-search/ui/` | Desktop shell and React UI |
| `ixos-site/`, `packages/`, `shared/` | Website variants and shared UI/design code |
| `eval/`, `config/`, `scripts/` | Reproducible model recipes, evaluations and tooling |
| `tests/`, `benches/`, `bench/`, `corpus_*`, `golden_data/` | Integration tests, historical microbenchmarks and authored fixtures |
| `reports/restoration/` | Captured evidence; failed attempts are retained |
| `docs/`, `docs/archive/`, `legacy/` | Current guides, preserved historical documents, retired code |
| `models/`, `dataset/`, `private-process/` | Excluded local artifacts/data/personal contribution records |

The desktop keeps its earlier progressive search pipeline; it does not yet use the CLI's new representations. Ixplorer is retired under `legacy/`. [Feature inventory](docs/FEATURES.md) distinguishes current, retained and incomplete facilities. Native Mac/Linux execution and historical credential remediation remain release checks; CI configuration alone does not establish that they passed.

## Development

```sh
cargo test --workspace --locked --jobs 2
python -m pip install -r eval/requirements.txt
python -m unittest discover -s eval -t .
npm ci
npm run dev
npm run tauri:dev
npm run site:dev
```

`PLAN.md`, `RUNLOG.md` and `DECISIONS.md` record engineering state and choices. Read [contribution and evidence rules](AGENTS.md) before changing retrieval behavior. Preserve exact model attribution and negative results; benchmarks must load actual artifacts.
