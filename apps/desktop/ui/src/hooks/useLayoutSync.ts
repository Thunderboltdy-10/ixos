/**
 * useLayoutSync - DOM Measurement Hook
 *
 * Measures search bar and result card positions for 3D animation targeting.
 * Uses ResizeObserver for responsive updates.
 */

import { useRef, useEffect } from "react";
import { useLayoutStore, type LayoutBox } from "@/stores/layoutStore";

/**
 * Hook for the search bar container - measures its position
 */
export function useSearchBarLayout() {
  const setSearchBarBox = useLayoutStore((s) => s.setSearchBarBox);
  const searchBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const measureSearchBar = () => {
      if (!searchBarRef.current) return;

      const rect = searchBarRef.current.getBoundingClientRect();
      const box: LayoutBox = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
      };
      setSearchBarBox(box);
    };

    // Initial measurement
    measureSearchBar();

    // ResizeObserver for element changes
    const resizeObserver = new ResizeObserver(() => {
      measureSearchBar();
    });

    if (searchBarRef.current) {
      resizeObserver.observe(searchBarRef.current);
    }

    // Window resize handler
    window.addEventListener("resize", measureSearchBar);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measureSearchBar);
    };
  }, [setSearchBarBox]);

  return searchBarRef;
}

/**
 * Hook for individual result cards - measures their positions
 */
export function useResultCardLayout(index: number) {
  const setResultBox = useLayoutStore((s) => s.setResultBox);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const measureCard = () => {
      if (!cardRef.current) return;

      const rect = cardRef.current.getBoundingClientRect();
      const box: LayoutBox = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
      };
      setResultBox(index, box);
    };

    // Initial measurement after a brief delay for layout settling
    const timeoutId = setTimeout(measureCard, 50);

    // ResizeObserver for element changes
    const resizeObserver = new ResizeObserver(() => {
      measureCard();
    });

    if (cardRef.current) {
      resizeObserver.observe(cardRef.current);
    }

    // Window resize handler
    window.addEventListener("resize", measureCard);
    window.addEventListener("scroll", measureCard, true);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", measureCard);
      window.removeEventListener("scroll", measureCard, true);
    };
  }, [index, setResultBox]);

  return cardRef;
}

/**
 * Hook to clear result boxes when results change
 */
export function useClearLayoutOnChange(dependencies: unknown[]) {
  const clearResultBoxes = useLayoutStore((s) => s.clearResultBoxes);

  useEffect(() => {
    clearResultBoxes();
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps
}
