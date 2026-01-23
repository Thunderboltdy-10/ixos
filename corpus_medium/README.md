# corpus_medium

Purpose: Medium-sized fixture for relevance and performance regression detection.

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
  - top_paths: array of string
  - evidence: array of
    - path: string
    - snippet_contains: array of string

