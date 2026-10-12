# Gate26 source and evidence notices

The pinned [SWE-smith Python training dataset](https://huggingface.co/datasets/SWE-bench/SWE-smith-py/tree/77cab9055d42ab4a5c25c89a8f937096db13558e) supplies synthetic bugs and generated issue descriptions in real repositories. Dataset revision: `77cab9055d42ab4a5c25c89a8f937096db13558e`. The official [SWE-smith runner](https://github.com/SWE-bench/SWE-smith) is pinned to `9b74ac08118a85c39c356802f7961893af73e07f`; its MIT notice and the SWE-bench MIT notice are retained under [licenses](licenses/). Gate25 records source and dependency locks. These are upstream data/tools, not original Ixos contributions or human-authored issue labels.

Actor wire records contain displayed source excerpts. Applied patches, evaluation scripts and test stdout also contain upstream material. Original notices are copied byte-for-byte and bound by [capture.json](capture.json).

| Source | Actual buggy branch commit | Retained notice |
|---|---|---|
| [pyutils/line_profiler](https://github.com/pyutils/line_profiler), mirror `swesmith/pyutils__line_profiler.a646bf0f` | `4a5d2a2d69f1d68235d5db350ea949785b3ba18f` | [BSD 3-Clause](licenses/LINE-PROFILER-BSD-3-CLAUSE.txt), [Python-derived timer notice](licenses/LINE-PROFILER-PYTHON-NOTICE.txt) |
| [alanjds/drf-nested-routers](https://github.com/alanjds/drf-nested-routers), mirror `swesmith/alanjds__drf-nested-routers.6144169d` | `0159ece8e7191560b44569afc959225f18240f60` | [Apache 2.0](licenses/DRF-NESTED-ROUTERS-APACHE-2.0.txt) |

The actor proposed changes to `line_profiler/explicit_profiler.py` and `rest_framework_nested/relations.py` in disposable grading containers. These proposals are modified excerpts, dated2026-10-12. The S03 amendment changes overlapping unified-diff formatting before reference/test access; its semantic edits are unchanged. Gold patches reverse upstream synthetic corruption. Full source corpora, Git history, image contents and model weights are excluded. S02 has no source-text response or scored patch; its public inventory contains file names, byte sizes and hashes only.

Licenses do not endorse Ixos or its results. No public benchmark submission or redistribution of complete task archives is performed by this gate.
