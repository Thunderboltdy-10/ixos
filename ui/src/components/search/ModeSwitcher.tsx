import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Shield, Lock, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SearchMode = 'ephemeral' | 'native-cache' | 'journalist';

interface ModeSwitcherProps {
  value: SearchMode;
  onChange: (mode: SearchMode) => void;
  className?: string;
  compact?: boolean;
}

interface ModeOption {
  id: SearchMode;
  icon: React.ElementType;
  label: string;
  shortLabel: string;
  description: string;
  details: string;
  color: string;
  bgColor: string;
}

interface FloatingMenuMetrics {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

const modes: ModeOption[] = [
  {
    id: 'ephemeral',
    icon: Zap,
    label: 'Memory Search',
    shortLabel: 'Memory',
    description: 'JIT embeddings in RAM only',
    details: 'JIT computes embeddings in memory and writes nothing to disk.',
    color: 'text-accent-amber',
    bgColor: 'bg-accent-amber/10',
  },
  {
    id: 'native-cache',
    icon: Shield,
    label: 'Local Search',
    shortLabel: 'Local',
    description: 'Persist local cache for repeats',
    details: 'Uses ADS (Windows) or xattr (macOS/Linux) for fast repeat searches.',
    color: 'text-accent-teal',
    bgColor: 'bg-accent-teal/10',
  },
  {
    id: 'journalist',
    icon: Lock,
    label: 'Deep Search',
    shortLabel: 'Deep',
    description: 'Expanded evidence path',
    details: 'Deep Search prioritizes richer evidence extraction while staying local.',
    color: 'text-accent-violet',
    bgColor: 'bg-accent-violet/10',
  },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function ModeSwitcher({ value, onChange, className, compact = false }: ModeSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  const [menuMetrics, setMenuMetrics] = useState<FloatingMenuMetrics | null>(null);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [hoveredMode, setHoveredMode] = useState<SearchMode>(value);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const selectedMode = modes.find((mode) => mode.id === value) ?? modes[0];
  const hoveredDetails = useMemo(
    () => modes.find((mode) => mode.id === hoveredMode) ?? selectedMode,
    [hoveredMode, selectedMode]
  );

  useEffect(() => {
    if (!isOpen) {
      setHoveredMode(value);
      return;
    }

    const updateMenuMetrics = () => {
      const buttonRect = buttonRef.current?.getBoundingClientRect();
      if (!buttonRect) return;

      const margin = 12;
      const preferredWidth = 360;
      const rowHeight = 48;
      const footerHeight = 72;
      const estimatedHeight = rowHeight * modes.length + footerHeight + 16;
      const spaceBelow = window.innerHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;
      const shouldOpenTop = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
      const availableHeight = shouldOpenTop
        ? Math.max(180, spaceAbove - margin - 8)
        : Math.max(180, window.innerHeight - buttonRect.bottom - margin - 8);
      const width = Math.min(preferredWidth, window.innerWidth - margin * 2);
      const left = clamp(buttonRect.right - width, margin, Math.max(margin, window.innerWidth - width - margin));
      const top = shouldOpenTop
        ? Math.max(margin, buttonRect.top - 8 - availableHeight)
        : Math.min(window.innerHeight - margin - availableHeight, buttonRect.bottom + 8);

      setDropdownPosition(shouldOpenTop ? 'top' : 'bottom');
      setMenuMetrics({
        top,
        left,
        width,
        maxHeight: availableHeight,
      });
    };

    updateMenuMetrics();
    window.addEventListener('resize', updateMenuMetrics);
    window.addEventListener('scroll', updateMenuMetrics, true);
    return () => {
      window.removeEventListener('resize', updateMenuMetrics);
      window.removeEventListener('scroll', updateMenuMetrics, true);
    };
  }, [isOpen, value]);

  const handleSelect = (mode: SearchMode) => {
    onChange(mode);
    setIsOpen(false);
  };

  if (compact) {
    return (
      <div className={cn('flex items-center gap-1 p-1 bg-graphite-2 rounded-md overflow-hidden border border-stroke-hairline', className)}>
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onChange(mode.id)}
            onMouseEnter={() => setShowTooltip(mode.id)}
            onMouseLeave={() => setShowTooltip(null)}
            className={cn(
              'relative px-2.5 py-1.5 rounded-md text-[10px] uppercase tracking-[0.14em] transition-all duration-150',
              mode.id === value
                ? `${mode.bgColor} ${mode.color}`
                : 'text-fg-dim hover:text-porcelain hover:bg-graphite-3'
            )}
          >
            <div className="flex items-center gap-1.5">
              <mode.icon className="w-3 h-3" />
              <span>{mode.shortLabel}</span>
            </div>

            <AnimatePresence>
              {showTooltip === mode.id && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className={cn(
                    'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50',
                    'w-52 p-2 rounded-lg',
                    'bg-graphite-2 border border-stroke-hairline shadow-lift',
                    'pointer-events-none'
                  )}
                >
                  <div className={cn('text-xs font-medium mb-1', mode.color)}>
                    {mode.label}
                  </div>
                  <div className="text-2xs text-fg-dim leading-relaxed">
                    {mode.details}
                  </div>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-graphite-2 border-r border-b border-stroke-hairline" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('relative w-[126px]', className)}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          'flex w-full items-center gap-2 px-2.5 py-1.5 rounded-md',
          'bg-transparent hover:bg-graphite-3/55',
          'transition-all duration-200',
          'text-[11px] uppercase tracking-[0.1em] border border-transparent hover:border-white/8'
        )}
      >
        <selectedMode.icon className={cn('w-3.5 h-3.5', selectedMode.color)} />
        <span className="text-porcelain text-left truncate">
          {selectedMode.shortLabel}
        </span>
        <ChevronDown
          className={cn(
            'ml-auto w-3 h-3 text-fg-dim transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && menuMetrics && (
          <>
            <div
              className="fixed inset-0 z-[9990]"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: dropdownPosition === 'bottom' ? -10 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: dropdownPosition === 'bottom' ? -10 : 10 }}
              transition={{ duration: 0.15 }}
              className="fixed z-[9999] rounded-xl border border-stroke-hairline bg-graphite-2 shadow-lift overflow-hidden"
              style={{
                top: menuMetrics.top,
                left: menuMetrics.left,
                width: menuMetrics.width,
                maxHeight: menuMetrics.maxHeight,
              }}
            >
              <div className="max-h-[calc(100%-72px)] overflow-y-auto">
                {modes.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => handleSelect(mode.id)}
                    onMouseEnter={() => setHoveredMode(mode.id)}
                    className={cn(
                      'w-full flex items-start gap-3 px-3 py-3 border-l-2',
                      'hover:bg-graphite-3 transition-colors duration-150',
                      'text-left',
                      mode.id === value ? `bg-graphite-3 ${mode.color} border-l-current` : 'border-l-transparent'
                    )}
                  >
                    <mode.icon className={cn('mt-0.5 w-3.5 h-3.5 shrink-0', mode.color)} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-porcelain leading-tight">{mode.label}</div>
                      <div className="mt-0.5 text-xs text-fg-secondary">{mode.description}</div>
                    </div>
                    {mode.id === 'native-cache' && (
                      <span className="text-[9px] px-1 py-px rounded bg-accent-amber/15 text-accent-amber shrink-0">
                        Default
                      </span>
                    )}
                    {mode.id === value && (
                      <Check className={cn('w-3.5 h-3.5 shrink-0', mode.color)} />
                    )}
                  </button>
                ))}
              </div>

              <div className="h-[72px] border-t border-stroke-hairline bg-graphite-1 px-3 py-2">
                <p className={cn('text-xs font-semibold uppercase tracking-[0.12em]', hoveredDetails.color)}>
                  {hoveredDetails.shortLabel}
                </p>
                <p className="mt-1 text-[11px] text-fg-secondary leading-relaxed">
                  {hoveredDetails.details}
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
