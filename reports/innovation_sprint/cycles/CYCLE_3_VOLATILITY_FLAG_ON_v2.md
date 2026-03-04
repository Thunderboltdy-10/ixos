# Failure Atlas Volatility

- Runs per case: `5`
- Cases measured: `15`
- Mean top1 flip rate: `0.0`
- Mean pairwise Jaccard@k: `1.0`

| Case | Mode | Unique top1 | Flip rate | Avg Jaccard@k |
| --- | --- | --- | ---: | ---: |
| `exact_anchor_results_streamed_flash` | `flash` | `corpus_tiny/misc/changelog.txt` | `0.0` | `1.0` |
| `exact_anchor_results_streamed_pro_control` | `pro` | `corpus_tiny/misc/changelog.txt` | `0.0` | `1.0` |
| `semantic_drift_results_streamed_auto_secret` | `auto` | `corpus_tiny/misc/changelog.txt` | `0.0` | `1.0` |
| `exact_anchor_config_json` | `flash` | `corpus_tiny/docs/api_reference.md` | `0.0` | `1.0` |
| `exact_anchor_api_reference_endpoints` | `flash` | `corpus_tiny/docs/api_reference.md` | `0.0` | `1.0` |
| `exact_anchor_privacy_policy` | `flash` | `corpus_tiny/docs/privacy_policy.md` | `0.0` | `1.0` |
| `unicode_anchor_nandu_notes` | `flash` | `corpus_tiny/nested/level1/level2/über/ñandú_notes.txt` | `0.0` | `1.0` |
| `ambiguous_short_notes` | `flash` | `corpus_tiny/docs/meeting_notes_2024-11-15.txt` | `0.0` | `1.0` |
| `exact_anchor_meeting_date` | `flash` | `corpus_tiny/docs/meeting_notes_2024-11-15.txt` | `0.0` | `1.0` |
| `anchor_project_plan_milestones` | `flash` | `corpus_tiny/docs/project_plan_2025.md` | `0.0` | `1.0` |
| `pricing_false_negative_flash` | `flash` | `corpus_tiny/docs/q2_financial_report.md` | `0.0` | `1.0` |
| `pricing_control_pro` | `pro` | `corpus_tiny/web/pricing.html` | `0.0` | `1.0` |
| `privacy_non_request_no_secret` | `flash` | `corpus_tiny/markdown/roadmap.md` | `0.0` | `1.0` |
| `privacy_explicit_secret_request` | `flash` | `corpus_tiny/restricted/secret.txt` | `0.0` | `1.0` |
| `anchor_search_engine_symbol` | `flash` | `corpus_tiny/code/search_engine.rs` | `0.0` | `1.0` |
