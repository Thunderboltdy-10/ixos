import { useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';

const PREFETCH_DELAY = 200; // ms

export function usePrefetch() {
  const prefetchTimeoutRef = useRef<number | null>(null);

  const handleMouseEnter = useCallback((path: string) => {
    // Clear any existing timeout
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
    }

    // Set new timeout for prefetch
    prefetchTimeoutRef.current = window.setTimeout(() => {
      if (typeof window === 'undefined' || !('__TAURI__' in window)) {
        return;
      }
      invoke('prefetch_file', { path }).catch((error) => {
        console.error('Prefetch failed:', error);
      });
    }, PREFETCH_DELAY);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
      prefetchTimeoutRef.current = null;
    }
  }, []);

  return { handleMouseEnter, handleMouseLeave };
}
