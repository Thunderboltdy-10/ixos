import Link from "next/link";

export default function DocsTroubleshootingPage() {
  return (
    <div className="docs-content max-w-4xl">
      <p className="docs-kicker">{"// TROUBLESHOOTING"}</p>
      <h1 className="docs-h1">Troubleshooting</h1>
      <p className="docs-lead">
        Common Ixos setup and runtime issues, with direct checks you can run before opening a
        support ticket.
      </p>

      <h2>Installer or launch failure</h2>
      <ul>
        <li>Confirm OS version meets minimum requirements (Windows 10+, macOS 12+, modern Linux).</li>
        <li>Re-download installer from <code>/download</code> and verify file integrity.</li>
        <li>Run the desktop app once with elevated privileges if policy tools block first launch.</li>
      </ul>

      <h2>No results or weak recall</h2>
      <ul>
        <li>Verify selected model is installed in the model manager or CLI list output.</li>
        <li>Switch from Memory to Local mode for repeated retrieval in large folders.</li>
        <li>Try Deep Search mode for broad or ambiguous natural-language prompts.</li>
        <li>Narrow directory scope and retry with clearer entities and timeframe.</li>
      </ul>

      <h2>Slow search on large roots</h2>
      <ul>
        <li>Run Flash model first to establish baseline latency.</li>
        <li>Profile with <code>ixos-profile</code> to locate scan/embed/rank bottlenecks.</li>
        <li>Exclude heavy generated folders and binary dumps from search root.</li>
      </ul>

      <h2>Ask Mode feels different from Search mode</h2>
      <ul>
        <li>Confirm Ask Mode is respecting your selected model and mode.</li>
        <li>Check logs for silent model overrides and disable fallback coercion if present.</li>
        <li>Use Ixos Flash for speed-first answers and Ixos Pro for higher reasoning depth.</li>
      </ul>

      <h2>Credential or account sync issues</h2>
      <ul>
        <li>Sign out and sign back in to refresh entitlement state.</li>
        <li>Check billing/account status on the account dashboard.</li>
        <li>Ensure system clock is accurate when token validation fails.</li>
      </ul>

      <h2>Useful command bundle</h2>
      <pre>
        <code>{`ixos doctor --verbose
ixos model list --json
cargo test
cargo build --release`}</code>
      </pre>

      <p className="docs-next">
        Back to: <Link href="/docs">Docs Overview</Link>
      </p>
    </div>
  );
}
