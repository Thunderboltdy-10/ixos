import { create } from "zustand";
import { persist } from "zustand/middleware";
export type SettingsTabId =
  "locations" | "search" | "storage" | "models" | "keyboard" | "about";
interface UIState {
  showSettings: boolean;
  settingsTab: SettingsTabId;
  sidebarCollapsed: boolean;
  setShowSettings: (showSettings: boolean) => void;
  openSettings: (tab?: SettingsTabId) => void;
  toggleSidebar: () => void;
}
export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      showSettings: false,
      settingsTab: "locations",
      sidebarCollapsed: false,
      setShowSettings: (showSettings) => set({ showSettings }),
      openSettings: (settingsTab = "locations") =>
        set({ showSettings: true, settingsTab }),
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    }),
    {
      name: "ixos-layout",
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
    },
  ),
);
