import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Calendar,
  Clock3,
  Command,
  Layers,
  Search,
  Settings2,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStarredStore, type SearchThread } from '@/stores/starredStore';
import { useSearchStore } from '@/stores/searchStore';
import { useUIStore } from '@/stores/uiStore';
import { useSettingsStore } from '@/stores/settingsStore';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PaletteItem {
  id: string;
  section: 'Recent searches' | 'Starred searches' | 'Quick actions' | 'Navigation';
  label: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords: string;
  onSelect: () => void | Promise<void>;
}

function formatRelativeTimestamp(timestamp: number): string {
  const deltaMs = Date.now() - timestamp;
  if (deltaMs < 60_000) return 'just now';
  if (deltaMs < 3_600_000) return `${Math.floor(deltaMs / 60_000)}m ago`;
  if (deltaMs < 86_400_000) return `${Math.floor(deltaMs / 3_600_000)}h ago`;
  return `${Math.floor(deltaMs / 86_400_000)}d ago`;
}

function threadSubtitle(thread: SearchThread): string {
  const resultLabel = thread.resultCount === 1 ? 'result' : 'results';
  return `${thread.resultCount} ${resultLabel} | ${formatRelativeTimestamp(thread.timestamp)}`;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const threads = useStarredStore((state) => state.threads);
  const restoreFromHistory = useSearchStore((state) => state.restoreFromHistory);
  const resetSearch = useSearchStore((state) => state.reset);
  const setCacheMode = useSearchStore((state) => state.setCacheMode);
  const cacheMode = useSearchStore((state) => state.cacheMode);

  const { setActiveView, openSettings } = useUIStore();
  const { config, updateConfig } = useSettingsStore();

  const applySearchMode = useCallback(
    async (mode: 'flash' | 'pro' | 'auto') => {
      if (!config) return;
      await updateConfig({
        search: {
          ...config.search,
          searchMode: mode,
        },
      });
      setActiveView('search');
    },
    [config, updateConfig, setActiveView]
  );

  const toggleCacheMode = useCallback(async () => {
    const nextMode = cacheMode === 'ephemeral' ? 'native-cache' : 'ephemeral';
    setCacheMode(nextMode);
    if (!config) return;
    await updateConfig({
      search: {
        ...config.search,
        cacheMode: nextMode,
      },
    });
  }, [cacheMode, config, setCacheMode, updateConfig]);

  const recentThreads = useMemo(
    () => threads.filter((thread) => !thread.starred).slice(0, 10),
    [threads]
  );
  const starredThreads = useMemo(
    () => threads.filter((thread) => thread.starred).slice(0, 10),
    [threads]
  );

  const items = useMemo<PaletteItem[]>(() => {
    const recentItems: PaletteItem[] = recentThreads.map((thread) => ({
      id: `recent:${thread.id}`,
      section: 'Recent searches',
      label: thread.query,
      subtitle: threadSubtitle(thread),
      icon: Clock3,
      keywords: `${thread.query} ${thread.directory} recent history`,
      onSelect: () => {
        restoreFromHistory(thread);
        setActiveView('search');
      },
    }));

    const starredItems: PaletteItem[] = starredThreads.map((thread) => ({
      id: `starred:${thread.id}`,
      section: 'Starred searches',
      label: thread.query,
      subtitle: threadSubtitle(thread),
      icon: Star,
      keywords: `${thread.query} ${thread.directory} starred pinned`,
      onSelect: () => {
        restoreFromHistory(thread);
        setActiveView('search');
      },
    }));

    const quickActions: PaletteItem[] = [
      {
        id: 'action:flash',
        section: 'Quick actions',
        label: 'Switch to Ixos Flash',
        subtitle: 'Prioritize speed',
        icon: Zap,
        keywords: 'flash mode speed',
        onSelect: () => applySearchMode('flash'),
      },
      {
        id: 'action:pro',
        section: 'Quick actions',
        label: 'Switch to Ixos Pro',
        subtitle: 'Prioritize depth',
        icon: Sparkles,
        keywords: 'pro mode quality',
        onSelect: () => applySearchMode('pro'),
      },
      {
        id: 'action:auto',
        section: 'Quick actions',
        label: 'Switch to Auto mode',
        subtitle: 'Flash-first with refinement',
        icon: Sparkles,
        keywords: 'auto mode hybrid',
        onSelect: () => applySearchMode('auto'),
      },
      {
        id: 'action:toggle-cache',
        section: 'Quick actions',
        label: `Toggle ${cacheMode === 'ephemeral' ? 'Local' : 'Memory'} mode`,
        subtitle: `Current mode: ${cacheMode === 'ephemeral' ? 'Memory' : 'Local'}`,
        icon: Sparkles,
        keywords: 'toggle memory local mode',
        onSelect: () => toggleCacheMode(),
      },
      {
        id: 'action:settings',
        section: 'Quick actions',
        label: 'Open settings',
        subtitle: 'Search, account, privacy',
        icon: Settings2,
        keywords: 'settings preferences config',
        onSelect: () => openSettings('search'),
      },
      {
        id: 'action:new-search',
        section: 'Quick actions',
        label: 'New search',
        subtitle: 'Reset current session',
        icon: Search,
        keywords: 'new search clear reset',
        onSelect: () => {
          resetSearch();
          setActiveView('search');
        },
      },
    ];

    const navigation: PaletteItem[] = [
      {
        id: 'nav:search',
        section: 'Navigation',
        label: 'Go to Search',
        icon: Search,
        keywords: 'go search tab',
        onSelect: () => setActiveView('search'),
      },
      {
        id: 'nav:today',
        section: 'Navigation',
        label: 'Go to Today',
        icon: Calendar,
        keywords: 'go today dashboard',
        onSelect: () => setActiveView('today'),
      },
      {
        id: 'nav:workstreams',
        section: 'Navigation',
        label: 'Go to Workstreams',
        icon: Layers,
        keywords: 'go workstreams sessions',
        onSelect: () => setActiveView('workstreams'),
      },
    ];

    return [...recentItems, ...starredItems, ...quickActions, ...navigation];
  }, [
    applySearchMode,
    cacheMode,
    openSettings,
    recentThreads,
    resetSearch,
    restoreFromHistory,
    setActiveView,
    starredThreads,
    toggleCacheMode,
  ]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredItems = useMemo(() => {
    if (!normalizedQuery) return items;
    return items.filter((item) => {
      const haystack = `${item.label} ${item.subtitle ?? ''} ${item.keywords}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [items, normalizedQuery]);

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setSelectedIndex(0);
    const raf = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(raf);
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex((prev) => {
      if (filteredItems.length === 0) return 0;
      return Math.min(prev, filteredItems.length - 1);
    });
  }, [filteredItems.length]);

  const selectItem = useCallback(
    async (item: PaletteItem) => {
      await item.onSelect();
      onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (filteredItems.length === 0) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredItems.length - 1));
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        const selected = filteredItems[selectedIndex];
        if (selected) {
          void selectItem(selected);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [filteredItems, isOpen, onClose, selectItem, selectedIndex]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm px-4 pt-[14vh]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto w-full max-w-xl rounded-2xl border border-stroke-hairline bg-graphite-1/95 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-stroke-hairline px-4 py-3">
              <Command className="h-4 w-4 text-fg-dim" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Type a command, search, or destination..."
                className="w-full bg-transparent text-sm text-porcelain placeholder:text-fg-dim focus:outline-none"
              />
            </div>

            <div className="max-h-[62vh] overflow-y-auto py-2">
              {filteredItems.length === 0 ? (
                <div className="px-4 py-6 text-sm text-fg-dim">No matches for "{query}"</div>
              ) : (
                filteredItems.map((item, index) => {
                  const Icon = item.icon;
                  const showSection =
                    index === 0 || filteredItems[index - 1]?.section !== item.section;

                  return (
                    <div key={item.id}>
                      {showSection && (
                        <div className="px-4 pb-1 pt-3 text-[11px] font-medium text-fg-ghost">
                          {item.section}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => void selectItem(item)}
                        className={cn(
                          'mx-2 flex w-[calc(100%-1rem)] items-start gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                          index === selectedIndex
                            ? 'bg-graphite-2 text-porcelain'
                            : 'text-fg-muted hover:bg-graphite-2/70 hover:text-porcelain'
                        )}
                      >
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-fg-dim" />
                        <div className="min-w-0">
                          <div className="truncate text-sm">{item.label}</div>
                          {item.subtitle && (
                            <div className="truncate text-xs text-fg-dim">{item.subtitle}</div>
                          )}
                        </div>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
