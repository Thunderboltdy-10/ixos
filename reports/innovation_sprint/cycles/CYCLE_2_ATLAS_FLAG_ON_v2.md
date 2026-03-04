# Innovation Failure Atlas Results

- Suite: `innovation_failure_atlas_v1`
- Cases: `16`
- Pass: `15`
- Fail: `1`
- Avg case latency: `2408.44 ms`

| Case | Category | Mode | Status | Top paths |
| --- | --- | --- | --- | --- |
| `exact_anchor_results_streamed_flash` | `exact_anchor` | `flash` | **FAIL** | `corpus_tiny/misc/changelog.txt; corpus_tiny/docs/q2_financial_report.md; corpus_tiny/docs/q1_financial_summary.txt; corpus_tiny/docs/q1_financial_report.md; corpus_tiny/docs/pdf_surrogate.txt` |
- `exact_anchor_results_streamed_flash`: missing in top-5: corpus_tiny/logs/app.log
| `exact_anchor_results_streamed_pro_control` | `exact_anchor` | `pro` | **PASS** | `corpus_tiny/misc/changelog.txt; corpus_tiny/logs/app.log; corpus_tiny/docs/q2_financial_report.md; corpus_tiny/code/watcher.py; corpus_tiny/docs/q1_financial_report.md` |
| `semantic_drift_results_streamed_auto_secret` | `semantic_drift` | `auto` | **PASS** | `corpus_tiny/misc/changelog.txt; corpus_tiny/docs/q2_financial_report.md; corpus_tiny/docs/q1_financial_report.md; corpus_tiny/docs/research_summary.txt; corpus_tiny/docs/q1_financial_summary.txt` |
| `exact_anchor_config_json` | `exact_anchor` | `flash` | **PASS** | `corpus_tiny/docs/api_reference.md; corpus_tiny/data/config.json; corpus_tiny/code/cli_flags.rs; corpus_tiny/data/users.json; corpus_tiny/data/metrics.json` |
| `exact_anchor_api_reference_endpoints` | `exact_anchor` | `flash` | **PASS** | `corpus_tiny/docs/api_reference.md; corpus_tiny/docs/research_summary.txt; corpus_tiny/code/search_engine.rs` |
| `exact_anchor_privacy_policy` | `exact_anchor` | `flash` | **PASS** | `corpus_tiny/docs/privacy_policy.md; corpus_tiny/docs/meeting_notes_2024-11-15.txt; corpus_tiny/nested/level1/level2/über/ñandú_notes.txt` |
| `unicode_anchor_nandu_notes` | `exact_anchor` | `flash` | **PASS** | `corpus_tiny/nested/level1/level2/über/ñandú_notes.txt; corpus_tiny/docs/meeting_notes_2024-11-15.txt` |
| `ambiguous_short_notes` | `ambiguous_short` | `flash` | **PASS** | `corpus_tiny/docs/meeting_notes_2024-11-15.txt; corpus_tiny/nested/level1/level2/über/ñandú_notes.txt` |
| `exact_anchor_meeting_date` | `exact_anchor` | `flash` | **PASS** | `corpus_tiny/docs/meeting_notes_2024-11-15.txt; corpus_tiny/nested/level1/level2/über/ñandú_notes.txt` |
| `anchor_project_plan_milestones` | `exact_anchor` | `flash` | **PASS** | `corpus_tiny/docs/project_plan_2025.md; corpus_tiny/docs/meeting_notes_2024-11-15.txt` |
| `pricing_false_negative_flash` | `semantic_drift` | `flash` | **PASS** | `corpus_tiny/docs/q2_financial_report.md; corpus_tiny/docs/q1_financial_report.md; corpus_tiny/code/watcher.py; corpus_tiny/docs/research_summary.txt; corpus_tiny/web/pricing.html` |
| `pricing_control_pro` | `exact_anchor` | `pro` | **PASS** | `corpus_tiny/web/pricing.html; corpus_tiny/docs/research_summary.txt; corpus_tiny/nested/level1/level2/über/ñandú_notes.txt; corpus_tiny/docs/project_plan_2025.md; corpus_tiny/code/search_engine.rs` |
| `privacy_non_request_no_secret` | `privacy_guard` | `flash` | **PASS** | `corpus_tiny/markdown/roadmap.md` |
| `privacy_explicit_secret_request` | `privacy_guard` | `flash` | **PASS** | `corpus_tiny/restricted/secret.txt; corpus_tiny/data/metrics.json; corpus_tiny/data/users.json; corpus_tiny/data/config.json` |
| `anchor_search_engine_symbol` | `exact_anchor` | `flash` | **PASS** | `corpus_tiny/code/search_engine.rs; corpus_tiny/docs/research_summary.txt; corpus_tiny/misc/todo.md; corpus_tiny/docs/q2_financial_report.md; corpus_tiny/docs/api_reference.md` |
| `large_dir_stress_tauri_command` | `large_directory_stress` | `flash` | **PASS** | `benches/agent_search_comparison.rs; corpus_tiny/code/search_engine.rs; src/compliance/search_history.rs; .claude/skills/ixos-search/SKILL.md; old_docs/JIT Embeddings Feature Audit & Strategy.md; old_docs/Ixos Search_ Performance & UX Revolution.md; ixos-site/src/components/hero/fakeSearch.ts; src-tauri/src/commands/search.rs; docs/archive/root/FEATURES.md; CLAUDE.md` |
