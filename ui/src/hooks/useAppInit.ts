/**
 * App initialization hook
 * Loads persistent data on app startup and performs initial model verification
 */

import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useStarredStore } from '@/stores/starredStore';
import { useStatsStore } from '@/stores/statsStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useActivityStore } from '@/stores/activityStore';
import { useTodayStore } from '@/stores/todayStore';
import * as tauri from '@/lib/tauri';

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
  const loadActivityFromStorage = useActivityStore(state => state.loadFromStorage);
  const initializeToday = useTodayStore(state => state.initialize);

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

        // Initialize Phase 2 Second Brain features (Pro only - fails silently for free users)
        try {
          // Load activity ledger from encrypted storage
          await loadActivityFromStorage();

          // Load persisted workstreams FIRST (before initializing Today Tab)
          // This ensures workstreams survive app restart
          let hasPersistedWorkstreams = false;
          try {
            const wsStats = await tauri.loadWorkstreams();
            hasPersistedWorkstreams = wsStats.totalCount > 0;
          } catch {
            // Expected for free users or first launch
          }

          // Initialize Today Tab data (uses loaded workstreams)
          await initializeToday();

          // Only recluster if no workstreams were loaded from persistence
          // This preserves user's existing workstreams across restarts
          if (!hasPersistedWorkstreams) {
            await tauri.reclusterWorkstreams();
          }
        } catch {
          // Silent failure - Second Brain features are Pro only
        }

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
  }, [loadStarred, loadStats, loadConfig, loadConsent, loadActivityFromStorage, initializeToday]);

  return { isInitialized, error };
}

