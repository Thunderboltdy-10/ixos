import { CheckIcon, CopyIcon, FolderIcon } from "@ixos/ui";
import { useEffect, useState, type ReactNode } from "react";
import {
  addFolder,
  cacheClear,
  cacheStats,
  clearRecent,
  getLaunchAtLogin,
  getUsage,
  installModel,
  openLink,
  setLaunchAtLogin,
  type CacheStats,
  type Config,
  type LocationStatus,
  type ModelStatus,
  type Profile,
  type Usage,
} from "../lib/api";
import { bytes, count, folderName, large, median, plural } from "../lib/format";
import { ShortcutField } from "./ShortcutField";

interface SettingsViewProps {
  config: Config;
  locations: LocationStatus[];
  models: ModelStatus[];
  save: (config: Config) => void;
}

const MODELS: Record<Profile, { name: string; use: string; url: string }> = {
  code: {
    name: "Code model",
    use: "Source files in any language",
    url: "https://huggingface.co/Thunderboltdy10/ixos-code",
  },
  documents: {
    name: "Documents model",
    use: "PDFs, Word files, notes and text",
    url: "https://huggingface.co/Thunderboltdy10/ixos-documents",
  },
};

export function SettingsView({ config, locations, models, save }: SettingsViewProps) {
  const search = config.search;
  const set = (change: Partial<Config["search"]>) => save({ ...config, search: { ...search, ...change } });
  const [launch, setLaunch] = useState<boolean | null>(null);
  useEffect(() => {
    getLaunchAtLogin().then(setLaunch, () => {});
  }, []);

  return (
    <main className="settings">
      <div className="settings-column">
        <Summary locations={locations} />

        <Section title="Folders" note="Ixos only reads these folders and everything inside them.">
          {search.locations.map((path) => (
            <FolderRow
              key={path}
              path={path}
              status={locations.find((location) => location.directory === path)}
              onRemove={() => set({ locations: search.locations.filter((location) => location !== path) })}
            />
          ))}
          <div className="row">
            <button className="ix-button" onClick={() => addFolder()}>
              Add a folder
            </button>
          </div>
        </Section>

        <Section title="Searching">
          <Row label="What you search" detail="Automatic picks from what your folders contain.">
            <Segmented
              value={config.autoProfile ? "auto" : search.profile}
              choices={[
                ["auto", "Automatic"],
                ["code", "Code"],
                ["documents", "Documents"],
              ]}
              onChange={(value) =>
                save(
                  value === "auto"
                    ? { ...config, autoProfile: true }
                    : { ...config, autoProfile: false, search: { ...search, profile: value } },
                )
              }
            />
          </Row>
          <Row label="Remember files" detail="Saved keeps a small record on each file so the next search is fast.">
            <Segmented
              value={search.cache}
              choices={[
                [true, "Saved"],
                [false, "Fresh"],
              ]}
              onChange={(cache) => set({ cache })}
            />
          </Row>
          <Row label="Results to show">
            <Segmented
              value={search.limit}
              choices={[
                [6, "6"],
                [10, "10"],
                [20, "20"],
              ]}
              onChange={(limit) => set({ limit })}
            />
          </Row>
        </Section>

        <Section title="App">
          <Row label="Quick search shortcut" detail="Opens search over whatever you are working in.">
            <ShortcutField />
          </Row>
          <Row label="Keep running when closed" detail="Closing the window leaves Ixos in the tray, ready for the shortcut.">
            <Toggle checked={!config.quitOnClose} onChange={(on) => save({ ...config, quitOnClose: !on })} />
          </Row>
          <Row label="Start with Windows" detail="Starts in the tray when you sign in.">
            <Toggle
              checked={Boolean(launch)}
              disabled={launch === null}
              onChange={(on) => setLaunchAtLogin(on).then(() => setLaunch(on), () => {})}
            />
          </Row>
        </Section>

        <Section title="Saved records" note="One small record per file, kept in its metadata. Removing them is safe; Ixos rebuilds them on the next search.">
          {search.locations.map((path) => (
            <SavedRow key={path} path={path} />
          ))}
        </Section>

        <Section title="Models" note="Downloaded once from Hugging Face. Without a model, Ixos still searches by keywords.">
          {(["code", "documents"] as const).map((profile) => (
            <ModelRow key={profile} profile={profile} status={models.find((model) => model.profile === profile)} />
          ))}
        </Section>

        <Section title="AI agents" note="Gives Claude Code or Codex the same search over a project.">
          <Command text="claude mcp add --transport stdio ixos -- ixos mcp --dir . --profile code" />
          <Command text="codex mcp add ixos -- ixos mcp --dir . --profile code" />
          <p className="section-note">
            Run one inside your project folder. Both need the Ixos command line.{" "}
            <button className="link" onClick={() => openLink("https://github.com/Thunderboltdy-10/ixos#command-line")}>
              How to install it
            </button>
          </p>
        </Section>

        <Section title="Recent searches">
          <ConfirmRow label="Clear the list of recent searches" action="Clear" run={clearRecent} />
        </Section>
      </div>
    </main>
  );
}

