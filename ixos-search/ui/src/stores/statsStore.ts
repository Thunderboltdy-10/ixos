/**
 * Statistics and achievements store
 * Tracks usage metrics and unlockable achievements
 */

import { create } from 'zustand';
import { saveEncrypted, loadEncrypted } from '@/lib/storage';
import { useNotificationStore } from './notificationStore';

const STATS_FILE = 'statistics.encrypted';

/**
 * Achievement definitions
 */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  threshold: number;
  checkFn: (stats: Stats) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_search',
    name: 'First Steps',
    description: 'Complete your first search',
    icon: '🔍',
    threshold: 1,
    checkFn: (s) => s.totalSearches >= 1,
  },
  {
    id: 'searcher_10',
    name: 'Getting Started',
    description: 'Complete 10 searches',
    icon: '🎯',
    threshold: 10,
    checkFn: (s) => s.totalSearches >= 10,
  },
  {
    id: 'power_user',
    name: 'Power User',
    description: 'Complete 100 searches',
    icon: '⚡',
    threshold: 100,
    checkFn: (s) => s.totalSearches >= 100,
  },
  {
    id: 'expert',
    name: 'Search Expert',
    description: 'Complete 1,000 searches',
    icon: '🏆',
    threshold: 1000,
    checkFn: (s) => s.totalSearches >= 1000,
  },
  {
    id: 'streak_3',
    name: 'Consistent',
    description: 'Maintain a 3-day streak',
    icon: '🔥',
    threshold: 3,
    checkFn: (s) => s.currentStreak >= 3,
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: '🔥🔥',
    threshold: 7,
    checkFn: (s) => s.currentStreak >= 7,
  },
  {
    id: 'streak_30',
    name: 'Month Master',
    description: 'Maintain a 30-day streak',
    icon: '🔥🔥🔥',
    threshold: 30,
    checkFn: (s) => s.currentStreak >= 30,
  },
  {
    id: 'privacy_pro',
    name: 'Privacy Pro',
    description: 'Use Deep Search mode',
    icon: '🕵️',
    threshold: 1,
    checkFn: (s) => s.modeStats.journalist >= 1,
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Complete a search in under 500ms',
    icon: '⚡',
    threshold: 1,
    checkFn: (s) => s.fastestSearchMs < 500 && s.fastestSearchMs > 0,
  },
  {
    id: 'cache_master',
    name: 'Cache Master',
    description: 'Achieve 90% cache hit rate (min 20 searches)',
    icon: '💾',
    threshold: 20,
    checkFn: (s) => {
      const total = s.cacheHits + s.cacheMisses;
      return total >= 20 && (s.cacheHits / total) >= 0.9;
    },
  },
  {
    id: 'explorer',
    name: 'Explorer',
    description: 'Index 1,000 files',
    icon: '🗂️',
    threshold: 1000,
    checkFn: (s) => s.filesIndexed >= 1000,
  },
];

/**
 * Milestone definition for engagement tracking
 */
export interface Milestone {
  type: 'searches' | 'streak' | 'files';
  value: number;
  date: string; // ISO date string
}

/** Search milestones to track */
const SEARCH_MILESTONES = [10, 50, 100, 500, 1000, 5000];

/** Streak milestones to track */
const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];

/**
 * Statistics data structure
 */
export interface Stats {
  totalSearches: number;
  filesIndexed: number;
  embeddingsGenerated: number;
  cacheHits: number;
  cacheMisses: number;

  // Performance
  fastestSearchMs: number;
  slowestSearchMs: number;
  averageSearchMs: number;

  // Streaks
  currentStreak: number;
  longestStreak: number;
  lastSearchDate: string | null; // ISO date string (YYYY-MM-DD)
  lastActiveDate: string | null; // ISO date string for daily activity tracking

  // Achievements
  unlockedAchievements: string[];

  // Milestones achieved
  milestones: Milestone[];

  // Per-mode stats
  modeStats: {
    nativeCache: number;
    ephemeral: number;
    journalist: number;
  };
}

