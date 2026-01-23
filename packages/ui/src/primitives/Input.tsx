import * as React from 'react';
import { cn } from '../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'ghost';
  inputSize?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant = 'default', inputSize = 'md', leftIcon, rightIcon, ...props }, ref) => {
    return (
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-dim pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            // Base styles
            'w-full bg-transparent text-porcelain font-display',
            'placeholder:text-fg-dim/60',
            'focus:outline-none',
            'transition-colors duration-150',

            // Variant styles
            variant === 'default' && [
              'bg-graphite-2 border border-stroke-hairline rounded-lg',
              'focus:border-accent-teal',
            ],
            variant === 'ghost' && [
              'bg-transparent border-0',
            ],

            // Size styles
            inputSize === 'sm' && 'text-sm py-2 px-3',
            inputSize === 'md' && 'text-base py-3 px-4',
            inputSize === 'lg' && 'text-xl py-4 px-5',

            // Icon padding
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',

            className
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-dim">
            {rightIcon}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
