import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Sparkles, Layers, ChevronDown, Check, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SearchMode } from '@/lib/types';

interface QualitySwitcherProps {
  value: SearchMode;
  onChange: (mode: SearchMode) => void;
  className?: string;
  proLocked?: boolean;
}

interface QualityOption {
  id: SearchMode;
  icon: React.ElementType;
  label: string;
  shortLabel: string;
  description: string;
  details: string;
  color: string;
  bgColor: string;
}

const modes: QualityOption[] = [
  {
    id: 'flash',
    icon: Zap,
    label: 'Ixos Flash',
    shortLabel: 'Flash',
    description: 'Fastest, lowest latency',
    details: 'Runs Flash directly for the quickest recall when you already know the context.',
    color: 'text-accent-amber',
    bgColor: 'bg-accent-amber/10',
  },
  {
    id: 'auto',
    icon: Sparkles,
    label: 'Auto Mode',
    shortLabel: 'Auto',
    description: 'Adapts to your query',
    details: 'Starts in Flash, then refines only when confidence is weak or query intent is ambiguous.',
    color: 'text-accent-teal',
    bgColor: 'bg-accent-teal/10',
  },
  {
    id: 'pro',
    icon: Layers,
    label: 'Ixos Pro',
    shortLabel: 'Pro',
    description: 'Highest quality ranking',
    details: 'Prioritizes depth and ranking quality with richer evidence extraction for hard queries.',
    color: 'text-accent-violet',
    bgColor: 'bg-accent-violet/10',
  },
];

export function QualitySwitcher({ value, onChange, className, proLocked = false }: QualitySwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  const [hoveredMode, setHoveredMode] = useState<SearchMode>(value);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const selectedMode = modes.find((m) => m.id === value) || modes[1];
  const SelectedIcon = selectedMode.icon;
  const hoveredDetails = useMemo(
    () => modes.find((mode) => mode.id === hoveredMode) ?? selectedMode,
    [hoveredMode, selectedMode]
  );

  // Calculate dropdown position to avoid overflow
  useEffect(() => {
    if (!isOpen || !dropdownRef.current || !buttonRef.current) return;

    const updatePosition = () => {
      const buttonRect = buttonRef.current?.getBoundingClientRect();
      const dropdownRect = dropdownRef.current?.getBoundingClientRect();

      if (!buttonRect || !dropdownRect) return;

      // Calculate space below and above the button
      const spaceBelow = window.innerHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;
      const dropdownHeight = dropdownRect.height;

      // If not enough space below and more space above, position dropdown above
      if (spaceBelow < dropdownHeight + 10 && spaceAbove > dropdownHeight + 10) {
        setDropdownPosition('top');
      } else {
        setDropdownPosition('bottom');
      }
    };

    // Use setTimeout to ensure DOM is ready
    const timer = setTimeout(updatePosition, 0);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setHoveredMode(value);
    }
  }, [isOpen, value]);

  const handleSelect = (mode: SearchMode) => {
    const lockedSelection = proLocked && mode === 'pro';
    if (lockedSelection) {
      window.dispatchEvent(new CustomEvent('open-pricing'));
      setIsOpen(false);
      return;
    }

    onChange(mode);
    setIsOpen(false);
  };

  return (
    <div className={cn('relative w-[132px]', className)}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex w-full items-center gap-2 px-2.5 py-1.5 rounded-md',
          'bg-transparent hover:bg-graphite-3/55',
          'transition-all duration-200',
          'text-[11px] uppercase tracking-[0.1em] border border-transparent hover:border-white/8'
        )}
      >
        <SelectedIcon className={cn('w-3.5 h-3.5', selectedMode.color)} />
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
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[9990]" onClick={() => setIsOpen(false)} />
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: dropdownPosition === 'bottom' ? -10 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: dropdownPosition === 'bottom' ? -10 : 10 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'absolute z-[9999] right-0',
                dropdownPosition === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2',
                'w-72',
                'bg-graphite-2 rounded-xl border border-stroke-hairline',
                'shadow-lift overflow-hidden'
              )}
            >
              <div className="max-h-[calc(100%-72px)] overflow-y-auto">
                {modes.map((mode) => {
                  const Icon = mode.icon;
                  const isLocked = proLocked && mode.id === 'pro';
                  return (
                    <button
                      key={mode.id}
                      onClick={() => handleSelect(mode.id)}
                      onMouseEnter={() => setHoveredMode(mode.id)}
                      className={cn(
                        'w-full flex items-start gap-3 px-3 py-3',
                        'hover:bg-graphite-3 transition-colors duration-150',
                        'text-left border-l-2',
                        mode.id === value ? `bg-graphite-3 ${mode.color} border-l-current` : 'border-l-transparent',
                        isLocked && 'opacity-78'
                      )}
                    >
                      <Icon className={cn('mt-0.5 w-3.5 h-3.5 shrink-0', mode.color)} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-porcelain leading-tight">{mode.label}</div>
                        <div className="mt-0.5 text-xs text-fg-muted">{mode.description}</div>
                      </div>
                      {isLocked && (
                        <Lock className="mt-0.5 w-3 h-3 shrink-0 text-fg-dim" />
                      )}
                      {mode.id === 'auto' && (
                        <span className="mt-0.5 text-[9px] px-1 py-px rounded bg-accent-teal/15 text-accent-teal shrink-0">
                          Default
                        </span>
                      )}
                      {mode.id === value && (
                        <Check className={cn('mt-0.5 w-3.5 h-3.5 shrink-0', mode.color)} />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="min-h-[72px] border-t border-stroke-hairline bg-graphite-1 px-4 py-3">
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
