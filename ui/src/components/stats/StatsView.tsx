/**
 * Combined stats and achievements view
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { StatsPanel } from './StatsPanel';
import { AchievementGrid } from './AchievementBadge';
import { TrendingUp, Trophy } from 'lucide-react';

type Tab = 'stats' | 'achievements';

export function StatsView() {
  const [activeTab, setActiveTab] = useState<Tab>('stats');

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <TabButton
          active={activeTab === 'stats'}
          onClick={() => setActiveTab('stats')}
          icon={<TrendingUp className="w-4 h-4" />}
          label="Statistics"
        />
        <TabButton
          active={activeTab === 'achievements'}
          onClick={() => setActiveTab('achievements')}
          icon={<Trophy className="w-4 h-4" />}
          label="Achievements"
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'stats' ? (
          <StatsPanel />
        ) : (
          <div className="p-6">
            <AchievementGrid />
          </div>
        )}
      </div>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative flex items-center gap-2 px-6 py-3 font-medium transition-colors
        ${active
          ? 'text-blue-600 dark:text-blue-400'
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
        }
      `}
    >
      {icon}
      <span>{label}</span>

      {active && (
        <motion.div
          layoutId="activeTab"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"
        />
      )}
    </button>
  );
}
