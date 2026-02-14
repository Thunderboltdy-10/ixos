import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { getDownloadUrl } from "@/lib/downloads";

export default function DocsOverviewPage() {
  return (
    <div className="docs-content max-w-4xl">
      <p className="docs-kicker">{"// OVERVIEW"}</p>
      <h1 className="docs-h1">Ixos Documentation</h1>
      <p className="docs-lead">
        Ixos is a local-first desktop search system with a Rust core, Tauri bridge, React UI, and
        versioned model pipeline. This reference documents setup, runtime behavior, model
        operations, benchmarking, CLI usage, troubleshooting, and agent architecture patterns.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild>
          <Link href={getDownloadUrl("windows") ?? "/download"}>Download for Windows</Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/docs/getting-started">Start Setup Guide</Link>
        </Button>
      </div>

      <h2>What you can run from this repo</h2>
      <ul>
        <li>`src/` Rust search core, ranking logic, and CLI tools.</li>
        <li>`src-tauri/` desktop command bridge and app shell.</li>
        <li>`ui/` desktop interface (Vite + React).</li>
        <li>`ixos-site/` marketing site, account routes, and public docs.</li>
        <li>`models/` and `models/lab/` model artifacts and evaluation logs.</li>
      </ul>

      <h2>Read path</h2>
      <ol>
        <li>
          <Link href="/docs/getting-started">Getting Started</Link> for installation and first
          search.
        </li>
        <li>
          <Link href="/docs/desktop-app">Desktop App</Link> for UI behavior and command flow.
        </li>
        <li>
          <Link href="/docs/cli-reference">CLI Reference</Link> for automation and shell workflows.
        </li>
        <li>
          <Link href="/docs/models">Models + Hugging Face</Link> for canonical IDs and publish
          flow.
        </li>
        <li>
          <Link href="/docs/benchmarking">Benchmarking</Link> for reproducible quality/latency
          evidence.
        </li>
        <li>
          <Link href="/docs/agents">AI Agent Architecture</Link> for multi-agent integration.
        </li>
        <li>
          <Link href="/docs/troubleshooting">Troubleshooting</Link> for common runtime issues.
        </li>
      </ol>

      <h2>Canonical references</h2>
      <ul>
        <li>`AGENTS.md` operating contract for repository execution.</li>
        <li>`PLAN.md` active goals and state snapshot.</li>
        <li>`RUNLOG.md` command/output trail.</li>
        <li>`DECISIONS.md` rationale for keep/revert/pivot choices.</li>
        <li>`docs/MARKDOWN_INVENTORY.md` complete markdown index.</li>
      </ul>
    </div>
  );
}
