import { create } from "zustand";
import * as tauri from "@/lib/tauri";
import type { RecentSearch } from "@/lib/types";
interface HistoryState {
  recent: RecentSearch[];
  load: () => Promise<void>;
  clear: () => Promise<void>;
}
export const useHistoryStore = create<HistoryState>((set, get) => ({
  recent: [],
  load: async () => set({ recent: await tauri.listRecentSearches() }),
  clear: async () => {
    await tauri.clearRecentSearches();
    await get().load();
  },
}));
