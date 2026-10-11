# Human code-issue navigation

This exploratory adapter uses [SWE-bench](https://github.com/SWE-bench/SWE-bench) training issue descriptions and original repository commits. It measures observed-only diagnosis/source localization, **not** the official patch-resolution benchmark. Patch/test fields remain unopened until all diagnoses are frozen. The three Gate 20 records have empty test patches and FAIL_TO_PASS lists.

`prepare.py` pins the dataset revision, chooses repositories/issues by SHA256 ordering and downloads complete original archives. It loads only repo/instance/base-commit/problem columns. All Lite dev repositories are excluded because the public viewer exposed solution excerpts during research. That exclusion is fixed in the prospective protocol. FastAPI appeared in earlier Ixos development studies; these tasks are label-blind, not unseen repository families or guaranteed pretraining-clean examples.

```sh
python -m pip install -r eval/requirements.txt pyarrow==21.0.0
python -m unittest scripts.code_tasks.test_contract
python -m scripts.code_tasks.prepare --data .tmp/new-code-tasks --output reports/local-code-tasks/tasks.json
python -u -m scripts.code_tasks.agent_shell --binary target/release/ixos --model CODE_MODEL_DIRECTORY --tasks reports/local-code-tasks/tasks.json --case C01 --output reports/local-code-tasks/C01
```

Windows uses `ixos.exe`. Preparation and actor require new output paths. Use interactive JSON search/grep/read requests, then `submit` with `status`, `diagnosis`, `proposed_change` and citations containing `call_id`, `path`, `start_line`, `end_line`. Citations must be fully shown by that call. Maximum 16 retrieval calls and 18,000 CLI stdout tokens per task. The actor never opens solution inputs and rejects changed source inventories.

Archive helpers refuse traversal, multiple roots and duplicate file members; links are excluded and recorded. Sources remain unedited. Returned views must equal original UTF-8 text after the engine's explicit CRLF/one-final-LF normalization. Stats, ready/request traffic and source hash/mtime are recorded separately. Model/cache/ignore/source limits remain actual engine behavior.

Gate 20's `freeze.py` and `grade.py` are original-run recipes, under its report directory. They verify immutable diagnoses before opening reference patch columns, verify original patch context, and measure original deleted-line/insertion-anchor localization separately from factual diagnosis. Insertions use the next original line, previous at EOF. Old patch context or exact source view mismatch fails instead of receiving partial fabricated credit. A future official resolved score requires submitted code patches and the [controlled test harness](https://www.swebench.com/SWE-bench/guides/evaluation/).

Original source notices and pinned links accompany Gate 20 captures. Complete downloaded code/data stay ignored. Dataset API license metadata was absent at the pinned revision; the adapter does not invent a dataset license or silently relicence source excerpts.
