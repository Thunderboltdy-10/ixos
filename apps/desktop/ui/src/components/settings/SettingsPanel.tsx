import { useEffect, useState } from "react";
import {
  Settings,
  FolderOpen,
  HardDrive,
  Info,
  Keyboard,
  Cpu,
} from "lucide-react";
import { useSettingsStore } from "@/stores/settingsStore";
import { cn } from "@/lib/utils";
import { StorageSettings } from "./StorageSettings";
import { SearchSettings } from "./SearchSettings";
import { ShortcutSettings } from "./ShortcutSettings";

import type { SettingsTabId } from "@/stores/uiStore";
import { LocationsSettings } from "./LocationsSettings";
import { ModelsSettings } from "./ModelsSettings";
const tabs: { id: SettingsTabId; label: string; icon: React.ElementType }[] = [
  { id: "locations", label: "Locations", icon: FolderOpen },
  { id: "search", label: "Search", icon: Settings },
  { id: "storage", label: "Storage", icon: HardDrive },
  { id: "models", label: "Models", icon: Cpu },
  { id: "keyboard", label: "Keyboard", icon: Keyboard },
  { id: "about", label: "About", icon: Info },
];

export function SettingsPanel({ initialTab }: { initialTab?: SettingsTabId }) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>(
    initialTab ?? "search",
  );
  const { loadConfig } = useSettingsStore();

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  return (
    <div className="flex h-full bg-graphite-1/[0.985] backdrop-blur-xl border border-stroke-hairline rounded-2xl overflow-hidden shadow-2xl">
      {/* Sidebar Navigation */}
      <nav className="w-64 bg-graphite-2/88 border-r border-stroke-hairline p-4 flex flex-col gap-1.5">
        <div className="mb-6 px-3 pt-2">
          <h2 className="text-xl font-display font-semibold text-porcelain tracking-tight">
            Settings
          </h2>
          <p className="text-sm text-fg-secondary">Preferences & Controls</p>
        </div>

        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-[13px] font-medium border border-transparent transition-all duration-200",
                isActive
                  ? "bg-accent-teal/10 border-accent-teal/20 text-accent-teal"
                  : "text-fg-secondary hover:bg-graphite-2/70 hover:border-white/8 hover:text-porcelain cursor-pointer",
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4",
                  isActive ? "text-accent-teal" : "text-fg-muted",
                )}
              />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Main Content Area */}
      <main className="relative flex-1 overflow-y-auto bg-transparent">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.045] via-white/[0.018] to-transparent" />
        <div className="mx-auto max-w-4xl p-6 lg:p-8">
          {activeTab === "storage" && <StorageSettings />}
          {activeTab === "search" && <SearchSettings />}
          {activeTab === "locations" && <LocationsSettings />}
          {activeTab === "models" && <ModelsSettings />}
          {activeTab === "keyboard" && <ShortcutSettings />}
          {activeTab === "about" && <AboutSection />}
        </div>
      </main>
    </div>
  );
}

function AboutSection() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div>
        <h2 className="text-xl font-semibold text-porcelain mb-2">
          About Ixos
        </h2>
        <p className="text-fg-secondary leading-relaxed">
          Local hybrid search over code and documents, running on CPU. Keyword
          results appear first, then the selected model refines them.
        </p>
      </div>
      <div className="bg-graphite-2/60 rounded-xl p-6 border border-stroke-hairline space-y-4">
        <div className="grid grid-cols-2 gap-y-4 text-sm">
          <div className="text-fg-muted">Version</div>
          <div className="text-porcelain font-mono">0.1.0</div>
          <div className="text-fg-muted">License</div>
          <div className="text-porcelain">MIT</div>
        </div>
      </div>
      <div className="text-xs text-fg-muted text-center pt-8 border-t border-stroke-hairline/50">
        <p>
          Designed and directed by Pablo MD, built with AI coding assistance.
        </p>
        <p className="mt-1 opacity-60">Models derived from minishlab Potion.</p>
      </div>
    </div>
  );
}
