import Link from "next/link";

export default function DocsModelsPage() {
  return (
    <div className="docs-content max-w-4xl">
      <p className="docs-kicker">{"// MODELS_AND_HF"}</p>
      <h1 className="docs-h1">Models + Hugging Face</h1>
      <p className="docs-lead">
        Ixos uses canonical model IDs to prevent naming drift across desktop UI, CLI flags,
        manifests, benchmarks, and docs.
      </p>

      <h2>Canonical model IDs</h2>
      <ul>
        <li>`ixos-flash-v1` legacy Flash baseline.</li>
        <li>`ixos-flash-v2` current Flash v2 generation.</li>
        <li>`ixos-pro-v1` legacy hidden Pro baseline.</li>
        <li>`ixos-pro-v2` true Pro v2 definition.</li>
        <li>`potion-base-8m-int8` internal dependency.</li>
      </ul>

      <h2>Artifact structure</h2>
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

      <h2>Publish flow</h2>
      <ol>
        <li>Prepare model files in the canonical folder.</li>
        <li>Upload artifacts with Git LFS to Hugging Face.</li>
        <li>Update desktop download manifests if IDs or files changed.</li>
        <li>Update docs and canonical results references.</li>
        <li>Validate install and selection in the desktop model switcher.</li>
      </ol>

      <h2>Required references</h2>
      <ul>
        <li>`reports/HF_UPLOAD_PLAYBOOK.md`</li>
        <li>`reports/MODEL_NAMING_MIGRATION.md`</li>
        <li>`models/lab/CANONICAL_RESULTS.md`</li>
      </ul>

      <p className="docs-next">
        Next: <Link href="/docs/benchmarking">Benchmarking</Link>
      </p>
    </div>
  );
}
