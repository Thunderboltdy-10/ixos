import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Shield, Lock, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SearchMode = 'jit' | 'cache' | 'journalist';

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

const modes: ModeOption[] = [
  {
    id: 'jit',
    icon: Zap,
    label: 'JIT Mode',
    shortLabel: 'JIT',
    description: 'No persistence, maximum privacy',
    details: 'Computes embeddings on-the-fly. No data written to disk. Maximum privacy.',
    color: 'text-accent-amber',
    bgColor: 'bg-accent-amber/10',
  },
  {
    id: 'cache',
    icon: Shield,
    label: 'Cache Mode',
    shortLabel: 'Cache',
    description: 'Persist metadata cache for speed',
    details: 'Stores embeddings in ADS (Windows) or xattr (Mac/Linux). Faster repeat searches.',
    color: 'text-accent-teal',
    bgColor: 'bg-accent-teal/10',
  },
  {
    id: 'journalist',
    icon: Lock,
    label: 'Journalist Mode',
    shortLabel: 'Secure',
    description: 'Hardened privacy profile',
    details: 'JIT + encrypted history + emergency clear (Ctrl+Shift+X). For sensitive investigations.',
    color: 'text-accent-violet',
    bgColor: 'bg-accent-violet/10',
  }
];

export function ModeSwitcher({ value, onChange, className, compact = false }: ModeSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const selectedMode = modes.find(m => m.id === value) || modes[0];

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

  const handleSelect = (mode: SearchMode) => {
    onChange(mode);
    setIsOpen(false);
  };

  if (compact) {
    // Compact inline version for search bar area
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
                    'w-48 p-2 rounded-lg',
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

  // Full dropdown version
  return (
    <div className={cn('relative', className)}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-2.5 py-1.5 rounded-md',
          'bg-transparent hover:bg-graphite-3/50',
          'transition-all duration-200',
          'text-xs uppercase tracking-[0.14em]'
        )}
      >
        <selectedMode.icon className={cn('w-3.5 h-3.5', selectedMode.color)} />
        <span className="text-porcelain flex-1 text-left">
          {selectedMode.shortLabel}
        </span>
        <ChevronDown
          className={cn(
            'w-3 h-3 text-fg-dim transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-[130]"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: dropdownPosition === 'bottom' ? -10 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: dropdownPosition === 'bottom' ? -10 : 10 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'absolute z-[140]',
                dropdownPosition === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2',
                'right-0',
                'w-52',
                'bg-graphite-2 rounded-xl border border-stroke-hairline',
                'shadow-lift overflow-hidden'
              )}
            >
              {modes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => handleSelect(mode.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2.5',
                    'hover:bg-graphite-3 transition-colors duration-150',
                    'text-left',
                    mode.id === value && 'bg-graphite-3'
                  )}
                >
                  <mode.icon className={cn('w-3.5 h-3.5 shrink-0', mode.color)} />
                  <span className="text-[12px] font-medium text-porcelain whitespace-nowrap">
                    {mode.label}
                  </span>
                  <span className="text-[11.5px] text-fg-secondary truncate flex-1">
                    {mode.description}
                  </span>
                  {mode.id === 'jit' && (
                    <span className="text-[9px] px-1 py-px rounded bg-accent-amber/15 text-accent-amber shrink-0">
                      Default
                    </span>
                  )}
                  {mode.id === value && (
                    <Check className={cn('w-3.5 h-3.5 shrink-0', mode.color)} />
                  )}
                </button>
              ))}

              <div className="px-3 py-2 bg-graphite-1 border-t border-stroke-hairline">
                <p className="text-[10px] text-fg-secondary leading-tight">
                  JIT is local-only, Cache is faster on repeat, Journalist adds strict safeguards.
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
