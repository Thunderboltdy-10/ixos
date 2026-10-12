import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { SearchOverlay } from "./components/search/SearchOverlay";
import { AppShell } from "./components/layout/AppShell";
import { SplashLoader } from "./components/layout/SplashLoader";
import { WindowControls } from "./components/layout/WindowControls";
import { MainSearchView } from "./components/search/MainSearchView";
import { useAppInit } from "./hooks/useAppInit";

export default function App() {
  const overlay = getCurrentWindow().label === "overlay";
  const { isInitialized, error } = useAppInit();
  useEffect(() => {
    if (overlay) {
      document.documentElement.style.background = "transparent";
      document.body.style.background = "transparent";
    }
  }, [overlay]);
  if (!isInitialized) return <SplashLoader />;
  if (error)
    return (
      <p role="alert" className="p-8 text-danger">
        {error}
      </p>
    );
  return overlay ? (
    <SearchOverlay />
  ) : (
    <>
      <WindowControls />
      <AppShell>
        <MainSearchView />
      </AppShell>
    </>
  );
}
