# Gate 14 — constrained CPU and allocator behavior

The actual-model CLI works on one constrained CPU, but a 256 MiB **virtual address-space** ceiling is unreliable with the default Linux allocator: two code runs took about 40 seconds, and a later document run aborted on allocation. Limiting glibc arenas improves this constrained scenario and reduces reserved address space, but substantially slows preparation with all cores available. No production allocator, model, score or default changes are promoted.

## Protocol and identities

[V1](gate14/protocol-v1.json) and [v2 allocator A/B](gate14/protocol-v2-allocator.json) were written before their runs. Native Ubuntu 24.04 on WSL/ext4, Ryzen 7 5800X host, eight initially allowed logical CPUs, glibc 2.39-0ubuntu8.9. Affinity, Rayon count and I/O workers change together in the one-core scenario; this is not a physical weak-device benchmark. `RLIMIT_AS` limits virtual mappings, not resident RAM. Core dumps disabled.

- Git control: Gate 13 `05a352f`; Linux executable SHA256 `823b1e77daba847591fefb937e3edadc2e7141088da0204715c463fe7929a883`.
- Fixed Gate 11 exported corpus: **113 Rust files / 1,610,853 bytes**, identical to Gate 12/13 cost corpus; not a dense-document collection.
- Code fingerprint `835fb9be0368efb6a64fd54039d4e79100add78ac50e2dc219daca32a62f5972`, 33,514,284 artifact bytes, intro/uniform representation.
- Document fingerprint `6966e61ba93fe416b36af3190469553e7c5447c8e3675ec034d4ee7ec0223f88`, 34,048,476 artifact bytes, whole-token centroid. Running it on Rust sources establishes resource contracts, not document relevance.
- Encoded-row CPU inference, JIT resident process, hybrid/global-line, combined session, limit 10, context 2, 6,000-byte output budget, typo correction off. Every process receives seed, repeat, feedback, request-local bounded rerank, then default-again. Accepted result 0 was actually displayed; its acceptance is synthetic contract feedback, not a gold relevance judgment.

One unmeasured unconstrained warm-up per model, then three fresh processes per condition with rotating order; one child model process at a time. Startup ends at ready; fill excludes startup. Repeat has actual RAM hits and zero document embeddings. No filesystem-cold control, physical memory cap, confidence interval or latency guarantee. The helper's synchronous response reads lack a per-request timeout; these resource runs all terminated. The separate profiler has a 120-second process-group timeout.

## Measured costs and failures

Full before/after tables with every condition, startup, all five requests, RSS/peak/virtual size and threads: [TABLES.md](gate14/TABLES.md). All numbers below are medians of successful measured runs, milliseconds. Three per row except the explicitly failed document baseline. MiB = 1,048,576 bytes.

| Experiment | Model | Default all-CPU fill / repeat | One-CPU uncapped fill / repeat | One-CPU AS256 fill / repeat |
|---|---|---:|---:|---:|
| V1 | Code | 103.264 / 12.264 | 273.342 / 9.634 | **39985.448 / 19.675** |
| V1 | Documents | 155.081 / 12.860 | 424.090 / 9.072 | 651.459 / 16.577 |
| V2 | Code | 106.248 / 13.045 | — | 324.878 / 20.752 |
| V2 | Documents | 156.684 / 12.722 | — | **495.149 / 16.687 (2 successes, 1 failure)** |

V1 code AS256 first fills: **391.157 / 39985.448 / 40328.183 ms**. Slow runs spend approximately 39,925/40,274 ms in document embedding; source I/O remains around 16 ms and lexical work around 28–32 ms. The cliff did **not** recur in v2's three default runs; this sample cannot establish disappearance or frequency. Final RSS below the virtual limit does not imply enough address space remains for concurrent allocator mappings. All-CPU processes have 21 threads; one-core scenarios have four, including runtime/I/O threads.

V2 explicitly removes inherited arena/tunable settings before applying `MALLOC_ARENA_MAX`. This controls glibc's arena count; see [GNU allocator documentation](https://sourceware.org/glibc/manual/latest/html_node/Memory-Allocation-Tunables.html). We measured installed 2.39 behavior and do not assume every detail in the latest manual applies to that release.

| Model | One CPU / AS256 / default fill | Same / arena max 1 fill | Same / arena max 2 fill | Same / arena max 4 fill | All CPUs / arena max 1 fill |
|---|---:|---:|---:|---:|---:|
| Code | 324.878 | 276.838 | 277.543 | 295.917 | **438.778** |
| Documents | 495.149* | 410.746 | 407.191 | 524.651 | **762.758** |

