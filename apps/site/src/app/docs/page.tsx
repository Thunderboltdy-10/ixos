import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Code } from "@/components/Code";
import { GITHUB, HUGGING_FACE, RELEASES } from "@/lib/github";
import { installCommand } from "@/lib/install";
import { MEDIAN, MEMORY_MB, P95 } from "@/lib/latency";
import { Sidebar, type Group } from "./Sidebar";

export const metadata: Metadata = {
  title: "Docs · Ixos",
  description: "Install Ixos and use it from the desktop, the terminal or an AI agent.",
};

const GROUPS: Group[] = [
  {
    title: "Get started",
    pages: [
      { id: "install", title: "Install" },
      { id: "first-search", title: "First search" },
      { id: "ranking", title: "How Ixos ranks" },
    ],
  },
  {
    title: "Desktop",
    pages: [
      { id: "overlay", title: "Quick search" },
      { id: "window", title: "Search window" },
      { id: "settings", title: "Settings" },
      { id: "shortcuts", title: "Shortcuts" },
    ],
  },
  {
    title: "Command line",
    pages: [
      { id: "search", title: "search" },
      { id: "grep", title: "grep" },
      { id: "read", title: "read" },
      { id: "cache", title: "cache" },
      { id: "config", title: "config" },
      { id: "setup", title: "setup and model" },
      { id: "doctor", title: "doctor" },
    ],
  },
  {
    title: "AI agents",
    pages: [
      { id: "agents", title: "Claude Code and Codex" },
      { id: "tools", title: "Tools" },
      { id: "evidence", title: "Function evidence" },
      { id: "batches", title: "Batched reads" },
      { id: "hashes", title: "Source hashes" },
    ],
  },
  {
    title: "Reference",
    pages: [
      { id: "settings-file", title: "Settings file" },
      { id: "environment", title: "Environment variables" },
      { id: "records", title: "Records and cache" },
      { id: "output", title: "Output and size limits" },
    ],
  },
  {
    title: "Results",
    pages: [
      { id: "results", title: "Retrieval benchmarks" },
      { id: "speed", title: "Speed" },
      { id: "agent-studies", title: "Agent studies" },
    ],
  },
];