function Summary({ locations }: { locations: LocationStatus[] }) {
  const [usage, setUsage] = useState<Usage | null>(null);
  useEffect(() => {
    getUsage().then(setUsage, () => {});
  }, []);
  const files = locations.reduce((sum, location) => sum + location.fileCount, 0);
  const lines = locations.reduce((sum, location) => sum + location.lineCount, 0);
  const wait = usage?.waits.length ? `${Math.round(median(usage.waits))} ms` : "–";
  return (
    <dl className="summary">
      <div>
        <dt>Searches</dt>
        <dd>{usage ? count(usage.searches) : "–"}</dd>
      </div>
      <div>
        <dt>Files searched</dt>
        <dd>{usage ? large(usage.files) : "–"}</dd>
      </div>
      <div>
        <dt>Lines searched</dt>
        <dd>{usage ? large(usage.lines) : "–"}</dd>
      </div>
      <div>
        <dt>Typical wait</dt>
        <dd>{wait}</dd>
      </div>
      <p className="summary-note">
        Your folders hold {plural(files, "file")} and {large(lines)} lines. These counts stay on this computer.
      </p>
    </dl>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="section">
      <h2>{title}</h2>
      {note && <p className="section-note">{note}</p>}
      <div className="section-rows">{children}</div>
    </section>
  );
}

function Row({ label, detail, children }: { label: ReactNode; detail?: ReactNode; children: ReactNode }) {
  return (
    <div className="row">
      <div className="row-text">
        <span className="row-label">{label}</span>
        {detail && <span className="row-detail">{detail}</span>}
      </div>
      {children}
    </div>
  );
}

function Segmented<T extends string | number | boolean>({
  value,
  choices,
  onChange,
}: {
  value: T;
  choices: [T, string][];
  onChange: (value: T) => void;
}) {
  return (
    <div className="segmented" role="radiogroup">
      {choices.map(([choice, label]) => (
        <button key={label} role="radio" aria-checked={choice === value} onClick={() => onChange(choice)}>
          {label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, disabled, onChange }: { checked: boolean; disabled?: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      className="toggle"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

function FolderRow({ path, status, onRemove }: { path: string; status?: LocationStatus; onRemove: () => void }) {
  let detail = path;
  if (status?.error) detail = status.error;
  else if (status?.stage === "discover") detail = "Reading files…";
  else if (status) {
    detail = `${plural(status.fileCount, "file")}, ${bytes(status.sourceBytes)}`;
    if (status.skippedFiles) detail += `, ${count(status.skippedFiles)} skipped`;
  }
  return (
    <div className="row">
      <FolderIcon className="row-icon" />
      <div className="row-text">
        <span className="row-label" title={path}>
          {folderName(path)}
        </span>
        <span className={`row-detail${status?.error ? " status--error" : ""}`}>{detail}</span>
      </div>
      <ConfirmButton action="Remove" run={async () => onRemove()} />
    </div>
  );
}

function SavedRow({ path }: { path: string }) {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    cacheStats(path).then(setStats, (reason) => setError(String(reason)));
  }, [path]);
  const detail = error ?? (stats ? `${plural(stats.filesWithRecords, "file")}, ${bytes(stats.recordBytes)} in total` : "Counting…");
  return (
    <div className="row">
      <div className="row-text">
        <span className="row-label">{folderName(path)}</span>
        <span className="row-detail">{detail}</span>
      </div>
      <ConfirmButton
        action="Remove"
        disabled={!stats?.filesWithRecords}
        run={() => cacheClear(path).then(() => cacheStats(path).then(setStats))}
      />
    </div>
  );
}

function ModelRow({ profile, status }: { profile: Profile; status?: ModelStatus }) {
  const model = MODELS[profile];
  let state = "Not downloaded";
  if (status?.downloading) state = "Downloading…";
  else if (status?.installed) state = "Ready";
  else if (status?.error) state = status.error;
  return (
    <div className="row">
      <div className="row-text">
        <span className="row-label">{model.name}</span>
        <span className={`row-detail${status?.error ? " status--error" : ""}`}>
          {model.use}. {state}.
        </span>
      </div>
      <button className="link" onClick={() => openLink(model.url)}>
        Hugging Face
      </button>
      {!status?.installed && !status?.downloading && (
        <button className="ix-button" onClick={() => installModel(profile).catch(() => {})}>
          {status?.error ? "Try again" : "Download"}
        </button>
      )}
    </div>
  );
}

function Command({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="command">
      <code>{text}</code>
      <button
        className="icon-button"
        aria-label="Copy command"
        onClick={() =>
          navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1400);
          })
        }
      >
        {copied ? <CheckIcon size={15} /> : <CopyIcon size={15} />}
      </button>
    </div>
  );
}

function ConfirmRow({ label, action, run }: { label: string; action: string; run: () => Promise<unknown> }) {
  return (
    <div className="row">
      <div className="row-text">
        <span className="row-label">{label}</span>
      </div>
      <ConfirmButton action={action} run={run} />
    </div>
  );
}

/** Asks once more before doing something that cannot be undone. */
function ConfirmButton({ action, run, disabled }: { action: string; run: () => Promise<unknown>; disabled?: boolean }) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!asking) {
    return (
      <button className="ix-button" disabled={disabled} onClick={() => setAsking(true)}>
        {action}
      </button>
    );
  }
  return (
    <span className="confirm">
      <button className="ix-button" onClick={() => setAsking(false)}>
        Cancel
      </button>
      <button
        className="ix-button ix-button--danger"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          run().finally(() => {
            setBusy(false);
            setAsking(false);
          });
        }}
      >
        {action}
      </button>
    </span>
  );
}
