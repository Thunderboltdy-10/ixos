import { Channel, invoke } from "@tauri-apps/api/core";

export type Profile = "code" | "documents";

export interface Config {
  search: {
    locations: string[];
    profile: Profile;
    limit: number;
    context: number;
    cache: boolean;
    model_dir: string;
  };
  quitOnClose: boolean;
  autoProfile: boolean;
}

export interface LocationStatus {
  directory: string;
  fileCount: number;
  lineCount: number;
  skippedFiles: number;
  sourceBytes: number;
  budgetBytes: number;
  stage: "discover" | "lexical" | "semantic" | "ready" | "error";
  error?: string;
}

export interface ModelStatus {
  profile: Profile;
  installed: boolean;
  downloading: boolean;
  error: string | null;
}

export interface Result {
  path: string;
  filename: string;
  score: number;
  snippet?: { text: string; start_line: number; end_line: number };
}

export interface SearchStats {
  searchableFiles: number;
  scoreParts?: [number, number][];
  queryCorrections?: { original: string; replacement: string }[];
}

export type SearchEvent =
  | { type: "phase"; stage: "discover" | "semantic" }
  | {
      type: "lexicalResults" | "semanticResults";
      results: Result[];
      stats: SearchStats;
      elapsedMs: number;
    }
  | { type: "warning"; message: string }
  | { type: "complete" };

export interface ReadResult {
  snippet: { text: string; start_line: number; end_line: number };
  total_lines: number;
}

export interface CacheStats {
  filesWithRecords: number;
  recordBytes: number;
}

export interface Usage {
  searches: number;
  files: number;
  lines: number;
  waits: number[];
}

export interface ShortcutConfig {
  modifiers: string[];
  key: string;
}

export interface RecentSearch {
  query: string;
  directory: string | null;
  timestamp: number;
}

export function search(query: string, directory: string | null, onEvent: (event: SearchEvent) => void) {
  const channel = new Channel<SearchEvent>();
  channel.onmessage = onEvent;
  return invoke<void>("search_progressive", { query, directory, onEvent: channel });
}
export const cancelSearch = () => invoke<void>("cancel_search");
export const readPreview = (path: string, start: number, lines: number) =>
  invoke<ReadResult>("read_preview", { path, start, lines });

export const getConfig = () => invoke<Config>("get_config");
export const updateConfig = (config: Config) => invoke<void>("update_config", { config });
export const getLocationStatus = () => invoke<LocationStatus[]>("get_location_status");
export const addFolder = () => invoke<string | null>("select_directory");
export const suggestedFolders = () => invoke<string[]>("suggested_locations");

export const getModelStatus = () => invoke<ModelStatus[]>("get_model_status");
export const installModel = (profile: Profile) => invoke<void>("install_model", { profile, source: null });

export const cacheStats = (directory: string) => invoke<CacheStats>("cache_stats", { directory });
export const cacheClear = (directory: string) => invoke<CacheStats>("cache_clear", { directory, yes: true });
export const getUsage = () => invoke<Usage>("get_usage");

export const openFile = (path: string) => invoke<void>("open_file", { path });
export const showInFolder = (path: string) => invoke<void>("reveal_in_explorer", { path });
export const openLink = (url: string) => invoke<void>("open_link", { url });
export const hideOverlay = () => invoke<void>("hide_overlay");

export const getShortcut = () => invoke<ShortcutConfig>("get_shortcut_config");
export const setShortcut = (config: ShortcutConfig) => invoke<void>("set_shortcut_config", { config });
export const getLaunchAtLogin = () => invoke<boolean>("get_launch_at_login");
export const setLaunchAtLogin = (enabled: boolean) => invoke<void>("set_launch_at_login", { enabled });

export const listRecent = () => invoke<RecentSearch[]>("list_recent_searches");
export const clearRecent = () => invoke<void>("clear_recent_searches");
