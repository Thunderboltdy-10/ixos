import Link from "next/link";

export default function DocsGettingStartedPage() {
  return (
    <div className="docs-content max-w-4xl">
      <p className="docs-kicker">{"// GETTING_STARTED"}</p>
      <h1 className="docs-h1">Getting Started</h1>
      <p className="docs-lead">
        This setup guide covers install prerequisites, local development commands, environment
        configuration, and first-run validation for the Ixos desktop stack.
      </p>

      <h2>System requirements</h2>
      <ul>
        <li>Windows 10/11 x64 or macOS 12+.</li>
        <li>8 GB RAM minimum, 16 GB recommended for larger directory sets.</li>
        <li>500 MB free disk space for app binaries and model artifacts.</li>
        <li>Modern x64 CPU with AVX2 support preferred.</li>
      </ul>

      <h2>Install desktop build</h2>
      <ol>
        <li>Download the installer from the Download page.</li>
        <li>Run installer and complete OS permission prompts.</li>
        <li>Launch Ixos and authenticate.</li>
        <li>Install at least one model from settings before first search.</li>
        <li>Select a folder scope and execute a natural-language query.</li>
      </ol>

      <h2>Run from source</h2>
      <pre>
        <code>{`# From repo root
cargo build
cargo test

# Desktop UI
npm run dev

# Desktop shell
npm run tauri:dev

# Landing + docs site
cd ixos-site
npm run dev`}</code>
      </pre>

      <h2>Environment configuration</h2>
      <ul>
        <li>Copy `ixos-site/.env.example` and set Clerk/billing variables.</li>
        <li>Copy `src-tauri/.env.example` for desktop-specific runtime settings.</li>
        <li>Confirm API URLs align between desktop and site before auth tests.</li>
      </ul>

      <h2>First-run verification</h2>
      <ul>
        <li>Sign-in and sign-up text/controls are readable on both desktop and web auth screens.</li>
        <li>Model switcher shows install status and active selection.</li>
        <li>Search results stream correctly and open/reveal actions work.</li>
        <li>Ask mode respects selected model and remains responsive.</li>
      </ul>

      <p className="docs-next">
        Next: <Link href="/docs/desktop-app">Desktop App</Link>
      </p>
    </div>
  );
}
