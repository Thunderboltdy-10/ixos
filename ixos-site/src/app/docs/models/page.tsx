import Link from "next/link";

export default function DocsModelsPage() {
  return (
    <div className="docs-content max-w-4xl">
      <p className="docs-kicker">{"// MODELS_AND_HF"}</p>
      <h1 className="docs-h1">Models + Hugging Face</h1>
      <p className="docs-lead">
        Ixos enforces canonical model IDs and separate user-facing branding to prevent naming drift
        across CLI, desktop, manifests, and benchmark reports.
      </p>

      <h2>Canonical IDs</h2>
      <ul>
        <li><code>ixos-flash-v1</code>: legacy Flash baseline.</li>
        <li><code>ixos-flash-v2</code>: current Flash generation.</li>
        <li><code>ixos-pro-v1</code>: legacy Pro baseline (comparison only).</li>
        <li><code>ixos-pro-v2</code>: current Pro generation.</li>
        <li><code>potion-base-8m-int8</code>: internal dependency model.</li>
      </ul>

      <h2>User-facing branding</h2>
      <ul>
        <li><strong>Flash Quartz</strong> - mapped to <code>ixos-flash-v2</code>.</li>
        <li><strong>Pro Prism</strong> - mapped to <code>ixos-pro-v2</code>.</li>
        <li><strong>Potion Core</strong> - mapped to <code>potion-base-8m-int8</code>.</li>
      </ul>

      <h2>Folder layout</h2>
      <pre>
        <code>{`models/
  ixos-flash-v1/
  ixos-flash-v2/
  ixos-pro-v1/
  ixos-pro-v2/
  potion-base-8m-int8/

models/lab/
  CANONICAL_RESULTS.md
  LEADERBOARD.md
  EXPERIMENT_LOG.md`}</code>
      </pre>

      <h2>Publishing checklist</h2>
      <ol>
        <li>Validate model files load from safetensors on all supported platforms.</li>
        <li>Run quality + perf evaluation and save outputs to <code>models/lab</code>.</li>
        <li>Update model manifest and desktop downloader references.</li>
        <li>Verify CLI model list JSON and desktop switcher display expected branded names.</li>
        <li>Update docs references and changelog entries.</li>
      </ol>

      <h2>Validation commands</h2>
      <pre>
        <code>{`cargo run --bin ixos -- model list --json
python scripts/ixos_eval.py --suite both --output models/lab/results_latest.json
cargo run --release --bin ixos-big-bench -- --dir . --runs 3 --model ixos-flash-v2 --cache-mode native-cache --output-dir reports/ralph`}</code>
      </pre>

      <p className="docs-next">
        Next: <Link href="/docs/benchmarking">Benchmarking</Link>
      </p>
    </div>
  );
}
