import { FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import * as tauri from "@/lib/tauri";
import { useSettingsStore } from "@/stores/settingsStore";
import { useSearchStore } from "@/stores/searchStore";
interface FolderPickerProps {
  value: string;
  onChange: (path: string) => void;
  className?: string;
  placeholder?: string;
}
export function FolderPicker({
  value,
  onChange,
  className,
}: FolderPickerProps) {
  const locations = useSettingsStore(
    (state) => state.config?.search.locations ?? [],
  );
  async function browse() {
    try {
      const path = await tauri.selectDirectory();
      await useSettingsStore.getState().loadConfig();
      if (path) onChange(path);
    } catch (error) {
      useSearchStore.setState({ noticeMessage: String(error) });
    }
  }
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <select
        aria-label="Search location"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        title={value || "All chosen locations"}
        className="min-w-0 max-w-full h-8 px-2.5 py-1 rounded-md bg-transparent text-fg-muted text-xs font-mono focus:outline-none focus:bg-graphite-3/30 hover:bg-graphite-3/20 transition-all duration-200"
      >
        <option value="">All locations</option>
        {locations.map((path) => (
          <option key={path} value={path}>
            {path}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={browse}
        title="Add a search location"
        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-md bg-transparent text-fg-dim hover:text-porcelain hover:bg-graphite-3/50 transition-all duration-150 cursor-pointer"
      >
        <FolderOpen className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
