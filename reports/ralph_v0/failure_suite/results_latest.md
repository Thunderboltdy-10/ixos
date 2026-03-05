# Innovation Failure Suite Results

- Suite: `innovation_failure_suite_v1`
- Cases: `3`

| Case | Mode | Status | Top Paths |
| --- | --- | --- | --- |
| `fn_flash_results_streamed` | `flash` | **FAIL** | `corpus_tiny/misc/changelog.txt; corpus_tiny/docs/q2_financial_report.md; corpus_tiny/restricted/secret.txt; corpus_tiny/docs/q1_financial_summary.txt; corpus_tiny/docs/q1_financial_report.md` |
- `fn_flash_results_streamed`: missing in top-5: corpus_tiny/logs/app.log
| `fp_auto_results_streamed` | `auto` | **FAIL** | `corpus_tiny/misc/changelog.txt; corpus_tiny/docs/q2_financial_report.md; corpus_tiny/docs/q1_financial_report.md; corpus_tiny/restricted/secret.txt; corpus_tiny/docs/q1_financial_summary.txt` |
- `fp_auto_results_streamed`: unexpected in top-5: corpus_tiny/restricted/secret.txt
| `control_pro_results_streamed` | `pro` | **PASS** | `corpus_tiny/misc/changelog.txt; corpus_tiny/logs/app.log; corpus_tiny/docs/q2_financial_report.md; corpus_tiny/code/watcher.py; corpus_tiny/data/metrics.json` |
