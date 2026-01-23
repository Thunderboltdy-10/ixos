import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Sparkles, Layers, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SearchMode } from '@/lib/types';

interface QualitySwitcherProps {
  value: SearchMode;
  onChange: (mode: SearchMode) => void;
  className?: string;
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
      description: 'Fastest model only. Lowest latency.',
      color: 'text-accent-amber',
      bgColor: 'bg-accent-amber/10',
    },
    {
      id: 'auto',
      icon: Sparkles,
      label: 'Auto Mode',
      shortLabel: 'Auto',
      description: 'Starts fast, refines with Pro when uncertain.',
      color: 'text-accent-teal',
      bgColor: 'bg-accent-teal/10',
    },
    {
      id: 'pro',
      icon: Layers,
      label: 'Pro Mode',
      shortLabel: 'Pro',
      description: 'Always use Pro model. Highest quality.',
      color: 'text-accent-violet',
      bgColor: 'bg-accent-violet/10',
    },
  ];

export function QualitySwitcher({ value, onChange, className }: QualitySwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedMode = modes.find((m) => m.id === value) || modes[1];
  const SelectedIcon = selectedMode.icon;

  const handleSelect = (mode: SearchMode) => {
    onChange(mode);
    setIsOpen(false);
  };

  return (
    <div className={cn('relative', className)}>
      <button
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
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'absolute top-full right-0 mt-2 z-50',
                'w-64',
                'bg-graphite-2 rounded-xl border border-stroke-hairline',
                'shadow-lift overflow-hidden'
              )}
            >
              {modes.map((mode) => {
                const Icon = mode.icon;
                return (
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
                      <Icon className={cn('w-4 h-4', mode.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-porcelain">
                          {mode.label}
                        </span>
                        {mode.id === 'auto' && (
                          <span className="text-2xs px-1.5 py-0.5 rounded bg-accent-teal/20 text-accent-teal">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="text-2xs text-fg-muted mt-1 leading-relaxed">
                        {mode.description}
                      </div>
                    </div>
                    {mode.id === value && (
                      <Check className={cn('w-4 h-4 mt-1', mode.color)} />
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
