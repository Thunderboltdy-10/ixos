import { useState, useEffect } from 'react';
import { Settings, Minus, Square, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sidebar } from './Sidebar';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { useSearchStore } from '@/stores/searchStore';
import { listen } from '@tauri-apps/api/event';
import { InfoPanel } from '@/components/onboarding/InfoPanel';

// Safe Tauri window import - falls back to no-op in browser
const getTauriWindow = async () => {
  try {
    const tauri = await import('@tauri-apps/api/window');
    return tauri.getCurrentWindow();
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
    <div className="h-screen flex bg-graphite-0 overflow-hidden" data-theme="desktop">
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
          onClick={() => setShowSettings(!showSettings)}
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
        className="flex-shrink-0"
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col pt-10 overflow-hidden relative bg-graphite-0">
        {/* Subtle gradient backgrounds */}
        <div className="pointer-events-none absolute inset-0 opacity-60 bg-gradient-to-br from-accent-amber/[0.02] to-transparent" />

        <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
          {children}
        </div>

        {/* Settings Panel Overlay */}
        {showSettings && (
          <div className="absolute inset-0 z-50 bg-graphite-0/90 backdrop-blur-xl">
            <div className="h-full overflow-auto p-8">
              <div className="max-w-3xl mx-auto bg-graphite-1 border border-stroke-hairline rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-porcelain">Settings</h2>
                    <p className="text-sm text-fg-muted">Tune search, privacy, and compliance controls.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSettings(false)}
                    className="p-2 rounded-md hover:bg-graphite-2 text-fg-muted hover:text-porcelain cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <SettingsPanel />
              </div>
            </div>
          </div>
        )}

        {/* Info Panel Overlay */}
        {showInfo && (
          <div className="absolute inset-0 z-50 bg-graphite-0/90 backdrop-blur-xl">
            <div className="h-full overflow-auto p-8">
              <div className="max-w-4xl mx-auto bg-graphite-1 border border-stroke-hairline rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-porcelain">Ixos Guide</h2>
                    <p className="text-sm text-fg-muted">Learn the protocol and shortcuts.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowInfo(false)}
                    className="p-2 rounded-md hover:bg-graphite-2 text-fg-muted hover:text-porcelain cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <InfoPanel />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
