import { useEffect, useState } from "react";
import { FolderOpen, Plus, X } from "lucide-react";
import { useSettingsStore } from "@/stores/settingsStore";
import * as tauri from "@/lib/tauri";
export function LocationsSettings() {
  const { config, locations, updateConfig, loadConfig } = useSettingsStore();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void tauri
      .suggestedLocations()
      .then(setSuggestions)
      .catch((error) => setError(String(error)));
  }, []);
  if (!config) return null;
  async function choose() {
    try {
      await tauri.selectDirectory();
      await loadConfig();
    } catch (error) {
      setError(String(error));
    }
  }
  async function save(paths: string[]) {
    try {
      await updateConfig({ search: { ...config!.search, locations: paths } });
      setError(null);
    } catch (error) {
      setError(String(error));
    }
  }
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div>
        <h2 className="text-xl font-semibold text-porcelain mb-2">Locations</h2>
        <p className="text-fg-secondary">
          Choose folders to search. Ixos warms them in the background.
        </p>
        <p className="mt-2 text-xs text-fg-dim">
          The engine has a combined limit of 256 MiB of extracted source text.
          Choose smaller locations if their combined text exceeds this limit.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      )}
      <button
        onClick={choose}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-teal/10 text-accent-teal border border-accent-teal/20 hover:bg-accent-teal/20 text-sm"
      >
        <FolderOpen className="w-4 h-4" />
        Add location
      </button>
      {!config.search.locations.length && (
        <p className="text-sm text-fg-muted">
          No locations chosen. Add a folder to begin.
        </p>
      )}
      <div className="space-y-3">
        {config.search.locations.map((directory) => {
          const status = locations.find(
            (location) =>
              location.directory.replace(/^\\\\\?\\/, "").toLowerCase() ===
              directory.replace(/^\\\\\?\\/, "").toLowerCase(),
          );
          return (
            <div
              key={directory}
              className="rounded-xl border border-white/10 bg-graphite-2/55 backdrop-blur-md p-4"
            >
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-porcelain break-all">{directory}</p>
                <button
                  title="Remove location"
                  onClick={() =>
                    void save(
                      config.search.locations.filter(
                        (path) => path !== directory,
                      ),
                    )
                  }
                  className="p-1.5 rounded-md text-fg-dim hover:text-porcelain hover:bg-graphite-3"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {status ? (
                <>
                  <p className="mt-2 text-xs text-fg-muted">
                    {status.fileCount.toLocaleString()} files ·{" "}
                    {status.skippedFiles.toLocaleString()} skipped ·{" "}
                    {(status.sourceBytes / 1048576).toFixed(1)} MiB source text
                    · {status.stage === "ready" ? "Ready" : status.stage}
                  </p>
                  {status.error && (
                    <p role="alert" className="mt-2 text-xs text-danger">
                      {status.error}
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-2 text-xs text-fg-dim">Waiting to warm…</p>
              )}
            </div>
          );
        })}
      </div>
      {suggestions.filter((path) => !config.search.locations.includes(path))
        .length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-fg-dim">Suggested locations</p>
          {suggestions
            .filter((path) => !config.search.locations.includes(path))
            .map((path) => (
              <button
                key={path}
                onClick={() => void save([...config.search.locations, path])}
                className="flex items-center gap-2 text-xs text-fg-muted hover:text-porcelain"
              >
                <Plus className="w-3.5 h-3.5" />
                {path}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
