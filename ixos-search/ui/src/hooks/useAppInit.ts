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
import { useWorkstreamStore } from '@/stores/workstreamStore';
import { useUIStore } from '@/stores/uiStore';
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
  const loadWorkstreamsStore = useWorkstreamStore(state => state.loadWorkstreams);
  const initializeToday = useTodayStore(state => state.initialize);
  const setShowInfo = useUIStore(state => state.setShowInfo);

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

        // Hydrate local activity and workstreams before displaying their views.
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
            // A first installation may not have persisted workstreams yet.
          }

          // Keep the UI store hydrated from first render.
          await loadWorkstreamsStore();

          // Initialize Today Tab data (uses loaded workstreams)
          await initializeToday();

          // Only recluster if no workstreams were loaded from persistence
          // This preserves user's existing workstreams across restarts
          if (!hasPersistedWorkstreams) {
            await tauri.reclusterWorkstreams();
            await loadWorkstreamsStore();
          }
        } catch (error) {
          console.warn('Local activity/workstream initialization failed:', error);
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

        // Show guide automatically on first launch
        const hasSeenGuide = localStorage.getItem('ix_has_seen_guide');
        if (!hasSeenGuide) {
          localStorage.setItem('ix_has_seen_guide', 'true');
          setTimeout(() => setShowInfo(true), 500);
        }

        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to initialize app:', err);
        setError(String(err));
        setIsInitialized(true); // Continue even if loading fails
      }
    }

    initialize();
  }, [loadStarred, loadStats, loadConfig, loadConsent, loadActivityFromStorage, loadWorkstreamsStore, initializeToday]);

  return { isInitialized, error };
}

