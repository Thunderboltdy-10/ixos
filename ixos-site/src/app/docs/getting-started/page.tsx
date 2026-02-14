import Link from "next/link";

export default function DocsGettingStartedPage() {
  return (
    <div className="docs-content max-w-4xl">
      <p className="docs-kicker">{"// GETTING_STARTED"}</p>
      <h1 className="docs-h1">Getting Started</h1>
      <p className="docs-lead">
        This guide covers install prerequisites, first-run setup, and validation commands for both
        desktop users and local contributors.
      </p>

      <h2>System requirements</h2>
      <ul>
        <li>Windows 10/11 x64 or macOS 12+ (Linux for CLI dev/testing).</li>
        <li>8 GB RAM minimum, 16 GB recommended for medium/large roots.</li>
        <li>500 MB free disk for binaries + model artifacts.</li>
        <li>Modern x64 CPU (AVX2 preferred for best embedding throughput).</li>
      </ul>

      <h2>Desktop installation flow</h2>
      <ol>
        <li>Download the installer from the Download page.</li>
        <li>Install and launch Ixos.</li>
        <li>Authenticate with your account.</li>
        <li>Install at least one model (Ixos Flash recommended first).</li>
        <li>Choose search root and run a first query.</li>
      </ol>

      <h2>Search mode defaults</h2>
      <ul>
        <li><strong>Local (default):</strong> persistent ADS/xattr cache for fast repeat queries.</li>
        <li><strong>Memory:</strong> memory-only mode for minimal persistence.</li>
        <li><strong>Deep Search:</strong> richer analysis path for ambiguous or complex prompts.</li>
      </ul>

      <h2>Run from source</h2>
      <pre>
        <code>{`# Rust core + CLI
cargo build
cargo test

# Desktop UI
npm run dev

# Tauri shell
npm run tauri:dev

# Docs/landing site
cd ixos-site
npm run dev`}</code>
      </pre>

      <h2>Environment configuration</h2>
      <ul>
        <li>Copy <code>ixos-site/.env.example</code> and set Clerk + billing variables.</li>
        <li>Copy <code>src-tauri/.env.example</code> for desktop runtime settings.</li>
        <li>For production desktop builds, set <code>VITE_API_URL</code>, <code>VITE_CLERK_PUBLISHABLE_KEY</code>, and <code>IXOS_JWT_PUBLIC_KEY</code>.</li>
      </ul>

      <h2>First-run validation checklist</h2>
      <ul>
        <li>Search returns streaming lexical then semantic results.</li>
        <li>Ask Mode toggle works and does not force wrong model path.</li>
        <li>Model list works in CLI JSON and desktop model switcher.</li>
        <li>Settings mode labels show Local/Memory/Deep Search consistently.</li>
      </ul>

      <p className="docs-next">
        Next: <Link href="/docs/desktop-app">Desktop App</Link>
      </p>
    </div>
  );
}
