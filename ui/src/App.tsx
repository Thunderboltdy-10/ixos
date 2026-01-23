import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { SearchOverlay } from './components/search/SearchOverlay';
import { AppShell } from './components/layout/AppShell';
import { MainSearchView } from './components/search/MainSearchView';
import { useAppInit } from './hooks/useAppInit';
import { AchievementNotifications } from './components/stats';
import ixosIcon from '@/assets/ixos-icon.png';

type WindowType = 'overlay' | 'main' | 'unknown';

interface ModelStatus {
  potionAvailable: boolean;
  potionPath: string | null;
  qwenAvailable: boolean;
  qwenPath: string | null;
  anyAvailable: boolean;
  recommended: string | null;
  loadedModel: string | null;
}

function ModelWarningPopup({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-surface-0 border border-border rounded-xl p-6 max-w-md mx-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-text-primary">No Embedding Models Found</h2>
        </div>

        <p className="text-text-secondary mb-4">
          Semantic search requires embedding models. Without them, search will use basic text matching only.
        </p>

        <div className="bg-surface-1 rounded-lg p-3 mb-4 text-sm font-mono text-text-secondary">
          <p className="mb-2">To install models, run:</p>
          <code className="text-brand-teal">python scripts/distill_model.py --potion</code>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onDismiss}
            className="flex-1 px-4 py-2 bg-surface-2 hover:bg-surface-3 text-text-primary rounded-lg transition-colors"
          >
            Continue Anyway
          </button>
        </div>
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
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-0">
        <div className="text-center">
          <div className="w-16 h-16 rounded-xl bg-gradient-brand p-[2px] flex items-center justify-center mx-auto mb-4 animate-pulse">
            <div className="w-full h-full rounded-[10px] bg-surface-2 flex items-center justify-center">
              <img src={ixosIcon} alt="Ixos" className="w-9 h-9" />
            </div>
          </div>
          <div className="text-brand-teal animate-pulse">Loading Ixos Protocol...</div>
        </div>
      </div>
    );
  }

  if (windowType === 'overlay') {
    return <SearchOverlay />;
  }

  // Main window with new AppShell layout
  return (
    <>
      <AppShell>
        <MainSearchView />
      </AppShell>
      <AchievementNotifications />
      {showModelWarning && (
        <ModelWarningPopup onDismiss={() => setShowModelWarning(false)} />
      )}
    </>
  );
}

export default App;
