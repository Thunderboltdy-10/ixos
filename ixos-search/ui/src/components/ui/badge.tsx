import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secure' | 'warning' | 'danger' | 'journalist' | 'outline';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium font-mono',
        'transition-colors duration-150',
        variant === 'default' && 'bg-accent/20 text-accent',
        variant === 'secure' && 'bg-success/15 text-success',
        variant === 'warning' && 'bg-warning/15 text-warning',
        variant === 'danger' && 'bg-danger/15 text-danger',
        variant === 'journalist' && 'bg-accent-magenta/20 text-accent-magenta glow-journalist',
        variant === 'outline' && 'border border-stroke-hairline bg-transparent text-fg-muted',
        className
      )}
      {...props}
    />
  );
}

export { Badge };
