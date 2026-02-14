/**
 * Today Empty State - First-time user guidance
 */

import { motion } from 'framer-motion';
import { Search, Clock, Lightbulb, Pin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TodayEmptyStateProps {
  onStartSearch?: () => void;
}

export function TodayEmptyState({ onStartSearch }: TodayEmptyStateProps) {
  const features = [
    {
      icon: Clock,
      title: 'Resume Your Work',
      description: 'Pick up where you left off with your recent sessions',
    },
    {
      icon: Search,
      title: 'Recently Touched',
      description: 'Quick access to files you opened today',
    },
    {
      icon: Lightbulb,
      title: 'Smart Suggestions',
      description: 'Discover related files based on your patterns',
    },
    {
      icon: Pin,
      title: 'Pin Favorites',
      description: 'Keep important files and workstreams at your fingertips',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center h-full p-8 text-center"
    >
      {/* Welcome message */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-porcelain mb-2">
          Welcome to Your Day
        </h2>
        <p className="text-fg-muted max-w-md">
          Start searching to build your activity history. Your Today Tab will show
          your recent work, suggestions, and pinned items.
        </p>
        <div className="mt-4 rounded-lg border border-stroke-hairline bg-graphite-1/55 px-4 py-3 text-left max-w-md mx-auto">
          <p className="text-xs text-fg-secondary mb-2">To populate this view:</p>
          <ol className="text-xs text-fg-dim space-y-1">
            <li>1. Run 5-10 searches in Search.</li>
            <li>2. Open a few results from different folders.</li>
            <li>3. Keep Deep Search off while testing memory features.</li>
            <li>4. Reopen Today in a few seconds.</li>
          </ol>
        </div>
      </div>

      {/* Feature grid */}
      <div className="grid grid-cols-2 gap-4 max-w-lg mb-8">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              'p-4 rounded-lg text-left',
              'bg-graphite-1/50 border border-stroke-hairline'
            )}
          >
            <feature.icon className="w-5 h-5 text-accent-teal mb-2" />
            <h3 className="text-sm font-semibold text-porcelain mb-1">
              {feature.title}
            </h3>
            <p className="text-xs text-fg-dim">
              {feature.description}
            </p>
          </motion.div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={onStartSearch}
        className={cn(
          'flex items-center gap-2 px-6 py-3 rounded-lg font-semibold',
          'bg-accent-teal text-graphite-0',
          'hover:bg-accent-teal/90 transition-colors'
        )}
      >
        <Search className="w-4 h-4" />
        Start Searching
      </button>
    </motion.div>
  );
}
