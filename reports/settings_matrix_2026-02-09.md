# Settings Matrix Report

- Generated: 2026-02-09T08:45:12.923818Z
- Corpus: `corpus_tiny`

| # | Cache | Privacy | Search | Progressive | Format | Status | Invariant | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | jit | normal | flash | off | human | FAIL | Baseline: produces results | search exited 101: thread 'main' (680) panicked at library\std\src\time.rs:446:33:
overflow when subtracting duration from instant
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace; stderr contains panic/backtrace; human output is empty |
| 2 | jit | normal | flash | off | json | FAIL | JSON output parses | search exited 101: thread 'main' (34800) panicked at library\std\src\time.rs:446:33:
overflow when subtracting duration from instant
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace; stderr contains panic/backtrace; invalid json output: Expecting value: line 1 column 1 (char 0) |
| 3 | jit | normal | flash | on | human | FAIL | Progressive events stream | search exited 1: thread 'tokio-runtime-worker' (20320) panicked at library\std\src\time.rs:446:33:
overflow when subtracting duration from instant
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace
Error: task 17 panicked with message "overflow when subtracting duration from instant"; stderr contains panic/backtrace |
| 4 | jit | normal | auto | off | human | FAIL | Auto routes to flash (no Pro) | search exited 101: thread 'main' (1316) panicked at library\std\src\time.rs:446:33:
overflow when subtracting duration from instant
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace; stderr contains panic/backtrace; human output is empty |
| 5 | jit | journalist | flash | off | human | FAIL | No writes, no learning | search exited 101: thread 'main' (17340) panicked at library\std\src\time.rs:446:33:
overflow when subtracting duration from instant
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace; stderr contains panic/backtrace |
| 6 | jit | journalist | flash | off | json | FAIL | No writes + valid JSON | search exited 101: thread 'main' (15764) panicked at library\std\src\time.rs:446:33:
overflow when subtracting duration from instant
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace; stderr contains panic/backtrace; invalid json output: Expecting value: line 1 column 1 (char 0) |
| 7 | cache | normal | flash | off | human | FAIL | Cache writes allowed | search exited 101: thread 'main' (4648) panicked at library\std\src\time.rs:446:33:
overflow when subtracting duration from instant
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace; stderr contains panic/backtrace; human output is empty |
| 8 | cache | normal | flash | off | json | FAIL | Cache writes + valid JSON | search exited 101: thread 'main' (35896) panicked at library\std\src\time.rs:446:33:
overflow when subtracting duration from instant
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace; stderr contains panic/backtrace; invalid json output: Expecting value: line 1 column 1 (char 0) |
| 9 | cache | normal | auto | off | human | FAIL | Auto + cache | search exited 101: thread 'main' (15272) panicked at library\std\src\time.rs:446:33:
overflow when subtracting duration from instant
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace; stderr contains panic/backtrace; human output is empty |
| 10 | cache | journalist | flash | off | human | FAIL | Journalist forces JIT (no cache writes) | search exited 101: thread 'main' (30196) panicked at library\std\src\time.rs:446:33:
overflow when subtracting duration from instant
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace; stderr contains panic/backtrace |
| 11 | cache | normal | flash | on | human | FAIL | Progressive + cache | search exited 1: thread 'tokio-runtime-worker' (17396) panicked at library\std\src\time.rs:446:33:
overflow when subtracting duration from instant
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace
Error: task 17 panicked with message "overflow when subtracting duration from instant"; stderr contains panic/backtrace |
