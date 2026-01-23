import { useState, useEffect } from 'react';
import { Settings, Minus, Square, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sidebar } from './Sidebar';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { useSearchStore } from '@/stores/searchStore';
import ixosIcon from '@/assets/ixos-icon.png';
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

  return (
    <div className="h-screen flex flex-col bg-graphite-0 overflow-hidden">
      {/* Titlebar */}
      <div className="h-12 flex items-center justify-between bg-graphite-1 border-b border-stroke-hairline relative">
        <div className="absolute inset-0 z-0" data-tauri-drag-region />

        {/* Left: Logo and Title */}
        <div className="flex items-center gap-3 px-4 relative z-10">
          <div className="w-6 h-6 rounded-md bg-gradient-teal p-[1px] shadow-glow-teal">
            <div className="w-full h-full rounded-[6px] bg-graphite-2 flex items-center justify-center">
              <img src={ixosIcon} alt="Ixos" className="w-4 h-4" />
            </div>
          </div>
          <div className="flex flex-col leading-tight select-none">
            <h1 className="text-xs font-semibold text-porcelain tracking-[0.08em] uppercase">Ixos Protocol</h1>
            <span className="text-[10px] text-fg-dim">Search Instrument</span>
          </div>
        </div>

        {/* Right: Window Controls */}
        <div className="flex items-center gap-0.5 px-3 relative z-10 pointer-events-auto">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowSettings(!showSettings);
            }}
            className={cn(
              "w-8 h-8 flex items-center justify-center rounded-md",
              "text-fg-muted hover:text-porcelain hover:bg-graphite-2",
              "transition-colors duration-150 cursor-pointer select-none"
            )}
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-stroke-hairline mx-1" />

          <button
            type="button"
            onMouseDown={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              try {
                const window = await getTauriWindow();
                await window.minimize();
              } catch (err) {
                console.error('Failed to minimize:', err);
              }
            }}
            className={cn(
              "w-8 h-8 flex items-center justify-center rounded-md",
              "text-fg-muted hover:text-porcelain hover:bg-graphite-2",
              "transition-colors duration-150 cursor-pointer select-none"
            )}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              try {
                const window = await getTauriWindow();
                await window.toggleMaximize();
              } catch (err) {
                console.error('Failed to maximize:', err);
              }
            }}
            className={cn(
              "w-8 h-8 flex items-center justify-center rounded-md",
              "text-fg-muted hover:text-porcelain hover:bg-graphite-2",
              "transition-colors duration-150 cursor-pointer select-none"
            )}
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            type="button"
            onMouseDown={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              try {
                const window = await getTauriWindow();
                await window.hide();
              } catch (err) {
                console.error('Failed to close:', err);
              }
            }}
            className={cn(
              "w-8 h-8 flex items-center justify-center rounded-md",
              "text-fg-muted hover:text-white hover:bg-danger",
              "transition-colors duration-150 cursor-pointer select-none"
            )}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          onNewSearch={handleNewSearch}
          onOpenGuide={() => {
            setShowInfo(true);
            setShowSettings(false);
          }}
        />

        <div className="flex-1 flex flex-col overflow-hidden relative bg-graphite-0">
          <div className="pointer-events-none absolute inset-0 opacity-80 bg-gradient-noise-teal" />
          <div className="pointer-events-none absolute inset-0 opacity-60 bg-gradient-noise-amber" />
          <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
            {children}
          </div>

          {showSettings && (
            <div className="absolute inset-0 z-50 bg-graphite-0/85 backdrop-blur-xl">
              <div className="h-full overflow-auto p-8">
                <div className="max-w-3xl mx-auto glass-card p-6">
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

          {showInfo && (
            <div className="absolute inset-0 z-50 bg-graphite-0/85 backdrop-blur-xl">
              <div className="h-full overflow-auto p-8">
                <div className="max-w-4xl mx-auto glass-card p-6">
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
        </div>
      </div>
    </div>
  );
}
