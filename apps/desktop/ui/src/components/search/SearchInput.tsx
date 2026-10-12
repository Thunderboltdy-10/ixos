import { useState, useRef, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
// motion import removed — search bar simplified
import { cn } from '@/lib/utils';
import { FolderPicker } from './FolderPicker';
import { ModeSwitcher, type SearchMode } from './ModeSwitcher';
import { QualitySwitcher } from './QualitySwitcher';
import { SearchSuggestions } from './SearchSuggestions';
import { useSettingsStore } from '@/stores/settingsStore';
import { useStarredStore, type HistorySuggestion } from '@/stores/starredStore';
import { useSearchStore } from '@/stores/searchStore';
import { useLayoutStore } from '@/stores/layoutStore';
import type { SearchMode as QualityMode, ModelType } from '@/lib/types';
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
export function SearchInput({ value, onChange, onSearch, directory, onDirectoryChange, isSearching: activeSearch, onCancel, mode, onModeChange, centered = false, showControls = true, autoFocus = true, }: SearchInputProps) {
    const { config, updateConfig } = useSettingsStore();
    const getSuggestions = useStarredStore((s) => s.getSuggestions);
    const getThreadById = useStarredStore((s) => s.getThreadById);
    const hasSearchIntent = useSearchStore((s) => s.hasSearchIntent);
    const restoreFromHistory = useSearchStore((s) => s.restoreFromHistory);
    const searchPhase = useSearchStore((s) => s.phase);
    const isAskModeActive = useSearchStore((s) => s.isAskModeActive);
    const setSearchBarBox = useLayoutStore((s) => s.setSearchBarBox);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [suggestions, setSuggestions] = useState<HistorySuggestion[]>([]);
    const [isInputFocused, setIsInputFocused] = useState(autoFocus);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const searchBarRef = useRef<HTMLDivElement>(null);
    const preloadedModels = useRef(new Set<string>());
    const modelType = (config?.search?.modelType || 'ixos-flash-v2') as ModelType;
    const proModelType = (config?.search?.proModelType || 'ixos-pro-v2') as ModelType;
    const qualityMode = (config?.search?.searchMode || 'auto') as QualityMode;
    const modePalette = {
        ephemeral: {
            accent: 'var(--accent-amber)',
            accentSoft: 'rgba(246, 185, 76, 0.22)',
            accentFade: 'rgba(246, 185, 76, 0.08)',
            border: 'rgba(246, 185, 76, 0.4)',
            glow: 'rgba(246, 185, 76, 0.18)',
            glowStrong: 'rgba(246, 185, 76, 0.35)',
        },
        'native-cache': {
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
    const qualityPalette = {
        flash: {
            accent: 'var(--accent-amber)',
            glow: 'rgba(246, 185, 76, 0.18)',
            glowStrong: 'rgba(246, 185, 76, 0.36)',
            rgb: '246, 185, 76',
        },
        auto: {
            accent: 'var(--accent-teal)',
            glow: 'rgba(20, 184, 166, 0.18)',
            glowStrong: 'rgba(20, 184, 166, 0.36)',
            rgb: '20, 184, 166',
        },
        pro: {
            accent: 'var(--accent-violet)',
            glow: 'rgba(124, 92, 255, 0.2)',
            glowStrong: 'rgba(124, 92, 255, 0.38)',
            rgb: '124, 92, 255',
        },
    } as const;
    const activePalette = modePalette[mode];
    const activeQuality = qualityPalette[qualityMode];
    const searchBarTone = mode === 'native-cache' ? 'cache' : mode === 'ephemeral' ? 'jit' : 'journalist';
    const safeInvoke = useCallback(async <T,>(cmd: string, args?: any): Promise<T | null> => {
        try {
            if (typeof window !== 'undefined' && '__TAURI__' in window) {
                return await invoke<T>(cmd, args);
            }
            console.log(`Simulating Tauri invoke '${cmd}' in browser mode`);
            return null;
        }
        catch (e) {
            console.log(`Tauri invoke '${cmd}' failed:`, e);
            return null;
        }
    }, []);
    // Measure search bar position for signal connector
    useEffect(() => {
        if (!searchBarRef.current)
            return;
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
    const heuristicAskIntent = value.trim().endsWith('?') || /^(who|what|when|where|how|why|whats|wheres|hows|find|show)\s/i.test(value);
    const shouldShowAskModeIndicator = (isAskModeActive || heuristicAskIntent);
    useEffect(() => {
        if (!config)
            return;
        const targets = new Set<ModelType>();
        targets.add(modelType);
        if (qualityMode === 'auto' || qualityMode === 'pro') {
            targets.add(proModelType);
        }
        targets.forEach((target) => {
            if (preloadedModels.current.has(target))
                return;
            preloadedModels.current.add(target);
            safeInvoke('preload_model', { modelType: target });
        });
    }, [config, modelType, proModelType, qualityMode, safeInvoke]);
    useEffect(() => {
        if (typeof document === 'undefined')
            return;
        document.documentElement.style.setProperty('--quality-color', activeQuality.accent);
        document.documentElement.style.setProperty('--quality-glow-rgb', activeQuality.rgb);
    }, [activeQuality.accent, activeQuality.rgb]);
    useEffect(() => {
        if (!autoFocus)
            return;
        const id = window.setTimeout(() => {
            inputRef.current?.focus();
            setIsInputFocused(true);
        }, 40);
        return () => window.clearTimeout(id);
    }, [autoFocus]);
    // Fetch suggestions when value changes
    // Show suggestions when:
    // - User is typing (value.length >= 1)
    // - Not currently searching
    // - Either idle OR typing a different query than what's currently showing results
    const activeQuery = useSearchStore((s) => s.activeQuery);
    useEffect(() => {
        const isTypingNewQuery = value.trim().toLowerCase() !== (activeQuery || '').toLowerCase();
        const canShowSuggestions = value.length >= 1 && !activeSearch && (searchPhase === 'idle' || isTypingNewQuery);
        if (canShowSuggestions) {
            const fetchedSuggestions = getSuggestions(value);
            setSuggestions(fetchedSuggestions);
            setShowSuggestions(fetchedSuggestions.length > 0);
            setSelectedIndex(-1);
        }
        else {
            setShowSuggestions(false);
        }
    }, [value, getSuggestions, searchPhase, activeSearch, activeQuery]);
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
    // Handle suggestion selection - restore cached results from history
    const handleSuggestionSelect = useCallback((suggestion: HistorySuggestion) => {
        // Get the full thread from history to restore cached results
        const thread = getThreadById(suggestion.id);
        if (thread) {
            // Restore from history without re-searching
            restoreFromHistory(thread);
        }
        else {
            // Fallback: just set query and directory (will need to search again)
            onChange(suggestion.query);
            onDirectoryChange(suggestion.directory);
        }
        setShowSuggestions(false);
        setSuggestions([]);
        inputRef.current?.focus();
    }, [onChange, onDirectoryChange, getThreadById, restoreFromHistory]);
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
        if (e.key === 'Enter' && value.trim() && !activeSearch) {
            e.preventDefault();
            setShowSuggestions(false);
            setSuggestions([]);
            onSearch?.();
        }
    }, [showSuggestions, suggestions, selectedIndex, handleSuggestionSelect, value, activeSearch, onSearch]);
    // Accent style simplified — no longer using layered glow
    return (<div ref={containerRef} className={cn('w-full relative', centered && 'max-w-3xl mx-auto px-8')}>
      <div className="relative" ref={searchBarRef}>
        <div className={cn('relative overflow-visible', 'bg-graphite-1/60 backdrop-blur-sm', 'transition-all duration-200 ease-out', showSuggestions && suggestions.length > 0 ? 'rounded-t-xl rounded-b-none' : 'rounded-xl')} style={{
            border: hasSearchIntent || activeSearch || isInputFocused
                ? `1px solid ${activePalette.border}`
                : '1px solid rgba(243, 245, 247, 0.08)',
            outline: isInputFocused ? `1px solid ${activePalette.accentSoft}` : 'none',
            outlineOffset: isInputFocused ? '0px' : undefined,
            boxShadow: hasSearchIntent || activeSearch || isInputFocused
                ? `0 0 0 1px ${activePalette.accentFade}, 0 8px 24px rgba(0, 0, 0, 0.4)`
                : '0 2px 8px rgba(0, 0, 0, 0.2)',
            '--accent-focus': activePalette.accent,
            '--accent-focus-soft': activePalette.accentSoft,
        } as any}>
          {/* Search input row */}
          <SearchBar ref={inputRef} value={value} onChange={onChange} onKeyDown={handleKeyDown} onFocus={() => {
            setIsInputFocused(true);
            value.length >= 1 && suggestions.length > 0 && setShowSuggestions(true);
        }} onBlur={() => setIsInputFocused(false)} placeholder="Type what you remember..." isSearching={activeSearch} autoFocus={autoFocus} tone={searchBarTone} withFrame={false} showClear={false} className="w-full" rightSlot={<div className="flex items-center gap-2">
                {/* Ask Mode Indicator */}
                {shouldShowAskModeIndicator && (<div className="relative group">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent-violet/10 border border-accent-violet/20 cursor-help">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-violet animate-pulse"/>
                      <span className="text-xs font-medium text-accent-violet">Ask Mode</span>
                      <span className="text-[9px] px-1 py-px rounded bg-accent-violet/20 text-accent-violet font-semibold tracking-[0.08em]">PRO</span>
                    </div>

                    {/* Tooltip */}
                    <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-graphite-2 border border-accent-violet/20 rounded-xl shadow-xl backdrop-blur-md opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 pointer-events-none z-50 origin-top-right">
                      <div className="text-xs text-porcelain mb-1 font-medium">Deep Understanding Enabled</div>
                      <div className="text-[11px] text-fg-muted leading-relaxed">
                        I'll read through your documents to find exact answers and extract facts, instead of just matching keywords.
                      </div>
                    </div>
                  </div>)}


                {(value || activeSearch) ? (<button onClick={() => {
                    if (activeSearch) {
                        onCancel();
                    }
                    else {
                        onChange('');
                    }
                }} className={cn('flex-shrink-0 p-1.5 rounded-md', 'text-fg-dim hover:text-porcelain hover:bg-graphite-3/50', 'transition-colors duration-150')} title={activeSearch ? 'Cancel search' : 'Clear'} type="button">
                    <X className="w-3.5 h-3.5"/>
                  </button>) : null}
              </div>}/>

          {/* Controls row */}
          {showControls && (<div className="px-3 pb-2.5 pt-0.5 flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <FolderPicker value={directory} onChange={onDirectoryChange} placeholder="Select folder..." className="w-full"/>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <QualitySwitcher className="w-[132px]" value={qualityMode} onChange={handleQualityChange}/>
                <ModeSwitcher className="w-[126px]" value={mode} onChange={onModeChange}/>
              </div>
            </div>)}
        </div>
      </div>

      <SearchSuggestions isOpen={showSuggestions && suggestions.length > 0} onSelect={handleSuggestionSelect} selectedIndex={selectedIndex} suggestions={suggestions}/>
    </div>);
}
