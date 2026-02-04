/**
 * Notification Store - Phase 2 Engagement Hooks
 *
 * Manages toast notifications for user engagement:
 * - Welcome back messages
 * - Search milestones (100, 500, 1000 searches)
 * - Streak achievements (7-day, 30-day)
 * - Workstream suggestions
 */

import { create } from 'zustand';

export type NotificationType = 'info' | 'success' | 'milestone' | 'streak' | 'suggestion';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  /** Optional action button text */
  actionText?: string;
  /** Optional action callback */
  onAction?: () => void;
  /** Auto-dismiss after ms (default: 5000, 0 = manual dismiss) */
  duration?: number;
  /** Timestamp when notification was created */
  createdAt: number;
}

interface NotificationState {
  /** Active notifications (max 3 visible) */
  notifications: Notification[];

  /** Add a notification */
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => string;

  /** Remove a notification by ID */
  removeNotification: (id: string) => void;

  /** Clear all notifications */
  clearAll: () => void;

  /** Convenience methods */
  showInfo: (title: string, message: string) => string;
  showSuccess: (title: string, message: string) => string;
  showMilestone: (title: string, message: string, onAction?: () => void) => string;
  showStreak: (title: string, message: string) => string;
  showSuggestion: (title: string, message: string, actionText: string, onAction: () => void) => string;
}

const MAX_NOTIFICATIONS = 3;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],

  addNotification: (notification) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newNotification: Notification = {
      ...notification,
      id,
      createdAt: Date.now(),
      duration: notification.duration ?? 5000,
    };

    set((state) => {
      // Remove oldest if at max
      let notifications = [...state.notifications, newNotification];
      if (notifications.length > MAX_NOTIFICATIONS) {
        notifications = notifications.slice(-MAX_NOTIFICATIONS);
      }
      return { notifications };
    });

    // Auto-dismiss if duration > 0
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        get().removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  clearAll: () => {
    set({ notifications: [] });
  },

  // Convenience methods
  showInfo: (title, message) => {
    return get().addNotification({ type: 'info', title, message });
  },

  showSuccess: (title, message) => {
    return get().addNotification({ type: 'success', title, message });
  },

  showMilestone: (title, message, onAction) => {
    return get().addNotification({
      type: 'milestone',
      title,
      message,
      actionText: onAction ? 'View Stats' : undefined,
      onAction,
      duration: 8000, // Milestones stay longer
    });
  },

  showStreak: (title, message) => {
    return get().addNotification({
      type: 'streak',
      title,
      message,
      duration: 6000,
    });
  },

  showSuggestion: (title, message, actionText, onAction) => {
    return get().addNotification({
      type: 'suggestion',
      title,
      message,
      actionText,
      onAction,
      duration: 10000, // Suggestions stay longer for consideration
    });
  },
}));
