/**
 * AskModeSwitcher - Toggle between Ask Mode settings
 *
 * Three modes:
 * - off: Keyword search only (gray/dim)
 * - auto: Detect ? and question words (amber)
 * - always: Treat every query as question (violet)
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircleQuestion, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AskMode = 'off' | 'auto' | 'always';

interface AskModeSwitcherProps {
  value: AskMode;
  onChange: (mode: AskMode) => void;
  disabled?: boolean;
}

const modeConfig: Record<AskMode, { label: string; description: string; color: string; bgClass: string; textClass: string }> = {
  off: {
    label: 'Off',
    description: 'Standard keyword search',
    color: 'rgb(115, 115, 115)',
    bgClass: 'bg-fg-dim/10',
    textClass: 'text-fg-dim',
  },
  auto: {
    label: 'Auto',
    description: 'Detect questions (? or who/what/how)',
    color: 'rgb(246, 185, 76)',
    bgClass: 'bg-accent-amber/10',
    textClass: 'text-accent-amber',
  },
  always: {
    label: 'Always',
    description: 'Treat all queries as questions',
    color: 'rgb(167, 139, 250)',
    bgClass: 'bg-accent-violet/10',
    textClass: 'text-accent-violet',
  },
};

export function AskModeSwitcher({ value, onChange, disabled = false }: AskModeSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentMode = modeConfig[value];

  const handleSelect = (mode: AskMode) => {
    onChange(mode);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg',
          'border transition-all',
          disabled
            ? 'opacity-50 cursor-not-allowed bg-graphite-2 border-stroke-hairline'
            : cn(
                currentMode.bgClass,
                'border-transparent hover:border-stroke-hairline'
              )
        )}
      >
        <MessageCircleQuestion
          className={cn('w-4 h-4', currentMode.textClass)}
        />
        <span className={cn('text-sm font-medium', currentMode.textClass)}>
          Ask: {currentMode.label}
        </span>
        <ChevronDown
          className={cn(
            'w-4 h-4 transition-transform',
            currentMode.textClass,
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'absolute top-full left-0 mt-2 z-50',
                'w-64 py-2 rounded-lg shadow-xl',
                'bg-graphite-1 border border-stroke-hairline'
              )}
            >
              {(Object.keys(modeConfig) as AskMode[]).map((mode) => {
                const config = modeConfig[mode];
                const isSelected = value === mode;

                return (
                  <button
                    key={mode}
                    onClick={() => handleSelect(mode)}
                    className={cn(
                      'w-full flex items-start gap-3 px-4 py-3 text-left',
                      'hover:bg-graphite-2 transition-colors',
                      isSelected && config.bgClass
                    )}
                  >
                    <div
                      className={cn(
                        'w-5 h-5 rounded-full flex items-center justify-center mt-0.5',
                        'border-2 transition-colors',
                        isSelected
                          ? cn(config.bgClass, `border-[${config.color}]`)
                          : 'border-stroke-hairline'
                      )}
                      style={{
                        borderColor: isSelected ? config.color : undefined,
                        backgroundColor: isSelected ? `${config.color}20` : undefined,
                      }}
                    >
                      {isSelected && (
                        <Check
                          className="w-3 h-3"
                          style={{ color: config.color }}
                        />
                      )}
                    </div>

                    <div className="flex-1">
                      <p
                        className={cn(
                          'text-sm font-semibold',
                          isSelected ? config.textClass : 'text-fg-muted'
                        )}
                      >
                        {config.label}
                      </p>
                      <p className="text-xs text-fg-dim mt-0.5">
                        {config.description}
                      </p>
                    </div>
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
