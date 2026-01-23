import * as React from 'react';
import { cn } from '../utils/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'md', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          'rounded-xl transition-all duration-200',

          // Variant styles
          variant === 'default' && [
            'bg-graphite-2 border border-stroke-hairline',
            'hover:border-border-medium',
          ],
          variant === 'glass' && [
            'bg-graphite-2/70 backdrop-blur-lg border border-stroke-hairline',
            'shadow-lift',
            'hover:bg-graphite-2/80 hover:border-border-medium',
          ],
          variant === 'elevated' && [
            'bg-graphite-1 border border-stroke-hairline shadow-lift',
          ],

          // Padding styles
          padding === 'none' && '',
          padding === 'sm' && 'p-3',
          padding === 'md' && 'p-5',
          padding === 'lg' && 'p-8',

          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
