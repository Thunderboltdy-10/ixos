# Cycle 1 Prototype: Witness Guard Reranker

- Cases: `15`
- Baseline pass/fail: `14` / `1`
- Rerank pass/fail: `15` / `0`
- Pass delta: `1`
- Mean query latency (expanded candidate pull): `646.2 ms`

| Case | Baseline | Rerank | Delta |
| --- | --- | --- | --- |
| `exact_anchor_results_streamed_flash` | `FAIL` | `PASS` | `IMPROVED` |
- `exact_anchor_results_streamed_flash` baseline top: `corpus_tiny/misc/changelog.txt; corpus_tiny/docs/q2_financial_report.md; corpus_tiny/restricted/secret.txt; corpus_tiny/docs/q1_financial_summary.txt; corpus_tiny/docs/q1_financial_report.md`
- `exact_anchor_results_streamed_flash` rerank top: `corpus_tiny/logs/app.log; corpus_tiny/misc/changelog.txt; corpus_tiny/docs/q2_financial_report.md; corpus_tiny/docs/q1_financial_summary.txt; corpus_tiny/docs/q1_financial_report.md`
| `exact_anchor_results_streamed_pro_control` | `PASS` | `PASS` | `UNCHANGED` |
| `semantic_drift_results_streamed_auto_secret` | `PASS` | `PASS` | `UNCHANGED` |
| `exact_anchor_config_json` | `PASS` | `PASS` | `UNCHANGED` |
| `exact_anchor_api_reference_endpoints` | `PASS` | `PASS` | `UNCHANGED` |
| `exact_anchor_privacy_policy` | `PASS` | `PASS` | `UNCHANGED` |
| `unicode_anchor_nandu_notes` | `PASS` | `PASS` | `UNCHANGED` |
| `ambiguous_short_notes` | `PASS` | `PASS` | `UNCHANGED` |
| `exact_anchor_meeting_date` | `PASS` | `PASS` | `UNCHANGED` |
| `anchor_project_plan_milestones` | `PASS` | `PASS` | `UNCHANGED` |
| `pricing_false_negative_flash` | `PASS` | `PASS` | `UNCHANGED` |
| `pricing_control_pro` | `PASS` | `PASS` | `UNCHANGED` |
| `privacy_non_request_no_secret` | `PASS` | `PASS` | `UNCHANGED` |
| `privacy_explicit_secret_request` | `PASS` | `PASS` | `UNCHANGED` |
| `anchor_search_engine_symbol` | `PASS` | `PASS` | `UNCHANGED` |
