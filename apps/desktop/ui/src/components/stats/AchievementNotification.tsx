/**
 * Toast notification for newly unlocked achievements
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useStatsStore, ACHIEVEMENTS } from '@/stores/statsStore';
import { Trophy, X } from 'lucide-react';
import { useEffect } from 'react';

export function AchievementNotifications() {
  const newAchievements = useStatsStore(state => state.newAchievements);
  const dismissNewAchievements = useStatsStore(state => state.dismissNewAchievements);

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (newAchievements.length > 0) {
      const timer = setTimeout(() => {
        dismissNewAchievements();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [newAchievements, dismissNewAchievements]);

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      <AnimatePresence>
        {newAchievements.map(achievementId => {
          const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
          if (!achievement) return null;

          return (
            <motion.div
              key={achievementId}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg shadow-2xl overflow-hidden max-w-sm"
            >
              <div className="p-4 flex items-start gap-3">
                {/* Icon */}
                <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center text-2xl">
                  {achievement.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Trophy className="w-4 h-4" />
                    <span className="text-sm font-semibold">Achievement Unlocked!</span>
                  </div>
                  <div className="font-bold text-lg">{achievement.name}</div>
                  <div className="text-sm text-white/90 mt-1">{achievement.description}</div>
                </div>

                {/* Close button */}
                <button
                  onClick={dismissNewAchievements}
                  className="flex-shrink-0 p-1 hover:bg-white/20 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Animated background */}
              <motion.div
                className="h-1 bg-white/30"
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 5, ease: 'linear' }}
                style={{ transformOrigin: 'left' }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
