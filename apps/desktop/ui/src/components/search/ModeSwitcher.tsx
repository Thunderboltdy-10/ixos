import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Lock, Shield, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SearchMode = 'ephemeral' | 'native-cache' | 'journalist';

interface ModeSwitcherProps {
  value: SearchMode;
  onChange: (mode: SearchMode) => void;
  className?: string;
  compact?: boolean;
}

const MODE_META = {
  ephemeral: {
    icon: Zap,
    color: 'text-accent-amber',
    label: 'Memory Search',
    shortLabel: 'Memory',
    description: 'JIT embeddings in RAM only',
    details: 'JIT computes embeddings in memory and writes nothing to disk.',
  },
  'native-cache': {
    icon: Shield,
    color: 'text-accent-teal',
    label: 'Local Search',
    shortLabel: 'Local',
    description: 'Persist local cache for repeats',
    details: 'Uses ADS (Windows) or xattr (macOS/Linux) for fast repeat searches.',
  },
  journalist: {
    icon: Lock,
    color: 'text-accent-violet',
    label: 'Deep Search',
    shortLabel: 'Deep',
    description: 'Expanded evidence path',
    details: 'Deep Search prioritizes richer evidence extraction while staying local.',
  },
} as const;

export function ModeSwitcher({ value, onChange, className, compact = false }: ModeSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredMode, setHoveredMode] = useState<SearchMode>(value);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selected = MODE_META[value] ?? MODE_META['native-cache'];
  const SelectedIcon = selected.icon;
  const hoveredDetails = useMemo(() => MODE_META[hoveredMode] ?? selected, [hoveredMode, selected]);

  useEffect(() => {
    if (!isOpen) {
      setHoveredMode(value);
      setDropdownPos(null);
      return;
    }

    const syncPosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 8,
        left: Math.max(12, rect.right - 320),
        width: rect.width,
      });
    };

    syncPosition();
    window.addEventListener('resize', syncPosition);
    window.addEventListener('scroll', syncPosition, true);
    return () => {
      window.removeEventListener('resize', syncPosition);
      window.removeEventListener('scroll', syncPosition, true);
    };
  }, [isOpen, value]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown, true);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown, true);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  if (compact) {
    return (
      <div className={cn('flex items-center gap-1 rounded-md border border-stroke-hairline bg-graphite-2 p-1', className)}>
        {(Object.keys(MODE_META) as SearchMode[]).map((mode) => {
          const meta = MODE_META[mode];
          const Icon = meta.icon;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => onChange(mode)}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[10px] uppercase tracking-[0.14em] transition-colors',
                mode === value ? `${meta.color} bg-graphite-3` : 'text-fg-dim hover:bg-graphite-3 hover:text-porcelain',
              )}
            >
              <Icon className="h-3 w-3" />
              <span>{meta.shortLabel}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('relative w-[126px]', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          'flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-[11px] uppercase tracking-[0.1em]',
          'text-porcelain transition-all duration-150 hover:bg-graphite-3/50',
          'focus-visible:ring-0 focus-visible:ring-offset-0',
          isOpen && 'bg-graphite-3/45',
        )}
      >
        <SelectedIcon className={cn('h-3.5 w-3.5 shrink-0', selected.color)} />
        <span className="min-w-0 truncate">{selected.shortLabel}</span>
        <ChevronDown className={cn('ml-auto h-3 w-3 shrink-0 text-fg-dim transition-transform', isOpen && 'rotate-180')} />
      </button>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isOpen && dropdownPos ? (
              <motion.div
                ref={menuRef}
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: 'fixed',
                  top: dropdownPos.top,
                  left: dropdownPos.left,
                  width: Math.max(320, dropdownPos.width),
                  zIndex: 20000,
                }}
                className="overflow-hidden rounded-xl border border-white/12 bg-[#1a1d24] shadow-[0_24px_64px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.04)]"
              >
                <div className="max-h-[300px] overflow-y-auto">
                  {(Object.keys(MODE_META) as SearchMode[]).map((mode) => {
                    const meta = MODE_META[mode];
                    const Icon = meta.icon;
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          onChange(mode);
                          setIsOpen(false);
                        }}
                        onMouseEnter={() => setHoveredMode(mode)}
                        className={cn(
                          'flex w-full items-start gap-3 border-l-2 px-3 py-3 text-left transition-colors',
                          mode === value
                            ? `${meta.color} border-l-current bg-graphite-3/70`
                            : 'border-l-transparent hover:border-l-accent-amber hover:bg-graphite-3/60',
                        )}
                      >
                        <Icon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', meta.color)} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-porcelain">{meta.label}</p>
                          <p className="mt-0.5 truncate text-xs text-fg-muted">{meta.description}</p>
                        </div>
                        {mode === 'native-cache' && (
                          <span className="mt-0.5 rounded bg-accent-teal/12 px-1 py-px text-[9px] font-semibold uppercase tracking-[0.08em] text-accent-teal">
                            Default
                          </span>
                        )}
                        {mode === value && <Check className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', meta.color)} />}
                      </button>
                    );
                  })}
                </div>

                <div className="border-t border-white/8 bg-graphite-1 px-4 py-3">
                  <p className={cn('text-xs font-semibold uppercase tracking-[0.12em]', hoveredDetails.color)}>
                    {hoveredDetails.shortLabel}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-fg-secondary">{hoveredDetails.details}</p>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
