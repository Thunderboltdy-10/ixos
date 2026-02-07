import Link from "next/link";

export default function DocsBenchmarkingPage() {
  return (
    <div className="docs-content max-w-4xl">
      <p className="docs-kicker">{"// BENCHMARKING"}</p>
      <h1 className="docs-h1">Benchmarking + Profiling</h1>
      <p className="docs-lead">
        Every optimization claim must be tied to reproducible commands, captured artifacts, and a
        before/after table.
      </p>

      <h2>Required build and eval commands</h2>
      <pre>
        <code>{`cargo build --release

python scripts/ixos_eval.py --suite both --output models/lab/results_<stamp>.json ...

./target/release/ixos-bench --dir dataset --runs 10 --cache-mode jit --model <model_id>

./target/release/ixos-profile --dir dataset --model <model_id> --cache-mode jit`}</code>
      </pre>

      <h2>Artifact policy</h2>
      <ul>
        <li>Baselines saved under `reports/baseline_*`.</li>
        <li>Improved runs saved under `reports/v2_*`.</li>
        <li>Final summary at `reports/V2_FINAL_WRITEUP.md`.</li>
        <li>Leaderboard synced to `models/lab/CANONICAL_RESULTS.md`.</li>
      </ul>

      <h2>Report structure</h2>
      <ol>
        <li>Run metadata: model ID, cache mode, dataset, run count.</li>
        <li>Quality: MRR@10 and Recall@10.</li>
        <li>Latency: p50/p95 and ms per 1k docs.</li>
        <li>Before/after delta table with percentage improvements.</li>
      </ol>

      <h2>Performance targets</h2>
      <ul>
        <li>Flash v2: strong quality with sub-350 ms/1k latency profile target.</li>
        <li>Pro v2: quality gain with bounded latency, or better TTFR behavior.</li>
        <li>Ask mode: no hidden model forcing and fast progressive output.</li>
      </ul>

      <p className="docs-next">
        Next: <Link href="/docs/agents">Agent Workflows</Link>
      </p>
    </div>
  );
}
