# Innovation Atlas Results

- Generated: `2026-03-03T23:58:29Z`
- Query file: `reports\innovation_sprint_vnext\atlas\queries.json`
- Corpus: `corpus_tiny`
- Search mode: `flash`
- Cache mode: `memory`
- Reference mode: `pro`
- Controller: `risk_budget_v2`
- Controller pro mode: `pro`
- Runs/case: `5`
- K: `10`

## Metric Summary

| Metric | Value |
| --- | ---: |
| OverallPassRate | 1.0 |
| ControllerProCallRate | 0.0133 |
| AnchorHit@k | 1.0 |
| AnchorTop1Hit@1 | 0.8 |
| SensitiveLeak@k | 0.0 |
| PlausibleWrong@k | 0.1333 |
| Jaccard@k Stability | 1.0 |
| Latency p50 (ms) | 642.08 |
| Latency p95 (ms) | 816.49 |
| Agreement@k (reference) | 0.8796 |

## Lowest-Pass Cases

| Case | Category | PassRate | AnchorHit | Top1Hit | PlausibleWrong | LeakRate | Jaccard | Top1Unique |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| R01_ambiguous_report | ambiguous_short | 1.0 | 1.0 | 1.0 | 0.0 | 0.0 | 1.0 | 1 |
| R02_ambiguous_plan | ambiguous_short | 1.0 | 1.0 | 0.0 | 1.0 | 0.0 | 1.0 | 1 |
| R03_ambiguous_policy | ambiguous_short | 1.0 | 1.0 | 1.0 | 0.0 | 0.0 | 1.0 | 1 |
| R04_ambiguous_search | ambiguous_short | 1.0 | 1.0 | 1.0 | 0.0 | 0.0 | 1.0 | 1 |
| R05_ambiguous_notes | ambiguous_short | 1.0 | 1.0 | 1.0 | 0.0 | 0.0 | 1.0 | 1 |
| A01_filename_exact_project_plan | anchor_exactness | 1.0 | 1.0 | 1.0 | 0.0 | 0.0 | 1.0 | 1 |
| A02_flag_literal_cache_mode | anchor_exactness | 1.0 | 1.0 | 1.0 | 0.0 | 0.0 | 1.0 | 1 |
| A03_symbol_progressive_engine | anchor_exactness | 1.0 | 1.0 | 1.0 | 0.0 | 0.0 | 1.0 | 1 |
| A04_meeting_title_exact | anchor_exactness | 1.0 | 1.0 | 1.0 | 0.0 | 0.0 | 1.0 | 1 |
| A05_filename_q1_report | anchor_exactness | 1.0 | 1.0 | 0.0 | 1.0 | 0.0 | 1.0 | 1 |
| A06_filename_privacy_policy | anchor_exactness | 1.0 | 1.0 | 1.0 | 0.0 | 0.0 | 1.0 | 1 |
| A07_unicode_deep_path | anchor_exactness | 1.0 | 1.0 | 1.0 | 0.0 | 0.0 | 1.0 | 1 |
| A08_html_phrase_exact | anchor_exactness | 1.0 | 1.0 | 0.0 | 1.0 | 0.0 | 1.0 | 1 |
| A09_json_literal_cache_mode | anchor_exactness | 1.0 | 1.0 | 1.0 | 0.0 | 0.0 | 1.0 | 1 |
| A10_changelog_bullet_exact | anchor_exactness | 1.0 | 1.0 | 1.0 | 0.0 | 0.0 | 1.0 | 1 |

## Case Cards

### A01_filename_exact_project_plan (anchor_exactness)
- Query: `"project_plan_2025.md"`
- Expected include(any): `['corpus_tiny/docs/project_plan_2025.md']`
- Expected exclude: `[]`
- User impact if fail: Exact anchors should be reliable; misses make users distrust deterministic retrieval.
- Observed: pass_rate=1.0, jaccard=1.0, top1_unique=1

