import { create } from 'zustand';
import type { SettingsTabId } from '@/components/settings/SettingsPanel';
import type { SidebarView } from '@/components/layout/Sidebar';

interface UIState {
    showSettings: boolean;
    settingsTab: SettingsTabId;
    showInfo: boolean;
    activeView: SidebarView;
    sidebarCollapsed: boolean;

    setShowSettings: (show: boolean) => void;
    setSettingsTab: (tab: SettingsTabId) => void;
    setShowInfo: (show: boolean) => void;
    setActiveView: (view: SidebarView) => void;
    toggleSidebar: () => void;
    setSidebarCollapsed: (collapsed: boolean) => void;

    // Helpers
    openSettings: (tab?: SettingsTabId) => void;
}

const SIDEBAR_COLLAPSED_KEY = 'ixos_sidebar_collapsed';

export const useUIStore = create<UIState>((set) => ({
    showSettings: false,
    settingsTab: 'search',
    showInfo: false,
    activeView: 'search',
    sidebarCollapsed: localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1',

    setShowSettings: (show) => set({ showSettings: show }),
    setSettingsTab: (tab) => set({ settingsTab: tab }),
    setShowInfo: (show) => set({ showInfo: show }),
    setActiveView: (view) => set({ activeView: view }),
    toggleSidebar: () => set((state) => {
        const next = !state.sidebarCollapsed;
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
        return { sidebarCollapsed: next };
    }),
    setSidebarCollapsed: (collapsed) => {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0');
        set({ sidebarCollapsed: collapsed });
    },

    openSettings: (tab) => set((state) => ({
        showSettings: true,
        showInfo: false,
        settingsTab: tab ?? state.settingsTab
    })),
}));
