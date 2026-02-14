/**
 * Statistics panel showing search metrics and achievements
 */

import { motion } from 'framer-motion';
import { useStatsStore } from '@/stores/statsStore';
import { TrendingUp, Zap, Database, Flame } from 'lucide-react';

export function StatsPanel() {
  const stats = useStatsStore();

  const cacheHitRate = stats.getCacheHitRate();

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold text-porcelain font-display">Statistics</h2>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Total Searches */}
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Total Searches"
          value={stats.totalSearches}
          color="teal"
        />

        {/* Current Streak */}
        <StatCard
          icon={<Flame className="w-5 h-5" />}
          label="Current Streak"
          value={`${stats.currentStreak} days`}
          color="amber"
          subtitle={`Best: ${stats.longestStreak} days`}
        />

        {/* Files Indexed */}
        <StatCard
          icon={<Database className="w-5 h-5" />}
          label="Files Indexed"
          value={stats.filesIndexed.toLocaleString()}
          color="teal"
        />

        {/* Cache Hit Rate */}
        <StatCard
          icon={<Zap className="w-5 h-5" />}
          label="Cache Hit Rate"
          value={`${(cacheHitRate * 100).toFixed(1)}%`}
          color="violet"
          subtitle={`${stats.cacheHits} hits, ${stats.cacheMisses} misses`}
        />
      </div>

      {/* Performance Stats */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-fg-muted">Performance</h3>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="bg-graphite-2 rounded-lg p-3 border border-stroke-hairline">
            <div className="text-fg-dim">Fastest</div>
            <div className="font-semibold text-porcelain font-mono">
              {stats.fastestSearchMs === Infinity ? '-' : `${stats.fastestSearchMs}ms`}
            </div>
          </div>
          <div className="bg-graphite-2 rounded-lg p-3 border border-stroke-hairline">
            <div className="text-fg-dim">Average</div>
            <div className="font-semibold text-porcelain font-mono">
              {stats.averageSearchMs > 0 ? `${stats.averageSearchMs.toFixed(0)}ms` : '-'}
            </div>
          </div>
          <div className="bg-graphite-2 rounded-lg p-3 border border-stroke-hairline">
            <div className="text-fg-dim">Slowest</div>
            <div className="font-semibold text-porcelain font-mono">
              {stats.slowestSearchMs > 0 ? `${stats.slowestSearchMs}ms` : '-'}
            </div>
          </div>
        </div>
      </div>

      {/* Mode Breakdown */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-fg-muted">Search Modes</h3>
        <div className="space-y-2">
          <ModeBar label="Local" count={stats.modeStats.nativeCache} total={stats.totalSearches} color="bg-accent-teal" />
          <ModeBar label="Memory" count={stats.modeStats.ephemeral} total={stats.totalSearches} color="bg-accent-teal-glow" />
          <ModeBar label="Deep Search" count={stats.modeStats.journalist} total={stats.totalSearches} color="bg-accent-magenta" />
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: 'teal' | 'amber' | 'violet' | 'magenta';
  subtitle?: string;
}

function StatCard({ icon, label, value, color, subtitle }: StatCardProps) {
  const colorClasses = {
    teal: 'bg-accent-teal/15 text-accent-teal',
    amber: 'bg-accent-amber/15 text-accent-amber',
    violet: 'bg-accent-violet/15 text-accent-violet',
    magenta: 'bg-accent-magenta/15 text-accent-magenta',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-graphite-2 rounded-lg p-4 border border-stroke-hairline"
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-fg-muted">{label}</div>
          <div className="text-2xl font-bold text-porcelain mt-1 font-mono">
            {value}
          </div>
          {subtitle && (
            <div className="text-xs text-fg-dim mt-1">
              {subtitle}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

interface ModeBarProps {
  label: string;
  count: number;
  total: number;
  color: string;
}

function ModeBar({ label, count, total, color }: ModeBarProps) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-fg-muted">{label}</span>
        <span className="text-fg-dim font-mono">
          {count} ({percentage.toFixed(0)}%)
        </span>
      </div>
      <div className="h-2 bg-graphite-3 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`h-full ${color}`}
        />
      </div>
    </div>
  );
}
