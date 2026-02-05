# Document Search Gate Fix (2026-02-05)

## Problem
`CandidateGenerator` always ran `DocumentEngine::search()` in both `generate()` and `generate_streaming()`, causing unnecessary document extraction on code-only queries.

## Change
- Added a document-intent gate in `src/ixos_rank/candidate_generator/mod.rs`.
- Document phase now runs only when:
  - query contains explicit document signals (`ext:pdf`, `pdf`, `docx`, `xlsx`, `pptx`, etc.), or
  - top ranked path candidates already include document extensions.
- Applied the gate to both non-streaming and streaming candidate generation paths.

## Before/After Behavior
| Case | Before | After |
|---|---|---|
| Code-only query (`fn main import module`) | Document search always executed | Document search skipped |
| Query with doc signal (`ext:pdf quarterly report`) | Document search executed | Document search executed |
| Query whose top paths include `.pdf` | Document search executed | Document search executed |

## Validation Commands
```powershell
cargo fmt --all
cargo test candidate_generator::tests::test_document_search_gate -- --nocapture
cargo test candidate_generator::tests -- --nocapture
```

## Validation Result
- `candidate_generator` tests: **8 passed, 0 failed**
- New gate tests added and passing:
  - `test_document_search_gate_skips_code_query_without_doc_signals`
  - `test_document_search_gate_runs_for_document_query_signals`
  - `test_document_search_gate_runs_when_top_paths_include_document_files`
