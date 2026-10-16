import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { Check, DownloadCloud, FolderOpen } from "lucide-react";
import { useSettingsStore } from "@/stores/settingsStore";
import * as tauri from "@/lib/tauri";
import type { Profile } from "@/lib/types";
export function ModelsSettings() {
  const { models, loadModels } = useSettingsStore();
  const [busy, setBusy] = useState<Profile | "doctor" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function install(profile: Profile, local: boolean) {
    setError(null);
    setMessage(null);
    try {
      const source = local
        ? await open({
            directory: true,
            multiple: false,
            title: `Choose the ${profile} model folder`,
          })
        : null;
      if (local && !source) return;
      setBusy(profile);
      await tauri.installModel(profile, source);
      await loadModels();
      setMessage(
        `${profile === "code" ? "Code" : "Documents"} model installed.`,
      );
    } catch (error) {
      setError(String(error));
    } finally {
      setBusy(null);
    }
  }
  async function check() {
    setBusy("doctor");
    setError(null);
    setMessage(null);
    try {
      const report = await tauri.doctor();
      setMessage(
        `${report.profile} model loads (${report.dimensions} dimensions). Cache is writable. Search works.`,
      );
    } catch (error) {
      setError(String(error));
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div>
        <h2 className="text-xl font-semibold text-porcelain mb-2">Models</h2>
        <p className="text-fg-secondary">
          Both models download automatically during first-launch setup. You can
          retry a download or install local files here. Keyword search works offline
          while setup is incomplete.
        </p>
      </div>
      <div className="rounded-xl border border-white/10 bg-graphite-2/55 backdrop-blur-md p-4 space-y-2">
        {(["code", "documents"] as const).map((profile) => (
          <div
            key={profile}
            className="flex items-center justify-between gap-3 bg-graphite-2/55 rounded-lg border border-white/8 px-3 py-2"
          >
            <div>
              <span className="text-sm text-porcelain capitalize">{profile}</span>
              {models.find((model) => model.profile === profile)?.error && (
                <p role="alert" className="text-xs text-danger mt-1 max-w-md">
                  {models.find((model) => model.profile === profile)?.error}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {models.find((model) => model.profile === profile)?.installed && (
                <span className="flex items-center gap-1.5 text-xs text-accent-teal">
                  <Check className="w-3.5 h-3.5" />
                  Installed
                </span>
              )}
              <button
                disabled={busy !== null || models.some((model) => model.downloading)}
                onClick={() => void install(profile, false)}
                className="flex items-center gap-1.5 h-7 px-2 text-xs text-accent-teal hover:bg-accent-teal/10 rounded-md disabled:opacity-50"
              >
                <DownloadCloud className="w-3.5 h-3.5" />
                {busy === profile || models.find((model) => model.profile === profile)?.downloading
                  ? "Installing…" : models.find((model) => model.profile === profile)?.error
                    ? "Retry download" : "Download"}
              </button>
              <button
                disabled={busy !== null || models.some((model) => model.downloading)}
                onClick={() => void install(profile, true)}
                title="Install from a model folder"
                className="p-1.5 rounded-md text-fg-dim hover:text-porcelain hover:bg-graphite-3 disabled:opacity-50"
              >
                <FolderOpen className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        disabled={busy !== null}
        onClick={() => void check()}
        className="px-4 py-2 rounded-lg border border-stroke-hairline text-sm text-fg-secondary hover:text-porcelain hover:bg-graphite-2 disabled:opacity-50"
      >
        {busy === "doctor" ? "Checking…" : "Check installation"}
      </button>
      {message && (
        <p role="status" className="text-sm text-accent-teal">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
