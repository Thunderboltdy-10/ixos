import Link from "next/link";

export default function DocsBenchmarkingPage() {
  return (
    <div className="docs-content max-w-4xl">
      <p className="docs-kicker">{"// BENCHMARKING"}</p>
      <h1 className="docs-h1">Benchmarking + Profiling</h1>
      <p className="docs-lead">
        Ixos performance work is only accepted with reproducible commands, stored artifacts, and a
        clear baseline-vs-current table. This page is the operational runbook used in CI and local
        optimization loops.
      </p>

      <h2>1) Build + sanity checks</h2>
      <pre>
        <code>{`cargo build --release
cargo test
cargo test --test settings_matrix

python scripts/run_settings_matrix.py`}</code>
      </pre>

      <h2>2) Large-root benchmark (tier-gated)</h2>
      <p>
        Use the curated query set in <code>bench/big_root_queries.json</code> and run at least 3
        passes to capture cold and warm behavior.
      </p>
      <pre>
        <code>{`cargo run --release --bin ixos-big-bench -- \
  --dir . \
  --queries-file bench/big_root_queries.json \
  --runs 3 \
  --cache-mode local \
  --model ixos-flash-v2 \
  --objective-profile harsh \
  --output-dir reports/benchmarks`}</code>
      </pre>

      <h2>3) Profile stage bottlenecks</h2>
      <pre>
        <code>{`./target/release/ixos-profile --dir dataset --model ixos-flash-v2 --cache-mode local
./target/release/ixos-profile --dir dataset --model potion --cache-mode local`}</code>
      </pre>

      <h2>4) Quality evaluation</h2>
      <pre>
        <code>{`python scripts/ixos_eval.py --suite both --output models/lab/results_latest.json
python scripts/ixos_eval.py --suite synthetic --output models/lab/results_synth_latest.json`}</code>
      </pre>

      <h2>5) Compare before vs after</h2>
      <pre>
        <code>{`python scripts/compare_performance.py \
  --before-bench reports/benchmarks/big_bench_<before>.json \
  --after-bench reports/benchmarks/big_bench_<after>.json \
  --output reports/benchmarks/comparison_<stamp>.md`}</code>
      </pre>
      <p>
        The comparison report includes: latency deltas, stage p95 deltas, harsh objective checks,
        and per-query regression hotspots.
      </p>

      <h2>Tier objectives</h2>
      <ul>
        <li>Tier A: TTFR p50 ≤ 60ms, Total p95 ≤ 400ms.</li>
        <li>Tier B: TTFR p50 ≤ 120ms, Total p95 ≤ 2.0s.</li>
        <li>Tier C: Cold TTFR p50 ≤ 200ms, Cold Total p95 ≤ 12s, Warm Total p95 ≤ 5s.</li>
      </ul>

      <h2>Harsh objectives (optimization mode)</h2>
      <ul>
        <li>Tier A: TTFR p50 ≤ 35ms, Total p95 ≤ 250ms.</li>
        <li>Tier B: TTFR p50 ≤ 70ms, Total p95 ≤ 1.2s.</li>
        <li>Tier C: Cold TTFR p50 ≤ 120ms, Cold Total p95 ≤ 6s, Warm Total p95 ≤ 2.5s.</li>
        <li>Tier C stage caps: Ripgrep p95 ≤ 80ms, Embed p95 ≤ 40ms, Rank p95 ≤ 80ms.</li>
      </ul>

      <h2>Artifact policy</h2>
      <ul>
        <li>Iteration artifacts: <code>reports/benchmarks/iteration_*</code>.</li>
        <li>Big-root benchmark artifacts: <code>reports/benchmarks/big_bench_*.json|md</code>.</li>
        <li>Comparison reports: <code>reports/benchmarks/comparison_*.json|md</code>.</li>
        <li>Quality outputs: <code>models/lab/results_*.json</code>.</li>
      </ul>

      <p className="docs-next">
        Next: <Link href="/docs/agents">Agent Workflows</Link>
      </p>
    </div>
  );
}
