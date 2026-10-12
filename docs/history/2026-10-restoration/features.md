# Feature inventory

This inventories implemented facilities without treating every retained experimental module as a finished product.

| Facility | Current status and evidence |
|---|---|
| Code/document/lexical profiles | Default CLI, real CPU models and editable retrieval config; standalone JSON/human |
| Semantic/hybrid/BM25 modes | Full extracted lexical source; bounded semantic representatives/centroid; optional component scores |
| Query handling | Exact-literal guard with matching outer identifier quotes; all whitespace separates terms; optional unique ordinary-word transposition correction; no LLM rewrite/calibrated confidence |
| Preview selection | Default strongest global lexical line; optional bounded semantic/local reranking of stored plus query-selected passages; file scores unchanged, extra inference recorded |
| Compact native cache | Signed full-dimension int8 records; ADS/xattr, application DB fallback; source/model/recipe freshness; warm/stats/clear |
| JIT and resident reuse | Persistent writes optional; resident source/terms/vectors reused after full raw hash check |
| Exact grep and bounded read | Embedded regex/fixed strings; verified lines and Unicode slices; evidence omitted explicitly if budget cannot fit |
| JSONL sessions | Search/grep/read/reset; bounded related/feedback/combined/context policies; displayed-result feedback; optional diagnostics |
| Discovery/extraction | Gitignore, hidden/symlink/dependency/cloud pruning; UTF-8/BOM UTF-16, PDF/DOCX/XLSX/XLS/PPTX parsers, bounded input/ZIP/XML |
| Reproducible evaluation | Actual artifacts, frozen sources/splits/recipes, BM25/rg/legacy controls, output tokens/spans, matrix and session replays; all 260 prospectively reserved RepoQA descriptions completed |
| Desktop progressive search | Retained earlier candidate/reranking pipeline, lexical/semantic streaming, open/reveal, Ask and deep settings; selected model respected |
| Desktop activity/workstreams | Retained local activity ledger and workstream/recluster facilities; optional local persistence, no paid unlock |
| Security/storage utilities | Cache integrity, protected buffers/timing options, local encrypted state, attestation, audit/compliance/journalist-mode modules retained |
| Watcher/daemon | Retained file events and foreground daemon; IPC background stop/status unavailable; not required by default CLI |
| Legacy model/index/export tools | Flash/Pro compatibility IDs, earlier cache audit/index/rebuild, human/JSON/CSV/ripgrep/bibliographic formats; use explicit legacy search |
| Installation/update/diagnostics | Current pinned source model setup; doctor/version and older release updater remain; restored public release not published |
| Website/shared UI | Free open-source notice, scripted shared product demos; earlier numerical claims must remain labeled as historical/illustrative |
| Ixplorer | Retired under legacy; no active architecture or feature dependency |
| Images/OCR, `.doc`/`.ppt`, faithful RTF/layout | Not implemented; PDF/Office evidence addresses extracted text |
| Matched Cursor/Augment public leaderboard | Not implemented; architecture/methodology research only, no superiority claim |
| ContextBench agent tasks/Spectra/low-end CPU | Next validation work; current restricted retrieval suite does not establish task success |
| Native platforms | Windows and Ubuntu 24.04/WSL x86-64 ext4 CLI verified with actual models/cache/package checks; native Mac and Mac desktop regression deferred |

Core modules `optimization`, `pro`, `integrations`, `instrumentation`, `diagnostics`, `journalist_mode`, `attestation`, `compliance`, `telemetry`, `workstreams`, `activity_ledger` and `ixos_watcher` remain compatibility/research facilities. Use their code/tests or archived guides to inspect them; inclusion alone does not justify performance or legal-compliance guarantees. Paid/account/device-instance gating was removed. Short OS locks for key/state writes allow multiple instances and do not merge independent snapshots.

Release gaps: real historical key revocation/history remediation, native Mac execution, desktop packaging with truthful model identities, real-agent/Spectra/dense-document tasks and worst-device/RSS measurements. The default CLI does not inherit all legacy extras or pretend the desktop has been migrated.
