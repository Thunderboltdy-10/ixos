import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secure' | 'warning' | 'danger' | 'journalist' | 'outline';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        'transition-colors duration-150',
        variant === 'default' && 'bg-accent/20 text-accent',
        variant === 'secure' && 'bg-secure/20 text-secure',
        variant === 'warning' && 'bg-warning/20 text-warning',
        variant === 'danger' && 'bg-danger/20 text-danger',
        variant === 'journalist' && 'bg-journalist/20 text-journalist glow-journalist',
        variant === 'outline' && 'border border-border bg-transparent text-text-secondary',
        className
      )}
      {...props}
    />
  );
}

export { Badge };
