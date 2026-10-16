import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { useSettingsStore } from "@/stores/settingsStore";
import { useHistoryStore } from "@/stores/historyStore";
import * as tauri from "@/lib/tauri";
import type { LocationStatus } from "@/lib/types";

export function useAppInit() {
  const [isInitialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let disposed = false;
    const unlisteners: (() => void)[] = [];
    const keep = (stop: () => void) => {
      if (disposed) stop();
      else unlisteners.push(stop);
    };
    async function init() {
      await listen<LocationStatus[]>("warming", (event) =>
        useSettingsStore.getState().setLocations(event.payload),
      ).then(keep);
      await listen(
        "recent-searches-changed",
        () => void useHistoryStore.getState().load(),
      ).then(keep);
      await listen("models-changed", () => {
        void useSettingsStore.getState().loadModels();
      }).then(keep);
      await listen("settings-changed", () => {
        void useSettingsStore.getState().loadConfig();
        void useSettingsStore.getState().loadModels();
      }).then(keep);
      await Promise.all([
        useSettingsStore.getState().loadConfig(),
        useSettingsStore.getState().loadModels(),
        useHistoryStore.getState().load(),
      ]);
      useSettingsStore.getState().setLocations(await tauri.getLocationStatus());
    }
    void init()
      .catch((error) => {
        if (!disposed) setError(String(error));
      })
      .finally(() => {
        if (!disposed) setInitialized(true);
      });
    return () => {
      disposed = true;
      unlisteners.forEach((stop) => stop());
    };
  }, []);
  return { isInitialized, error };
}
