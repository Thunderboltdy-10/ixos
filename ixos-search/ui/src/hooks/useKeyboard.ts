import { useEffect, useCallback } from 'react';
import { useSearchStore } from '@/stores/searchStore';
import * as tauri from '@/lib/tauri';

/**
 * Hook to handle keyboard navigation in the search overlay
 */
export function useSearchKeyboard() {
  const {
    moveSelection,
    openSelected,
    revealSelected,
    cancelSearch,
    reset,
    phase,
  } = useSearchStore();

  const handleKeyDown = useCallback(
    async (event: KeyboardEvent) => {
      // Arrow navigation
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        moveSelection('down');
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        moveSelection('up');
        return;
      }

      // Enter to open
      if (event.key === 'Enter') {
        event.preventDefault();
        if (event.ctrlKey || event.metaKey) {
          // Ctrl+Enter to reveal in explorer
          await revealSelected();
        } else {
          // Enter to open
          await openSelected();
        }
        return;
      }

      // Escape to close/cancel
      if (event.key === 'Escape') {
        event.preventDefault();
        if (phase === 'lexical' || phase === 'semantic') {
          await cancelSearch();
        } else {
          reset();
          await tauri.hideOverlay();
        }
        return;
      }

      // Ctrl+Shift+Delete for emergency clear
      if (event.key === 'Delete' && event.ctrlKey && event.shiftKey) {
        event.preventDefault();
        await tauri.emergencyClear();
        reset();
        return;
      }
    },
    [moveSelection, openSelected, revealSelected, cancelSearch, reset, phase]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Hook to detect specific key combinations
 */
export function useKeyCombo(
  keys: { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean },
  callback: () => void
) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const keyMatches = event.key.toLowerCase() === keys.key.toLowerCase();
      const ctrlMatches = keys.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
      const shiftMatches = keys.shift ? event.shiftKey : !event.shiftKey;
      const altMatches = keys.alt ? event.altKey : !event.altKey;

      if (keyMatches && ctrlMatches && shiftMatches && altMatches) {
        event.preventDefault();
        callback();
      }
    },
    [keys, callback]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
