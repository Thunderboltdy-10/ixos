# Tooling

| Tool | Responsibility |
|---|---|
| `setup_models.py` | Reproduce pinned free code/document model derivatives, preserve cards, verify hashes |
| `verify_restored_cli.py` | Actual-model profile/config/cache/quiet JSONL integration, optional frozen binary equivalence |
| `verify_retrieval_engine.py` | Source preservation, late facts, edits, native cache/fallback, indexed feedback/protocol isolation |
| `verify_cli_contract.py` | Retained real Flash/legacy contract checks |
| `profile_resident.py` | Real resident request/memory profiling, with OS-specific metrics and no quality labels |
| `package_cli.py` | Executable plus minimal pinned model setup/docs/skill, excluding weights and private material |
| `eval/` (repo sibling) | Versioned modern retrieval/model matrix and source-evidence evaluation |
| `install.sh`, `install.ps1` | Existing released binary installers; restored release not yet published |
| Older distillation/eval/build utilities | Historical experimentation/compatibility, not canonical quality proof |

Use `python scripts/setup_models.py --help` and each probe's help for exact arguments. Code setup needs Python 3.11+ standard library; documents need NumPy 2.3.5. Evaluation/output token accounting uses `eval/requirements.txt`. Large weights, derived corpora/results stay excluded; public aggregate receipts go under reports.

The previous guide claimed 64-dimensional/5–10 MB distilled models and integer inference. Its byte-preserved version is in `docs/archive/pre-restoration/scripts/README.md`; these are not current claims. `legacy/tools/run_settings_matrix.py` is a retired stub-dependent runner whose failed output remains captured. Current settings integration is `cargo test --test settings_matrix`.
