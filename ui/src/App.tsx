import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { SearchOverlay } from './components/search/SearchOverlay';
import { AppShell } from './components/layout/AppShell';
import { MainSearchView } from './components/search/MainSearchView';
import { useAppInit } from './hooks/useAppInit';
import { AchievementNotifications } from './components/stats';
import ixosIcon from '@/assets/ixos-icon.png';
import { IxosClerkProvider } from './providers/ClerkProvider';
import { AuthGate } from './components/auth/AuthGate';
import { useAuthStore } from './stores/authStore';

type WindowType = 'overlay' | 'main' | 'unknown';



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
      <div className="flex items-center justify-center min-h-screen bg-graphite-0">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-brand p-[2px] flex items-center justify-center mx-auto mb-4 animate-pulse">
            <div className="w-full h-full rounded-[14px] bg-graphite-2 flex items-center justify-center">
              <img src={ixosIcon} alt="Ixos" className="w-9 h-9" />
            </div>
          </div>
          <div className="text-accent-teal animate-pulse uppercase tracking-[0.2em] text-xs">Loading Ixos Protocol...</div>
        </div>
      </div>
    );
  }

  return (
    <IxosClerkProvider>
      <AuthGate>
        {windowType === 'overlay' ? (
          <SearchOverlay />
        ) : (
          <>
            <AppShell>
              <MainSearchView />
            </AppShell>
            <AchievementNotifications />
            {showModelWarning && (
              <ModelWarningPopup onDismiss={() => setShowModelWarning(false)} />
            )}
          </>
        )}
      </AuthGate>
    </IxosClerkProvider>
  );
}

export default App;