### A02_flag_literal_cache_mode (anchor_exactness)
- Query: `"--cache-mode"`
- Expected include(any): `['corpus_tiny/code/cli_flags.rs']`
- Expected exclude: `[]`
- User impact if fail: Exact anchors should be reliable; misses make users distrust deterministic retrieval.
- Observed: pass_rate=1.0, jaccard=1.0, top1_unique=1

### A03_symbol_progressive_engine (anchor_exactness)
- Query: `"ProgressiveSearchEngine prototype"`
- Expected include(any): `['corpus_tiny/code/search_engine.rs']`
- Expected exclude: `[]`
- User impact if fail: Exact anchors should be reliable; misses make users distrust deterministic retrieval.
- Observed: pass_rate=1.0, jaccard=1.0, top1_unique=1

### A04_meeting_title_exact (anchor_exactness)
- Query: `"Ixos Meeting Notes - 2024-11-15"`
- Expected include(any): `['corpus_tiny/docs/meeting_notes_2024-11-15.txt']`
- Expected exclude: `[]`
- User impact if fail: Exact anchors should be reliable; misses make users distrust deterministic retrieval.
- Observed: pass_rate=1.0, jaccard=1.0, top1_unique=1

### A05_filename_q1_report (anchor_exactness)
- Query: `"q1_financial_report.md"`
- Expected include(any): `['corpus_tiny/docs/q1_financial_report.md']`
- Expected exclude: `[]`
- User impact if fail: Exact anchors should be reliable; misses make users distrust deterministic retrieval.
- Observed: pass_rate=1.0, jaccard=1.0, top1_unique=1

### A06_filename_privacy_policy (anchor_exactness)
- Query: `"privacy_policy.md"`
- Expected include(any): `['corpus_tiny/docs/privacy_policy.md']`
- Expected exclude: `[]`
- User impact if fail: Exact anchors should be reliable; misses make users distrust deterministic retrieval.
- Observed: pass_rate=1.0, jaccard=1.0, top1_unique=1

### A07_unicode_deep_path (anchor_exactness)
- Query: `"ñandú_notes.txt"`
- Expected include(any): `['corpus_tiny/nested/level1/level2/uber/nandu_notes.txt', 'corpus_tiny/nested/level1/level2/über/ñandú_notes.txt']`
- Expected exclude: `[]`
- User impact if fail: Exact anchors should be reliable; misses make users distrust deterministic retrieval.
- Observed: pass_rate=1.0, jaccard=1.0, top1_unique=1

### A08_html_phrase_exact (anchor_exactness)
- Query: `"Free and Pro tiers"`
- Expected include(any): `['corpus_tiny/web/pricing.html']`
- Expected exclude: `[]`
- User impact if fail: Exact anchors should be reliable; misses make users distrust deterministic retrieval.
- Observed: pass_rate=1.0, jaccard=1.0, top1_unique=1

### A09_json_literal_cache_mode (anchor_exactness)
- Query: `"cache_mode": "jit"`
- Expected include(any): `['corpus_tiny/data/config.json']`
- Expected exclude: `[]`
- User impact if fail: Exact anchors should be reliable; misses make users distrust deterministic retrieval.
- Observed: pass_rate=1.0, jaccard=1.0, top1_unique=1

### A10_changelog_bullet_exact (anchor_exactness)
- Query: `"Added progressive streaming"`
- Expected include(any): `['corpus_tiny/misc/changelog.txt']`
- Expected exclude: `[]`
- User impact if fail: Exact anchors should be reliable; misses make users distrust deterministic retrieval.
- Observed: pass_rate=1.0, jaccard=1.0, top1_unique=1

### S01_plan_paraphrase (semantic_paraphrase)
- Query: `2025 milestones for search privacy and cache improvements`
- Expected include(any): `['corpus_tiny/docs/project_plan_2025.md']`
- Expected exclude: `[]`
- User impact if fail: Paraphrase recall drives natural-language usability; misses feel 'smart but wrong'.
- Observed: pass_rate=1.0, jaccard=1.0, top1_unique=1

