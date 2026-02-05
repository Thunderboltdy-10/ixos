import type { ScoreBreakdown } from './types';

export type MatchSignal = 'semantic' | 'integrity' | 'temporal' | 'behavior';

export interface ScoreComponent {
  key: MatchSignal;
  label: string;
  weight: number;
}

export interface MatchContribution extends ScoreComponent {
  score: number;
  contribution: number;
}

export const SCORE_COMPONENTS: readonly ScoreComponent[] = [
  { key: 'semantic', label: 'Semantic', weight: 0.4 },
  { key: 'integrity', label: 'Integrity', weight: 0.3 },
  { key: 'temporal', label: 'Age', weight: 0.1 },
  { key: 'behavior', label: 'Pattern', weight: 0.2 },
] as const;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function getMatchContributions(breakdown: ScoreBreakdown): MatchContribution[] {
  return SCORE_COMPONENTS.map((component) => {
    const score = clamp01(breakdown[component.key]);
    return {
      ...component,
      score,
      contribution: score * component.weight,
    };
  });
}

export function getPrimaryMatchSignal(breakdown: ScoreBreakdown): MatchContribution {
  const contributions = getMatchContributions(breakdown);
  return contributions.reduce((best, current) => {
    if (current.contribution > best.contribution) return current;
    if (current.contribution === best.contribution && current.score > best.score) return current;
    return best;
  });
}
