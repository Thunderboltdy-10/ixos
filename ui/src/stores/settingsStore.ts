import { create } from 'zustand';
import type { IxosConfig, ConsentStatus } from '@/lib/types';
import * as tauri from '@/lib/tauri';

interface SettingsState {
  // Config
  config: IxosConfig | null;
  consent: ConsentStatus | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadConfig: () => Promise<void>;
  updateConfig: (config: Partial<IxosConfig>) => Promise<void>;
  resetConfig: () => Promise<void>;
  loadConsent: () => Promise<void>;
  grantConsent: () => Promise<void>;
  withdrawConsent: () => Promise<void>;
}

const defaultConfig: IxosConfig = {
  search: {
    defaultLimit: 20,
    defaultDirectory: null,
    timeoutSeconds: 15,
    enableSecureRanking: true,
    progressiveByDefault: true,
    cacheMode: 'jit',
    modelType: 'ixos-flash-v2',
    proModelType: 'ixos-pro-v1',
    searchMode: 'auto',
    useStubModel: true,
    secureTiming: false,
    contextLines: 3,
    minScoreThreshold: 0.1,
  },
  output: {
    defaultFormat: 'human',
    color: true,
    showScores: false,
  },
  security: {
    sandboxEnabled: false,
    sandboxDirectories: [],
    verifyIntegrity: true,
    telemetryOptIn: false,
  },
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  config: null,
  consent: null,
  isLoading: false,
  error: null,

  loadConfig: async () => {
    set({ isLoading: true, error: null });
    try {
      const config = await tauri.getConfig();
      set({ config, isLoading: false });
    } catch (error) {
      console.error('Failed to load config:', error);
      set({ config: defaultConfig, isLoading: false, error: String(error) });
    }
  },

  updateConfig: async (updates) => {
    const currentConfig = get().config;
    if (!currentConfig) return;

    const newConfig: IxosConfig = {
      ...currentConfig,
      search: { ...currentConfig.search, ...updates.search },
      output: { ...currentConfig.output, ...updates.output },
      security: { ...currentConfig.security, ...updates.security },
    };

    set({ isLoading: true, error: null });
    try {
      await tauri.updateConfig(newConfig);
      set({ config: newConfig, isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: String(error) });
    }
  },

  resetConfig: async () => {
    set({ isLoading: true, error: null });
    try {
      await tauri.resetConfig();
      const config = await tauri.getConfig();
      set({ config, isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: String(error) });
    }
  },

  loadConsent: async () => {
    try {
      const consent = await tauri.getConsentStatus();
      set({ consent });
    } catch (error) {
      console.error('Failed to load consent:', error);
    }
  },

  grantConsent: async () => {
    try {
      await tauri.grantConsent();
      const consent = await tauri.getConsentStatus();
      set({ consent });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  withdrawConsent: async () => {
    try {
      await tauri.withdrawConsent();
      const consent = await tauri.getConsentStatus();
      set({ consent });
    } catch (error) {
      set({ error: String(error) });
    }
  },
}));