### S02_endpoint_paraphrase (semantic_paraphrase)
- Query: `where are the endpoints for search config and compliance`
- Expected include(any): `['corpus_tiny/docs/api_reference.md']`
- Expected exclude: `[]`
- User impact if fail: Paraphrase recall drives natural-language usability; misses feel 'smart but wrong'.
- Observed: pass_rate=1.0, jaccard=1.0, top1_unique=1

### S03_meeting_paraphrase (semantic_paraphrase)
- Query: `november meeting notes about hiring and launch checklist`
- Expected include(any): `['corpus_tiny/docs/meeting_notes_2024-11-15.txt']`
- Expected exclude: `[]`
- User impact if fail: Paraphrase recall drives natural-language usability; misses feel 'smart but wrong'.
- Observed: pass_rate=1.0, jaccard=1.0, top1_unique=1

### S04_privacy_paraphrase (semantic_paraphrase)
- Query: `local only search with no default telemetry`
- Expected include(any): `['corpus_tiny/docs/privacy_policy.md']`
- Expected exclude: `[]`
- User impact if fail: Paraphrase recall drives natural-language usability; misses feel 'smart but wrong'.
- Observed: pass_rate=1.0, jaccard=1.0, top1_unique=1

### S05_q1_paraphrase (semantic_paraphrase)
- Query: `quarter one revenue retention and churn highlights`
- Expected include(any): `['corpus_tiny/docs/q1_financial_report.md', 'corpus_tiny/docs/q1_financial_summary.txt']`
- Expected exclude: `[]`
- User impact if fail: Paraphrase recall drives natural-language usability; misses feel 'smart but wrong'.
- Observed: pass_rate=1.0, jaccard=1.0, top1_unique=1

### S06_q2_paraphrase (semantic_paraphrase)
- Query: `quarter two faster search and onboarding improvements`
- Expected include(any): `['corpus_tiny/docs/q2_financial_report.md']`
- Expected exclude: `[]`
- User impact if fail: Paraphrase recall drives natural-language usability; misses feel 'smart but wrong'.
- Observed: pass_rate=1.0, jaccard=1.0, top1_unique=1

### S07_roadmap_paraphrase (semantic_paraphrase)
- Query: `roadmap phases for measurement and ui parity`
- Expected include(any): `['corpus_tiny/markdown/roadmap.md']`
- Expected exclude: `[]`
- User impact if fail: Paraphrase recall drives natural-language usability; misses feel 'smart but wrong'.
- Observed: pass_rate=1.0, jaccard=1.0, top1_unique=1

### S08_pdf_surrogate_paraphrase (semantic_paraphrase)
- Query: `document that stands in for a pdf about compliance audit logs`
- Expected include(any): `['corpus_tiny/docs/pdf_surrogate.txt']`
- Expected exclude: `[]`
- User impact if fail: Paraphrase recall drives natural-language usability; misses feel 'smart but wrong'.
- Observed: pass_rate=1.0, jaccard=1.0, top1_unique=1

### S09_watcher_paraphrase (semantic_paraphrase)
- Query: `python watcher prototype file`
- Expected include(any): `['corpus_tiny/code/watcher.py']`
- Expected exclude: `[]`
- User impact if fail: Paraphrase recall drives natural-language usability; misses feel 'smart but wrong'.
- Observed: pass_rate=1.0, jaccard=1.0, top1_unique=1

### S10_embedder_paraphrase (semantic_paraphrase)
- Query: `example code that prints secure embedder`
- Expected include(any): `['corpus_tiny/code/embedder.rs']`
- Expected exclude: `[]`
- User impact if fail: Paraphrase recall drives natural-language usability; misses feel 'smart but wrong'.
- Observed: pass_rate=1.0, jaccard=1.0, top1_unique=1

### P01_financial_no_secret (privacy_sensitive)
- Query: `q1 financial summary`
- Expected include(any): `['corpus_tiny/docs/q1_financial_summary.txt', 'corpus_tiny/docs/q1_financial_report.md']`
- Expected exclude: `['corpus_tiny/restricted/secret.txt']`
- User impact if fail: Any leak of restricted content in benign queries is a trust/safety failure.
- Observed: pass_rate=1.0, jaccard=1.0, top1_unique=1

