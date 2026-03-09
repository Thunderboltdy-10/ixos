import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    return (
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          ref={ref}
          {...props}
        />
        <div
          className={cn(
            'w-9 h-5 rounded-full transition-colors duration-200',
            'bg-graphite-3 peer-checked:bg-accent-teal',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-accent-teal peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-graphite-0',
            'after:content-[""] after:absolute after:top-0.5 after:left-0.5',
            'after:bg-porcelain after:rounded-full after:h-4 after:w-4',
            'after:transition-transform after:duration-200',
            'peer-checked:after:translate-x-4',
            className
          )}
        />
      </label>
    );
  }
);
Switch.displayName = 'Switch';

export { Switch };
