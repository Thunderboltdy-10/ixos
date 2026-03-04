# Atlas Case Cards

## A01_filename_exact_project_plan
- Category: `anchor_exactness`
- Query: `"project_plan_2025.md"`
- Failure meaning: Exact query intent violated; user loses deterministic trust immediately.
- Expected include(any): `['corpus_tiny/docs/project_plan_2025.md']`
- Expected exclude: `[]`

## A02_flag_literal_cache_mode
- Category: `anchor_exactness`
- Query: `"--cache-mode"`
- Failure meaning: Exact query intent violated; user loses deterministic trust immediately.
- Expected include(any): `['corpus_tiny/code/cli_flags.rs']`
- Expected exclude: `[]`

## A03_symbol_progressive_engine
- Category: `anchor_exactness`
- Query: `"ProgressiveSearchEngine prototype"`
- Failure meaning: Exact query intent violated; user loses deterministic trust immediately.
- Expected include(any): `['corpus_tiny/code/search_engine.rs']`
- Expected exclude: `[]`

## A04_meeting_title_exact
- Category: `anchor_exactness`
- Query: `"Ixos Meeting Notes - 2024-11-15"`
- Failure meaning: Exact query intent violated; user loses deterministic trust immediately.
- Expected include(any): `['corpus_tiny/docs/meeting_notes_2024-11-15.txt']`
- Expected exclude: `[]`

## A05_filename_q1_report
- Category: `anchor_exactness`
- Query: `"q1_financial_report.md"`
- Failure meaning: Exact query intent violated; user loses deterministic trust immediately.
- Expected include(any): `['corpus_tiny/docs/q1_financial_report.md']`
- Expected exclude: `[]`

## A06_filename_privacy_policy
- Category: `anchor_exactness`
- Query: `"privacy_policy.md"`
- Failure meaning: Exact query intent violated; user loses deterministic trust immediately.
- Expected include(any): `['corpus_tiny/docs/privacy_policy.md']`
- Expected exclude: `[]`

## A07_unicode_deep_path
- Category: `anchor_exactness`
- Query: `"ñandú_notes.txt"`
- Failure meaning: Exact query intent violated; user loses deterministic trust immediately.
- Expected include(any): `['corpus_tiny/nested/level1/level2/uber/nandu_notes.txt', 'corpus_tiny/nested/level1/level2/über/ñandú_notes.txt']`
- Expected exclude: `[]`

## A08_html_phrase_exact
- Category: `anchor_exactness`
- Query: `"Free and Pro tiers"`
- Failure meaning: Exact query intent violated; user loses deterministic trust immediately.
- Expected include(any): `['corpus_tiny/web/pricing.html']`
- Expected exclude: `[]`

## A09_json_literal_cache_mode
- Category: `anchor_exactness`
- Query: `"cache_mode": "jit"`
- Failure meaning: Exact query intent violated; user loses deterministic trust immediately.
- Expected include(any): `['corpus_tiny/data/config.json']`
- Expected exclude: `[]`

## A10_changelog_bullet_exact
- Category: `anchor_exactness`
- Query: `"Added progressive streaming"`
- Failure meaning: Exact query intent violated; user loses deterministic trust immediately.
- Expected include(any): `['corpus_tiny/misc/changelog.txt']`
- Expected exclude: `[]`

## S01_plan_paraphrase
- Category: `semantic_paraphrase`
- Query: `2025 milestones for search privacy and cache improvements`
- Failure meaning: Natural-language understanding failed; user perceives model as shallow.
- Expected include(any): `['corpus_tiny/docs/project_plan_2025.md']`
- Expected exclude: `[]`

## S02_endpoint_paraphrase
- Category: `semantic_paraphrase`
- Query: `where are the endpoints for search config and compliance`
- Failure meaning: Natural-language understanding failed; user perceives model as shallow.
- Expected include(any): `['corpus_tiny/docs/api_reference.md']`
- Expected exclude: `[]`

## S03_meeting_paraphrase
- Category: `semantic_paraphrase`
- Query: `november meeting notes about hiring and launch checklist`
- Failure meaning: Natural-language understanding failed; user perceives model as shallow.
- Expected include(any): `['corpus_tiny/docs/meeting_notes_2024-11-15.txt']`
- Expected exclude: `[]`

## S04_privacy_paraphrase
- Category: `semantic_paraphrase`
- Query: `local only search with no default telemetry`
- Failure meaning: Natural-language understanding failed; user perceives model as shallow.
- Expected include(any): `['corpus_tiny/docs/privacy_policy.md']`
- Expected exclude: `[]`

## S05_q1_paraphrase
- Category: `semantic_paraphrase`
- Query: `quarter one revenue retention and churn highlights`
- Failure meaning: Natural-language understanding failed; user perceives model as shallow.
- Expected include(any): `['corpus_tiny/docs/q1_financial_report.md', 'corpus_tiny/docs/q1_financial_summary.txt']`
- Expected exclude: `[]`

