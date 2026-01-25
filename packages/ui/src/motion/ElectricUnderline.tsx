import { motion } from 'framer-motion';
import { cn } from '../utils/cn';

export interface ElectricUnderlineProps {
  active?: boolean;
  complete?: boolean;
  progress?: number; // 0-1
  color?: 'teal' | 'amber' | 'success';
  className?: string;
}

/**
 * Animated underline with electric pulse effect
 */
export function ElectricUnderline({
  active = false,
  complete = false,
  progress,
  color = 'teal',
  className,
}: ElectricUnderlineProps) {
  const colorMap = {
    teal: {
      bg: 'rgba(20, 184, 166, 0.4)',
      pulse: 'rgba(20, 184, 166, 0.9)',
      complete: 'rgba(20, 184, 166, 0.6)',
    },
    amber: {
      bg: 'rgba(246, 185, 76, 0.4)',
      pulse: 'rgba(246, 185, 76, 0.9)',
      complete: 'rgba(246, 185, 76, 0.6)',
    },
    success: {
      bg: 'rgba(16, 185, 129, 0.4)',
      pulse: 'rgba(16, 185, 129, 0.9)',
      complete: 'rgba(16, 185, 129, 0.6)',
    },
  };

  const colors = colorMap[color];

  return (
    <div className={cn('relative h-[2px] w-full overflow-hidden', className)}>
      {/* Base glow */}
      <motion.div
        className="absolute inset-0"
        style={{ backgroundColor: colors.bg }}
        animate={{ opacity: complete ? 0.7 : 0.4 }}
      />

      {/* Progress bar (if progress is provided) */}
      {progress !== undefined && !complete && (
        <motion.div
          className="absolute top-0 left-0 h-full"
          style={{ backgroundColor: colors.pulse }}
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      )}

      {/* Pulse train animation - active during search */}
      {active && !complete && (
        <>
          <motion.div
            className="absolute top-0 h-full"
            style={{
              width: '20%',
              background: `linear-gradient(90deg, transparent, ${colors.pulse}, transparent)`,
            }}
            animate={{ left: ['-20%', '100%'] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute top-0 h-full"
            style={{
              width: '15%',
              background: `linear-gradient(90deg, transparent, ${colors.pulse}80, transparent)`,
            }}
            animate={{ left: ['-15%', '100%'] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'linear', delay: 0.5 }}
          />
        </>
      )}

      {/* Calm full-width glow for complete state */}
      {complete && (
        <motion.div
          className="absolute inset-0"
          style={{ backgroundColor: colors.complete }}
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      )}
    </div>
  );
}
