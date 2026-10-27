import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useState } from "react";
import {
  getConfig,
  getLocationStatus,
  getModelStatus,
  updateConfig,
  type Config,
  type LocationStatus,
  type ModelStatus,
} from "./api";

/** Settings, folder status and models, kept current with backend events. */
export function useBackend() {
  const [config, setConfig] = useState<Config | null>(null);
  const [locations, setLocations] = useState<LocationStatus[]>([]);
  const [models, setModels] = useState<ModelStatus[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => {
      getConfig().then(setConfig, (reason) => setError(String(reason)));
      getLocationStatus().then(setLocations, () => {});
      getModelStatus().then(setModels, () => {});
    };
    refresh();
    const subscriptions = [
      listen<LocationStatus[]>("warming", (event) => setLocations(event.payload)),
      listen("models-changed", () => getModelStatus().then(setModels, () => {})),
      listen("settings-changed", () => getConfig().then(setConfig, () => {})),
    ];
    return () => subscriptions.forEach((subscription) => subscription.then((stop) => stop()));
  }, []);

  const save = useCallback(async (next: Config) => {
    setConfig(next);
    try {
      await updateConfig(next);
      setError(null);
    } catch (reason) {
      setError(String(reason));
      getConfig().then(setConfig, () => {});
    }
  }, []);

  return { config, locations, models, error, save };
}
