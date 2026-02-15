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

      <h2 id="install">Install</h2>
      <p>
        The commands below install the <strong>CLI binary</strong> (not the desktop app).
        For desktop installers, use <Link href="/download">/download</Link>.
      </p>
      <pre>
        <code>{`# macOS / Linux / WSL
curl -fsSL https://ixos.dev/install.sh | sh

# Windows PowerShell
irm https://ixos.dev/install.ps1 | iex

# Verify
ixos --version`}</code>
      </pre>
      <p>
        The installer is intended to be zero-touch: it downloads the right binary, places it on PATH,
        and runs a version check. After install, use <code>ixos ...</code> directly (no <code>.exe</code> suffix needed in normal shells).
      </p>

      <h2>Core commands</h2>
      <pre>
        <code>{`# Search current directory
ixos search "release notes around api auth"

# Search specific directory
ixos search "quarterly forecast" --dir ~/Documents/Finance

# Ask-style query (Ask intent is detected automatically)
ixos search "summarize all NDA renewal deadlines" --model ixos-pro-v2 --deep-search`}</code>
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
./target/release/ixos-profile --dir dataset --model ixos-flash-v2 --cache-mode native-cache`}</code>
      </pre>

      <h2>GitHub Actions releases</h2>
      <pre>
        <code>{`# Desktop release workflow (tag starts with v)
git tag v1.2.3
git push origin v1.2.3

# CLI release workflow (tag starts with cli-v)
git tag cli-v1.2.3
git push origin cli-v1.2.3`}</code>
      </pre>
      <ul>
        <li><strong>Desktop workflow:</strong> <code>.github/workflows/release.yml</code> (Windows/macOS/Linux app assets).</li>
        <li><strong>CLI workflow:</strong> <code>.github/workflows/cli-release.yml</code> (tar/zip CLI artifacts + sha256 files).</li>
        <li>Check run status in the repository <strong>Actions</strong> tab after pushing a tag.</li>
      </ul>

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
