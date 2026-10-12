import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useSearchStore } from "@/stores/searchStore";
import { useUIStore } from "@/stores/uiStore";
import { hideOverlay } from "@/lib/tauri";

export function useSearchKeyboard() {
  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      if (useUIStore.getState().showSettings) {
        if (event.key === "Escape")
          useUIStore.getState().setShowSettings(false);
        return;
      }
      const search = useSearchStore.getState();
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        if (!search.results.length) return;
        event.preventDefault();
        search.setSelectedIndex(
          search.selectedIndex + (event.key === "ArrowDown" ? 1 : -1),
        );
      } else if (event.key === "Enter" && search.results.length) {
        event.preventDefault();
        void (event.ctrlKey || event.metaKey
          ? search.revealSelected()
          : search.openSelected());
      } else if (event.key === "Escape") {
        event.preventDefault();
        search.reset();
        if (getCurrentWindow().label === "overlay") void hideOverlay();
      }
    }
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, []);
}
