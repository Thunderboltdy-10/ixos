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
    <div className={cn('rounded-md bg-base overflow-hidden', className)}>
      <div className="px-3 py-1.5 bg-muted/50 border-b border-border">
        <span className="text-xs text-text-muted">
          Line {lineNumber}
        </span>
      </div>

      <div className="p-2 font-mono text-xs overflow-x-auto">
        {/* Before lines */}
        {beforeLines.map((line, i) => (
          <div key={`before-${i}`} className="flex">
            <span className="w-8 flex-shrink-0 text-text-muted text-right pr-3 select-none">
              {startLine + i}
            </span>
            <span className="text-text-tertiary">{line || ' '}</span>
          </div>
        ))}

        {/* Matched lines */}
        {matchedLines.map((line, i) => (
          <div
            key={`match-${i}`}
            className="flex bg-accent/10 -mx-2 px-2 border-l-2 border-l-accent"
          >
            <span className="w-8 flex-shrink-0 text-accent text-right pr-3 select-none font-medium">
              {lineNumber + i}
            </span>
            <span className="text-text-primary whitespace-pre">
              {highlightMatch(line || '')}
            </span>
          </div>
        ))}

        {/* After lines */}
        {afterLines.map((line, i) => (
          <div key={`after-${i}`} className="flex">
            <span className="w-8 flex-shrink-0 text-text-muted text-right pr-3 select-none">
              {lineNumber + matchedLines.length + i}
            </span>
            <span className="text-text-tertiary">{line || ' '}</span>
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
