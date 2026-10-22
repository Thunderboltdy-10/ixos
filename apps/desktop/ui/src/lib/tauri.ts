import { Channel, invoke } from "@tauri-apps/api/core";
import type {
  Config,
  DoctorReport,
  LocationStatus,
  ModelStatus,
  Profile,
  RecentSearch,
  SearchEvent,
  ShortcutConfig,
} from "./types";

export function searchProgressive(
  query: string,
  directory: string,
  onEvent: (event: SearchEvent) => void,
) {
  const channel = new Channel<SearchEvent>();
  channel.onmessage = onEvent;
  return invoke<void>("search_progressive", {
    query,
    directory: directory || null,
    onEvent: channel,
  });
}
export const cancelSearch = () => invoke<void>("cancel_search");
export const getConfig = () => invoke<Config>("get_config");
export const updateConfig = (config: Config) =>
  invoke<void>("update_config", { config });
export const getLocationStatus = () =>
  invoke<LocationStatus[]>("get_location_status");
export const selectDirectory = () => invoke<string | null>("select_directory");
export const suggestedLocations = () => invoke<string[]>("suggested_locations");
export const getModelStatus = () => invoke<ModelStatus[]>("get_model_status");
export const installModel = (profile: Profile, source: string | null = null) =>
  invoke<void>("install_model", { profile, source });
export const doctor = () => invoke<DoctorReport>("doctor");
export const openFile = (path: string) => invoke<void>("open_file", { path });
export const revealInExplorer = (path: string) =>
  invoke<void>("reveal_in_explorer", { path });
export const hideOverlay = () => invoke<void>("hide_overlay");
export const showOverlay = () => invoke<void>("show_overlay");
export const getShortcutConfig = () =>
  invoke<ShortcutConfig>("get_shortcut_config");
export const setShortcutConfig = (config: ShortcutConfig) =>
  invoke<void>("set_shortcut_config", { config });
export const listRecentSearches = () =>
  invoke<RecentSearch[]>("list_recent_searches");
export const clearRecentSearches = () => invoke<void>("clear_recent_searches");

export interface SkillReport {
  bundled_version: string;
  bundled_sha256: string;
  targets: { path: string; status: "installed" | "current" | "linked" | "preserved" | "failed"; installed_sha256: string | null; detail: string | null }[];
}
export const getSkillStatus = () => invoke<SkillReport>("get_skill_status");