*Successful runs only. Failed document process reached ready, then aborted on the seed request: exit -6/SIGABRT, `memory allocation of 1 bytes failed`. [Raw stderr](gate14/allocator/1-1-one-core-256.stderr), full failed row retained; no output-equivalence credit. Arena max 1 makes all-CPU preparation **4.13× / 4.87× slower** than v2 default for code/documents. It is unsuitable as an unconditional default. Three successes with arena 1/2 do not establish a universal optimum or eliminate every allocation failure.

Default all-CPU v1 final RSS is about **102 / 154 MiB** code/documents, with about **1,426 MiB virtual size**. One CPU uncapped: approximately **99 / 116 MiB RSS**, **303 / 304 MiB virtual**. V2 one CPU/AS256/arena1: **96 / 96 MiB RSS**, **111 / 112 MiB virtual**. These are observed process measurements on a small corpus, not requirements/guarantees for larger folders or physical 128 MiB devices.

## Syscall evidence

Locally extracted Ubuntu `strace=6.8-0ubuntu2`, no system installation. Package SHA256 `d588810ae26b06fee6678dc81e5b54f6efcde8e718e4589adb4d11d254b9820b`; [identity](gate14/strace-identity.stdout). Twelve fresh processes: two repetitions × two models × default/AS256, arena1/AS256 and default/unlimited, all one CPU/Rayon1/I/O1. Every process exits zero with exact reference response bytes. **Profile-only**, tracer timings excluded from performance comparisons.

| Model/condition | `mmap` calls (two runs) | `mmap` errors | `mremap` calls |
|---|---|---|---|
| Code default/AS256 | 8560 / 8565 | 6821 / 6825 | 1545 / 1545 |
| Code arena1/AS256 | 32 / 32 | 0 / 0 | 0 / 0 |
| Code default/unlimited | 35 / 35 | 0 / 0 | 0 / 0 |
| Documents default/AS256 | 8552 / 8560 | 6814 / 6821 | 1545 / 1545 |
| Documents arena1/AS256 | 32 / 32 | 0 / 0 | 0 / 0 |
| Documents default/unlimited | 35 / 35 | 0 / 0 | 0 / 0 |

Supports allocator/mapping pressure under the ceiling. Aggregate counts do not identify the exact earlier stalled allocation or prove the entire causal chain. Futex errors are raw synchronization evidence, not failed retrievals. [All summaries and trace receipt](gate14/trace/receipt.json).

## Context and preservation

**82 resource processes** (78 measured, four warm-ups), **81 successes / one failure**, 405 completed responses. Twelve tracer processes add 60 responses. Repeated contracts use two query strings; these are not 465 unique tasks or new relevance labels.

Reference five-response stdout: **4,686 code / 4,646 document cl100k tokens**, individual responses 856–949. Explicitly enabled ready/per-request diagnostic stderr brings v1 totals to **6,325 / 6,312**. Input requests add 178 tokens separately. Stats contribute materially (~1,600 tokens over five calls); leave per-request stats off in ordinary agent use unless diagnosing. Numeric diagnostics vary between repetitions; successful stdout is byte-identical. Bounded output does not establish that necessary evidence was found.

Source hashes/nanosecond mtime/no adjacent files checked before/after both series and **natively in Linux** after tracing. Initial Windows UNC timestamp comparison failed because Windows rounds Linux timestamps to 100 ns; hashes matched. Preserve failed check, then compare exact native timestamps. No source mutation is waived.

## Commands and decision

```sh
# Saved recipes contain exact isolated local paths and arguments.
bash reports/restoration/gate14/run.sh
bash reports/restoration/gate14/allocator.sh
bash reports/restoration/gate14/install_strace.sh
bash reports/restoration/gate14/trace.sh
bash reports/restoration/gate14/check_sources.sh
python reports/restoration/gate14/summarize.py
python reports/restoration/gate14/render_tables.py
```

Recipes require the existing isolated checkout/models/fixed corpus. General runner: `python scripts/profile_constrained.py --help`, explicit paths and a **new** receipt directory. Replays use new paths; do not overwrite historical receipts. Summarizer audits existing signatures/identities and counts tiktoken0.12/cl100k tokens; [analysis](gate14/analysis.json). An initial profiler download command mishandled shell-variable expansion; logs retained, package moved to ignored scratch storage, corrected saved script extracts outside the checkout. No profiler binary/package committed.

**KEEP** reproducible helper and negative cases. **KEEP** normal parallelism; document optional constrained glibc settings and costs. No production Rust changes/quality tuning/training here; Gate 13 Windows545/Linux543 core and actual-model/source/package checks remain implementation evidence. Native Mac, genuinely small devices, dense corpora, complete agent tasks and no-answer calibration require separate evidence.
