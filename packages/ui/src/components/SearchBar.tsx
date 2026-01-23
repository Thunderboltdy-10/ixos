import * as React from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  isSearching?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  /** For demo mode - disables actual functionality */
  isDemo?: boolean;
  /** Controls accent styling */
  tone?: 'jit' | 'cache' | 'journalist';
  /** When false, renders only the inner row without a frame */
  withFrame?: boolean;
  /** When false, hides the clear button */
  showClear?: boolean;
  /** Optional slot for actions rendered at the end of the row */
  rightSlot?: React.ReactNode;
}

/**
 * Shared search input component
 * Used by both desktop app and landing page demo
 */
export const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(
  (
    {
      value,
      onChange,
      onFocus,
      onBlur,
      onKeyDown,
      isSearching = false,
      placeholder = 'Type what you remember...',
      autoFocus = false,
      className,
      isDemo = false,
      tone = 'cache',
      withFrame = true,
      showClear = true,
      rightSlot,
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const accentClass = tone === 'jit'
      ? 'text-accent-amber'
      : tone === 'journalist'
        ? 'text-accent-violet'
        : 'text-accent-teal';
    const accentBorder = tone === 'jit'
      ? 'border-accent-amber/40'
      : tone === 'journalist'
        ? 'border-accent-violet/40'
        : 'border-accent-teal/40';
    const accentGlow = tone === 'jit'
      ? 'shadow-glow-amber'
      : tone === 'journalist'
        ? 'shadow-glow-violet'
        : 'shadow-glow-teal';

    const handleFocus = () => {
      setIsFocused(true);
      onFocus?.();
    };

    const handleBlur = () => {
      setIsFocused(false);
      onBlur?.();
    };

    const handleClear = () => {
      onChange('');
    };

    const inputRow = (
      <div className="flex items-center px-4 py-3 gap-3">
          {/* Search icon / Loading spinner */}
          <div className="flex-shrink-0">
            {isSearching ? (
              <Loader2 className={cn('w-5 h-5 animate-spin', accentClass)} />
            ) : (
              <Search
                className={cn(
                  'w-5 h-5 transition-colors duration-150',
                  isFocused ? accentClass : 'text-fg-dim'
                )}
              />
            )}
          </div>

          {/* Input */}
          <input
            ref={ref}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            autoFocus={autoFocus}
            readOnly={isDemo && !value}
            className={cn(
              'flex-1 bg-transparent text-porcelain font-display',
              'placeholder:text-fg-dim/60',
              'focus:outline-none',
              isDemo && 'cursor-pointer'
            )}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
          />

          {rightSlot}

          {/* Clear button */}
          {value && !isDemo && showClear && (
            <button
              onClick={handleClear}
              className={cn(
                'flex-shrink-0 p-1.5 rounded-md',
                'text-fg-dim hover:text-porcelain hover:bg-graphite-3',
                'transition-colors duration-150'
              )}
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
    );

    if (!withFrame) {
      return (
        <div className={cn('relative', className)}>
          {inputRow}
        </div>
      );
    }

    return (
      <div
        className={cn(
          'relative bg-graphite-2 border rounded-lg transition-colors duration-150',
          isFocused || isSearching
            ? `${accentBorder} ${accentGlow}`
            : 'border-stroke-hairline hover:border-border-medium',
          className
        )}
      >
        {inputRow}
      </div>
    );
  }
);

SearchBar.displayName = 'SearchBar';
