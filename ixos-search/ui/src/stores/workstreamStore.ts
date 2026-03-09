/**
 * Workstream Store - Phase 2 Second Brain
 *
 * Manages workstream state for auto-clustered sessions.
 */

import { create } from 'zustand';
import type { Workstream, WorkstreamsStats } from '@/lib/types';
import * as tauri from '@/lib/tauri';

interface WorkstreamState {
  // State
  workstreams: Workstream[];
  currentWorkstream: Workstream | null;
  stats: WorkstreamsStats | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadWorkstreams: (limit?: number, offset?: number) => Promise<void>;
  getWorkstream: (id: string) => Promise<Workstream | null>;
  createWorkstream: (name: string, description?: string, eventIds?: string[]) => Promise<Workstream | null>;
  renameWorkstream: (id: string, newName: string) => Promise<boolean>;
  deleteWorkstream: (id: string) => Promise<boolean>;
  mergeWorkstreams: (ids: string[]) => Promise<string | null>;
  pinWorkstream: (id: string, pinned: boolean) => Promise<boolean>;
  recluster: (gapThresholdMins?: number) => Promise<number>;
  loadStats: () => Promise<void>;

  // Selection
  setCurrentWorkstream: (workstream: Workstream | null) => void;
  selectWorkstream: (id: string) => Promise<void>;

  // Get most recent
  getMostRecent: () => Workstream | null;

  // Reset
  reset: () => void;
}

export const useWorkstreamStore = create<WorkstreamState>((set, get) => ({
  // Initial state
  workstreams: [],
  currentWorkstream: null,
  stats: null,
  isLoading: false,
  error: null,

  // Load workstreams
  loadWorkstreams: async (limit, offset) => {
    set({ isLoading: true, error: null });
    try {
      const workstreams = await tauri.listWorkstreams(limit, offset);
      set({ workstreams, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Don't show error for Pro capability requirement
      if (!message.includes('Pro capability required')) {
        set({ error: message });
      }
      set({ isLoading: false });
    }
  },

  // Get a specific workstream
  getWorkstream: async (id) => {
    try {
      const workstream = await tauri.getWorkstream(id);
      return workstream;
    } catch (error) {
      console.error('Failed to get workstream:', error);
      return null;
    }
  },

  // Create a new workstream
  createWorkstream: async (name, description, eventIds) => {
    set({ isLoading: true, error: null });
    try {
      const workstream = await tauri.createWorkstream(name, description, eventIds);
      const workstreams = [...get().workstreams, workstream];
      set({ workstreams, isLoading: false });
      return workstream;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ error: message, isLoading: false });
      return null;
    }
  },

  // Rename a workstream
  renameWorkstream: async (id, newName) => {
    try {
      const success = await tauri.renameWorkstream(id, newName);
      if (success) {
        const workstreams = get().workstreams.map((ws) =>
          ws.id === id ? { ...ws, name: newName, isAuto: false } : ws
        );
        set({ workstreams });

        // Update current if it's the renamed one
        const current = get().currentWorkstream;
        if (current?.id === id) {
          set({ currentWorkstream: { ...current, name: newName, isAuto: false } });
        }
      }
      return success;
    } catch (error) {
      console.error('Failed to rename workstream:', error);
      return false;
    }
  },

  // Delete a workstream
  deleteWorkstream: async (id) => {
    try {
      const success = await tauri.deleteWorkstream(id);
      if (success) {
        const workstreams = get().workstreams.filter((ws) => ws.id !== id);
        set({ workstreams });

        // Clear current if it's the deleted one
        if (get().currentWorkstream?.id === id) {
          set({ currentWorkstream: null });
        }
      }
      return success;
    } catch (error) {
      console.error('Failed to delete workstream:', error);
      return false;
    }
  },

  // Merge workstreams
  mergeWorkstreams: async (ids) => {
    set({ isLoading: true, error: null });
    try {
      const mergedId = await tauri.mergeWorkstreams(ids);
      if (mergedId) {
        // Reload workstreams to get updated list
        await get().loadWorkstreams();
      }
      set({ isLoading: false });
      return mergedId;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ error: message, isLoading: false });
      return null;
    }
  },

  // Pin/unpin a workstream
  pinWorkstream: async (id, pinned) => {
    try {
      const success = await tauri.pinWorkstream(id, pinned);
      if (success) {
        const workstreams = get().workstreams.map((ws) =>
          ws.id === id ? { ...ws, isPinned: pinned } : ws
        );
        set({ workstreams });

        // Update current if applicable
        const current = get().currentWorkstream;
        if (current?.id === id) {
          set({ currentWorkstream: { ...current, isPinned: pinned } });
        }
      }
      return success;
    } catch (error) {
      console.error('Failed to pin workstream:', error);
      return false;
    }
  },

  // Re-cluster from activity
  recluster: async (gapThresholdMins) => {
    set({ isLoading: true, error: null });
    try {
      const count = await tauri.reclusterWorkstreams(gapThresholdMins);
      // Reload to get new workstreams
      await get().loadWorkstreams();
      set({ isLoading: false });
      return count;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ error: message, isLoading: false });
      return 0;
    }
  },

  // Load statistics
  loadStats: async () => {
    try {
      const stats = await tauri.getWorkstreamsStats();
      set({ stats });
    } catch (error) {
      console.debug('Failed to load workstream stats:', error);
    }
  },

  // Set current workstream
  setCurrentWorkstream: (workstream) => {
    set({ currentWorkstream: workstream });
  },

  // Select a workstream by ID
  selectWorkstream: async (id) => {
    const existing = get().workstreams.find((ws) => ws.id === id);
    if (existing) {
      set({ currentWorkstream: existing });
      return;
    }

    // Not in local list, fetch from backend
    const workstream = await get().getWorkstream(id);
    if (workstream) {
      set({ currentWorkstream: workstream });
    }
  },

  // Get most recent workstream
  getMostRecent: () => {
    const workstreams = get().workstreams;
    if (workstreams.length === 0) return null;

    return workstreams.reduce((most, ws) =>
      ws.lastActive > most.lastActive ? ws : most
    );
  },

  // Reset store
  reset: () => {
    set({
      workstreams: [],
      currentWorkstream: null,
      stats: null,
      isLoading: false,
      error: null,
    });
  },
}));
