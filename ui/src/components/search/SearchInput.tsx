import { useState, useRef, useEffect, useCallback, type CSSProperties } from 'react';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { FolderPicker } from './FolderPicker';
import { ModeSwitcher, type SearchMode } from './ModeSwitcher';
import type { ModelType } from './ModelSwitcher';
import { QualitySwitcher } from './QualitySwitcher';
import { SearchSuggestions } from './SearchSuggestions';
import { useSettingsStore } from '@/stores/settingsStore';
import { useStarredStore, type HistorySuggestion } from '@/stores/starredStore';
import { useSearchStore } from '@/stores/searchStore';
import { useLayoutStore } from '@/stores/layoutStore';
import type { SearchMode as QualityMode } from '@/lib/types';
import { invoke } from '@tauri-apps/api/core';
import { SearchBar } from '@ixos/ui';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: () => void;
  directory: string;
  onDirectoryChange: (directory: string) => void;
  isSearching: boolean;
  onCancel: () => void;
  mode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
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
  isSearching,
  onCancel,
  mode,
  onModeChange,
  centered = false,
  showControls = true,
  autoFocus = true,
}: SearchInputProps) {
  const { config, updateConfig } = useSettingsStore();
  const getSuggestions = useStarredStore((s) => s.getSuggestions);
  const hasSearchIntent = useSearchStore((s) => s.hasSearchIntent);
  const setSearchBarBox = useLayoutStore((s) => s.setSearchBarBox);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState<HistorySuggestion[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchBarRef = useRef<HTMLDivElement>(null);
  const preloadedModels = useRef(new Set<ModelType>());

  const modelType = (config?.search?.modelType || 'ixos-flash-v2') as ModelType;
  const proModelType = (config?.search?.proModelType || 'ixos-pro-v1') as ModelType;
  const qualityMode = (config?.search?.searchMode || 'auto') as QualityMode;

  const modePalette = {
    jit: {
      accent: 'var(--accent-amber)',
      accentSoft: 'rgba(246, 185, 76, 0.22)',
      accentFade: 'rgba(246, 185, 76, 0.08)',
      border: 'rgba(246, 185, 76, 0.4)',
      glow: 'rgba(246, 185, 76, 0.18)',
      glowStrong: 'rgba(246, 185, 76, 0.35)',
    },
    cache: {
      accent: 'var(--accent-teal)',
      accentSoft: 'rgba(20, 184, 166, 0.22)',
      accentFade: 'rgba(13, 148, 136, 0.08)',
      border: 'rgba(20, 184, 166, 0.4)',
      glow: 'rgba(20, 184, 166, 0.18)',
      glowStrong: 'rgba(20, 184, 166, 0.35)',
    },
    journalist: {
      accent: 'var(--accent-violet)',
      accentSoft: 'rgba(124, 92, 255, 0.22)',
      accentFade: 'rgba(124, 92, 255, 0.08)',
      border: 'rgba(124, 92, 255, 0.38)',
      glow: 'rgba(124, 92, 255, 0.2)',
      glowStrong: 'rgba(124, 92, 255, 0.4)',
    },
  } as const;

  const activePalette = modePalette[mode];
  const safeInvoke = useCallback(async <T,>(cmd: string, args?: any): Promise<T | null> => {
    try {
      if (typeof window !== 'undefined' && '__TAURI__' in window) {
        return await invoke<T>(cmd, args);
      }
      const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
      return await tauriInvoke<T>(cmd, args);
    } catch (e) {
      console.log(`Tauri invoke '${cmd}' failed (browser mode):`, e);
      return null;
    }
  }, []);

  // Measure search bar position for signal connector
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
    window.addEventListener('scroll', measure, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', measure);
    };
  }, [setSearchBarBox]);

  const handleQualityChange = async (mode: QualityMode) => {
    if (config) {
      await updateConfig({
        search: { ...config.search, searchMode: mode },
      });
    }
  };

  useEffect(() => {
    if (!config) return;
    const targets = new Set<ModelType>();
    targets.add(modelType);
    if (qualityMode === 'auto' || qualityMode === 'pro') {
      targets.add(proModelType);
    }

    targets.forEach((target) => {
      if (preloadedModels.current.has(target)) return;
      preloadedModels.current.add(target);
      safeInvoke('preload_model', { modelType: target });
    });
  }, [config, modelType, proModelType, qualityMode, safeInvoke]);

  // Fetch suggestions when value changes
  useEffect(() => {
    if (value.length >= 1 && !isSearching) {
      setSuggestions(getSuggestions(value));
      setShowSuggestions(true);
      setSelectedIndex(-1);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [value, isSearching, getSuggestions]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestion: HistorySuggestion) => {
    onChange(suggestion.query);
    onDirectoryChange(suggestion.directory);
    setShowSuggestions(false);
    setSuggestions([]);
    inputRef.current?.focus();
  }, [onChange, onDirectoryChange]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Handle suggestions navigation first
    if (showSuggestions && suggestions.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
          return;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, -1));
          return;
        case 'Enter':
          if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
            e.preventDefault();
            handleSuggestionSelect(suggestions[selectedIndex]);
            return;
          }
          break;
        case 'Escape':
          e.preventDefault();
          setShowSuggestions(false);
          setSuggestions([]);
          return;
      }
    }

    // Enter key triggers explicit search when no suggestion is selected
      if (e.key === 'Enter' && value.trim() && !isSearching) {
        e.preventDefault();
        setShowSuggestions(false);
        setSuggestions([]);
        onSearch?.();
      }
  }, [showSuggestions, suggestions, selectedIndex, handleSuggestionSelect, value, isSearching, onSearch]);

  type AccentStyle = CSSProperties & {
    '--accent-focus'?: string;
    '--accent-focus-soft'?: string;
  };
  const accentStyle: AccentStyle =
    hasSearchIntent || isSearching
      ? {
          borderColor: activePalette.border,
          boxShadow: `0 0 0 1px ${activePalette.border}, 0 18px 40px rgba(0, 0, 0, 0.55), 0 0 28px ${activePalette.glow}`,
          '--accent-focus': activePalette.accent,
          '--accent-focus-soft': activePalette.accentSoft,
        }
      : {
          '--accent-focus': activePalette.accent,
          '--accent-focus-soft': activePalette.accentSoft,
        };

  return (
    <div ref={containerRef} className={cn('w-full relative', centered && 'max-w-3xl mx-auto px-8')}>
      <div className="relative" ref={searchBarRef}>
        <motion.div
          className="absolute -inset-10 rounded-[28px] pointer-events-none blur-3xl"
          style={{
            background: `radial-gradient(circle at 50% 45%, ${activePalette.glow} 0%, transparent 70%)`,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: hasSearchIntent || isSearching ? 0.9 : 0 }}
          transition={{ duration: 0.25 }}
        />

        <motion.div
          className="absolute -inset-[2px] rounded-2xl pointer-events-none"
          style={{
            background: `linear-gradient(135deg, ${activePalette.accentSoft} 0%, ${activePalette.accentFade} 100%)`,
          }}
          initial={{ opacity: 0 }}
          animate={{
            opacity: hasSearchIntent || isSearching ? 1 : 0,
            scale: hasSearchIntent || isSearching ? 1 : 0.98,
          }}
          transition={{ duration: 0.2 }}
        />

        {(hasSearchIntent || isSearching) && (
          <motion.div
            className="absolute -inset-[4px] rounded-2xl pointer-events-none"
            style={{
              border: `1px solid ${activePalette.border}`,
              boxShadow: `0 0 28px ${activePalette.glowStrong}`,
            }}
            animate={{
              opacity: [0.5, 0.2, 0.5],
              scale: [1, 1.01, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}

        <div className={cn(
          'relative gradient-border-focus rounded-xl overflow-visible',
          'bg-graphite-2/80 border border-stroke-hairline',
          'transition-all duration-200',
          hasSearchIntent || isSearching
            ? ''
            : 'hover:border-border-medium'
        )}
        style={accentStyle}>
          {/* Search input row */}
          <SearchBar
            ref={inputRef}
            value={value}
            onChange={onChange}
            onKeyDown={handleKeyDown}
            onFocus={() => value.length >= 1 && suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="Type what you remember..."
            isSearching={isSearching}
            autoFocus={autoFocus}
            tone={mode}
            withFrame={false}
            showClear={false}
            className="w-full"
            rightSlot={(value || isSearching) ? (
              <button
                onClick={() => {
                  if (isSearching) {
                    onCancel();
                  } else {
                    onChange('');
                  }
                }}
                className={cn(
                  'flex-shrink-0 p-1.5 rounded-md',
                  'text-fg-dim hover:text-porcelain hover:bg-graphite-3/50',
                  'transition-colors duration-150'
                )}
                title={isSearching ? 'Cancel search' : 'Clear'}
                type="button"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
          />

          {/* Controls row - no separator, seamless */}
          {showControls && (
            <div className="px-4 pb-3 flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-[160px]">
                <FolderPicker
                  value={directory}
                  onChange={onDirectoryChange}
                  placeholder="Select folder..."
                />
              </div>

              <div className="flex-shrink-0">
                <QualitySwitcher
                  value={qualityMode}
                  onChange={handleQualityChange}
                />
              </div>

              <div className="flex-shrink-0">
                <ModeSwitcher
                  value={mode}
                  onChange={onModeChange}
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
