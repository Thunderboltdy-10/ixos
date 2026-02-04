/**
 * AskModeSwitcher - Toggle between Ask Mode settings
 * Matches styling of ModeSwitcher and QualitySwitcher
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircleQuestion, ChevronDown, Check, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AskMode = 'off' | 'auto' | 'always';

interface AskModeSwitcherProps {
  value: AskMode;
  onChange: (mode: AskMode) => void;
  className?: string;
  disabled?: boolean;
}

interface AskModeOption {
  id: AskMode;
  label: string;
  shortLabel: string;
  description: string;
  details: string;
  color: string;
  bgColor: string;
}

const modes: AskModeOption[] = [
  {
    id: 'off',
    label: 'Standard Search',
    shortLabel: 'Ask: Off',
    description: 'Keyword search',
    details: 'Traditional keyword matching. Best for exact file names or specific terms.',
    color: 'text-accent-amber',
    bgColor: 'bg-accent-amber/10',
  },
  {
    id: 'auto',
    label: 'Auto Ask Mode',
    shortLabel: 'Ask: Auto',
    description: 'Detects questions',
    details: 'Activates deep understanding when you type a question (ends with ? or starts with who/what/etc).',
    color: 'text-accent-teal',
    bgColor: 'bg-accent-teal/10',
  },
  {
    id: 'always',
    label: 'Always On',
    shortLabel: 'Ask: On',
    description: 'Force deep mode',
    details: 'Always attempts to find answers and extract facts, even for keyword queries.',
    color: 'text-accent-violet',
    bgColor: 'bg-accent-violet/10',
  }
];

export function AskModeSwitcher({ value, onChange, className, disabled = false }: AskModeSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
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

  const handleSelect = (mode: AskMode) => {
    onChange(mode);
    setIsOpen(false);
  };

  return (
    <div className={cn('relative', className)}>
      <button
        ref={buttonRef}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'flex items-center gap-2 px-2.5 py-1.5 rounded-md',
          'bg-transparent hover:bg-graphite-3/50',
          'transition-all duration-200',
          'text-xs uppercase tracking-[0.14em]',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <MessageCircleQuestion className={cn('w-3.5 h-3.5', selectedMode.color)} />
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
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: dropdownPosition === 'bottom' ? -10 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: dropdownPosition === 'bottom' ? -10 : 10 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'absolute z-50',
                dropdownPosition === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2',
                'right-0',
                'w-80',
                'bg-graphite-2 rounded-xl border border-stroke-hairline',
                'shadow-lift overflow-hidden'
              )}
            >
              {modes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => handleSelect(mode.id)}
                  className={cn(
                    'w-full flex items-start gap-3 px-4 py-3',
                    'hover:bg-graphite-3 transition-colors duration-150',
                    'text-left',
                    mode.id === value && 'bg-graphite-3'
                  )}
                >
                  <div className={cn('p-2 rounded-md mt-0.5', mode.bgColor)}>
                    <MessageCircleQuestion className={cn('w-4 h-4', mode.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-porcelain">
                        {mode.label}
                      </span>
                    </div>
                    <div className="text-2xs text-fg-muted mt-1 leading-relaxed">
                      {mode.details}
                    </div>
                  </div>
                  {mode.id === value && (
                    <Check className={cn('w-4 h-4 mt-1', mode.color)} />
                  )}
                </button>
              ))}

              <div className="px-4 py-3 bg-graphite-1 border-t border-stroke-hairline">
                <div className="flex items-start gap-2 text-2xs text-fg-dim">
                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>
                    Use Ctrl+Shift+A to toggle Ask Mode for a single search.
                  </span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
