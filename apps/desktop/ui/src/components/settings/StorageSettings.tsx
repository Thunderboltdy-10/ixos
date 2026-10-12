import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { confirm } from "@tauri-apps/plugin-dialog";

interface CacheStats {
  filesWithRecords: number;
  recordBytes: number;
  nativeRecords: number;
  fallbackEntries: number;
  oldRecords: number;
}

export function StorageSettings() {
  const [locations, setLocations] = useState<string[]>([]);
  const [records, setRecords] = useState<Record<string, CacheStats>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const config = await invoke<{ search: { locations: string[] } }>(
      "get_config",
    );
    setLocations(config.search.locations);
    const entries = await Promise.all(
      config.search.locations.map(
        async (directory) =>
          [
            directory,
            await invoke<CacheStats>("cache_stats", { directory }),
          ] as const,
      ),
    );
    setRecords(Object.fromEntries(entries));
  }

  useEffect(() => {
    refresh().catch((error) => setError(String(error)));
  }, []);

  async function remove(directory: string) {
    setBusy(directory);
    setError(null);
    try {
      const plan = await invoke<CacheStats>("cache_clear", {
        directory,
        yes: false,
      });
      const accepted = await confirm(
        `Remove ${plan.recordBytes.toLocaleString()} bytes of Ixos data from ${plan.filesWithRecords} files in ${directory}? Your file contents stay unchanged.`,
        { title: "Remove Ixos data", kind: "warning" },
      );
      if (accepted) {
        await invoke("cache_clear", { directory, yes: true });
        await refresh();
      }
    } catch (error) {
      setError(String(error));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div>
        <h2 className="text-xl font-semibold text-porcelain mb-2">Storage</h2>
        <p className="text-fg-secondary">
          Ixos stores compact records in file metadata, with an application
          cache when needed.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-red-400 text-sm">
          {error}
        </p>
      )}
      {!locations.length && (
        <p className="text-fg-muted">
          Choose a search location to see its storage.
        </p>
      )}
      {locations.map((directory) => (
        <div
          key={directory}
          className="bg-graphite-2/60 rounded-xl p-6 border border-stroke-hairline space-y-4"
        >
          <p className="text-porcelain break-all">{directory}</p>
          {records[directory] ? (
            <p className="text-sm text-fg-secondary">
              {records[directory].filesWithRecords.toLocaleString()} files ·{" "}
              {records[directory].recordBytes.toLocaleString()} bytes ·{" "}
              {records[directory].fallbackEntries.toLocaleString()} fallback
              entries · {records[directory].oldRecords.toLocaleString()} old
              records
            </p>
          ) : (
            <p className="text-fg-muted text-sm">Checking storage…</p>
          )}
          <button
            disabled={busy !== null || !records[directory]}
            onClick={() => remove(directory)}
            className="px-4 py-2 rounded-lg border border-stroke-hairline text-sm text-fg-secondary hover:text-porcelain hover:bg-graphite-2 disabled:opacity-50"
          >
            {busy === directory ? "Removing…" : "Remove Ixos data"}
          </button>
        </div>
      ))}
    </div>
  );
}
