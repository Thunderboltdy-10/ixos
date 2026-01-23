import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base styles
  [
    'inline-flex items-center justify-center rounded-lg font-medium',
    'transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal focus-visible:ring-offset-2 focus-visible:ring-offset-graphite-0',
    'disabled:pointer-events-none disabled:opacity-50',
  ],
  {
    variants: {
      variant: {
        // Primary - teal accent with glow
        primary: [
          'bg-accent-teal text-graphite-0',
          'hover:bg-accent-teal-glow',
          'shadow-glow-teal',
        ],
        // Secondary - bordered with transparent bg
        secondary: [
          'border border-border-medium bg-transparent text-porcelain',
          'hover:bg-graphite-3 hover:border-accent-teal/30',
        ],
        // Ghost - subtle hover
        ghost: [
          'bg-transparent text-fg-muted',
          'hover:bg-accent-teal/10 hover:text-porcelain',
        ],
        // Outline - border only
        outline: [
          'border border-stroke-hairline bg-transparent text-porcelain',
          'hover:bg-graphite-3 hover:border-accent-teal/30',
        ],
        // Danger - for destructive actions
        danger: [
          'bg-danger text-white',
          'hover:bg-danger/80',
        ],
        // Gradient - teal gradient with glow
        gradient: [
          'bg-gradient-teal text-graphite-0',
          'hover:opacity-90',
          'shadow-glow-teal',
        ],
        // Link - text only with underline on hover
        link: [
          'text-accent-teal underline-offset-4',
          'hover:underline',
        ],
        // Amber accent variant
        amber: [
          'bg-accent-amber text-graphite-0',
          'hover:opacity-90',
          'shadow-glow-amber',
        ],
        // Violet accent variant (for special features)
        violet: [
          'bg-accent-violet text-white',
          'hover:opacity-90',
          'shadow-glow-violet',
        ],
        // Magenta accent variant (for journalist mode, pro features)
        magenta: [
          'bg-accent-magenta text-white',
          'hover:opacity-90',
          'shadow-glow-magenta',
        ],
      },
      size: {
        default: 'h-9 px-4 py-2 text-sm',
        sm: 'h-7 px-3 text-xs',
        lg: 'h-11 px-6 text-base',
        icon: 'h-8 w-8',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
