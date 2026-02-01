import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { useSearchStore } from '@/stores/searchStore';
import { listen } from '@tauri-apps/api/event';
import { InfoPanel } from '@/components/onboarding/InfoPanel';
import { ArcNoiseBackground } from '@/components/effects/ArcNoiseBackground';
import { PricingPanel } from '@/components/account/PricingPanel';
import { useUIStore } from '@/stores/uiStore';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const {
    showSettings, setShowSettings,
    showInfo, setShowInfo,
    showPricing, setShowPricing,
    settingsTab, openSettings
  } = useUIStore();

  const searchStore = useSearchStore();

  const handleNewSearch = () => {
    searchStore.reset();
  };

  // Listen for global shortcut trigger to focus search
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    listen('shortcut-triggered', () => {
      // Reset search state for a fresh search
      searchStore.reset();
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
  }, [searchStore]);

  return (
    <div className="h-screen flex bg-graphite-0 overflow-hidden relative" data-theme="desktop">
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
        className="flex-shrink-0 relative z-20 backdrop-blur-sm bg-graphite-0/80"
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col pt-10 overflow-hidden relative z-10">

        <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
          {children}
        </div>

        {/* Settings Panel Overlay */}
        {showSettings && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-8 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-5xl h-[85vh] animate-in fade-in zoom-in-95 duration-200 relative group">
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
          <div className="absolute inset-0 z-50 flex items-center justify-center p-8 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-4xl h-[700px] max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 relative group">
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
          <div className="absolute inset-0 z-50 flex items-center justify-center p-8 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-5xl h-[85vh] animate-in fade-in zoom-in-95 duration-200 relative group">
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
      </main>
    </div>
  );
}