interface StatsState extends Stats {
  isLoaded: boolean;
  newAchievements: string[]; // Recently unlocked, for notifications

  // Actions
  incrementSearch: (mode: 'native-cache' | 'ephemeral' | 'journalist', durationMs: number) => void;
  updateFileCount: (count: number) => void;
  updateEmbeddingCount: (count: number) => void;
  recordCacheHit: () => void;
  recordCacheMiss: () => void;
  checkAchievements: () => string[]; // Returns newly unlocked achievement IDs
  dismissNewAchievements: () => void;

  // Persistence
  loadStats: () => Promise<void>;
  saveStats: () => Promise<void>;
  resetStats: () => Promise<void>;

  // Getters
  getCacheHitRate: () => number;
  getUnlockedAchievements: () => Achievement[];
  getLockedAchievements: () => Achievement[];
}

const DEFAULT_STATS: Stats = {
  totalSearches: 0,
  filesIndexed: 0,
  embeddingsGenerated: 0,
  cacheHits: 0,
  cacheMisses: 0,
  fastestSearchMs: Infinity,
  slowestSearchMs: 0,
  averageSearchMs: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastSearchDate: null,
  lastActiveDate: null,
  unlockedAchievements: [],
  milestones: [],
  modeStats: {
    nativeCache: 0,
    ephemeral: 0,
    journalist: 0,
  },
};