function Page({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="doc">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="doc-table">
      <table>
        <thead>
          <tr>
            {head.map((cell) => (
              <th key={cell}>{cell}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, column) => (
                <td key={column}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Docs() {
  return (
    <div className="docs">
      <Sidebar groups={GROUPS} />
      <article className="docs-body">
        <header className="docs-head">
          <h1>Docs</h1>
          <p className="lede">
            Ixos searches the files on your computer by keywords and meaning. It is one program, <code>ixos</code>, used
            three ways: the desktop app, the terminal, and AI agents over MCP. All three share the same settings, models
            and records.
          </p>
        </header>

        <Page id="install" title="Install">
          <p>
            <strong>One installer.</strong> The small bootstrap executable from the{" "}
            <a href={RELEASES}>releases page</a> installs the shared CLI/engine, MCP and agent skill, verifies both models,
            and includes desktop by default. Windows and Linux on x86-64 and macOS on Apple silicon and Intel are supported.
          </p>
          <p>
            <strong>Agent installation.</strong> These scripts download and verify the same binary installer. No Rust
            or Node is needed. They add <code>ixos</code> to your user PATH and verify the models from <a href={HUGGING_FACE}>Hugging Face</a>.
          </p>
          <Code label="Windows, PowerShell">{installCommand("windows", true)}</Code>
          <Code label="macOS and Linux">{installCommand("unix", true)}</Code>
          <p>For CLI/MCP/skill only, append <code>-NoDesktop</code> on Windows, or use <code>sh -s -- --no-desktop</code> after the pipe on macOS/Linux. Open a new terminal after installation. Published engine and desktop releases are required for these links.</p>
          <p><code>ixos update</code> updates the CLI/MCP/skill; <code>ixos update --desktop</code> includes desktop. CLI and MCP suggest available updates, while desktop applies compatible engine and signed app updates on launch/login and restarts. Custom engine overrides are preserved.</p>
          <p>
            After setup, everything works offline. Keyword search, <code>grep</code> and <code>read</code> never need a
            model. To install without a network, see <a href="#setup">setup and model</a>.
          </p>
        </Page>

        <Page id="first-search" title="First search">
          <p>From a project folder, ask for something by what it does. This example shows results from Ixos&apos;s source:</p>
          <Code label="Terminal">{`ixos search "skip files that are still in the cloud" --dir . --limit 3`}</Code>
          <p>Each result is the file and the passage that matched best, with line numbers:</p>
          <pre className="doc-output">{`ixos-core/src/cloud.rs:184:/// Check if we should skip processing this file to avoid triggering a cloud download
ixos-core/src/cloud.rs:185:///
ixos-core/src/cloud.rs:186:/// Returns \`true\` if the file should be skipped (cloud-only)
ixos-core/src/discover.rs:5:/// \`build\` is intentionally absent: it can be a source module (e.g. Clap).
…`}</pre>
          <p>Add <code>--json</code> for output a program can read:</p>
          <pre className="doc-output">{`{"results":[{"path":"ixos-core/src/cloud.rs","score":0.73457474,"snippet":{
  "path":"ixos-core/src/cloud.rs","start_line":182,"end_line":186,"text":"…"}}]}`}</pre>
        </Page>

        <Page id="ranking" title="How Ixos ranks">
          <p>Every search runs two rankings and averages them.</p>
          <Table
            head={["Part", "How it works"]}
            rows={[
              [
                "Keywords",
                "BM25 over the full text of each file, including its path (k1 = 1.2, b = 0.75). Small spelling mistakes are corrected; names, paths, numbers and quoted text are left alone.",
              ],
              [
                "Meaning",
                "Model2Vec static embeddings on the CPU. Code files keep up to eight passages of at most 1,800 characters; documents keep one vector for the whole text.",
              ],
              [
                "Candidates",
                "The top 100 files by keywords together with the top 100 by meaning whose similarity is above 0.25.",
              ],
              ["Score", "Half the cosine similarity plus half the keyword score divided by the best keyword score."],
              [
                "Passage",
                "Within the chosen file, the passage closest to the query is picked, then its strongest keyword line anchors the excerpt.",
              ],
            ]}
          />
          <p>
            Scores order the results; they are not probabilities. A query that is an exact identifier only matches files
            that contain it. Choose a mode with <code>--mode</code>:
          </p>
          <Table
            head={["Mode", "Uses", "Needs a model"]}
            rows={[
              [<code key="m">hybrid</code>, "Keywords and meaning. The default.", "Yes"],
              [<code key="m">lexical</code>, "Keywords only.", "No"],
              [<code key="m">semantic</code>, "Meaning only.", "Yes"],
            ]}
          />
          <p>The two profiles use different models:</p>
          <Table
            head={["Profile", "For", "Model"]}
            rows={[
              [
                <code key="p">code</code>,
                "Source files in any language. The default.",
                <a key="l" href="https://huggingface.co/Thunderboltdy10/ixos-code">
                  ixos-code
                </a>,
              ],
              [
                <code key="p">documents</code>,
                "PDFs, Word and other Office files, notes and text.",
                <a key="l" href="https://huggingface.co/Thunderboltdy10/ixos-documents">
                  ixos-documents
                </a>,
              ],
            ]}
          />
        </Page>

        <Page id="overlay" title="Quick search">
          <p>
            Press <kbd>Ctrl</kbd> <kbd>Space</kbd> anywhere to open the quick search over whatever you are working in.
            Keyword results appear as you type; meaning is added a moment later and the list re-orders. The selected
            result shows its best passage beside the list. The shortcut can be changed in Settings.
          </p>
          <p>
            The app lives in the tray. Closing a window hides it, so the next search starts warm, unless you turn off
            Keep running when closed.
          </p>
        </Page>

        <Page id="window" title="Search window">
          <p>
            The main window shows the full list on the left and the file on the right, scrolled to the passage, with your
            query highlighted. Three menus sit in the search bar:
          </p>
          <Table
            head={["Menu", "Choices"]}
            rows={[
              ["Search in", "All folders, or one of the folders you chose in Settings."],
              ["Search for", "Automatic, Code or Documents. Automatic picks from what the folders contain."],
              ["Remember files", "Saved keeps a small record on each file so the next search is fast. Fresh writes nothing."],
            ]}
          />
        </Page>

        <Page id="settings" title="Settings">
          <Table
            head={["Setting", "What it does"]}
            rows={[
              ["Folders", "The only places Ixos reads. Nothing is chosen until you add a folder."],
              ["What you search", "Automatic, Code or Documents."],
              ["Remember files", "Whether to keep records on files between searches."],
              ["Results to show", "How many files each search returns."],
              ["Quick search shortcut", "Ctrl + Space by default. Click and press a new combination."],
              ["Keep running when closed", "Leaves Ixos in the tray when its window closes."],
              ["Start with Windows", "Starts Ixos in the tray when you sign in."],
              ["Saved records", "How many records Ixos keeps in each folder, and a button to remove them."],
              ["Models", "Download status for both models, with a retry if setup failed."],
              ["AI agents", "The commands that give Claude Code or Codex the same search."],
              ["Recent searches", "A short local list, which you can clear."],
            ]}
          />
        </Page>

        <Page id="shortcuts" title="Shortcuts">
          <Table
            head={["Keys", "Action"]}
            rows={[
              [<><kbd>Ctrl</kbd> <kbd>Space</kbd></>, "Open quick search"],
              [<><kbd>↑</kbd> <kbd>↓</kbd></>, "Move through results"],
              [<kbd key="k">Enter</kbd>, "Open the file"],
              [<><kbd>Ctrl</kbd> <kbd>Enter</kbd></>, "Show the file in its folder (⌘ Enter on macOS)"],
              [<kbd key="k">Esc</kbd>, "Clear the search, or close quick search when it is empty"],
            ]}
          />
        </Page>

        <Page id="search" title="search">
          <p>Finds files by what they are about, by keywords, or both.</p>
          <Code label="Terminal">{`ixos search "where are settings saved" --dir . --profile code --limit 5`}</Code>
          <Table
            head={["Option", "Default", "What it does"]}
            rows={[
              [<code key="o">--dir</code>, <code key="d">.</code>, "Folder to search."],
              [<code key="o">--profile</code>, <code key="d">code</code>, "code or documents."],
              [<code key="o">--mode</code>, <code key="d">hybrid</code>, "hybrid, lexical or semantic."],
              [<code key="o">--limit</code>, <code key="d">10</code>, "Number of files, 1 to 10,000."],
              [<code key="o">--context</code>, <code key="d">2</code>, "Lines around each passage, up to 100."],
              [<code key="o">--evidence</code>, <code key="d">none</code>, <>none, passages or functions. See <a href="#evidence">function evidence</a>.</>],
              [<code key="o">--json</code>, "", "Structured output."],
              [<code key="o">--model-path</code>, "", "Load a model from a local folder instead of the installed one."],
            ]}
          />
          <p>
            Defaults for profile, limit and context come from the <a href="#settings-file">settings file</a>.
          </p>
        </Page>

        <Page id="grep" title="grep">
          <p>Finds exact text or a regular expression. It follows the same ignore rules as search and needs no model.</p>
          <Code label="Terminal">{`ixos grep "source_hash" --dir crates/ixos-core --fixed`}</Code>
          <Table
            head={["Option", "Default", "What it does"]}
            rows={[
              [<code key="o">--dir</code>, <code key="d">.</code>, "Folder to search."],
              [<code key="o">-F, --fixed</code>, "", "Treat the pattern as plain text."],
              [<code key="o">-i, --ignore-case</code>, "", "Ignore letter case."],
              [<code key="o">--context</code>, <code key="d">2</code>, "Lines around each hit."],
              [<code key="o">--limit</code>, <code key="d">10</code>, "Number of files."],
              [<code key="o">--json</code>, "", "Structured output."],
            ]}
          />
        </Page>

        <Page id="read" title="read">
          <p>
            Prints lines from a file. PDFs and Office files are read as their extracted text, so line numbers refer to
            that text rather than pages.
          </p>
          <Code label="Terminal">{`ixos read src/source.rs --dir crates/ixos-core --start 1 --lines 30`}</Code>
          <Table
            head={["Option", "Default", "What it does"]}
            rows={[
              [<code key="o">--start</code>, <code key="d">1</code>, "First line."],
              [<code key="o">--lines</code>, <code key="d">40</code>, "How many lines to print."],
              [<code key="o">--end</code>, "", "Last line, inclusive, instead of --lines."],
              [<code key="o">--expected-source-hash</code>, "", <>Refuse if the file changed. See <a href="#hashes">source hashes</a>.</>],
              [<code key="o">--characters</code>, "", "Read part of one very long line."],
              [<code key="o">--character-offset</code>, <code key="d">0</code>, "Where that part starts."],
              [<code key="o">--json</code>, "", "Structured output."],
            ]}
          />
        </Page>

        <Page id="cache" title="cache">
          <p>
            Shows or removes the <a href="#records">records</a> Ixos keeps. Removing them is safe; Ixos rebuilds them on
            the next search. Only Ixos metadata is touched, never the files themselves.
          </p>
          <Code label="Terminal">{`ixos cache stats --dir .
ixos cache clear --dir .
ixos cache clear --dir . --yes
ixos cache clear --all --yes`}</Code>
          <Table
            head={["Command", "What it does"]}
            rows={[
              [<code key="c">cache stats</code>, "Files with records, bytes used, entries in the fallback cache and records from older versions."],
              [<code key="c">cache clear</code>, "Lists what would be removed. Nothing changes without --yes."],
              [<code key="c">cache clear --yes</code>, "Removes the records under --dir, which defaults to the current folder."],
              [<code key="c">cache clear --all --yes</code>, "Removes records in every configured folder and the whole fallback cache."],
            ]}
          />
        </Page>

        <Page id="config" title="config">
          <p>Shows the shared settings, or changes one. The desktop app reads the same file.</p>
          <Code label="Terminal">{`ixos config
ixos config limit 5
ixos config cache false
ixos config locations '["/home/me/projects", "/home/me/notes"]'`}</Code>
          <p>
            The keys are listed under <a href="#settings-file">settings file</a>.
          </p>
        </Page>

        <Page id="setup" title="setup and model">
          <p>
            <code>ixos setup</code> downloads both models from pinned Hugging Face revisions, checks their SHA-256 hashes
            and installs the agent skill. A failed download leaves nothing half installed; run it again once you are
            online.
          </p>
          <Code label="Terminal">{`ixos setup
ixos setup --skip-models
ixos model install documents
ixos model list`}</Code>
          <p>
            Without a network, copy the three files of each model from{" "}
            <a href="https://huggingface.co/Thunderboltdy10/ixos-code">ixos-code</a> and{" "}
            <a href="https://huggingface.co/Thunderboltdy10/ixos-documents">ixos-documents</a> into a folder, then
            install from it:
          </p>
          <Code label="Terminal">{`ixos model install code --from ./ixos-code
ixos model install documents --from ./ixos-documents`}</Code>
          <p>
            If you skip setup, the first search that needs meaning downloads the model it needs.
          </p>
        </Page>

        <Page id="doctor" title="doctor">
          <p>Loads the model, checks that the cache can be written, and runs a small search.</p>
          <Code label="Terminal">{`ixos doctor --dir . --profile code`}</Code>
        </Page>

        <Page id="agents" title="Claude Code and Codex">
          <p>
            <code>ixos mcp</code> starts an MCP server over stdio that gives an agent three tools: search, grep and read.
            Register it once per project, with the project&apos;s full path:
          </p>
          <Code label="Claude Code">{`claude mcp add --transport stdio ixos -- ixos mcp --dir /your/project --profile code`}</Code>
          <Code label="Codex">{`codex mcp add ixos -- ixos mcp --dir /your/project --profile code`}</Code>
          <p>Other MCP clients take the same command in their settings file:</p>
          <Code label="JSON">{`{
  "mcpServers": {
    "ixos": {
      "command": "ixos",
      "args": ["mcp", "--dir", "/your/project", "--profile", "code"]
    }
  }
}`}</Code>
          <p>
            If <code>ixos</code> is not on your path, use its full path. Quote Windows paths that contain spaces. Reload
            the agent afterwards and check the tools with a real call. <code>ixos setup</code> also installs a short skill
            for Claude Code and Codex that explains when each tool helps; it does not register the server.
          </p>
        </Page>

        <Page id="tools" title="Tools">
          <Table
            head={["Tool", "Use it for", "Arguments"]}
            rows={[
              [
                <code key="t">search</code>,
                "Finding code or documents from a description.",
                <code key="a">query, dir, profile, mode, limit, context, evidence, view</code>,
              ],
              [
                <code key="t">grep</code>,
                "Exact names, text or regular expressions.",
                <code key="a">pattern, dir, fixed, ignore_case, limit, context, view</code>,
              ],
              [
                <code key="t">read</code>,
                "Lines from a known file, a whole function, or several ranges at once.",
                <code key="a">path, dir, start, lines | end, within, body, expected_source_hash, characters, character_offset, requests, max_bytes, view</code>,
              ],
            ]}
          />
          <p>
            Only <code>query</code>, <code>pattern</code> or <code>path</code> (or <code>requests</code>) is required;
            the rest default to the server&apos;s folder and settings. Line ranges are inclusive. <code>view</code>{" "}
            is <code>json</code> by default; <code>numbered</code> returns compact source with line numbers and groups
            grep hits by file.
          </p>
          <Code label="read">{`{ "path": "ixos-core/src/cloud.rs", "within": "should_skip_cloud_file", "view": "numbered" }`}</Code>
          <p>
            <code>within</code> reads a whole function by name, including its doc comment. <code>Owner::name</code> picks
            a method. Add <code>&quot;body&quot;: true</code> to start at the body. If the name is defined more than once,
            the answer lists each definition instead of guessing.
          </p>
        </Page>

        <Page id="evidence" title="Function evidence">
          <p>
            For code, search can return the functions in each top file that best match the query, next to the usual
            passage. File ranking does not change.
          </p>
          <Code label="search">{`{ "query": "invalidate cached source after file changes", "evidence": "functions", "limit": 5, "view": "numbered" }`}</Code>
          <Table
            head={["Value", "Returns"]}
            rows={[
              [<code key="v">none</code>, "One passage per file. The default."],
              [<code key="v">passages</code>, "Another distinct passage per file, without parsing."],
              [
                <code key="v">functions</code>,
                "For the top three files, the closest functions with their names and exact line extents. Files that cannot be parsed fall back to passages.",
              ],
            ]}
          />
          <p>
            With evidence on, <code>matches</code> replaces <code>snippet</code>; its first entry is the usual passage.
            Each match has <code>lines</code>, <code>text</code>, and when known a <code>symbol</code> with the
            definition&apos;s extent. Evidence applies to the code profile with a model; keyword search and documents
            return their normal passage.
          </p>
        </Page>

        <Page id="batches" title="Batched reads">
          <p>
            <code>read</code> accepts up to eight ranges in one call through <code>requests</code>. Each can carry an{" "}
            <code>id</code>, and results come back in the same order.
          </p>
          <Code label="read">{`{
  "requests": [
    { "id": "definition", "path": "src/cache.rs", "start": 20, "end": 55 },
    { "id": "caller", "path": "src/main.rs", "start": 80, "lines": 12 }
  ],
  "max_bytes": 12000
}`}</Code>
          <p>
            The byte budget is split equally between the requests. A request that fails returns its own{" "}
            <code>error</code> and the others still run. <code>dir</code>, <code>view</code> and{" "}
            <code>max_bytes</code> apply to the whole call.
          </p>
        </Page>

        <Page id="hashes" title="Source hashes">
          <p>
            Search and read return a <code>source_hash</code> for each file. Pass it back as{" "}
            <code>expected_source_hash</code> and the read is refused if the file changed since, so an agent never acts
            on old line numbers.
          </p>
          <Code label="read">{`{ "path": "src/cache.rs", "start": 20, "end": 55, "expected_source_hash": "<source_hash from the search>" }`}</Code>
          <p>
            When a read is cut short, continue from <code>next_start_line</code>. For one very long line, set{" "}
            <code>characters</code> and move <code>character_offset</code> forward using{" "}
            <code>next_character_offset</code>.
          </p>
        </Page>

        <Page id="settings-file" title="Settings file">
          <p>
            The command, the agent server and the desktop app share one file, <code>ixos/settings.toml</code>, in your
            system&apos;s configuration folder.
          </p>
          <Table
            head={["System", "Settings", "Models"]}
            rows={[
              ["Windows", <code key="s">%APPDATA%\ixos\settings.toml</code>, <code key="m">%LOCALAPPDATA%\ixos\models</code>],
              [
                "macOS",
                <code key="s">~/Library/Application Support/ixos/settings.toml</code>,
                <code key="m">~/Library/Application Support/ixos/models</code>,
              ],
              ["Linux", <code key="s">~/.config/ixos/settings.toml</code>, <code key="m">~/.local/share/ixos/models</code>],
            ]}
          />
          <Table
            head={["Key", "Default", "Meaning"]}
            rows={[
              [<code key="k">locations</code>, <code key="d">[]</code>, "Folders the desktop app searches."],
              [<code key="k">profile</code>, <code key="d">code</code>, "code or documents."],
              [<code key="k">limit</code>, <code key="d">10</code>, "Files per search, 1 to 10,000."],
              [<code key="k">context</code>, <code key="d">2</code>, "Lines around each passage, up to 100."],
              [<code key="k">cache</code>, <code key="d">true</code>, "Keep records between searches."],
              [<code key="k">model_dir</code>, "the models folder above", "Where models are installed."],
            ]}
          />
          <p>
            Pass <code>--config path/to/settings.toml</code> to any command to use another file.
          </p>
        </Page>

        <Page id="environment" title="Environment variables">
          <Table
            head={["Variable", "Effect"]}
            rows={[
              [
                <code key="v">IXOS_HOME</code>,
                <>Keeps settings, models and the fallback cache in <code>config</code>, <code>data</code> and <code>cache</code> under one folder. Useful for a portable or test setup.</>,
              ],
              [<code key="v">IXOS_SKILL_HOME</code>, "Installs the agent skill under this folder instead of your home folder."],
              [<code key="v">IXOS_MODEL_PATH</code>, "Loads a model from this folder, like --model-path."],
              [<code key="v">IXOS_ENGINE_PATH</code>, "Makes the desktop app use this ixos executable."],
              [<code key="v">IXOS_RUNTIME_FROM</code>, "Makes the desktop app install its engine from this folder instead of downloading it."],
            ]}
          />
        </Page>

        <Page id="records" title="Records and cache">
          <p>
            With Remember files on, Ixos saves one small record in each file&apos;s own metadata: an alternate data
            stream named <code>:ixos</code> on Windows and the extended attribute <code>user.ixos</code> on macOS and
            Linux. Where a drive cannot hold metadata, the record goes in one database in the application cache instead.
            The file&apos;s contents and modified time are never changed.
          </p>
          <p>
            A record stays valid while the file and the model are the same. Change the file and only that file is read
            again.
          </p>
          <Table
            head={["Field", "Bytes"]}
            rows={[
              ["IXOS magic", "4"],
              ["Format version", "1"],
              ["Model fingerprint", "32"],
              ["Source fingerprint", "32"],
              ["Dimensions", "2"],
              ["Passage count", "1"],
              ["Each passage: byte and line range, scale", "28"],
              ["Each passage: int8 vector", "dimensions"],
              ["Checksum, xxh3", "8"],
            ]}
          />
          <Table
            head={["Profile", "Dimensions", "Passages", "Record size"]}
            rows={[
              ["code", "256", "1 to 8", "364 B to 2,352 B"],
              ["documents", "512", "1", "620 B"],
            ]}
          />
        </Page>

        <Page id="output" title="Output and size limits">
          <Table
            head={["Limit", "Value"]}
            rows={[
              ["Answer size", "6,000 bytes by default. Passages are shortened first, then fewer files are returned."],
              ["read with max_bytes", "128 to 24,000 bytes"],
              ["One file", "16 MiB"],
              ["All extracted text in one search", "256 MiB"],
              ["Batched reads", "8 per call"],
            ]}
          />
          <p>
            Ixos reads text, PDF and Office files. Scanned pages without a text layer are skipped, as are symbolic links,
            files your ignore rules exclude, and cloud files that have not been downloaded.
          </p>
        </Page>

        <Page id="results" title="Retrieval benchmarks">
          <p>
            Two public sets: 260 descriptions of functions from 26 repository families in RepoQA, and all 300 test claims
            in SciFact over 5,183 papers. Every method returns 10 files with 2 lines of context under the same 6,000-byte
            limit.
          </p>
          <Table
            head={["Set", "Method", "nDCG@10", "MRR@10", "File found in top 10"]}
            rows={[
              ["RepoQA", "Ixos", "0.6937", "0.6212", "92.3%"],
              ["RepoQA", "BM25", "0.6066", "0.5326", "84.2%"],
              ["RepoQA", "ripgrep, ranked", "0.4469", "0.3614", "72.3%"],
              ["SciFact", "Ixos", "0.6950", "0.6665", "80.7%"],
              ["SciFact", "BM25", "0.6645", "0.6342", "77.6%"],
              ["SciFact", "ripgrep, ranked", "0.5361", "0.5172", "62.7%"],
            ]}
          />
          <p>
            These sets were also looked at during development, so read them as a check rather than a fresh test. RepoQA
            descriptions are generated, and neither set measures PDF extraction or whether an agent finishes its task.
            Per-query results and the commands to reproduce them are in the{" "}
            <a href={`${GITHUB}/tree/main/eval`}>repository</a>.
          </p>
        </Page>

        <Page id="speed" title="Speed">
          <p>
            260 searches through the agent server, one per RepoQA description, on a Ryzen 7 5800X with the folders
            already read once.
          </p>
          <Table
            head={["Median", "95th percentile", "Fastest", "Slowest", "Memory"]}
            rows={[[`${MEDIAN} ms`, `${P95} ms`, "9.8 ms", "99.4 ms", `${MEMORY_MB} MB`]]}
          />
          <p>
            The first search in a new folder reads every file. One check on 9,892 files (65 MB) took 2,873 ms from a fresh
            process, including loading the model, and 573 ms for the second search in a running server.
          </p>
        </Page>

        <Page id="agent-studies" title="Agent studies">
          <p>
            On the RepoQA set, Ixos put the right file in the top ten for 240 of 260 descriptions. The passage it showed
            overlapped the function being described for 101 of them; with function evidence on, 171 did.
          </p>
          <p>
            That makes the right code easier to reach. It is not the same as an agent doing better work: in controlled
            runs, agents using Ixos were not reliably more correct and did not reliably use less context than agents using
            ordinary tools. The <a href={`${GITHUB}/blob/main/docs/AGENT-EVIDENCE.md`}>full write-up</a> has the
            details.
          </p>
        </Page>
      </article>
    </div>
  );
}
