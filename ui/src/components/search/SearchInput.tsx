import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { FolderPicker } from './FolderPicker';
import { ModeSwitcher, type SearchMode } from './ModeSwitcher';
import type { ModelType } from './ModelSwitcher';
import { QualitySwitcher } from './QualitySwitcher';
import { SearchSuggestions } from './SearchSuggestions';
import { useSettingsStore } from '@/stores/settingsStore';
import { useHistoryStore, type HistorySuggestion } from '@/stores/historyStore';
import { useSearchStore } from '@/stores/searchStore';
import { useLayoutStore } from '@/stores/layoutStore';
import type { SearchMode as QualityMode } from '@/lib/types';
import { invoke } from '@tauri-apps/api/core';

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
}: SearchInputProps) {
  const { config, updateConfig } = useSettingsStore();
  const { fetchSuggestions, clearSuggestions, suggestions } = useHistoryStore();
  const hasSearchIntent = useSearchStore((s) => s.hasSearchIntent);
  const setSearchBarBox = useLayoutStore((s) => s.setSearchBarBox);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchBarRef = useRef<HTMLDivElement>(null);
  const preloadedModels = useRef(new Set<ModelType>());

  const modelType = (config?.search?.modelType || 'ixos-flash-v2') as ModelType;
  const proModelType = (config?.search?.proModelType || 'ixos-pro-v1') as ModelType;
  const qualityMode = (config?.search?.searchMode || 'auto') as QualityMode;

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

  const handleModelChange = async (model: ModelType) => {
    if (config) {
      await updateConfig({
        search: { ...config.search, modelType: model },
      });
    }
  };

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
      fetchSuggestions(value);
      setShowSuggestions(true);
      setSelectedIndex(-1);
    } else {
      clearSuggestions();
      setShowSuggestions(false);
    }
  }, [value, isSearching, fetchSuggestions, clearSuggestions]);

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
    clearSuggestions();
    inputRef.current?.focus();
  }, [onChange, onDirectoryChange, clearSuggestions]);

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
          clearSuggestions();
          return;
      }
    }

    // Enter key triggers explicit search when no suggestion is selected
    if (e.key === 'Enter' && value.trim() && !isSearching) {
      e.preventDefault();
      setShowSuggestions(false);
      clearSuggestions();
      onSearch?.();
    }
  }, [showSuggestions, suggestions, selectedIndex, handleSuggestionSelect, clearSuggestions, value, isSearching, onSearch]);

  return (
    <div ref={containerRef} className={cn('w-full relative', centered && 'max-w-3xl mx-auto px-8')}>
      <div className="relative" ref={searchBarRef}>
        <motion.div
          className="absolute -inset-[2px] rounded-2xl pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.22) 0%, rgba(6, 214, 193, 0.12) 100%)',
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
              border: '1px solid rgba(20, 184, 166, 0.35)',
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
          'relative gradient-border-focus rounded-2xl overflow-visible',
          'bg-graphite-2 border border-stroke-hairline shadow-lift',
          'transition-all duration-200',
          hasSearchIntent || isSearching
            ? 'border-accent-teal/40 shadow-glow-teal'
            : 'hover:border-border-medium'
        )}>
          <div className="flex items-center gap-4 px-5 py-5">
            <div className="flex-shrink-0">
              {isSearching ? (
                <Loader2 className="w-5 h-5 text-accent-teal animate-spin" />
              ) : (
                <motion.div
                  animate={{
                    color: hasSearchIntent ? 'rgb(20, 184, 166)' : 'rgba(243, 245, 247, 0.48)',
                  }}
                  transition={{ duration: 0.2 }}
                >
                  <Search className="w-5 h-5" />
                </motion.div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-[0.3em] text-fg-dim mb-2">
                Query
              </div>
              <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => value.length >= 1 && suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Ask a question or search keywords..."
                className={cn(
                  'w-full bg-transparent text-xl text-porcelain font-display',
                  'placeholder:text-fg-dim/60',
                  'focus:outline-none'
                )}
                autoFocus
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
              />
            </div>

            {(value || isSearching) && (
              <button
                onClick={() => {
                  if (isSearching) {
                    onCancel();
                  } else {
                    onChange('');
                  }
                }}
                className={cn(
                  'flex-shrink-0 p-2 rounded-md',
                  'text-fg-dim hover:text-porcelain hover:bg-graphite-3',
                  'transition-colors duration-150'
                )}
                title={isSearching ? 'Cancel search' : 'Clear'}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="px-5 pb-4 pt-1 flex items-center gap-2 flex-wrap border-t border-stroke-hairline/70">
            <div className="flex-1 min-w-[180px]">
              <FolderPicker
                value={directory}
                onChange={onDirectoryChange}
                placeholder="Select folder to search..."
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
        </div>
      </div>

      <SearchSuggestions
        isOpen={showSuggestions && suggestions.length > 0}
        onSelect={handleSuggestionSelect}
        selectedIndex={selectedIndex}
      />
    </div>
  );
}
