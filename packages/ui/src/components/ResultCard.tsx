import * as React from 'react';
import { FileText, ChevronRight } from 'lucide-react';
import { cn } from '../utils/cn';
import { Badge } from '../primitives/Badge';

export interface ResultData {
  filename: string;
  directory: string;
  score: number;
  snippet?: string;
  tags?: string[];
}

export interface ResultCardProps {
  result: ResultData;
  index: number;
  isSelected?: boolean;
  isExpanded?: boolean;
  onClick?: () => void;
  onOpen?: () => void;
  onReveal?: () => void;
  /** For demo mode - disables file operations */
  isDemo?: boolean;
  className?: string;
}

/**
 * Shared result card component
 * Simplified design with 4 elements: filename + path, score, expand indicator
 */
export function ResultCard({
  result,
  index,
  isSelected = false,
  isExpanded = false,
  onClick,
  onOpen,
  onReveal,
  isDemo = false,
  className,
}: ResultCardProps) {
  const scorePercent = Math.round(result.score * 100);

  return (
    <div
      className={cn(
        'px-4 py-2.5 cursor-pointer transition-colors duration-150',
        'border-l-2',
        isSelected
          ? 'border-l-accent-teal bg-graphite-1'
          : 'border-l-transparent hover:bg-graphite-1/50',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        {/* File icon */}
        <FileText
          className={cn(
            'w-4 h-4 flex-shrink-0 transition-colors',
            isSelected ? 'text-accent-teal' : 'text-fg-dim'
          )}
        />

        {/* File info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-porcelain truncate">{result.filename}</p>
          <p className="text-xs text-fg-dim truncate font-mono">{result.directory}</p>
        </div>

        {/* Score */}
        <span
          className={cn(
            'text-xs font-mono tabular-nums',
            scorePercent >= 90
              ? 'text-accent-amber'
              : scorePercent >= 70
              ? 'text-accent-teal'
              : 'text-fg-muted'
          )}
        >
          {scorePercent}%
        </span>

        {/* Expand indicator */}
        <ChevronRight
          className={cn(
            'w-4 h-4 text-fg-dim transition-transform duration-200',
            isExpanded && 'rotate-90'
          )}
        />
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-3 pl-7 border-l border-stroke-hairline space-y-3">
          {/* Tags */}
          {result.tags && result.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {result.tags.map((tag) => (
                <Badge key={tag} variant="outline" size="sm">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Snippet */}
          {result.snippet && (
            <p className="text-xs text-fg-muted font-mono bg-graphite-2/50 rounded px-2 py-1.5 leading-relaxed">
              {result.snippet}
            </p>
          )}

          {/* Actions (only when not in demo mode) */}
          {!isDemo && (
            <div className="flex gap-2 pt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen?.();
                }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-md',
                  'bg-accent-teal/10 text-accent-teal border border-accent-teal/30',
                  'hover:bg-accent-teal/20 hover:border-accent-teal/50',
                  'transition-colors duration-150'
                )}
              >
                Open
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReveal?.();
                }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-md',
                  'bg-graphite-3 text-fg-muted border border-stroke-hairline',
                  'hover:bg-graphite-2 hover:text-porcelain',
                  'transition-colors duration-150'
                )}
              >
                Reveal
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
