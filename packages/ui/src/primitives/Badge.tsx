import * as React from 'react';
import { cn } from '../utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline' | 'secure' | 'warning' | 'amber' | 'teal' | 'violet' | 'magenta';
  size?: 'sm' | 'md';
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center font-mono font-semibold rounded-full',
          'transition-colors duration-150',

          // Variant styles
          variant === 'default' && 'bg-graphite-2 text-fg-muted border border-stroke-hairline',
          variant === 'outline' && 'bg-transparent text-fg-muted border border-stroke-hairline',
          variant === 'secure' && 'bg-success/15 text-success border border-success/30',
          variant === 'warning' && 'bg-warning/15 text-warning border border-warning/30',
          variant === 'amber' && 'bg-accent-amber/15 text-accent-amber border border-accent-amber/30',
          variant === 'teal' && 'bg-accent-teal/15 text-accent-teal border border-accent-teal/30',
          variant === 'violet' && 'bg-accent-violet/15 text-accent-violet border border-accent-violet/30',
          variant === 'magenta' && 'bg-accent-magenta/15 text-accent-magenta border border-accent-magenta/30',

          // Size styles
          size === 'sm' && 'text-[9px] tracking-[0.1em] px-1.5 py-0.5',
          size === 'md' && 'text-[10px] tracking-[0.14em] px-2 py-0.5',

          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
