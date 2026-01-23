/**
 * Achievement badge component
 * Shows locked/unlocked achievements with tooltips
 */

import { motion } from 'framer-motion';
import { useStatsStore, ACHIEVEMENTS, type Achievement } from '@/stores/statsStore';
import { Lock } from 'lucide-react';
import { useState } from 'react';

interface AchievementBadgeProps {
  achievement: Achievement;
  unlocked: boolean;
  progress?: number; // 0-1 for locked achievements
}

export function AchievementBadge({ achievement, unlocked, progress = 0 }: AchievementBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.05 }}
        onHoverStart={() => setShowTooltip(true)}
        onHoverEnd={() => setShowTooltip(false)}
        className={`
          relative p-4 rounded-xl border-2 transition-all cursor-pointer
          ${unlocked
            ? 'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-400 dark:border-yellow-600 shadow-lg'
            : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 opacity-60'
          }
        `}
      >
        {/* Icon */}
        <div className="text-4xl mb-2 flex items-center justify-center">
          {unlocked ? achievement.icon : <Lock className="w-8 h-8 text-gray-400" />}
        </div>

        {/* Name */}
        <div className={`text-sm font-semibold text-center ${unlocked ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
          {achievement.name}
        </div>

        {/* Progress bar for locked achievements */}
        {!unlocked && progress > 0 && (
          <div className="mt-2 h-1 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              className="h-full bg-blue-500"
            />
          </div>
        )}

        {/* Glow effect for unlocked */}
        {unlocked && (
          <motion.div
            className="absolute inset-0 rounded-xl bg-gradient-to-br from-yellow-400/20 to-orange-400/20 blur-xl -z-10"
            animate={{
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
      </motion.div>

      {/* Tooltip */}
      {showTooltip && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-10"
        >
          <div className="font-semibold">{achievement.description}</div>
          {!unlocked && achievement.threshold && (
            <div className="text-gray-400 mt-1">
              Progress: {Math.round(progress * 100)}%
            </div>
          )}
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45" />
        </motion.div>
      )}
    </div>
  );
}

/**
 * Achievement grid showing all achievements
 */
export function AchievementGrid() {
  const stats = useStatsStore();

  const unlockedAchievements = stats.getUnlockedAchievements();
  const lockedAchievements = stats.getLockedAchievements();

  // Calculate progress for locked achievements
  const getProgress = (achievement: typeof ACHIEVEMENTS[0]): number => {
    switch (achievement.id) {
      case 'first_search':
      case 'searcher_10':
      case 'power_user':
      case 'expert':
        return Math.min(1, stats.totalSearches / achievement.threshold);
      case 'streak_3':
      case 'streak_7':
      case 'streak_30':
        return Math.min(1, stats.currentStreak / achievement.threshold);
      case 'privacy_pro':
        return stats.modeStats.journalist > 0 ? 1 : 0;
      case 'speed_demon':
        return stats.fastestSearchMs < 500 && stats.fastestSearchMs > 0 ? 1 : 0;
      case 'cache_master': {
        const total = stats.cacheHits + stats.cacheMisses;
        if (total < 20) return total / 20;
        const rate = stats.cacheHits / total;
        return rate >= 0.9 ? 1 : rate / 0.9;
      }
      case 'explorer':
        return Math.min(1, stats.filesIndexed / achievement.threshold);
      default:
        return 0;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Unlocked ({unlockedAchievements.length}/{ACHIEVEMENTS.length})
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {unlockedAchievements.map(achievement => (
            <AchievementBadge
              key={achievement.id}
              achievement={achievement}
              unlocked={true}
            />
          ))}
        </div>
      </div>

      {lockedAchievements.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Locked
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {lockedAchievements.map(achievement => (
              <AchievementBadge
                key={achievement.id}
                achievement={achievement}
                unlocked={false}
                progress={getProgress(achievement)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
