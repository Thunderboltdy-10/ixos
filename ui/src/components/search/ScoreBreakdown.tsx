import { cn } from '@/lib/utils';
import type { ScoreBreakdown as ScoreBreakdownType } from '@/lib/types';

interface ScoreBreakdownProps {
  breakdown: ScoreBreakdownType;
  mode?: 'jit' | 'cache' | 'journalist';
  className?: string;
}

export function ScoreBreakdown({ breakdown, mode = 'cache', className }: ScoreBreakdownProps) {
  // Safety check - return nothing if breakdown is invalid
  if (!breakdown || typeof breakdown !== 'object') {
    return null;
  }

  // Safe accessor with fallback
  const getScore = (key: string): number => {
    const value = (breakdown as Record<string, unknown>)[key];
    // Clamp individual scores between 0 and 1
    return typeof value === 'number' ? Math.min(Math.max(value, 0), 1) : 0;
  };

  // Dynamic colors based on mode
  const getSemanticColor = () => {
    switch (mode) {
      case 'jit': return 'bg-accent-amber';
      case 'journalist': return 'bg-accent-violet';
      case 'cache':
      default: return 'bg-accent-teal';
    }
  };

  const segments = [
    { key: 'semantic', label: 'Semantic', color: getSemanticColor(), weight: 0.4 },
    { key: 'integrity', label: 'Integrity', color: 'bg-emerald-500', weight: 0.3 }, // Distinct green
    { key: 'temporal', label: 'Age', color: 'bg-indigo-400', weight: 0.1 }, // Neutral blue
    { key: 'behavior', label: 'Pattern', color: 'bg-pink-500', weight: 0.2 }, // Pattern
  ];

  // Calculate total weighted score
  const rawTotal = segments.reduce((sum, seg) => {
    const value = getScore(seg.key);
    return sum + value * seg.weight;
  }, 0);

  // Cap strictly at 100%
  const totalScore = Math.min(rawTotal, 1);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-fg-muted font-medium uppercase tracking-[0.2em]">Score Breakdown</p>
        <p className="text-xs text-fg-dim font-mono">
          Total: {Math.round(totalScore * 100)}%
        </p>
      </div>

      <div className="h-2 rounded-full overflow-hidden flex bg-graphite-3/20">
        {segments.map(({ key, color, weight }) => {
          const value = getScore(key);
          const contribution = value * weight;

          if (contribution <= 0.005) return null; // Hide tiny segments

          return (
            <div
              key={key}
              className={cn(color, 'h-full transition-all duration-400 last:border-0')}
              style={{ width: `${contribution * 100}%` }}
              title={`${key}: ${Math.round(value * 100)}% (${Math.round(contribution * 100)}% contribution)`}
            />
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-2xs">
        {segments.map(({ key, label, color }) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={cn('w-2 h-2 rounded-full', color)} />
            <span className="text-fg-dim">{label}</span>
            <span className="text-porcelain font-mono">
              {Math.round(getScore(key) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
