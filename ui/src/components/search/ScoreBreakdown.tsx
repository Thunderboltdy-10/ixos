import { cn } from '@/lib/utils';
import type { ScoreBreakdown as ScoreBreakdownType } from '@/lib/types';
import { getMatchContributions } from '@/lib/matchClassification';

interface ScoreBreakdownProps {
  breakdown: ScoreBreakdownType;
  mode?: 'ephemeral' | 'native-cache' | 'journalist';
  className?: string;
}

export function ScoreBreakdown({ breakdown, mode = 'native-cache', className }: ScoreBreakdownProps) {
  // Safety check - return nothing if breakdown is invalid
  if (!breakdown || typeof breakdown !== 'object') {
    return null;
  }

  const contributions = getMatchContributions(breakdown);

  // Dynamic colors based on mode
  const getSemanticColor = () => {
    switch (mode) {
      case 'ephemeral': return 'bg-accent-amber';
      case 'journalist': return 'bg-accent-violet';
      case 'native-cache':
      default: return 'bg-accent-teal';
    }
  };

  const getSegmentColor = (key: string) => {
    if (key === 'semantic') return getSemanticColor();
    if (key === 'integrity') return 'bg-emerald-500';
    if (key === 'temporal') return 'bg-indigo-400';
    return 'bg-pink-500';
  };

  // Calculate total weighted score
  const rawTotal = contributions.reduce((sum, seg) => sum + seg.contribution, 0);

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
        {contributions.map(({ key, score, contribution }) => {
          const color = getSegmentColor(key);

          if (contribution <= 0.005) return null; // Hide tiny segments

          return (
            <div
              key={key}
              className={cn(color, 'h-full transition-all duration-400 last:border-0')}
              style={{ width: `${contribution * 100}%` }}
              title={`${key}: ${Math.round(score * 100)}% (${Math.round(contribution * 100)}% contribution)`}
            />
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-2xs">
        {contributions.map(({ key, label, score }) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={cn('w-2 h-2 rounded-full', getSegmentColor(key))} />
            <span className="text-fg-dim">{label}</span>
            <span className="text-porcelain font-mono">
              {Math.round(score * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
