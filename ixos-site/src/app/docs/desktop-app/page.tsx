import Link from "next/link";

export default function DocsDesktopAppPage() {
  return (
    <div className="docs-content max-w-4xl">
      <p className="docs-kicker">{"// DESKTOP_APP"}</p>
      <h1 className="docs-h1">Desktop App</h1>
      <p className="docs-lead">
        Ixos desktop combines a Rust search engine, Tauri command layer, and React interface for
        low-latency local retrieval with zero-index privacy behavior.
      </p>

      <h2>Pipeline behavior</h2>
      <ol>
        <li>Parse intent and entities from the natural query.</li>
        <li>Generate local embeddings in JIT mode.</li>
        <li>Blend semantic and lexical signals for ranking.</li>
        <li>Wipe transient buffers and vectors after scoring.</li>
        <li>Stream ranked files to the UI as soon as they are available.</li>
      </ol>

      <h2>Core files</h2>
      <pre>
        <code>{`ui/src/components/search/MainSearchView.tsx
ui/src/components/search/ModelSwitcher.tsx
ui/src/components/search/AskModeSwitcher.tsx
ui/src/components/auth/AuthGate.tsx
src-tauri/src/commands/search.rs
src-tauri/src/commands/system.rs
src/ixos_rank/
src/ixos_embed/`}</code>
      </pre>

      <h2>Ask mode rule</h2>
      <ul>
        <li>Ask mode must respect the user-selected model.</li>
        <li>It must not silently force a slower Pro path.</li>
        <li>Progressive updates must remain fast and readable.</li>
      </ul>

      <h2>Auth and entitlement</h2>
      <ul>
        <li>Identity is managed with Clerk flows.</li>
        <li>Desktop entitlement checks call `/api/desktop/*` endpoints on the site.</li>
        <li>Device transfer flow supports Pro entitlement portability.</li>
      </ul>

      <h2>Release checks</h2>
      <ul>
        <li>Clean-machine sign-in and model install tested end-to-end.</li>
        <li>Search and Ask mode validated with explicit model selection.</li>
        <li>Settings pages (privacy/compliance/account) verified functional.</li>
        <li>Result streaming and ranking explanations match backend output.</li>
      </ul>

      <p className="docs-next">
        Next: <Link href="/docs/models">Models + Hugging Face</Link>
      </p>
    </div>
  );
}