### P02_roadmap_no_secret (privacy_sensitive)
- Query: `project roadmap phase planning`
- Expected include(any): `['corpus_tiny/markdown/roadmap.md', 'corpus_tiny/docs/project_plan_2025.md']`
- Expected exclude: `['corpus_tiny/restricted/secret.txt']`
- User impact if fail: Any leak of restricted content in benign queries is a trust/safety failure.
- Observed: pass_rate=1.0, jaccard=1.0, top1_unique=1

### P03_api_no_secret (privacy_sensitive)
- Query: `api endpoint search config`
- Expected include(any): `['corpus_tiny/docs/api_reference.md']`
- Expected exclude: `['corpus_tiny/restricted/secret.txt']`
- User impact if fail: Any leak of restricted content in benign queries is a trust/safety failure.
- Observed: pass_rate=1.0, jaccard=1.0, top1_unique=1

### P04_pricing_no_secret (privacy_sensitive)
- Query: `free and pro pricing tiers`
- Expected include(any): `['corpus_tiny/web/pricing.html']`
- Expected exclude: `['corpus_tiny/restricted/secret.txt']`
- User impact if fail: Any leak of restricted content in benign queries is a trust/safety failure.
- Observed: pass_rate=1.0, jaccard=1.0, top1_unique=1

### P05_todo_no_secret (privacy_sensitive)
- Query: `todo list add tests`
- Expected include(any): `['corpus_tiny/misc/todo.md']`
- Expected exclude: `['corpus_tiny/restricted/secret.txt']`
- User impact if fail: Any leak of restricted content in benign queries is a trust/safety failure.
- Observed: pass_rate=1.0, jaccard=1.0, top1_unique=1

### R01_ambiguous_report (ambiguous_short)
- Query: `report`
- Expected include(any): `['corpus_tiny/docs/q1_financial_report.md', 'corpus_tiny/docs/q2_financial_report.md']`
- Expected exclude: `[]`
- User impact if fail: Short queries stress routing; unstable or off-target top-k feels noisy and slow.
- Observed: pass_rate=1.0, jaccard=1.0, top1_unique=1

### R02_ambiguous_plan (ambiguous_short)
- Query: `plan`
- Expected include(any): `['corpus_tiny/docs/project_plan_2025.md', 'corpus_tiny/markdown/roadmap.md']`
- Expected exclude: `[]`
- User impact if fail: Short queries stress routing; unstable or off-target top-k feels noisy and slow.
- Observed: pass_rate=1.0, jaccard=1.0, top1_unique=1

### R03_ambiguous_policy (ambiguous_short)
- Query: `policy`
- Expected include(any): `['corpus_tiny/docs/privacy_policy.md']`
- Expected exclude: `[]`
- User impact if fail: Short queries stress routing; unstable or off-target top-k feels noisy and slow.
- Observed: pass_rate=1.0, jaccard=1.0, top1_unique=1

### R04_ambiguous_search (ambiguous_short)
- Query: `search`
- Expected include(any): `['corpus_tiny/code/search_engine.rs', 'corpus_tiny/docs/project_plan_2025.md']`
- Expected exclude: `[]`
- User impact if fail: Short queries stress routing; unstable or off-target top-k feels noisy and slow.
- Observed: pass_rate=1.0, jaccard=1.0, top1_unique=1

### R05_ambiguous_notes (ambiguous_short)
- Query: `notes`
- Expected include(any): `['corpus_tiny/docs/meeting_notes_2024-11-15.txt', 'corpus_tiny/nested/level1/level2/über/ñandú_notes.txt']`
- Expected exclude: `[]`
- User impact if fail: Short queries stress routing; unstable or off-target top-k feels noisy and slow.
- Observed: pass_rate=1.0, jaccard=1.0, top1_unique=1
