import * as React from 'react';
import { cn } from '../utils/cn';

export interface WindowChromeProps {
  title?: string;
  variant?: 'macos' | 'windows';
  children: React.ReactNode;
  className?: string;
}

/**
 * Fake window decoration for demo purposes
 */
export function WindowChrome({
  title = 'Ixos',
  variant = 'macos',
  children,
  className,
}: WindowChromeProps) {
  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden border border-stroke-hairline shadow-lift',
        'bg-graphite-1',
        className
      )}
    >
      {/* Window Bar */}
      <div className="h-8 w-full bg-graphite-1 border-b border-stroke-hairline flex items-center px-4 gap-2">
        {variant === 'macos' ? (
          <>
            <div className="w-3 h-3 rounded-full bg-[#FF5F56]/40" />
            <div className="w-3 h-3 rounded-full bg-[#FFBD2E]/40" />
            <div className="w-3 h-3 rounded-full bg-[#27C93F]/40" />
          </>
        ) : (
          <>
            <div className="w-3 h-3 rounded-sm bg-fg-ghost" />
            <div className="w-3 h-3 rounded-sm bg-fg-ghost" />
            <div className="w-3 h-3 rounded-sm bg-fg-ghost" />
          </>
        )}
        <span className="ml-3 text-xs text-fg-muted font-mono">{title}</span>
      </div>

      {/* Content */}
      <div className="bg-graphite-0">{children}</div>
    </div>
  );
}
