import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import type { SearchEvent } from '@/lib/types';
import { useSearchStore } from '@/stores/searchStore';

/**
 * Hook to listen for search events from the backend
 */
export function useSearchEvents() {
  const handleSearchEvent = useSearchStore((state) => state.handleSearchEvent);

  useEffect(() => {
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
 * Hook to listen for a specific Tauri event
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
