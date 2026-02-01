import { create } from 'zustand';
import type { SettingsTabId } from '@/components/settings/SettingsPanel';

interface UIState {
    showSettings: boolean;
    settingsTab: SettingsTabId;
    showInfo: boolean;
    showPricing: boolean;

    setShowSettings: (show: boolean) => void;
    setSettingsTab: (tab: SettingsTabId) => void;
    setShowInfo: (show: boolean) => void;
    setShowPricing: (show: boolean) => void;

    // Helpers
    openSettings: (tab?: SettingsTabId) => void;
}

export const useUIStore = create<UIState>((set) => ({
    showSettings: false,
    settingsTab: 'search',
    showInfo: false,
    showPricing: false,

    setShowSettings: (show) => set({ showSettings: show }),
    setSettingsTab: (tab) => set({ settingsTab: tab }),
    setShowInfo: (show) => set({ showInfo: show }),
    setShowPricing: (show) => set({ showPricing: show }),

    openSettings: (tab) => set((state) => ({
        showSettings: true,
        showInfo: false,
        showPricing: false,
        settingsTab: tab ?? state.settingsTab
    })),
}));
