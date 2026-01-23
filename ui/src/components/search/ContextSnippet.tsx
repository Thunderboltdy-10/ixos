import { cn } from '@/lib/utils';
import type { ContextSnippet as ContextSnippetType } from '@/lib/types';

interface ContextSnippetProps {
  context: ContextSnippetType;
  className?: string;
}

export function ContextSnippet({ context, className }: ContextSnippetProps) {
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

  // If no matched lines, don't render
  if (matchedLines.length === 0) {
    return null;
  }

  const startLine = lineNumber - beforeLines.length;

  return (
    <div className={cn('rounded-md bg-graphite-2/80 overflow-hidden border border-stroke-hairline/70', className)}>
      <div className="px-3 py-1.5 bg-graphite-3/60 border-b border-stroke-hairline">
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
            className="flex bg-accent-teal/10 -mx-3 px-3 border-l-2 border-l-accent-teal"
          >
            <span className="w-8 flex-shrink-0 text-accent-teal text-right pr-3 select-none font-semibold">
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
