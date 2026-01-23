# corpus_tiny

Purpose: Small, deterministic corpus for fast golden tests.

Files in this folder are a committed fixture. Do not replace with real user data.

## JSON schemas

query_set.json
- version: number
- corpus: string
- queries: array of
  - id: string
  - query: string
  - notes: string (optional)

expected_results.json
- version: number
- corpus: string
- expected: array of
  - query_id: string
  - top_k: number (0 means no strict ordering check)
  - top_paths: array of string (length == top_k)
  - must_include: array of string
  - must_exclude: array of string

Notes:
- If top_k = 0 and must_include/must_exclude are empty, the test expects zero results.

