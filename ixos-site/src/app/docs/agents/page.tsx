import Link from "next/link";

export default function DocsAgentsPage() {
  return (
    <div className="docs-content max-w-4xl">
      <p className="docs-kicker">{"// AGENT_ARCHITECTURE"}</p>
      <h1 className="docs-h1">AI Agent Architecture</h1>
      <p className="docs-lead">
        Ixos supports agent-driven workflows where planning, search, evidence extraction, and
        execution stay local-first. This guide describes how to design reliable agent systems on
        top of Ixos CLI and desktop APIs.
      </p>

      <h2>Reference architecture</h2>
      <ul>
        <li>
          <strong>Planner agent:</strong> converts user intent into search tasks and constraints.
        </li>
        <li>
          <strong>Retriever agent:</strong> runs Ixos search with selected model and mode.
        </li>
        <li>
          <strong>Evidence agent:</strong> validates snippets/chunks before final answer assembly.
        </li>
        <li>
          <strong>Action agent:</strong> performs follow-up actions (open file, export report, etc.).
        </li>
      </ul>

      <h2>Mode + model routing</h2>
      <ul>
        <li>
          <strong>Local mode:</strong> default for fast repeated retrieval with local cache.
        </li>
        <li>
          <strong>Memory mode:</strong> minimal persistence for sensitive one-off searches.
        </li>
        <li>
          <strong>Deep Search mode:</strong> richer query decomposition and evidence fusion.
        </li>
        <li>
          <strong>Ixos Flash:</strong> low-latency default for most retrieval chains.
        </li>
        <li>
          <strong>Ixos Pro:</strong> deeper reasoning and synthesis for complex requests.
        </li>
      </ul>

      <h2>Control plane contract</h2>
      <ul>
        <li>Always pass explicit model + mode in agent-issued search commands.</li>
        <li>Never silently promote to Ixos Pro when a user selected Ixos Flash.</li>
        <li>Propagate confidence score + evidence list to downstream agents.</li>
        <li>Attach command + output artifact path for reproducibility.</li>
      </ul>

      <h2>Recommended interaction loop</h2>
      <ol>
        <li>Collect intent, directory scope, and privacy requirements.</li>
        <li>Run broad retrieval in Ixos Flash + Local mode.</li>
        <li>If confidence is low, retry with Deep Search and narrower constraints.</li>
        <li>Ground answer with file paths and snippets before agent response.</li>
        <li>Log command, latency, and selected artifacts for auditability.</li>
      </ol>

      <h2>Safety and privacy controls</h2>
      <ul>
        <li>Default to local execution and local artifact storage.</li>
        <li>Use Memory mode for high-sensitivity workflows.</li>
        <li>Require explicit opt-in before external network calls.</li>
        <li>Redact secrets from agent logs and exported reports.</li>
      </ul>

      <h2>Implementation entry points</h2>
      <ul>
        <li>
          CLI command patterns: <Link href="/docs/cli-reference">CLI Reference</Link>.
        </li>
        <li>
          Desktop flow constraints: <Link href="/docs/desktop-app">Desktop App</Link>.
        </li>
        <li>
          Perf and quality validation: <Link href="/docs/benchmarking">Benchmarking</Link>.
        </li>
      </ul>

      <p className="docs-next">
        Next: <Link href="/docs/troubleshooting">Troubleshooting</Link>
      </p>
    </div>
  );
}
