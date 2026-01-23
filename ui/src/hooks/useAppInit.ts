/**
 * App initialization hook
 * Loads persistent data on app startup
 */

import { useEffect, useState } from 'react';
import { useStarredStore } from '@/stores/starredStore';
import { useStatsStore } from '@/stores/statsStore';
import { useSettingsStore } from '@/stores/settingsStore';

export function useAppInit() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStarred = useStarredStore(state => state.loadStarred);
  const loadStats = useStatsStore(state => state.loadStats);
  const loadConfig = useSettingsStore(state => state.loadConfig);
  const loadConsent = useSettingsStore(state => state.loadConsent);

  useEffect(() => {
    async function initialize() {
      try {
        // Load all persistent data in parallel
        await Promise.all([
          loadStarred(),
          loadStats(),
          loadConfig(),
          loadConsent(),
        ]);

        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to initialize app:', err);
        setError(String(err));
        setIsInitialized(true); // Continue even if loading fails
      }
    }

    initialize();
  }, [loadStarred, loadStats]);

  return { isInitialized, error };
}

