import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { useSearchStore } from '@/stores/searchStore';
import { listen } from '@tauri-apps/api/event';
import { InfoPanel } from '@/components/onboarding/InfoPanel';
import { FirstRunOnboarding } from '@/components/onboarding/FirstRunOnboarding';
import { ArcNoiseBackground } from '@/components/effects/ArcNoiseBackground';
import { PricingPanel } from '@/components/account/PricingPanel';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { hasProAccess } from '@/lib/proAccess';
import { Button } from '@/components/ui/button';
import { TodayTab } from '@/components/today/TodayTab';
import { WorkstreamsList } from '@/components/workstreams/WorkstreamsList';
import { WorkstreamDetail } from '@/components/workstreams/WorkstreamDetail';
import { CommandPalette } from '@/components/search/CommandPalette';
import { useWorkstreamStore } from '@/stores/workstreamStore';
import * as tauri from '@/lib/tauri';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const ONBOARDING_DONE_KEY = 'ixos_first_run_onboarding_v2_done';
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [firstRunOnboarding, setFirstRunOnboarding] = useState<{
    open: boolean;
    step: 1 | 2 | 3;
    firstQuery: string | null;
    firstDurationMs: number | null;
    secondDurationMs: number | null;
    firstCacheHits: number;
    secondCacheHits: number;
  }>({
    open: false,
    step: 1,
    firstQuery: null,
    firstDurationMs: null,
    secondDurationMs: null,
    firstCacheHits: 0,
    secondCacheHits: 0,
  });
  const {
    showSettings, setShowSettings,
    showInfo, setShowInfo,
    showPricing, setShowPricing,
    settingsTab, openSettings,
    activeView, setActiveView
  } = useUIStore();

  const searchStore = useSearchStore();
  const previousPhaseRef = useRef(searchStore.phase);
  const selectWorkstream = useWorkstreamStore((state) => state.selectWorkstream);
  const currentWorkstream = useWorkstreamStore((state) => state.currentWorkstream);
  const setCurrentWorkstream = useWorkstreamStore((state) => state.setCurrentWorkstream);
  const entitlement = useAuthStore((s) => s.entitlement);
  const proStatus = useAuthStore((s) => s.proStatus);
  const entitlementToken = useAuthStore((s) => s.entitlementToken);
  const { config, updateConfig } = useSettingsStore();
  const hasPro = hasProAccess(entitlement, entitlementToken, proStatus);

  const refreshBy =
    entitlementToken && proStatus?.status === 'grace' ? proStatus.refreshBy : null;
  const refreshByLabel = refreshBy ? new Date(refreshBy * 1000).toLocaleString() : null;
  const shouldLock =
    entitlement?.plan === 'pro' &&
    !hasPro &&
    (proStatus?.status === 'timeSuspect' || proStatus?.status === 'expired');

  const lockTitle =
    proStatus?.status === 'timeSuspect'
      ? 'Device time change detected'
      : 'Pro access expired';
  const lockBody =
    proStatus?.status === 'timeSuspect'
      ? 'Connect to the internet to refresh your entitlement. Pro features are locked until verified.'
      : 'Your Pro entitlement has expired. Renew to unlock Pro features. Your data remains intact.';

  const closeOverlays = () => {
    setShowSettings(false);
    setShowInfo(false);
    setShowPricing(false);
    setShowCommandPalette(false);
  };

  const handleNewSearch = () => {
    closeOverlays();
    searchStore.reset();
    setActiveView('search');
  };

  const handleOpenFile = async (path: string) => {
    await tauri.openFile(path);
  };

  const handleSelectWorkstream = (id: string) => {
    setActiveView('workstreams');
    void selectWorkstream(id);
  };

  const focusSearchForOnboarding = () => {
    setActiveView('search');
    setFirstRunOnboarding((prev) => ({ ...prev, open: false }));
    setTimeout(() => {
      const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement | null;
      searchInput?.focus();
      searchInput?.select();
    }, 60);
  };

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_DONE_KEY) === '1';
    if (!done) {
      setFirstRunOnboarding((prev) => ({ ...prev, open: true }));
      setActiveView('search');
    }
  }, [setActiveView]);

  useEffect(() => {
    if (localStorage.getItem(ONBOARDING_DONE_KEY) === '1') return;
    if (firstRunOnboarding.step === 3) return;

    const wasComplete = previousPhaseRef.current === 'complete';
    const isComplete = searchStore.phase === 'complete';
    previousPhaseRef.current = searchStore.phase;

    if (!isComplete || wasComplete) return;

    const durationMs = searchStore.searchStartTime ? Date.now() - searchStore.searchStartTime : null;
    const cacheHits = searchStore.streamStats?.cacheHits ?? 0;
    const resolvedQuery = searchStore.activeQuery || searchStore.query || null;

    setFirstRunOnboarding((prev) => {
      if (prev.step === 1) {
        return {
          ...prev,
          open: true,
          step: 2,
          firstDurationMs: durationMs,
          firstCacheHits: cacheHits,
          firstQuery: resolvedQuery,
        };
      }
      if (prev.step === 2) {
        return {
          ...prev,
          open: true,
          step: 3,
          secondDurationMs: durationMs,
          secondCacheHits: cacheHits,
        };
      }
      return prev;
    });
  }, [
    firstRunOnboarding.step,
    searchStore.activeQuery,
    searchStore.phase,
    searchStore.query,
    searchStore.searchStartTime,
    searchStore.streamStats?.cacheHits,
  ]);

  // Listen for global shortcut trigger to focus search
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    listen('shortcut-triggered', () => {
      // Reset search state for a fresh search
      searchStore.reset();
      setShowCommandPalette(false);
      // Close settings panel if open
      setShowSettings(false);
      // Focus the search input after a short delay to ensure render
      setTimeout(() => {
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }, 50);
    }).then(fn => {
      unlisten = fn;
    }).catch(err => {
      console.log('Event listener not available (browser mode):', err);
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, [searchStore, setShowSettings]);

  useEffect(() => {
    const handleOpenPricing = () => {
      setShowPricing(true);
      setShowSettings(false);
      setShowInfo(false);
    };

    window.addEventListener('open-pricing', handleOpenPricing as EventListener);
    return () => {
      window.removeEventListener('open-pricing', handleOpenPricing as EventListener);
    };
  }, [setShowPricing, setShowSettings, setShowInfo]);

  // Global keyboard shortcuts: Ctrl+T (new search), Ctrl+K (command palette)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;

      // Ctrl+T / Cmd+T: New search tab, focus input
      if (isMod && e.key === 't') {
        e.preventDefault();
        setShowCommandPalette(false);
        searchStore.reset();
        setShowSettings(false);
        setShowInfo(false);
        setShowPricing(false);
        setActiveView('search');
        setTimeout(() => {
          const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
        }, 50);
      }

      // Ctrl+K / Cmd+K: Toggle command palette / focus search
      if (isMod && e.key === 'k') {
        e.preventDefault();
        // Close any open panels first
        if (showSettings || showInfo || showPricing) {
          setShowSettings(false);
          setShowInfo(false);
          setShowPricing(false);
        }
        setShowCommandPalette((visible) => !visible);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchStore, showSettings, showInfo, showPricing, setShowSettings, setShowInfo, setShowPricing, setActiveView]);

  return (
    <div className="desktop-window-shell h-screen flex bg-graphite-0 overflow-hidden relative" data-theme="desktop">
      {/* Background Effect */}
      <ArcNoiseBackground />

      {/* Top Padding for Window Controls (Global) */}
      <div className="h-10 fixed top-0 left-0 right-0 z-0 pointer-events-none" />

      <Sidebar
        onNewSearch={handleNewSearch}
        onOpenGuide={() => {
          setShowInfo(true);
          setShowSettings(false);
          setShowPricing(false);
        }}
        onOpenSettings={(tab) => {
          openSettings(tab);
        }}
        onOpenPricing={() => {
          setShowPricing(true);
          setShowSettings(false);
          setShowInfo(false);
        }}
        activeView={activeView}
        onViewChange={(view) => { closeOverlays(); setActiveView(view); }}
        className="flex-shrink-0 relative z-20 backdrop-blur-sm bg-graphite-0/80"
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col pt-10 overflow-hidden relative z-10">
        {refreshByLabel && (
          <div className="px-6 py-2 border-b border-accent-amber/30 bg-accent-amber/10 text-xs text-porcelain">
            Pro needs internet refresh by{' '}
            <span className="text-accent-amber font-semibold">{refreshByLabel}</span>
          </div>
        )}

        {/* Breadcrumb context line */}
        <div className="px-6 pt-3 pb-2">
          <p className="text-[11px] text-fg-ghost tracking-[0.06em]">
            Ixos <span className="text-fg-ghost/40 mx-1">/</span>
            <span className="text-fg-dim capitalize">{activeView}</span>
          </p>
        </div>

        <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            {activeView === 'search' && (
              <motion.div
                key="search-view"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -18 }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 flex flex-col"
              >
                {children}
              </motion.div>
            )}
            {activeView === 'today' && (
              <motion.div
                key="today-view"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -18 }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 flex flex-col"
              >
                <TodayTab
                  onStartSearch={() => setActiveView('search')}
                  onOpenFile={handleOpenFile}
                  onSelectWorkstream={handleSelectWorkstream}
                />
              </motion.div>
            )}
            {activeView === 'workstreams' && (
              <motion.div
                key="workstreams-view"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -18 }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 flex flex-col"
              >
                {currentWorkstream ? (
                  <WorkstreamDetail
                    workstreamId={currentWorkstream.id}
                    onBack={() => setCurrentWorkstream(null)}
                    onOpenFile={handleOpenFile}
                  />
                ) : (
                  <WorkstreamsList
                    onSelectWorkstream={handleSelectWorkstream}
                    onOpenFile={handleOpenFile}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {shouldLock && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="max-w-md w-full bg-graphite-1 border border-stroke-hairline rounded-2xl p-6 shadow-lift text-center">
              <h3 className="text-lg font-semibold text-porcelain mb-2">{lockTitle}</h3>
              <p className="text-sm text-fg-muted mb-6">{lockBody}</p>
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!config) return;
                    updateConfig({
                      search: { ...config.search, searchMode: 'flash' },
                    });
                  }}
                >
                  Switch to Flash
                </Button>
                <Button
                  onClick={() => {
                    setShowPricing(true);
                    setShowSettings(false);
                    setShowInfo(false);
                  }}
                >
                  Renew Pro
                </Button>
              </div>
            </div>
          </div>
        )}

        <CommandPalette
          isOpen={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
        />

        {/* Settings Panel Overlay */}
        {showSettings && (
          <div
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 sm:p-4 bg-graphite-0/68 backdrop-blur-md pointer-events-auto"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setShowSettings(false);
              }
            }}
          >
            <div
              data-overlay-panel="true"
              className="relative my-auto w-[min(96vw,1280px)] h-[min(88vh,840px)] max-h-[calc(100vh-1.5rem)] min-h-[560px] overflow-hidden animate-in fade-in zoom-in-95 duration-200 group pointer-events-auto"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="absolute top-4 right-4 z-50 p-2 rounded-full bg-graphite-2 border border-stroke-hairline text-fg-muted hover:text-porcelain hover:bg-graphite-3 transition-colors shadow-lg"
              >
                <X className="w-4 h-4" />
              </button>
              <SettingsPanel
                initialTab={settingsTab}
                onUpgrade={() => {
                  setShowPricing(true);
                  setShowSettings(false);
                  setShowInfo(false);
                }}
              />
            </div>
          </div>
        )}

        {/* Info Panel Overlay */}
        {showInfo && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-graphite-0/58 backdrop-blur-md pointer-events-auto"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setShowInfo(false);
              }
            }}
          >
            <div
              data-overlay-panel="true"
              className="w-full max-w-4xl h-[min(700px,88vh)] animate-in fade-in zoom-in-95 duration-200 relative group pointer-events-auto"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowInfo(false)}
                className="absolute top-4 right-4 z-50 p-2 rounded-full bg-graphite-2 border border-stroke-hairline text-fg-muted hover:text-porcelain hover:bg-graphite-3 transition-colors shadow-lg"
              >
                <X className="w-4 h-4" />
              </button>
              <InfoPanel />
            </div>
          </div>
        )}

        {/* Pricing Panel Overlay */}
        {showPricing && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-graphite-0/58 backdrop-blur-md pointer-events-auto"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setShowPricing(false);
              }
            }}
          >
            <div
              data-overlay-panel="true"
              className="w-full max-w-5xl h-[min(85vh,860px)] animate-in fade-in zoom-in-95 duration-200 relative group pointer-events-auto"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowPricing(false)}
                className="absolute top-4 right-4 z-50 p-2 rounded-full bg-graphite-2 border border-stroke-hairline text-fg-muted hover:text-porcelain hover:bg-graphite-3 transition-colors shadow-lg"
              >
                <X className="w-4 h-4" />
              </button>
              <PricingPanel />
            </div>
          </div>
        )}

        <FirstRunOnboarding
          isOpen={firstRunOnboarding.open}
          step={firstRunOnboarding.step}
          firstQuery={firstRunOnboarding.firstQuery}
          firstDurationMs={firstRunOnboarding.firstDurationMs}
          secondDurationMs={firstRunOnboarding.secondDurationMs}
          firstCacheHits={firstRunOnboarding.firstCacheHits}
          secondCacheHits={firstRunOnboarding.secondCacheHits}
          onFocusSearch={focusSearchForOnboarding}
          onComplete={() => {
            localStorage.setItem(ONBOARDING_DONE_KEY, '1');
            setFirstRunOnboarding((prev) => ({ ...prev, open: false }));
          }}
        />
      </main>
    </div>
  );
}
