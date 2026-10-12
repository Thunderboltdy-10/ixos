import * as React from "react";
import { Search, Loader2 } from "lucide-react";
import { cn } from "../utils/cn";

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
  tone?: "amber" | "teal";
  rightSlot?: React.ReactNode;
}

export const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(
  (
    {
      value,
      onChange,
      onFocus,
      onBlur,
      onKeyDown,
      isSearching = false,
      placeholder = "Type what you remember...",
      autoFocus = false,
      className,
      tone = "teal",
      rightSlot,
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const accentClass =
      tone === "amber" ? "text-accent-amber" : "text-accent-teal";
    const handleFocus = () => {
      setIsFocused(true);
      onFocus?.();
    };

    const handleBlur = () => {
      setIsFocused(false);
      onBlur?.();
    };

    const inputRow = (
      <div className="flex items-center px-4 py-3 gap-3">
        {/* Search icon / Loading spinner */}
        <div className="flex-shrink-0">
          {isSearching ? (
            <Loader2 className={cn("w-5 h-5 animate-spin", accentClass)} />
          ) : (
            <Search
              className={cn(
                "w-5 h-5 transition-colors duration-150",
                isFocused ? accentClass : "text-fg-dim",
              )}
            />
          )}
        </div>

        {/* Input */}
        <input
          ref={ref}
          data-search-input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={cn(
            "flex-1 bg-transparent text-porcelain font-display",
            "placeholder:text-fg-dim/60",
            "focus:outline-none",
          )}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />

        {rightSlot}
      </div>
    );

    return <div className={cn("relative", className)}>{inputRow}</div>;
  },
);

SearchBar.displayName = "SearchBar";
