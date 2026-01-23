import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLayoutStore } from '@/stores/layoutStore';
import { cn } from '@/lib/utils';

interface GhostScaffoldProps {
  count?: number;
  visible: boolean;
}

interface SkeletonRowProps {
  index: number;
  variant: 'A' | 'B' | 'C';
  isEnergizing?: boolean;
}

// Skeleton row variants for visual variety
const SKELETON_VARIANTS = {
  A: { filename: 65, path: 40, showScore: false },  // Long filename, short path
  B: { filename: 35, path: 70, showScore: true },   // Short filename, long path
  C: { filename: 50, path: 55, showScore: true },   // Medium both
};

function SkeletonRow({ index, variant, isEnergizing }: SkeletonRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const setGhostSlotBox = useLayoutStore((s) => s.setGhostSlotBox);
  const config = SKELETON_VARIANTS[variant];

  // Measure row position for spark targeting
  useEffect(() => {
    if (!rowRef.current) return;

    const measure = () => {
      const rect = rowRef.current?.getBoundingClientRect();
      if (rect) {
        setGhostSlotBox(index, {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          width: rect.width,
          height: rect.height,
          top: rect.top,
          left: rect.left,
        });
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(rowRef.current);

    return () => observer.disconnect();
  }, [index, setGhostSlotBox]);

  // Staggered shimmer animation delay based on index
  const shimmerDelay = (index % 3) * 0.3;

  return (
    <motion.div
      ref={rowRef}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
      transition={{ duration: 0.2, delay: index * 0.025, ease: 'easeOut' }}
      className={cn(
        "relative px-4 py-2.5",
        "overflow-hidden"
      )}
    >
      {/* Left accent bar - subtle glow when energizing */}
      {isEnergizing ? (
        <motion.div
          className="absolute left-0 top-0 bottom-0 w-[2px]"
          style={{ background: 'linear-gradient(to bottom, rgba(13, 148, 136, 0.8), rgba(6, 182, 212, 0.8))' }}
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: [0, 1, 0], scaleY: [0, 1, 1] }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      ) : null}

      {/* Skeleton content - matches ResultCard structure */}
      <div className="flex items-center gap-3">
        {/* Index number placeholder */}
        <div className="w-5 flex-shrink-0 flex justify-center">
          <div
            className="w-3.5 h-3.5 rounded bg-surface-3/40"
            style={{
              animation: `pulse 2s ease-in-out ${shimmerDelay}s infinite`
            }}
          />
        </div>

        {/* File icon placeholder */}
        <div
          className="w-4 h-4 rounded bg-surface-3/50 flex-shrink-0"
          style={{
            animation: `pulse 2s ease-in-out ${shimmerDelay + 0.1}s infinite`
          }}
        />

        {/* File info */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Filename placeholder - varies by variant */}
          <div
            className="h-3 rounded-sm bg-surface-3/50"
            style={{
              width: `${config.filename + (index * 7) % 15}%`,
              animation: `pulse 2s ease-in-out ${shimmerDelay + 0.15}s infinite`
            }}
          />
          {/* Path placeholder - varies by variant */}
          <div
            className="h-2 rounded-sm bg-surface-3/30"
            style={{
              width: `${config.path + (index * 11) % 20}%`,
              animation: `pulse 2s ease-in-out ${shimmerDelay + 0.2}s infinite`
            }}
          />
        </div>

        {/* Score badge placeholder - only some rows */}
        {config.showScore && (
          <div
            className="w-10 h-5 rounded-full bg-surface-3/35 flex-shrink-0"
            style={{
              animation: `pulse 2s ease-in-out ${shimmerDelay + 0.25}s infinite`
            }}
          />
        )}

        {/* Chevron placeholder */}
        <div
          className="w-3.5 h-3.5 rounded bg-surface-3/20 flex-shrink-0"
          style={{
            animation: `pulse 2s ease-in-out ${shimmerDelay + 0.3}s infinite`
          }}
        />
      </div>

      {/* Shimmer overlay effect */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.02) 50%, transparent 100%)',
        }}
        animate={{ x: ['-100%', '200%'] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatDelay: 1,
          delay: shimmerDelay,
          ease: 'easeInOut'
        }}
      />
    </motion.div>
  );
}

export function GhostScaffold({ count = 8, visible }: GhostScaffoldProps) {
  const clearGhostSlots = useLayoutStore((s) => s.clearGhostSlots);

  // Clear ghost slot measurements when unmounting
  useEffect(() => {
    return () => clearGhostSlots();
  }, [clearGhostSlots]);

  // Determine variant for each row (A, B, C cycling with some randomness)
  const getVariant = (index: number): 'A' | 'B' | 'C' => {
    const variants: ('A' | 'B' | 'C')[] = ['A', 'B', 'C'];
    // Use index with offset to create variety
    return variants[(index + Math.floor(index / 3)) % 3];
  };

  return (
    <div className="w-full max-w-3xl mx-auto py-2">
      <AnimatePresence mode="popLayout">
        {visible && Array.from({ length: count }, (_, i) => (
          <SkeletonRow
            key={`ghost-${i}`}
            index={i}
            variant={getVariant(i)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
