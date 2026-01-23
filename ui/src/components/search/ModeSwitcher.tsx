import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Shield, Lock, ChevronDown, Check, Info } from 'lucide-react';
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
    description: 'Just-In-Time (Default)',
    details: 'Computes embeddings on-the-fly. No data written to disk. Maximum privacy.',
    color: 'text-brand-cyan',
    bgColor: 'bg-brand-cyan/10',
  },
  {
    id: 'cache',
    icon: Shield,
    label: 'Cache Mode',
    shortLabel: 'Cache',
    description: 'Persistent Cache',
    details: 'Stores embeddings in ADS (Windows) or xattr (Mac/Linux). Faster repeat searches.',
    color: 'text-brand-teal',
    bgColor: 'bg-brand-teal/10',
  },
  {
    id: 'journalist',
    icon: Lock,
    label: 'Journalist Mode',
    shortLabel: 'Secure',
    description: 'Maximum Security',
    details: 'JIT + encrypted history + emergency clear (Ctrl+Shift+X). For sensitive investigations.',
    color: 'text-journalist',
    bgColor: 'bg-journalist/10',
  }
];

export function ModeSwitcher({ value, onChange, className, compact = false }: ModeSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const selectedMode = modes.find(m => m.id === value) || modes[0];

  const handleSelect = (mode: SearchMode) => {
    onChange(mode);
    setIsOpen(false);
  };

  if (compact) {
    // Compact inline version for search bar area
    return (
      <div className={cn('flex items-center gap-1 p-1 bg-surface-2 rounded-lg overflow-hidden', className)}>
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onChange(mode.id)}
            onMouseEnter={() => setShowTooltip(mode.id)}
            onMouseLeave={() => setShowTooltip(null)}
            className={cn(
              'relative px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150',
              mode.id === value
                ? `${mode.bgColor} ${mode.color}`
                : 'text-text-muted hover:text-text-secondary hover:bg-surface-3'
            )}
          >
            <div className="flex items-center gap-1.5">
              <mode.icon className="w-3 h-3" />
              <span>{mode.shortLabel}</span>
            </div>

            {/* Tooltip */}
            <AnimatePresence>
              {showTooltip === mode.id && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className={cn(
                    'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50',
                    'w-48 p-2 rounded-lg',
                    'bg-surface-3 border border-border shadow-xl',
                    'pointer-events-none'
                  )}
                >
                  <div className={cn('text-xs font-medium mb-1', mode.color)}>
                    {mode.label}
                  </div>
                  <div className="text-2xs text-text-secondary leading-relaxed">
                    {mode.details}
                  </div>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-surface-3 border-r border-b border-border" />
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
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg',
          'bg-surface-2 hover:bg-surface-3',
          'border border-border hover:border-border-accent',
          'transition-all duration-200',
          'text-sm min-w-[100px] max-w-[130px]'
        )}
      >
        <selectedMode.icon className={cn('w-4 h-4', selectedMode.color)} />
        <span className="text-text-primary flex-1 text-left">
          {selectedMode.shortLabel}
        </span>
        <ChevronDown
          className={cn(
            'w-3 h-3 text-text-muted transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown menu */}
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
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'absolute top-full left-0 mt-2 z-50',
                'w-72',
                'bg-surface-2 rounded-lg border border-border',
                'shadow-xl overflow-hidden'
              )}
            >
              {modes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => handleSelect(mode.id)}
                  className={cn(
                    'w-full flex items-start gap-3 px-3 py-3',
                    'hover:bg-surface-3 transition-colors duration-150',
                    'text-left',
                    mode.id === value && 'bg-surface-3'
                  )}
                >
                  <div className={cn('p-1.5 rounded-md mt-0.5', mode.bgColor)}>
                    <mode.icon className={cn('w-4 h-4', mode.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary">
                        {mode.label}
                      </span>
                      {mode.id === 'jit' && (
                        <span className="text-2xs px-1.5 py-0.5 rounded bg-brand-teal/20 text-brand-teal">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="text-2xs text-text-secondary mt-1 leading-relaxed">
                      {mode.details}
                    </div>
                  </div>
                  {mode.id === value && (
                    <Check className={cn('w-4 h-4 mt-1', mode.color)} />
                  )}
                </button>
              ))}

              {/* Info footer */}
              <div className="px-3 py-2 bg-surface-1 border-t border-border">
                <div className="flex items-start gap-2 text-2xs text-text-muted">
                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>
                    JIT is recommended for privacy. Cache mode is faster for repeated searches in the same directory.
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
