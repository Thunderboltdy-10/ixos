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
      <div className="h-10 flex items-center justify-between bg-graphite-1 border-b border-stroke-hairline relative">
        {/* Drag region - absolute positioned behind everything */}
        <div
          className="absolute inset-0 z-0"
          data-tauri-drag-region
        />

        {/* Left: Logo and Title - positioned above drag region */}
        <div className="flex items-center gap-2 px-3 relative z-10">
          <div className="w-5 h-5 rounded bg-gradient-teal p-[1px]">
            <div className="w-full h-full rounded bg-graphite-2 flex items-center justify-center">
              <img src={ixosIcon} alt="Ixos" className="w-3.5 h-3.5" />
            </div>
          </div>
          <h1 className="text-xs font-medium text-fg-muted select-none">Ixos Protocol</h1>
        </div>

        {/* Right: Window Controls - positioned above drag region */}
        <div className="flex items-center gap-0.5 px-2 relative z-10 pointer-events-auto">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowSettings(!showSettings);
            }}
            className={cn(
              "w-8 h-8 flex items-center justify-center rounded",
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
              "w-8 h-8 flex items-center justify-center rounded",
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
              "w-8 h-8 flex items-center justify-center rounded",
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
              "w-8 h-8 flex items-center justify-center rounded",
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
        {/* Sidebar */}
        <Sidebar
          onNewSearch={handleNewSearch}
          onOpenGuide={() => {
            setShowInfo(true);
            setShowSettings(false);
          }}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {children}

          {/* Settings Panel Overlay */}
          {showSettings && (
            <div className="absolute inset-0 z-50 bg-graphite-0/80 backdrop-blur-xl">
              <div className="h-full overflow-auto p-6">
                <div className="max-w-2xl mx-auto">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-porcelain">Settings</h2>
                    <button
                      type="button"
                      onClick={() => setShowSettings(false)}
                      className="p-2 rounded hover:bg-graphite-2 text-fg-muted hover:text-porcelain cursor-pointer"
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
            <div className="absolute inset-0 z-50 bg-graphite-0/80 backdrop-blur-xl">
              <div className="h-full overflow-auto p-6">
                <div className="max-w-4xl mx-auto">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-porcelain">Ixos Guide</h2>
                    <button
                      type="button"
                      onClick={() => setShowInfo(false)}
                      className="p-2 rounded hover:bg-graphite-2 text-fg-muted hover:text-porcelain cursor-pointer"
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
