/**
 * Toast Container - Phase 2 Engagement Hooks
 *
 * Renders toast notifications in the corner of the screen.
 * Supports multiple notification types with distinct styling.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X, Info, CheckCircle, Trophy, Flame, Lightbulb } from 'lucide-react';
import { useNotificationStore, type NotificationType } from '@/stores/notificationStore';
import { cn } from '@/lib/utils';

const iconMap: Record<NotificationType, typeof Info> = {
  info: Info,
  success: CheckCircle,
  milestone: Trophy,
  streak: Flame,
  suggestion: Lightbulb,
};

const colorMap: Record<NotificationType, string> = {
  info: 'text-accent-cyan',
  success: 'text-accent-lime',
  milestone: 'text-accent-amber',
  streak: 'text-accent-coral',
  suggestion: 'text-accent-violet',
};

const bgMap: Record<NotificationType, string> = {
  info: 'bg-accent-cyan/10 border-accent-cyan/20',
  success: 'bg-accent-lime/10 border-accent-lime/20',
  milestone: 'bg-accent-amber/10 border-accent-amber/20',
  streak: 'bg-accent-coral/10 border-accent-coral/20',
  suggestion: 'bg-accent-violet/10 border-accent-violet/20',
};

export function ToastContainer() {
  const { notifications, removeNotification } = useNotificationStore();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => {
          const Icon = iconMap[notification.type];
          const iconColor = colorMap[notification.type];
          const bgColor = bgMap[notification.type];

          return (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.95 }}
              layout
              className={cn(
                'pointer-events-auto w-80 p-4 rounded-lg',
                'bg-graphite-1 border shadow-lg shadow-black/20',
                bgColor
              )}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={cn('mt-0.5', iconColor)}>
                  <Icon className="w-5 h-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-porcelain text-sm">
                    {notification.title}
                  </h4>
                  <p className="text-xs text-fg-muted mt-1">
                    {notification.message}
                  </p>

                  {/* Action button */}
                  {notification.actionText && notification.onAction && (
                    <button
                      onClick={() => {
                        notification.onAction?.();
                        removeNotification(notification.id);
                      }}
                      className={cn(
                        'mt-2 text-xs font-medium',
                        iconColor,
                        'hover:underline'
                      )}
                    >
                      {notification.actionText}
                    </button>
                  )}
                </div>

                {/* Dismiss button */}
                <button
                  onClick={() => removeNotification(notification.id)}
                  className="text-fg-dim hover:text-fg-muted transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
