import { useState, useRef, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FolderPicker } from "./FolderPicker";
import { ProfileSwitcher } from "./ProfileSwitcher";
import type { Profile, RecentSearch } from "@/lib/types";
import { SearchSuggestions } from "./SearchSuggestions";
import { useSearchStore } from "@/stores/searchStore";
import { useLayoutStore } from "@/stores/layoutStore";
import { SearchBar } from "@ixos/ui";
import { useHistoryStore } from "@/stores/historyStore";
interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: () => void;
  directory: string;
  onDirectoryChange: (directory: string) => void;
  isSearching: boolean;
  onCancel: () => void;
  profile: Profile;
  onProfileChange: (profile: Profile) => void;
  centered?: boolean;
  showControls?: boolean;
  autoFocus?: boolean;
}
export function SearchInput({
  value,
  onChange,
  onSearch,
  directory,
  onDirectoryChange,
  isSearching: activeSearch,
  onCancel,
  profile,
  onProfileChange,
  centered = false,
  showControls = true,
  autoFocus = true,
}: SearchInputProps) {
  const recent = useHistoryStore((s) => s.recent);
  const hasSearchIntent = useSearchStore((s) => s.hasSearchIntent);
  const resume = useSearchStore((s) => s.resume);
  const searchPhase = useSearchStore((s) => s.phase);
  const setSearchBarBox = useLayoutStore((s) => s.setSearchBarBox);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState<RecentSearch[]>([]);
  const [isInputFocused, setIsInputFocused] = useState(autoFocus);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchBarRef = useRef<HTMLDivElement>(null);
  const modePalette = {
    code: {
      accent: "var(--accent-teal)",
      accentSoft: "rgba(20,184,166,0.22)",
      accentFade: "rgba(13,148,136,0.08)",
      border: "rgba(20,184,166,0.4)",
    },
    documents: {
      accent: "var(--accent-amber)",
      accentSoft: "rgba(246,185,76,0.22)",
      accentFade: "rgba(246,185,76,0.08)",
      border: "rgba(246,185,76,0.4)",
    },
  };
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--profile-glow-rgb",
      profile === "code" ? "20, 184, 166" : "246, 185, 76",
    );
  }, [profile]);
  const activePalette = modePalette[profile];
  const searchBarTone = profile === "code" ? "teal" : "amber";
  useEffect(() => {
    if (!searchBarRef.current) return;
    const measure = () => {
      const rect = searchBarRef.current?.getBoundingClientRect();
      if (rect) {
        setSearchBarBox({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          width: rect.width,
          height: rect.height,
          top: rect.top,
          left: rect.left,
        });
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(searchBarRef.current);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", measure);
    };
  }, [setSearchBarBox]);
  useEffect(() => {
    if (!autoFocus) return;
    const id = window.setTimeout(() => {
      inputRef.current?.focus();
      setIsInputFocused(true);
    }, 40);
    return () => window.clearTimeout(id);
  }, [autoFocus]);
  const activeQuery = useSearchStore((s) => s.activeQuery);
  useEffect(() => {
    const isTypingNewQuery =
      value.trim().toLowerCase() !== (activeQuery || "").toLowerCase();
    const canShowSuggestions =
      value.length >= 1 &&
      !activeSearch &&
      (searchPhase === "idle" || isTypingNewQuery);
    if (canShowSuggestions) {
      const fetchedSuggestions = recent
        .filter((item) =>
          item.query.toLowerCase().includes(value.toLowerCase()),
        )
        .slice(0, 4);
      setSuggestions(fetchedSuggestions);
      setShowSuggestions(fetchedSuggestions.length > 0);
      setSelectedIndex(-1);
    } else {
      setShowSuggestions(false);
    }
  }, [value, recent, searchPhase, activeSearch, activeQuery]);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const handleSuggestionSelect = useCallback(
    (suggestion: RecentSearch) => {
      resume(suggestion);
      setShowSuggestions(false);
      setSuggestions([]);
      inputRef.current?.focus();
    },
    [resume],
  );
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (showSuggestions && suggestions.length > 0) {
        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            setSelectedIndex((prev) =>
              Math.min(prev + 1, suggestions.length - 1),
            );
            return;
          case "ArrowUp":
            e.preventDefault();
            setSelectedIndex((prev) => Math.max(prev - 1, -1));
            return;
          case "Enter":
            if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
              e.preventDefault();
              handleSuggestionSelect(suggestions[selectedIndex]);
              return;
            }
            break;
          case "Escape":
            e.preventDefault();
            setShowSuggestions(false);
            setSuggestions([]);
            return;
        }
      }
      if (e.key === "Enter" && value.trim() && !activeSearch) {
        if (value === activeQuery && useSearchStore.getState().results.length)
          return;
        e.preventDefault();
        setShowSuggestions(false);
        setSuggestions([]);
        onSearch?.();
      }
    },
    [
      showSuggestions,
      suggestions,
      selectedIndex,
      handleSuggestionSelect,
      value,
      activeSearch,
      onSearch,
    ],
  );
  return (
    <div
      ref={containerRef}
      className={cn("w-full relative", centered && "max-w-3xl mx-auto px-8")}
    >
      <div className="relative" ref={searchBarRef}>
        <div
          className={cn(
            "relative overflow-visible",
            "bg-graphite-1/60 backdrop-blur-sm",
            "transition-all duration-200 ease-out",
            showSuggestions && suggestions.length > 0
              ? "rounded-t-xl rounded-b-none"
              : "rounded-xl",
          )}
          style={
            {
              border:
                hasSearchIntent || activeSearch || isInputFocused
                  ? `1px solid ${activePalette.border}`
                  : "1px solid rgba(243, 245, 247, 0.08)",
              outline: isInputFocused
                ? `1px solid ${activePalette.accentSoft}`
                : "none",
              outlineOffset: isInputFocused ? "0px" : undefined,
              boxShadow:
                hasSearchIntent || activeSearch || isInputFocused
                  ? `0 0 0 1px ${activePalette.accentFade}, 0 8px 24px rgba(0, 0, 0, 0.4)`
                  : "0 2px 8px rgba(0, 0, 0, 0.2)",
              "--accent-focus": activePalette.accent,
              "--accent-focus-soft": activePalette.accentSoft,
            } as any
          }
        >
          {/* Search input row */}
          <SearchBar
            ref={inputRef}
            value={value}
            onChange={onChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setIsInputFocused(true);
              value.length >= 1 &&
                suggestions.length > 0 &&
                setShowSuggestions(true);
            }}
            onBlur={() => setIsInputFocused(false)}
            placeholder="Type what you remember..."
            isSearching={activeSearch}
            autoFocus={autoFocus}
            tone={searchBarTone}
            withFrame={false}
            showClear={false}
            className="w-full"
            rightSlot={
              <div className="flex items-center gap-2">
                {value || activeSearch ? (
                  <button
                    onClick={() => {
                      if (activeSearch) {
                        onCancel();
                      } else {
                        onChange("");
                      }
                    }}
                    className={cn(
                      "flex-shrink-0 p-1.5 rounded-md",
                      "text-fg-dim hover:text-porcelain hover:bg-graphite-3/50",
                      "transition-colors duration-150",
                    )}
                    title={activeSearch ? "Cancel search" : "Clear"}
                    type="button"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : null}
              </div>
            }
          />

          {/* Controls row */}
          {showControls && (
            <div className="px-3 pb-2.5 pt-0.5 flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <FolderPicker
                  value={directory}
                  onChange={onDirectoryChange}
                  placeholder="All locations"
                  className="w-full"
                />
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <ProfileSwitcher
                  className="w-[126px]"
                  value={profile}
                  onChange={onProfileChange}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <SearchSuggestions
        isOpen={showSuggestions && suggestions.length > 0}
        onSelect={handleSuggestionSelect}
        selectedIndex={selectedIndex}
        suggestions={suggestions}
      />
    </div>
  );
}
