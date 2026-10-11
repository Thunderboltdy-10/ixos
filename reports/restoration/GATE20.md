# Gate 20 — actual human code-issue diagnosis

Three real issue descriptions were investigated using the actual CLI against complete original repository archives. Diagnoses/source citations were frozen before original fixes were read. FastAPI and pip navigation found relevant code, while Docker's dependency update was missed. This is an exploratory navigation study; no submitted code patch was applied and no task is claimed resolved.

## Selection, identities and isolation

The [prospective protocol](gate20/protocol.json) pins SWE-bench train revision `e48e2bd1e9fecd5bbd641e9414ac59da9f2e69f6`. Its parquet contains 19,008 rows, SHA256 `0ba403a7060af657e1f0476937a703726c07da15b759836694b16e553705a10f`. Preparation loads only task metadata, never patch, test or hint columns. The first three remaining repositories by SHA256-name ordering contribute their first SHA256-ordered issue.

During benchmark research, the public Lite dev viewer displayed solution excerpts. All six Lite dev repositories are therefore excluded prospectively, not just particular easy/hard examples. Full official dev/test inputs were not downloaded or scored. FastAPI source was used in earlier Ixos development studies, so this is not unseen-repository evidence. Agent/model pretraining overlap is unknown.

| Case | Original issue | Base commit | Complete regular files / bytes |
|---|---|---|---:|
| C01 | docker/compose #1688: missing TTY output | `81707ef1ad94403789166d2fe042c8a718a4c748` | 127 / 419,566 |
| C02 | tiangolo/fastapi #437: custom validation-response schema | `033bc2a6c9aec3a245eb1f1b4fadb2fbb7a514b8` | 555 / 5,540,671 |
| C03 | pypa/pip #7348: wrong command documentation links | `44db4d81b2e4b6dbcfd4ff04af08859b4429da56` | 853 / 10,643,069 |

[Tasks](gate20/tasks.json) and source inventories bind every archived regular file, original ignores and download hashes. Links are excluded explicitly. Search uses the real ignore/format/budget constraints rather than an oracle subset. Files were never modified; all bytes, mtime and ordinary-file inventory checks pass. Native embedding metadata can be written without ordinary sidecars.

Windows binary `7aab8d7d627e98f190e3af2519b4b520722d9d23663d377bc496a3e6b4ed1418`; actual code model fingerprint `835fb9be0368efb6a64fd54039d4e79100add78ac50e2dc219daca32a62f5972`. Resident code profile, intro-uniform, combined session, bounded-rerank, native persistence, context 2 / limit 5 / 6,000 bytes. One already-informed restoration assistant used only actual CLI source retrieval to solve the tasks, with at most 16 calls / 18,000 stdout tokens each. References were outside searched roots and first opened after the complete [submission freeze](gate20/submission-freeze.json).

## Results and interpretation

| Case | Search / grep / read calls | Stdout tokens | Initial → observed changed-file recall | Observed → cited original changed/anchor line recall |
|---|---|---:|---|---|
| C01 | 2 / 4 / 4 | 4,490 | 0 → 0 | 0 → 0 |
| C02 | 1 / 1 / 1 | 1,640 | 1 → 1 | 13/24 → 7/24 |
| C03 | 2 / 2 / 2 | 3,339 | 0 → 1 | 4/4 → 4/4 |

Total **19 calls, 9,469 CLI stdout + 2,201 diagnostic + 1,680 request tokens**, ready records separate. These are exact raw-wire token counts, excluding inherited reasoning/chat, actor wrappers and terminal echo. Timing is descriptive on this Ryzen Windows host, not a repeated performance comparison or weak-device result.

C01 traced the common logging path and suspected TTY/framed-stream decoding, while noting that the external Docker client was uninspected. The actual supplied fix changes `docker-py` from the 1.2 range to 1.3 in `setup.py`. The actor never inspected that file and did not propose that dependency change. A plausible mechanism is not successful localization or a verified patch.

C02 identified an explicit response being overwritten by automatic 422 schema assignment and hard-coded JSON in additional responses. The original fix changes those areas and also restructures validation-definition creation plus guards `422`, `4xx` and `default`. The diagnosis did not cover every original change. File presence and partial patch-line coverage are not test success.

C03 identified duplicate unqualified bookmarks emitted for shared index options and proposed passing the command scope into the existing formatter, with corresponding directive/reference updates. The supplied patch adds the command argument/scoping to `PipIndexOptions`. No documentation build was executed, and its empty test fields cannot establish that either proposal fully fixes documentation.

All three supplied training records have **empty test patches and FAIL_TO_PASS lists**. Keep them as navigation/diagnosis evidence. [Official SWE-bench resolution](https://www.swebench.com/SWE-bench/guides/evaluation/) applies generated patches and runs controlled tests; these results are not a leaderboard percentage or a Cursor/Augment comparison. Original deleted lines plus explicit insertion anchors form the localization denominator: next old line for an insertion, previous at EOF. Patch context is verified byte-for-normalized-text against the original source before scoring. These patch locations are a proxy for relevant code, not exhaustive ground-truth evidence.

## Concrete follow-up

The `tty|attach_socket` grep in C01 returned five overlapping matches from the first matching file, hiding other matches despite reporting 19 total. An optional per-file match cap can spread a compact result budget across files without changing exact matching. Measure before/after on the preserved request and new authored controls; preserve default behavior and explicit unlimited within-file inspection. This is a narrower engineering change than changing semantic representations from three diagnoses.

The issue searches also demonstrate helpful concept discovery followed by exact/source inspection. Grep/read do not currently enter feedback history; a future explicit inspection-feedback experiment needs freshness and bounded vector/cost proof. None of these tasks selected models or presets.

## Checks and recipes

Four source-view/citation/archive integrity tests passed **before** live tasks. A fifth patch-context/anchor contract was added after freeze/reference inspection; all five pass. Every original actor helper/binary/submission hash, source state, raw-wire token count and original patch context verifies in [grading](gate20/analysis.json). An initial inline freeze attempt failed importing pyarrow because its dependency path was absent; it did not open references or save a freeze. The explicit run environment then completed freezing before grading. No model-process failure occurred.

```powershell
python -m scripts.code_tasks.prepare --data .tmp/gate20/data --output reports/restoration/gate20/tasks.json
python -m unittest scripts.code_tasks.test_contract
python -u -m scripts.code_tasks.agent_shell --binary target/release/ixos.exe --model .tmp/gate4/reviewer-models/potion-code-16M-v2-unbounded --tasks reports/restoration/gate20/tasks.json --case C01 --output reports/restoration/gate20/C01
python reports/restoration/gate20/freeze.py
python reports/restoration/gate20/grade.py
```

Exact interactive requests appear in `C*/wire.jsonl`. Reproduction requires Python3.12, `eval/requirements.txt`, pyarrow21.0.0 and new preparation/output paths; the original-run freeze refuses overwrite. See [adapter instructions](../../scripts/code_tasks/README.md). Source notices and pinned links are preserved in [attribution](gate20/attribution.json). Dataset license metadata was unavailable at the pinned API revision; no new licence is assigned to its issue text.

Production Rust, model/defaults and frozen evaluator are unchanged. Gate 17 engine correctness remains applicable; it is not a fresh code quality score. Next: implement and measure the observed grep-budget problem, then fresh test-backed agent tasks and evidence/session work. No publication or history rewrite occurred.
