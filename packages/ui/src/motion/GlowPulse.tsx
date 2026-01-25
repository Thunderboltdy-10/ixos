import { motion } from 'framer-motion';
import { cn } from '../utils/cn';

export interface GlowPulseProps {
  color?: 'teal' | 'amber' | 'violet' | 'magenta';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Animated glow dot with pulse effect
 */
export function GlowPulse({ color = 'teal', size = 'md', className }: GlowPulseProps) {
  const colorMap = {
    teal: 'bg-accent-teal',
    amber: 'bg-accent-amber',
    violet: 'bg-accent-violet',
    magenta: 'bg-accent-magenta',
  };

  const sizeMap = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  return (
    <span className={cn('relative flex', sizeMap[size], className)}>
      <motion.span
        className={cn(
          'absolute inline-flex h-full w-full rounded-full opacity-75',
          colorMap[color]
        )}
        animate={{ scale: [1, 1.5, 1], opacity: [0.75, 0, 0.75] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <span className={cn('relative inline-flex rounded-full', sizeMap[size], colorMap[color])} />
    </span>
  );
}
