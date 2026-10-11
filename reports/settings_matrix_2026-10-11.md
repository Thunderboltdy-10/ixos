# Settings Matrix Report

- Generated: 2026-10-11T07:41:51.536148+00:00
- Corpus: `corpus_tiny`
- Combinations: `48`
- Dimensions: cache_mode x search_mode x progressive x secure_timing x deep_search

| # | Cache | Search | Progressive | SecureTiming | DeepSearch | Status | Notes |
|---|---|---|---|---|---|---|---|
| 1 | local | flash | off | off | off | FAIL | results array empty; local mode produced zero cached files |
| 2 | local | flash | off | off | on | FAIL | results array empty |
| 3 | local | flash | off | on | off | FAIL | results array empty; local mode produced zero cached files |
| 4 | local | flash | off | on | on | FAIL | results array empty |
| 5 | local | flash | on | off | off | FAIL | local mode produced zero cached files |
| 6 | local | flash | on | off | on | PASS | OK |
| 7 | local | flash | on | on | off | FAIL | local mode produced zero cached files |
| 8 | local | flash | on | on | on | PASS | OK |
| 9 | local | auto | off | off | off | FAIL | results array empty; local mode produced zero cached files |
| 10 | local | auto | off | off | on | FAIL | results array empty |
| 11 | local | auto | off | on | off | FAIL | results array empty; local mode produced zero cached files |
| 12 | local | auto | off | on | on | FAIL | results array empty |
| 13 | local | auto | on | off | off | FAIL | local mode produced zero cached files |
| 14 | local | auto | on | off | on | PASS | OK |
| 15 | local | auto | on | on | off | FAIL | local mode produced zero cached files |
| 16 | local | auto | on | on | on | PASS | OK |
| 17 | local | pro | off | off | off | FAIL | results array empty; local mode produced zero cached files |
| 18 | local | pro | off | off | on | FAIL | results array empty |
| 19 | local | pro | off | on | off | FAIL | results array empty; local mode produced zero cached files |
| 20 | local | pro | off | on | on | FAIL | results array empty |
| 21 | local | pro | on | off | off | FAIL | local mode produced zero cached files |
| 22 | local | pro | on | off | on | PASS | OK |
| 23 | local | pro | on | on | off | FAIL | local mode produced zero cached files |
| 24 | local | pro | on | on | on | PASS | OK |
| 25 | memory | flash | off | off | off | FAIL | results array empty |
| 26 | memory | flash | off | off | on | FAIL | results array empty |
| 27 | memory | flash | off | on | off | FAIL | results array empty |
| 28 | memory | flash | off | on | on | FAIL | results array empty |
| 29 | memory | flash | on | off | off | PASS | OK |
| 30 | memory | flash | on | off | on | PASS | OK |
| 31 | memory | flash | on | on | off | PASS | OK |
| 32 | memory | flash | on | on | on | PASS | OK |
| 33 | memory | auto | off | off | off | FAIL | results array empty |
| 34 | memory | auto | off | off | on | FAIL | results array empty |
| 35 | memory | auto | off | on | off | FAIL | results array empty |
| 36 | memory | auto | off | on | on | FAIL | results array empty |
| 37 | memory | auto | on | off | off | PASS | OK |
| 38 | memory | auto | on | off | on | PASS | OK |
| 39 | memory | auto | on | on | off | PASS | OK |
| 40 | memory | auto | on | on | on | PASS | OK |
| 41 | memory | pro | off | off | off | FAIL | results array empty |
| 42 | memory | pro | off | off | on | FAIL | results array empty |
| 43 | memory | pro | off | on | off | FAIL | results array empty |
| 44 | memory | pro | off | on | on | FAIL | results array empty |
| 45 | memory | pro | on | off | off | PASS | OK |
| 46 | memory | pro | on | off | on | PASS | OK |
| 47 | memory | pro | on | on | off | PASS | OK |
| 48 | memory | pro | on | on | on | PASS | OK |
