import { useEffect } from "react";
import { useSearchStore } from "@/stores/searchStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useSearchKeyboard } from "./useKeyboard";

export function useSearch() {
  const search = useSearchStore();
  const config = useSettingsStore((state) => state.config);
  useSearchKeyboard();
  useEffect(() => {
    if (
      config &&
      search.directory &&
      !config.search.locations.includes(search.directory)
    )
      search.setDirectory("");
  }, [config?.search.locations, search.directory]);
  useEffect(() => {
    if (search.query.trim().length < 2 || !config?.search.locations.length)
      return;
    if (
      search.query === search.activeQuery &&
      search.directory === search.activeDirectory &&
      config?.search.profile === search.activeProfile &&
      search.phase !== "idle"
    )
      return;
    const timer = setTimeout(
      () => void useSearchStore.getState().startSearch(),
      300,
    );
    return () => clearTimeout(timer);
  }, [
    search.query,
    search.directory,
    search.activeQuery,
    config?.search.profile,
    config?.search.locations,
  ]);
  return {
    ...search,
    currentResults: search.results,
    hasResults: search.results.length > 0,
  };
}
