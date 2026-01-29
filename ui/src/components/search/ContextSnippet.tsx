import { cn } from '@/lib/utils';
import type { ContextSnippet as ContextSnippetType } from '@/lib/types';

interface ContextSnippetProps {
  context: ContextSnippetType;
  className?: string;
  mode?: 'jit' | 'cache' | 'journalist';
}

export function ContextSnippet({ context, className, mode = 'cache' }: ContextSnippetProps) {
  // Safety checks for malformed data
  if (!context || typeof context !== 'object') {
    return null;
  }

  const lineNumber = typeof context.lineNumber === 'number' && !isNaN(context.lineNumber)
    ? context.lineNumber
    : 0;
  const beforeLines = Array.isArray(context.before) ? context.before : [];
  const matchedLines = Array.isArray(context.matched) ? context.matched : [];
  const afterLines = Array.isArray(context.after) ? context.after : [];

  // Colors based on mode
  const colors = {
    jit: { bg: 'bg-accent-amber/5', border: 'border-l-accent-amber', text: 'text-accent-amber' },
    cache: { bg: 'bg-accent-teal/5', border: 'border-l-accent-teal', text: 'text-accent-teal' },
    journalist: { bg: 'bg-accent-violet/5', border: 'border-l-accent-violet', text: 'text-accent-violet' },
  };
  const activeColor = colors[mode] || colors.cache;

  // If no matched lines, don't render
  if (matchedLines.length === 0) {
    return null;
  }

  const startLine = lineNumber - beforeLines.length;

  return (
    <div
      className={cn('bg-graphite-2/80 overflow-hidden', className)}
      style={{ borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}
    >
      <div
        className="px-3 py-1.5 bg-graphite-3/60"
        style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}
      >
        <span className="text-xs text-fg-dim uppercase tracking-[0.2em]">
          Line {lineNumber}
        </span>
      </div>

      <div className="p-3 font-mono text-xs overflow-x-auto">
        {beforeLines.map((line, i) => (
          <div key={`before-${i}`} className="flex">
            <span className="w-8 flex-shrink-0 text-fg-dim text-right pr-3 select-none">
              {startLine + i}
            </span>
            <span className="text-fg-muted">{line || ' '}</span>
          </div>
        ))}

        {matchedLines.map((line, i) => (
          <div
            key={`match-${i}`}
            className={cn(
              "flex -mx-3 px-3 border-l-2",
              activeColor.bg,
              activeColor.border
            )}
          >
            <span className={cn(
              "w-8 flex-shrink-0 text-right pr-3 select-none font-semibold",
              activeColor.text
            )}>
              {lineNumber + i}
            </span>
            <span className="text-porcelain whitespace-pre">
              {highlightMatch(line || '')}
            </span>
          </div>
        ))}

        {afterLines.map((line, i) => (
          <div key={`after-${i}`} className="flex">
            <span className="w-8 flex-shrink-0 text-fg-dim text-right pr-3 select-none">
              {lineNumber + matchedLines.length + i}
            </span>
            <span className="text-fg-muted">{line || ' '}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Simple highlight that removes ANSI codes and wraps content
 * In a real implementation, you'd parse the ANSI codes to add proper highlighting
 */
function highlightMatch(text: string): string {
  // Remove ANSI escape codes for display
  // The backend sends highlighted text with ANSI codes
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}
