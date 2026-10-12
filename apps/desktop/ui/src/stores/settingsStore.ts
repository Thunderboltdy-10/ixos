import { create } from "zustand";
import * as tauri from "@/lib/tauri";
import type { Config, LocationStatus, ModelStatus, Profile } from "@/lib/types";
interface SettingsState {
  config: Config | null;
  locations: LocationStatus[];
  models: ModelStatus[];
  error: string | null;
  loadConfig: () => Promise<void>;
  loadModels: () => Promise<void>;
  updateConfig: (patch: Partial<Config>) => Promise<void>;
  setProfile: (profile: Profile) => Promise<void>;
  setLocations: (locations: LocationStatus[]) => void;
}
export const useSettingsStore = create<SettingsState>((set, get) => ({
  config: null,
  locations: [],
  models: [],
  error: null,
  loadConfig: async () => {
    const config = await tauri.getConfig();
    set({ config });
  },
  loadModels: async () => set({ models: await tauri.getModelStatus() }),
  updateConfig: async (patch) => {
    const current = get().config;
    if (!current) return;
    try {
      const config = { ...current, ...patch };
      await tauri.updateConfig(config);
      set({ config, error: null });
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },
  setProfile: async (profile) => {
    const config = get().config;
    if (config && config.search.profile !== profile) {
      await get().updateConfig({ search: { ...config.search, profile } });
    }
  },
  setLocations: (locations) => set({ locations }),
}));