export const useStatsStore = create<StatsState>((set, get) => ({
  ...DEFAULT_STATS,
  isLoaded: false,
  newAchievements: [],

  incrementSearch: (mode, durationMs) => {
    const prevState = get();
    const prevTotal = prevState.totalSearches;
    const prevStreak = prevState.currentStreak;

    set(state => {
      const newTotal = state.totalSearches + 1;
      const newAverage = (state.averageSearchMs * state.totalSearches + durationMs) / newTotal;
      const modeKey = mode === 'native-cache' ? 'nativeCache' : mode;

      // Update streak
      const today = new Date().toISOString().split('T')[0];
      let newStreak = state.currentStreak;
      let newLongest = state.longestStreak;

      if (state.lastSearchDate) {
        const lastDate = new Date(state.lastSearchDate);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
          // Same day, streak unchanged
          newStreak = state.currentStreak;
        } else if (diffDays === 1) {
          // Next day, increment streak
          newStreak = state.currentStreak + 1;
          newLongest = Math.max(newLongest, newStreak);
        } else {
          // Streak broken
          newStreak = 1;
        }
      } else {
        // First search
        newStreak = 1;
        newLongest = 1;
      }

      // Check for new milestones
      const newMilestones: Milestone[] = [];

      // Search milestones
      for (const threshold of SEARCH_MILESTONES) {
        if (prevTotal < threshold && newTotal >= threshold) {
          newMilestones.push({ type: 'searches', value: threshold, date: today });
        }
      }

      // Streak milestones
      for (const threshold of STREAK_MILESTONES) {
        if (prevStreak < threshold && newStreak >= threshold) {
          newMilestones.push({ type: 'streak', value: threshold, date: today });
        }
      }

      return {
        totalSearches: newTotal,
        modeStats: {
          ...state.modeStats,
          [modeKey]: state.modeStats[modeKey] + 1,
        },
        fastestSearchMs: Math.min(state.fastestSearchMs, durationMs),
        slowestSearchMs: Math.max(state.slowestSearchMs, durationMs),
        averageSearchMs: newAverage,
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastSearchDate: today,
        lastActiveDate: today,
        milestones: [...state.milestones, ...newMilestones],
      };
    });

    // Check for new milestones and show notifications
    const newState = get();
    const notificationStore = useNotificationStore.getState();

    // Show search milestone notifications
    for (const threshold of SEARCH_MILESTONES) {
      if (prevTotal < threshold && newState.totalSearches >= threshold) {
        notificationStore.showMilestone(
          `${threshold} Searches!`,
          `You've completed ${threshold} searches. Keep exploring!`
        );
      }
    }

    // Show streak milestone notifications
    for (const threshold of STREAK_MILESTONES) {
      if (prevStreak < threshold && newState.currentStreak >= threshold) {
        notificationStore.showStreak(
          `${threshold}-Day Streak!`,
          `Amazing! You've maintained a ${threshold}-day streak.`
        );
      }
    }

    // Check for new achievements
    get().checkAchievements();
    get().saveStats();
  },

  updateFileCount: (count) => {
    set({ filesIndexed: Math.max(get().filesIndexed, count) });
    get().saveStats();
  },

  updateEmbeddingCount: (count) => {
    set({ embeddingsGenerated: get().embeddingsGenerated + count });
    get().saveStats();
  },

  recordCacheHit: () => {
    set(state => ({ cacheHits: state.cacheHits + 1 }));
    get().checkAchievements();
    get().saveStats();
  },

  recordCacheMiss: () => {
    set(state => ({ cacheMisses: state.cacheMisses + 1 }));
    get().saveStats();
  },

  checkAchievements: () => {
    const state = get();
    const newlyUnlocked: string[] = [];

    for (const achievement of ACHIEVEMENTS) {
      const isUnlocked = state.unlockedAchievements.includes(achievement.id);
      const shouldUnlock = achievement.checkFn(state);

      if (!isUnlocked && shouldUnlock) {
        newlyUnlocked.push(achievement.id);
      }
    }

    if (newlyUnlocked.length > 0) {
      set(state => ({
        unlockedAchievements: [...state.unlockedAchievements, ...newlyUnlocked],
        newAchievements: [...state.newAchievements, ...newlyUnlocked],
      }));
      get().saveStats();
    }

    return newlyUnlocked;
  },

  dismissNewAchievements: () => {
    set({ newAchievements: [] });
  },

  loadStats: async () => {
    try {
      const loaded = await loadEncrypted<Stats>(STATS_FILE);

      if (loaded) {
        const loadedModeStats = (loaded.modeStats ?? {}) as Record<string, number>;
        set({
          ...loaded,
          modeStats: {
            nativeCache: loadedModeStats.nativeCache ?? loadedModeStats.cache ?? 0,
            ephemeral: loadedModeStats.ephemeral ?? loadedModeStats.jit ?? 0,
            journalist: loadedModeStats.journalist ?? 0,
          },
          isLoaded: true,
        });
      } else {
        set({ isLoaded: true });
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
      set({ isLoaded: true });
    }
  },

  saveStats: async () => {
    const state = get();
    const statsData: Stats = {
      totalSearches: state.totalSearches,
      filesIndexed: state.filesIndexed,
      embeddingsGenerated: state.embeddingsGenerated,
      cacheHits: state.cacheHits,
      cacheMisses: state.cacheMisses,
      fastestSearchMs: state.fastestSearchMs,
      slowestSearchMs: state.slowestSearchMs,
      averageSearchMs: state.averageSearchMs,
      currentStreak: state.currentStreak,
      longestStreak: state.longestStreak,
      lastSearchDate: state.lastSearchDate,
      lastActiveDate: state.lastActiveDate,
      unlockedAchievements: state.unlockedAchievements,
      milestones: state.milestones,
      modeStats: state.modeStats,
    };

    try {
      await saveEncrypted(STATS_FILE, statsData);
    } catch (error) {
      console.error('Failed to save stats:', error);
    }
  },

  resetStats: async () => {
    set({
      ...DEFAULT_STATS,
      newAchievements: [],
    });
    await get().saveStats();
  },

  getCacheHitRate: () => {
    const state = get();
    const total = state.cacheHits + state.cacheMisses;
    return total > 0 ? state.cacheHits / total : 0;
  },

  getUnlockedAchievements: () => {
    const state = get();
    return ACHIEVEMENTS.filter(a => state.unlockedAchievements.includes(a.id));
  },

  getLockedAchievements: () => {
    const state = get();
    return ACHIEVEMENTS.filter(a => !state.unlockedAchievements.includes(a.id));
  },
}));
