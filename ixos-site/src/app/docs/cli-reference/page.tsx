import Link from "next/link";

export default function DocsCliReferencePage() {
  return (
    <div className="docs-content max-w-4xl">
      <p className="docs-kicker">{"// CLI_REFERENCE"}</p>
      <h1 className="docs-h1">CLI Reference</h1>
      <p className="docs-lead">
        Ixos CLI is built for local-first search automation. Use these commands for installation,
        model management, search execution, and diagnostics.
      </p>

      <h2>Install</h2>
      <pre>
        <code>{`curl -fsSL https://ixos.dev/install.sh | sh`}</code>
      </pre>

      <h2>Core commands</h2>
      <pre>
        <code>{`# Search current directory
ixos search "release notes around api auth"

# Search specific directory
ixos search "quarterly forecast" --dir ~/Documents/Finance

# Ask mode with explicit model + mode
ixos ask "summarize all NDA renewal deadlines" --model ixos-pro-v2 --cache-mode deep-search`}</code>
      </pre>

      <h2>Model management</h2>
      <pre>
        <code>{`# List local and available models
ixos model list --json

# Pull latest Ixos Flash
ixos model pull ixos-flash-v2

# Pull latest Ixos Pro
ixos model pull ixos-pro-v2`}</code>
      </pre>

      <h2>Mode mapping</h2>
      <ul>
        <li>
          <strong>Local:</strong> fastest repeated retrieval with local cache.
        </li>
        <li>
          <strong>Memory:</strong> in-memory execution without persistent cache writes.
        </li>
        <li>
          <strong>Deep Search:</strong> richer query decomposition and evidence extraction.
        </li>
      </ul>

      <h2>Diagnostics</h2>
      <pre>
        <code>{`# Validate environment, models, and filesystem permissions
ixos doctor --verbose

# Capture profiling data
./target/release/ixos-profile --dir dataset --model ixos-flash-v2 --cache-mode local`}</code>
      </pre>

      <h2>Automation tips</h2>
      <ul>
        <li>Always pass explicit <code>--model</code> and <code>--cache-mode</code> in scripts.</li>
        <li>Capture output to files for reproducible audits.</li>
        <li>Use JSON output where available for downstream parsing.</li>
      </ul>

      <p className="docs-next">
        Next: <Link href="/docs/troubleshooting">Troubleshooting</Link>
      </p>
    </div>
  );
}
