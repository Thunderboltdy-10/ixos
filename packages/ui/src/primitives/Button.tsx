import * as React from 'react';
import { cn } from '../utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center gap-2 font-semibold uppercase tracking-wider',
          'transition-all duration-150 ease-out',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-graphite-0',
          'disabled:opacity-50 disabled:cursor-not-allowed',

          // Variant styles
          variant === 'primary' && [
            'bg-gradient-to-r from-accent-amber to-accent-amber-dim text-graphite-0',
            'hover:opacity-90 shadow-glow-amber',
            'focus-visible:ring-accent-amber',
          ],
          variant === 'secondary' && [
            'bg-graphite-2 text-porcelain border border-stroke-hairline',
            'hover:bg-graphite-3 hover:border-border-medium',
            'focus-visible:ring-porcelain',
          ],
          variant === 'ghost' && [
            'bg-transparent text-fg-muted',
            'hover:bg-graphite-2 hover:text-porcelain',
            'focus-visible:ring-porcelain',
          ],
          variant === 'danger' && [
            'bg-error/10 text-error border border-error/30',
            'hover:bg-error/20 hover:border-error/50',
            'focus-visible:ring-error',
          ],

          // Size styles
          size === 'sm' && 'text-xs tracking-[0.14em] px-3 py-2 rounded-md',
          size === 'md' && 'text-xs tracking-[0.16em] px-4 py-2.5 rounded-lg',
          size === 'lg' && 'text-sm tracking-[0.12em] px-6 py-3 rounded-lg',

          className
        )}
        {...props}
      >
        {isLoading ? (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
