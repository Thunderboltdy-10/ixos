/**
 * useLayoutSync - DOM Measurement Hook
 * 
 * Measures search bar and result card positions for 3D animation targeting.
 * Uses ResizeObserver for responsive updates.
 */

import { useRef, useEffect, useCallback } from 'react';
import { useLayoutStore, type LayoutBox } from '@/stores/layoutStore';

/**
 * Hook for the search bar container - measures its position
 */
export function useSearchBarLayout() {
    const setSearchBarBox = useLayoutStore((s) => s.setSearchBarBox);
    const setCanvasSize = useLayoutStore((s) => s.setCanvasSize);
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

        const updateCanvasSize = () => {
            setCanvasSize(window.innerWidth, window.innerHeight);
        };

        // Initial measurement
        measureSearchBar();
        updateCanvasSize();

        // ResizeObserver for element changes
        const resizeObserver = new ResizeObserver(() => {
            measureSearchBar();
        });

        if (searchBarRef.current) {
            resizeObserver.observe(searchBarRef.current);
        }

        // Window resize handler
        window.addEventListener('resize', updateCanvasSize);
        window.addEventListener('resize', measureSearchBar);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', updateCanvasSize);
            window.removeEventListener('resize', measureSearchBar);
        };
    }, [setSearchBarBox, setCanvasSize]);

    return searchBarRef;
}

/**
 * Hook for the status line container - measures its position
 */
export function useStatusLayout() {
    const setStatusBox = useLayoutStore((s) => s.setStatusBox);
    const statusRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const measureStatus = () => {
            if (!statusRef.current) return;

            const rect = statusRef.current.getBoundingClientRect();
            const box: LayoutBox = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
                width: rect.width,
                height: rect.height,
                top: rect.top,
                left: rect.left,
            };
            setStatusBox(box);
        };

        measureStatus();

        const resizeObserver = new ResizeObserver(() => {
            measureStatus();
        });

        if (statusRef.current) {
            resizeObserver.observe(statusRef.current);
        }

        window.addEventListener('resize', measureStatus);
        window.addEventListener('scroll', measureStatus, true);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', measureStatus);
            window.removeEventListener('scroll', measureStatus, true);
        };
    }, [setStatusBox]);

    return statusRef;
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
        window.addEventListener('resize', measureCard);
        window.addEventListener('scroll', measureCard, true);

        return () => {
            clearTimeout(timeoutId);
            resizeObserver.disconnect();
            window.removeEventListener('resize', measureCard);
            window.removeEventListener('scroll', measureCard, true);
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

/**
 * Combined hook for layout management
 */
export function useLayoutSync() {
    const layoutStore = useLayoutStore();

    const getAnimatedOpacity = useCallback((index: number): number => {
        // Results beyond index 5 (6th result) don't animate
        if (index >= 6) return 1;
        return layoutStore.cardOpacities[index] ?? 0;
    }, [layoutStore.cardOpacities]);

    const shouldAnimate = useCallback((index: number): boolean => {
        return index < 6 && layoutStore.animationPhase !== 'idle';
    }, [layoutStore.animationPhase]);

    return {
        searchBarBox: layoutStore.searchBarBox,
        resultBoxes: layoutStore.resultBoxes,
        animationPhase: layoutStore.animationPhase,
        getAnimatedOpacity,
        shouldAnimate,
        splineProgress: layoutStore.splineProgress,
        planeScales: layoutStore.planeScales,
    };
}