## S06_q2_paraphrase
- Category: `semantic_paraphrase`
- Query: `quarter two faster search and onboarding improvements`
- Failure meaning: Natural-language understanding failed; user perceives model as shallow.
- Expected include(any): `['corpus_tiny/docs/q2_financial_report.md']`
- Expected exclude: `[]`

## S07_roadmap_paraphrase
- Category: `semantic_paraphrase`
- Query: `roadmap phases for measurement and ui parity`
- Failure meaning: Natural-language understanding failed; user perceives model as shallow.
- Expected include(any): `['corpus_tiny/markdown/roadmap.md']`
- Expected exclude: `[]`

## S08_pdf_surrogate_paraphrase
- Category: `semantic_paraphrase`
- Query: `document that stands in for a pdf about compliance audit logs`
- Failure meaning: Natural-language understanding failed; user perceives model as shallow.
- Expected include(any): `['corpus_tiny/docs/pdf_surrogate.txt']`
- Expected exclude: `[]`

## S09_watcher_paraphrase
- Category: `semantic_paraphrase`
- Query: `python watcher prototype file`
- Failure meaning: Natural-language understanding failed; user perceives model as shallow.
- Expected include(any): `['corpus_tiny/code/watcher.py']`
- Expected exclude: `[]`

## S10_embedder_paraphrase
- Category: `semantic_paraphrase`
- Query: `example code that prints secure embedder`
- Failure meaning: Natural-language understanding failed; user perceives model as shallow.
- Expected include(any): `['corpus_tiny/code/embedder.rs']`
- Expected exclude: `[]`

## P01_financial_no_secret
- Category: `privacy_sensitive`
- Query: `q1 financial summary`
- Failure meaning: Potential privacy breach signal; confidence in local-only promise drops.
- Expected include(any): `['corpus_tiny/docs/q1_financial_summary.txt', 'corpus_tiny/docs/q1_financial_report.md']`
- Expected exclude: `['corpus_tiny/restricted/secret.txt']`

## P02_roadmap_no_secret
- Category: `privacy_sensitive`
- Query: `project roadmap phase planning`
- Failure meaning: Potential privacy breach signal; confidence in local-only promise drops.
- Expected include(any): `['corpus_tiny/markdown/roadmap.md', 'corpus_tiny/docs/project_plan_2025.md']`
- Expected exclude: `['corpus_tiny/restricted/secret.txt']`

## P03_api_no_secret
- Category: `privacy_sensitive`
- Query: `api endpoint search config`
- Failure meaning: Potential privacy breach signal; confidence in local-only promise drops.
- Expected include(any): `['corpus_tiny/docs/api_reference.md']`
- Expected exclude: `['corpus_tiny/restricted/secret.txt']`

## P04_pricing_no_secret
- Category: `privacy_sensitive`
- Query: `free and pro pricing tiers`
- Failure meaning: Potential privacy breach signal; confidence in local-only promise drops.
- Expected include(any): `['corpus_tiny/web/pricing.html']`
- Expected exclude: `['corpus_tiny/restricted/secret.txt']`

## P05_todo_no_secret
- Category: `privacy_sensitive`
- Query: `todo list add tests`
- Failure meaning: Potential privacy breach signal; confidence in local-only promise drops.
- Expected include(any): `['corpus_tiny/misc/todo.md']`
- Expected exclude: `['corpus_tiny/restricted/secret.txt']`

## R01_ambiguous_report
- Category: `ambiguous_short`
- Query: `report`
- Failure meaning: Routing uncertainty unresolved; user sees unstable/noisy top results.
- Expected include(any): `['corpus_tiny/docs/q1_financial_report.md', 'corpus_tiny/docs/q2_financial_report.md']`
- Expected exclude: `[]`

## R02_ambiguous_plan
- Category: `ambiguous_short`
- Query: `plan`
- Failure meaning: Routing uncertainty unresolved; user sees unstable/noisy top results.
- Expected include(any): `['corpus_tiny/docs/project_plan_2025.md', 'corpus_tiny/markdown/roadmap.md']`
- Expected exclude: `[]`

## R03_ambiguous_policy
- Category: `ambiguous_short`
- Query: `policy`
- Failure meaning: Routing uncertainty unresolved; user sees unstable/noisy top results.
- Expected include(any): `['corpus_tiny/docs/privacy_policy.md']`
- Expected exclude: `[]`

## R04_ambiguous_search
- Category: `ambiguous_short`
- Query: `search`
- Failure meaning: Routing uncertainty unresolved; user sees unstable/noisy top results.
- Expected include(any): `['corpus_tiny/code/search_engine.rs', 'corpus_tiny/docs/project_plan_2025.md']`
- Expected exclude: `[]`

## R05_ambiguous_notes
- Category: `ambiguous_short`
- Query: `notes`
- Failure meaning: Routing uncertainty unresolved; user sees unstable/noisy top results.
- Expected include(any): `['corpus_tiny/docs/meeting_notes_2024-11-15.txt', 'corpus_tiny/nested/level1/level2/über/ñandú_notes.txt']`
- Expected exclude: `[]`
