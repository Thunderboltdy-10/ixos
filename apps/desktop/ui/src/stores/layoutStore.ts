import { create } from "zustand";
export interface LayoutBox {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  left: number;
}
interface LayoutState {
  searchBarBox: LayoutBox | null;
  deckUnderlineBox: LayoutBox | null;
  resultBoxes: Map<number, LayoutBox>;
  setSearchBarBox: (box: LayoutBox) => void;
  setDeckUnderlineBox: (box: LayoutBox) => void;
  setResultBox: (index: number, box: LayoutBox) => void;
  clearResultBoxes: () => void;
}
export const useLayoutStore = create<LayoutState>((set) => ({
  searchBarBox: null,
  deckUnderlineBox: null,
  resultBoxes: new Map(),
  setSearchBarBox: (searchBarBox) => set({ searchBarBox }),
  setDeckUnderlineBox: (deckUnderlineBox) => set({ deckUnderlineBox }),
  setResultBox: (index, box) =>
    set((state) => ({
      resultBoxes: new Map(state.resultBoxes).set(index, box),
    })),
  clearResultBoxes: () => set({ resultBoxes: new Map() }),
}));
