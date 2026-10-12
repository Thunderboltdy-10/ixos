import { useMemo, useState } from "react";
import { Plus, Clock, Search, ChevronLeft, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHistoryStore } from "@/stores/historyStore";
import { useSearchStore } from "@/stores/searchStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useUIStore, type SettingsTabId } from "@/stores/uiStore";
import ixosIcon from "@/assets/ixos-icon.png";

interface SidebarProps {
  onNewSearch: () => void;
  onOpenSettings: (tab?: SettingsTabId) => void;
  className?: string;
}
export function Sidebar({
  onNewSearch,
  onOpenSettings,
  className,
}: SidebarProps) {
  const [historyFilter, setHistoryFilter] = useState("");
  const recent = useHistoryStore((state) => state.recent);
  const resume = useSearchStore((state) => state.resume);
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const profile = useSettingsStore(
    (state) => state.config?.search.profile ?? "code",
  );
  const modeAccent = profile === "code" ? "#14b8a6" : "#f59e0b";
  const filtered = useMemo(
    () =>
      recent.filter((item) =>
        item.query.toLowerCase().includes(historyFilter.toLowerCase()),
      ),
    [recent, historyFilter],
  );
  if (sidebarCollapsed)
    return (
      <aside
        className={cn(
          "w-12 h-full flex flex-col items-center bg-graphite-0 border-r border-white/[0.06] transition-all duration-200",
          className,
        )}
      >
        <button
          type="button"
          onClick={toggleSidebar}
          className="mt-12 mb-4 p-1.5 rounded-md hover:bg-graphite-2/40 transition-colors"
          title="Expand sidebar"
        >
          <img src={ixosIcon} alt="Ixos" className="w-6 h-6 object-contain" />
        </button>
        <nav className="flex flex-col items-center gap-1 px-1">
          <button
            type="button"
            onClick={onNewSearch}
            title="Search"
            className="p-2 rounded-lg transition-colors bg-graphite-2/40"
          >
            <Search style={{ color: modeAccent }} className="w-4 h-4" />
          </button>
        </nav>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => onOpenSettings()}
          title="Settings"
          className="p-2 rounded-lg hover:bg-graphite-2/25 transition-colors mb-3"
        >
          <Settings className="w-4 h-4 text-fg-dim" />
        </button>
      </aside>
    );
  return (
    <aside
      className={cn(
        "w-60 h-full flex flex-col bg-graphite-0 border-r border-white/[0.06] transition-all duration-200",
        className,
      )}
    >
      <div className="px-4 pt-12 pb-4 flex items-center gap-2.5">
        <img src={ixosIcon} alt="Ixos" className="w-7 h-7 object-contain" />
        <span className="font-display text-sm font-semibold text-porcelain tracking-tight">
          Ixos
        </span>
        <button
          type="button"
          onClick={toggleSidebar}
          className="ml-auto p-1 rounded-md text-fg-ghost hover:text-fg-muted hover:bg-graphite-2/40 transition-colors"
          title="Collapse sidebar"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onNewSearch}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-accent-teal/10 text-accent-teal border border-accent-teal/20 hover:bg-accent-teal/18 transition-colors duration-150"
        >
          <Plus className="w-3 h-3" />
          New
        </button>
      </div>
      <nav className="px-3 pb-3 space-y-0.5">
        <NavItem
          icon={Search}
          label="Search"
          isActive
          onClick={onNewSearch}
          accentColor={modeAccent}
        />
        <NavItem
          icon={Settings}
          label="Settings"
          isActive={false}
          onClick={() => onOpenSettings()}
          accentColor={modeAccent}
        />
      </nav>
      <div className="px-3 pb-2 flex items-center justify-between text-[10px] font-medium text-fg-muted">
        <span>Recent</span>
        {recent.length > 0 && (
          <button
            onClick={() => void useHistoryStore.getState().clear()}
            className="hover:text-porcelain"
          >
            Clear
          </button>
        )}
      </div>
      <div className="px-3 pb-2">
        <input
          type="text"
          value={historyFilter}
          onChange={(event) => setHistoryFilter(event.target.value)}
          placeholder="Filter history..."
          className="w-full px-2.5 py-1.5 rounded-md text-[11px] bg-graphite-0 border border-white/10 text-porcelain placeholder:text-fg-dim focus:outline-none focus:ring-0 transition-colors"
        />
      </div>
      <nav className="flex-1 overflow-y-auto px-2 pt-1 scrollbar-hide">
        {!filtered.length ? (
          <div className="px-2 py-8 text-center">
            <Clock className="w-5 h-5 mx-auto mb-2 text-fg-ghost" />
            <p className="text-[11px] text-fg-dim">
              {historyFilter ? "No matches" : "No recent searches"}
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {filtered.map((item) => (
              <button
                key={`${item.query}-${item.timestamp}`}
                type="button"
                onClick={() => resume(item)}
                className="w-full px-2 py-1.5 rounded-md text-left hover:bg-graphite-1/50 transition-colors duration-150 group cursor-pointer relative"
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-fg-ghost flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-porcelain truncate">
                      {item.query}
                    </p>
                    <p className="text-[10px] text-fg-ghost mt-0.5">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </nav>
    </aside>
  );
}
interface NavItemProps {
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  onClick: () => void;
  accentColor?: string;
}
function NavItem({
  icon: Icon,
  label,
  isActive,
  onClick,
  accentColor = "#14b8a6",
}: NavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={isActive ? { borderLeftColor: accentColor } : undefined}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-150",
        isActive
          ? "text-porcelain bg-graphite-2/40 border-l-2 ml-0"
          : "text-fg-muted hover:text-porcelain hover:bg-graphite-2/25 border-l-2 border-transparent",
      )}
    >
      <Icon
        style={isActive ? { color: accentColor } : undefined}
        className={cn("w-3.5 h-3.5", isActive ? "" : "text-fg-dim")}
      />
      <span className="text-[12px] font-medium flex-1">{label}</span>
    </button>
  );
}
