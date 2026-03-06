# Ralph v6 Experiments

## E01: Witness-Guard Unit Probe

- Command: `cargo test witness_guard -- --nocapture 2>&1 | Tee-Object reports/ralph_v6/cargo_test_witness_guard.txt`
- Artifact: `reports/ralph_v6/cargo_test_witness_guard.txt`
- Observation: 5 witness-guard tests passed. The existing engine already tests promotion, reordering, and skip behavior when a strong non-sensitive witness is present.
- Failure/noise: the first run waited on cargo locks because two test invocations started together; the artifact still captured the successful run.

## E02: Ask-Mode Selected-Model Invariant Probe

- Command: `cargo test test_ask_mode_respects_selected_model -- --nocapture 2>&1 | Tee-Object reports/ralph_v6/cargo_test_ask_mode_respects_selected_model.txt`
- Artifact: `reports/ralph_v6/cargo_test_ask_mode_respects_selected_model.txt`
- Observation: the targeted test passed. Current Ixos explicitly prevents Ask Mode from forcing the Pro engine when Flash is selected.
- Failure/noise: PowerShell wrapped cargo stderr as a `NativeCommandError`, but the captured output shows the test itself passed.

## E03: Progressive-Heuristic Code Probe

- Command: `git grep -n "should_refine|witness_guard_enabled|apply_witness_guard|semantic_candidate_limit|search_mode = resolve_search_mode|ask_mode_active|Collecting evidence" -- src src-tauri ui > reports/ralph_v6/code_probe_progressive_heuristics.txt`
- Artifact: `reports/ralph_v6/code_probe_progressive_heuristics.txt`
- Observation: the current engine relies on explicit heuristics and stage toggles rather than an anytime miss-risk certificate.
- Failure/noise: none.

## E04: Real Progressive Routing Probe

- Commands:
  - `./target/release/ixos-scale-bench.exe --dir dataset --queries-file reports/ralph_v6/queries.txt --max-queries 4 --cache-mode native-cache --search-mode flash --model ixos-flash-v2 --pro-model ixos-pro-v2 --out-json reports/ralph_v6/scale_flash.json --out-md reports/ralph_v6/scale_flash.md --timeout-seconds 15`
  - `./target/release/ixos-scale-bench.exe --dir dataset --queries-file reports/ralph_v6/queries.txt --max-queries 4 --cache-mode native-cache --search-mode auto --model ixos-flash-v2 --pro-model ixos-pro-v2 --out-json reports/ralph_v6/scale_auto.json --out-md reports/ralph_v6/scale_auto.md --timeout-seconds 15`
  - `./target/release/ixos-scale-bench.exe --dir dataset --queries-file reports/ralph_v6/queries.txt --max-queries 4 --cache-mode native-cache --search-mode pro --model ixos-flash-v2 --pro-model ixos-pro-v2 --out-json reports/ralph_v6/scale_pro.json --out-md reports/ralph_v6/scale_pro.md --timeout-seconds 15`
  - `./target/release/ixos-scale-bench.exe --dir dataset --queries-file reports/ralph_v6/queries.txt --max-queries 4 --cache-mode native-cache --search-mode pro --model ixos-flash-v2 --pro-model potion --out-json reports/ralph_v6/scale_pro_potion.json --out-md reports/ralph_v6/scale_pro_potion.md --timeout-seconds 15`
- Artifacts:
  - `reports/ralph_v6/scale_flash.json`
  - `reports/ralph_v6/scale_auto.json`
  - `reports/ralph_v6/scale_pro.json`
  - `reports/ralph_v6/scale_pro_potion.json`
- Observation:
  - `flash`: total p50 `203 ms`, p95 `520 ms`, embedded p95 `100`
  - `auto`: total p50 `199 ms`, p95 `383 ms`, embedded p95 `120`
  - `pro`: total p50 `206 ms`, p95 `413 ms`, embedded p95 `120`
  - `ixos-pro-v2` and `potion` produced the same Pro-shape behavior apart from normal run-to-run timing variance, matching the code path that aliases `ixos-pro-v2` to `Potion` in `src/bin/ixos-scale-bench.rs`
- Failure/noise:
  - none; release binaries and model folders were already present.

## Takeaway

- The strongest live objects are not the currently shipped heuristics themselves.
- The plausible novelty lies in formalizing what those heuristics are trying to approximate.
