import Link from "next/link";

export default function DocsDesktopAppPage() {
  return (
    <div className="docs-content max-w-4xl">
      <p className="docs-kicker">{"// DESKTOP_APP"}</p>
      <h1 className="docs-h1">Desktop App Architecture</h1>
      <p className="docs-lead">
        Ixos desktop is a local-first search stack: Rust core for retrieval, Tauri command bridge,
        and React UI for progressive result streaming. The design goal is fast retrieval with
        explicit privacy controls.
      </p>

      <h2>Core architecture</h2>
      <ul>
        <li><strong>Engine:</strong> <code>src/ixos_rank</code> + <code>src/ixos_embed</code>.</li>
        <li><strong>Desktop bridge:</strong> <code>src-tauri/src/commands/*</code>.</li>
        <li><strong>UI:</strong> <code>ui/src/components/search/*</code>.</li>
        <li><strong>Config:</strong> <code>src/cli/config.rs</code> and settings store parity.</li>
      </ul>

      <h2>Search flow</h2>
      <ol>
        <li>Query enters progressive pipeline (lexical candidate pass first).</li>
        <li>Semantic rerank applies selected model (Flash Quartz, Pro Prism, or Potion Core).</li>
        <li>Evidence/snippet extraction runs for explainability.</li>
        <li>Results stream continuously to UI, then finalize with ranking metadata.</li>
      </ol>

      <h2>Privacy and cache modes</h2>
      <ul>
        <li><strong>NativeCache (default):</strong> ADS/xattr backed persistent embedding cache.</li>
        <li><strong>Ephemeral:</strong> memory-only embeddings, no persistent cache writes.</li>
        <li><strong>Journalist:</strong> hardened profile built on Ephemeral + strict controls.</li>
      </ul>

      <h2>Ask Mode contract</h2>
      <ul>
        <li>Respects user-selected model and search mode.</li>
        <li>Never silently forces Pro for regular queries.</li>
        <li>Keeps progressive output responsive while evidence is collected.</li>
      </ul>

      <h2>Operational checks before release</h2>
      <ol>
        <li>Sign-in/sign-out and entitlement refresh paths pass.</li>
        <li>Model list and model switching works in UI and CLI JSON output.</li>
        <li>Mode names are consistent: NativeCache/Ephemeral across UI, CLI, docs.</li>
        <li>Search and Ask Mode behavior match expected confidence gating.</li>
      </ol>

      <h2>Useful commands</h2>
      <pre>
        <code>{`# Desktop dev
npm run tauri:dev

# Desktop production build (requires env vars)
npm run tauri:build

# Backend validation
cargo test
cargo run --bin ixos -- doctor --verbose`}</code>
      </pre>

      <p className="docs-next">
        Next: <Link href="/docs/models">Models + Hugging Face</Link>
      </p>
    </div>
  );
}
