import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import type { SearchEvent } from '@/lib/types';
import { useSearchStore } from '@/stores/searchStore';

/**
 * Hook to listen for search events from the backend.
 *
 * With the Tauri v2 Channel API migration, search events are now delivered
 * directly through the Channel callback passed to `searchProgressive()`.
 * This hook is kept as a no-op for backwards compatibility — the actual
 * event handling is wired in `searchStore.ts` via the `onEvent` callback.
 */
export function useSearchEvents() {
  const handleSearchEvent = useSearchStore((state) => state.handleSearchEvent);

  useEffect(() => {
    const legacyBusEnabled = (import.meta as any).env?.VITE_LEGACY_SEARCH_EVENT_BUS === '1';
    if (!legacyBusEnabled) {
      return;
    }

    let unlisten: (() => void) | undefined;

    async function setupListener() {
      if (typeof window === 'undefined' || !('__TAURI__' in window)) {
        return;
      }
      unlisten = await listen<SearchEvent>('search-event', (event) => {
        handleSearchEvent(event.payload);
      });
    }

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [handleSearchEvent]);
}

/**
 * Hook to listen for a specific Tauri event (non-search events)
 */
export function useTauriEvent<T>(eventName: string, handler: (payload: T) => void) {
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    async function setupListener() {
      if (typeof window === 'undefined' || !('__TAURI__' in window)) {
        return;
      }
      unlisten = await listen<T>(eventName, (event) => {
        handler(event.payload);
      });
    }

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [eventName, handler]);
}
