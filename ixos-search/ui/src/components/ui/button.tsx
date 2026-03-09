import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center rounded-md font-medium uppercase tracking-[0.04em]',
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
          'border border-stroke-hairline bg-transparent text-porcelain',
          'hover:bg-graphite-3 hover:border-border-medium',
        ],
        ghost: [
          'bg-transparent text-fg-muted',
          'hover:bg-accent-teal/10 hover:text-porcelain',
        ],
        outline: [
          'border border-stroke-hairline bg-transparent text-porcelain',
          'hover:bg-graphite-3 hover:border-border-medium',
        ],
        danger: [
          'bg-danger text-white',
          'hover:bg-danger/80',
        ],
        gradient: [
          'bg-gradient-teal text-graphite-0',
          'hover:opacity-90',
          'shadow-glow-teal',
        ],
        link: [
          'text-accent-teal underline-offset-4',
          'hover:underline',
        ],
        amber: [
          'bg-accent-amber text-graphite-0',
          'hover:opacity-90',
          'shadow-glow-amber',
        ],
        violet: [
          'bg-accent-violet text-white',
          'hover:opacity-90',
          'shadow-glow-violet',
        ],
        magenta: [
          'bg-accent-magenta text-white',
          'hover:opacity-90',
          'shadow-glow-magenta',
        ],
      },
      size: {
        default: 'h-10 px-5 text-xs',
        sm: 'h-8 px-3 text-2xs',
        lg: 'h-11 px-6 text-sm',
        icon: 'h-9 w-9',
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
