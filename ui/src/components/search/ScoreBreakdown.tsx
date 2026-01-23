import { cn } from '@/lib/utils';
import type { ScoreBreakdown as ScoreBreakdownType } from '@/lib/types';

interface ScoreBreakdownProps {
  breakdown: ScoreBreakdownType;
  className?: string;
}

const segments = [
  { key: 'semantic', label: 'Semantic', color: 'bg-blue-500', weight: 0.4 },
  { key: 'integrity', label: 'Integrity', color: 'bg-green-500', weight: 0.3 },
  { key: 'temporal', label: 'Age', color: 'bg-amber-500', weight: 0.1 },
  { key: 'behavior', label: 'Pattern', color: 'bg-purple-500', weight: 0.2 },
] as const;

export function ScoreBreakdown({ breakdown, className }: ScoreBreakdownProps) {
  // Safety check - return nothing if breakdown is invalid
  if (!breakdown || typeof breakdown !== 'object') {
    return null;
  }

  // Safe accessor with fallback
  const getScore = (key: string): number => {
    const value = (breakdown as Record<string, unknown>)[key];
    return typeof value === 'number' ? value : 0;
  };

  // Calculate total weighted score
  const totalScore = segments.reduce((sum, seg) => {
    const value = getScore(seg.key);
    return sum + value * seg.weight;
  }, 0);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-secondary font-medium">Score Breakdown</p>
        <p className="text-xs text-text-muted">
          Total: {Math.round(totalScore * 100)}%
        </p>
      </div>

      {/* Horizontal bar chart */}
      <div className="h-2 rounded-full overflow-hidden flex bg-muted">
        {segments.map(({ key, color, weight }) => {
          const value = getScore(key);
          const contribution = value * weight;

          return (
            <div
              key={key}
              className={cn(color, 'h-full transition-all duration-400')}
              style={{ width: `${contribution * 100}%` }}
              title={`${key}: ${Math.round(value * 100)}% (${Math.round(contribution * 100)}% contribution)`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-2xs">
        {segments.map(({ key, label, color }) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={cn('w-2 h-2 rounded-full', color)} />
            <span className="text-text-muted">{label}</span>
            <span className="text-text-primary font-mono">
              {Math.round(getScore(key) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
