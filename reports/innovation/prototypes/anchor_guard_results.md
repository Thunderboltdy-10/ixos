# Anchor Guard Prototype Results

- Suite: `innovation_failure_suite_v1`

## Metrics
| Metric | Baseline | Anchor Guard | Delta |
| --- | ---: | ---: | ---: |
| `hit_at_k` | `0.6667` | `1.0000` | `+0.3333` |
| `banned_in_top_k_rate` | `0.0000` | `0.0000` | `+0.0000` |
| `mrr` | `0.1667` | `0.6667` | `+0.5000` |
| `anchor_trust_at_k` | `0.1333` | `0.2000` | `+0.0667` |

## Case Diff
### fn_flash_results_streamed (flash)
- Baseline top-5: `corpus_tiny/misc/changelog.txt; corpus_tiny/docs/q2_financial_report.md; corpus_tiny/restricted/secret.txt; corpus_tiny/docs/q1_financial_summary.txt; corpus_tiny/docs/q1_financial_report.md`
- Reranked top-5: `corpus_tiny/logs/app.log; corpus_tiny/misc/changelog.txt; corpus_tiny/docs/q2_financial_report.md; corpus_tiny/restricted/secret.txt; corpus_tiny/docs/q1_financial_summary.txt`
- Hit@k: baseline=False -> reranked=True; banned@k: baseline=False -> reranked=False
### fp_auto_results_streamed (auto)
- Baseline top-5: `corpus_tiny/misc/changelog.txt; corpus_tiny/logs/app.log; corpus_tiny/docs/q2_financial_report.md; corpus_tiny/docs/q1_financial_report.md; corpus_tiny/docs/research_summary.txt`
- Reranked top-5: `corpus_tiny/logs/app.log; corpus_tiny/misc/changelog.txt; corpus_tiny/docs/q2_financial_report.md; corpus_tiny/docs/q1_financial_report.md; corpus_tiny/docs/research_summary.txt`
- Hit@k: baseline=True -> reranked=True; banned@k: baseline=False -> reranked=False
### control_pro_results_streamed (pro)
- Baseline top-5: `corpus_tiny/misc/changelog.txt; corpus_tiny/logs/app.log; corpus_tiny/docs/q2_financial_report.md; corpus_tiny/code/watcher.py; corpus_tiny/docs/q1_financial_report.md`
- Reranked top-5: `corpus_tiny/logs/app.log; corpus_tiny/misc/changelog.txt; corpus_tiny/docs/q2_financial_report.md; corpus_tiny/code/watcher.py; corpus_tiny/docs/q1_financial_report.md`
- Hit@k: baseline=True -> reranked=True; banned@k: baseline=False -> reranked=False
