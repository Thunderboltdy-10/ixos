import { useState, useEffect } from 'react';
import { Settings, Minus, Square, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sidebar } from './Sidebar';
import { SettingsPanel, type SettingsTabId } from '@/components/settings/SettingsPanel';
import { useSearchStore } from '@/stores/searchStore';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { InfoPanel } from '@/components/onboarding/InfoPanel';
import { ArcNoiseBackground } from '@/components/effects/ArcNoiseBackground';
import { PricingPanel } from '@/components/account/PricingPanel';

// Safe Tauri window import - falls back to no-op in browser
const getTauriWindow = async () => {
  try {
    return getCurrentWindow();
  } catch {
    console.log('Tauri window API not available (browser mode)');
    return {
      minimize: async () => { },
      toggleMaximize: async () => { },
      hide: async () => { },
    };
  }
};

interface WindowControlProps {
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

function WindowControl({ icon, onClick, variant = 'default' }: WindowControlProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "w-7 h-7 flex items-center justify-center rounded-md",
        "transition-colors duration-150 cursor-pointer select-none",
        variant === 'default'
          ? "text-fg-muted hover:text-porcelain hover:bg-graphite-2"
          : "text-fg-muted hover:text-white hover:bg-error"
      )}
    >
      {icon}
    </button>
  );
}

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTabId>('search');
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

  const handleMinimize = async () => {
    try {
      const window = await getTauriWindow();
      await window.minimize();
    } catch (err) {
      console.error('Failed to minimize:', err);
    }
  };

  const handleMaximize = async () => {
    try {
      const window = await getTauriWindow();
      await window.toggleMaximize();
    } catch (err) {
      console.error('Failed to maximize:', err);
    }
  };

  const handleClose = async () => {
    try {
      const window = await getTauriWindow();
      await window.hide();
    } catch (err) {
      console.error('Failed to close:', err);
    }
  };

  return (
    <div className="h-screen flex bg-graphite-0 overflow-hidden relative" data-theme="desktop">
      {/* Background Effect */}
      <ArcNoiseBackground />

      {/* Invisible drag region - covers top of window */}
      <div
        data-tauri-drag-region
        className="fixed top-0 left-0 right-0 h-10 z-40 pointer-events-auto"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />

      {/* Window controls - absolute top-right */}
      <div className="fixed top-2 right-3 flex items-center gap-0.5 z-50">
        <WindowControl
          icon={<Settings className="w-3.5 h-3.5" />}
          onClick={() => {
            setSettingsTab('search');
            setShowSettings(!showSettings);
          }}
        />
        <div className="w-px h-4 bg-stroke-hairline mx-1" />
        <WindowControl icon={<Minus className="w-3.5 h-3.5" />} onClick={handleMinimize} />
        <WindowControl icon={<Square className="w-3 h-3" />} onClick={handleMaximize} />
        <WindowControl icon={<X className="w-3.5 h-3.5" />} onClick={handleClose} variant="danger" />
      </div>

      {/* Sidebar */}
      <Sidebar
        onNewSearch={handleNewSearch}
        onOpenGuide={() => {
          setShowInfo(true);
          setShowSettings(false);
        }}
        onOpenSettings={(tab) => {
          if (tab) setSettingsTab(tab);
          setShowSettings(true);
          setShowInfo(false);
          setShowPricing(false);
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
