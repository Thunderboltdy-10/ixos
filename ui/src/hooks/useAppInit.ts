/**
 * App initialization hook
 * Loads persistent data on app startup and performs initial model verification
 */

import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useStarredStore } from '@/stores/starredStore';
import { useStatsStore } from '@/stores/statsStore';
import { useSettingsStore } from '@/stores/settingsStore';

interface ModelStatus {
  anyAvailable: boolean;
}

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

        // Verify that at least one model is available
        // This is informational only - doesn't block app startup
        try {
          const modelStatus = await invoke<ModelStatus>('get_model_status');
          if (!modelStatus.anyAvailable) {
            console.warn('No models available - app will show model download prompt');
          }
        } catch (err) {
          console.warn('Failed to check model status on startup:', err);
          // Non-fatal - continue loading
        }

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

