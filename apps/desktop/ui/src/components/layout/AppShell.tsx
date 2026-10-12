import { useEffect } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { listen } from "@tauri-apps/api/event";
import { Sidebar } from "./Sidebar";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { ArcNoiseBackground } from "@/components/effects/ArcNoiseBackground";
import { useUIStore } from "@/stores/uiStore";
import { useSearchStore } from "@/stores/searchStore";
import { useSettingsStore } from "@/stores/settingsStore";

export function AppShell({ children }: { children: React.ReactNode }) {
  const {
    showSettings,
    setShowSettings,
    settingsTab,
    openSettings,
    sidebarCollapsed,
  } = useUIStore();
  const config = useSettingsStore((state) => state.config);
  const handleNewSearch = () => {
    setShowSettings(false);
    useSearchStore.getState().reset();
    setTimeout(
      () =>
        document
          .querySelector<HTMLInputElement>("[data-search-input]")
          ?.focus(),
      50,
    );
  };
  useEffect(() => {
    if (config && !config.search.locations.length) openSettings("locations");
  }, [config?.search.locations.length, openSettings]);
  useEffect(() => {
    const unlisten = listen("open-settings", () => openSettings());
    function keydown(event: KeyboardEvent) {
      if (
        (event.ctrlKey || event.metaKey) &&
        (event.key === "k" || event.key === "t")
      ) {
        event.preventDefault();
        handleNewSearch();
      }
    }
    window.addEventListener("keydown", keydown);
    return () => {
      void unlisten.then((stop) => stop());
      window.removeEventListener("keydown", keydown);
    };
  }, [openSettings]);
  return (
    <div
      className="desktop-window-shell h-screen flex bg-graphite-0 overflow-hidden relative"
      data-theme="desktop"
    >
      <ArcNoiseBackground />
      <div className="h-10 fixed top-0 left-0 right-0 z-0 pointer-events-none" />
      <Sidebar
        onNewSearch={handleNewSearch}
        onOpenSettings={openSettings}
        className="flex-shrink-0 relative z-20 backdrop-blur-sm bg-graphite-0/80"
      />
      <main className="flex-1 flex flex-col pt-10 overflow-hidden relative z-10">
        <div className="px-6 pt-3 pb-2">
          <p className="text-[11px] text-fg-ghost tracking-[0.06em]">
            Ixos <span className="text-fg-ghost/40 mx-1">/</span>
            <span className="text-fg-dim">Search</span>
          </p>
        </div>
        <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 flex flex-col"
          >
            {children}
          </motion.div>
        </div>
        {showSettings && (
          <div
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 sm:p-4 bg-graphite-0/92 backdrop-blur-lg pointer-events-auto"
            style={{ left: sidebarCollapsed ? "3rem" : "15rem" }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setShowSettings(false);
              }
            }}
          >
            <div
              data-overlay-panel="true"
              className="relative my-auto w-[min(96vw,1280px)] h-[min(88vh,840px)] max-h-[calc(100vh-1.5rem)] min-h-[560px] overflow-hidden animate-in fade-in zoom-in-95 duration-200 group pointer-events-auto"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="absolute top-4 right-4 z-50 p-2 rounded-full bg-graphite-2 border border-stroke-hairline text-fg-muted hover:text-porcelain hover:bg-graphite-3 transition-colors shadow-lg"
              >
                <X className="w-4 h-4" />
              </button>
              <SettingsPanel initialTab={settingsTab} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
