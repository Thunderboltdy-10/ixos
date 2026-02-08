import { useState, useRef, useEffect } from 'react';
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
  color: string;
  bgColor: string;
}

const modes: QualityOption[] = [
  {
    id: 'flash',
    icon: Zap,
    label: 'Flash Mode',
    shortLabel: 'Flash',
    description: 'Fastest only, lowest latency.',
    color: 'text-accent-amber',
    bgColor: 'bg-accent-amber/10',
  },
  {
    id: 'auto',
    icon: Sparkles,
    label: 'Auto Mode',
    shortLabel: 'Auto',
    description: 'Flash-first, refines when needed.',
    color: 'text-accent-teal',
    bgColor: 'bg-accent-teal/10',
  },
  {
    id: 'pro',
    icon: Layers,
    label: 'Pro Mode',
    shortLabel: 'Pro',
    description: 'Always highest-quality ranking.',
    color: 'text-accent-violet',
    bgColor: 'bg-accent-violet/10',
  },
];

export function QualitySwitcher({ value, onChange, className, proLocked = false }: QualitySwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const selectedMode = modes.find((m) => m.id === value) || modes[1];
  const SelectedIcon = selectedMode.icon;

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
    const lockedSelection = proLocked && mode !== 'flash';
    if (lockedSelection) {
      window.dispatchEvent(new CustomEvent('open-pricing'));
      setIsOpen(false);
      return;
    }

    onChange(mode);
    setIsOpen(false);
  };

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
        <SelectedIcon className={cn('w-3.5 h-3.5', selectedMode.color)} />
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
            <div className="fixed inset-0 z-[130]" onClick={() => setIsOpen(false)} />
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: dropdownPosition === 'bottom' ? -10 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: dropdownPosition === 'bottom' ? -10 : 10 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'absolute z-[140] right-0',
                dropdownPosition === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2',
                'w-52',
                'bg-graphite-2 rounded-xl border border-stroke-hairline',
                'shadow-lift overflow-hidden'
              )}
            >
              {modes.map((mode) => {
                const Icon = mode.icon;
                const isLocked = proLocked && mode.id !== 'flash';
                return (
                  <button
                    key={mode.id}
                    onClick={() => handleSelect(mode.id)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2.5',
                      'hover:bg-graphite-3 transition-colors duration-150',
                      'text-left',
                      mode.id === value && 'bg-graphite-3',
                      isLocked && 'opacity-75'
                    )}
                  >
                    <Icon className={cn('w-3.5 h-3.5 shrink-0', mode.color)} />
                    <span className="text-[12px] font-medium text-porcelain whitespace-nowrap">
                      {mode.label}
                    </span>
                    <span className="text-[11.5px] text-fg-secondary truncate flex-1">
                      {mode.description}
                    </span>
                    {isLocked && (
                      <Lock className="w-3 h-3 shrink-0 text-fg-dim" />
                    )}
                    {mode.id === 'auto' && (
                      <span className="text-[9px] px-1 py-px rounded bg-accent-teal/15 text-accent-teal shrink-0">
                        Default
                      </span>
                    )}
                    {mode.id === value && (
                      <Check className={cn('w-3.5 h-3.5 shrink-0', mode.color)} />
                    )}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
