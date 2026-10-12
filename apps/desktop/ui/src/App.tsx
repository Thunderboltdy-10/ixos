import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { SearchOverlay } from './components/search/SearchOverlay';
import { AppShell } from './components/layout/AppShell';
import { SplashLoader } from './components/layout/SplashLoader';
import { WindowControls } from './components/layout/WindowControls';
import { MainSearchView } from './components/search/MainSearchView';
import { useAppInit } from './hooks/useAppInit';
import { AchievementNotifications } from './components/stats';
import { ToastContainer } from './components/notifications/ToastContainer';
import type { ModelStatus } from './lib/types';

type WindowType = 'overlay' | 'main' | 'unknown';





function ModelWarningPopup({ onDismiss }: { onDismiss: () => void }) {
  // Simple inline fallback if the component was missing
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-graphite-1 border border-stroke-hairline rounded-lg p-6 max-w-md mx-4 shadow-lift text-center">
        <h2 className="text-lg font-semibold text-porcelain mb-2">Models Required</h2>
        <p className="text-fg-muted mb-4 text-sm">Semantic search needs embedding models.</p>
        <button
          onClick={onDismiss}
          className="px-4 py-2 bg-accent-teal text-graphite-0 rounded-md text-xs font-bold uppercase tracking-wider"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

function App() {
  const [windowType, setWindowType] = useState<WindowType>('unknown');
  const [showModelWarning, setShowModelWarning] = useState(false);
  const { isInitialized } = useAppInit();

  useEffect(() => {
    async function detectWindow() {
      try {
        const window = getCurrentWindow();
        const label = window.label;
        if (label === 'overlay') {
          setWindowType('overlay');
        } else if (label === 'main') {
          setWindowType('main');
        } else {
          setWindowType('main'); // Default to main
        }
      } catch {
        setWindowType('main');
      }
    }
    detectWindow();
  }, []);

  // Check model status on mount (only for main window)
  useEffect(() => {
    async function checkModels() {
      if (windowType !== 'main') return;

      try {
        const status = await invoke<ModelStatus>('get_model_status');
        if (!status.anyAvailable) {
          setShowModelWarning(true);
        }
      } catch (err) {
        console.warn('Failed to check model status:', err);
      }
    }

    if (windowType === 'main' && isInitialized) {
      checkModels();
    }
  }, [windowType, isInitialized]);

  // Wait for both window detection and store initialization
  if (windowType === 'unknown' || !isInitialized) {
    // Loading state with new branding
    return <SplashLoader />;
  }

  return (
    <>
      {/* Window controls stay available without a network session. */}
      {windowType !== 'overlay' && <WindowControls />}

      <>
        {windowType === 'overlay' ? (
          <SearchOverlay />
        ) : (
          <>
            <AppShell>
              <MainSearchView />
            </AppShell>
            <AchievementNotifications />
            <ToastContainer />
            {showModelWarning && (
              <ModelWarningPopup onDismiss={() => setShowModelWarning(false)} />
            )}
          </>
        )}
      </>
    </>
  );
}

export default App;
