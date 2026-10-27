import { BackIcon, GearIcon, Loading, TitleBar } from "@ixos/ui";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";
import logo from "./assets/ixos-icon.png";
import { useBackend } from "./lib/useBackend";
import { SearchView } from "./main/SearchView";
import { Overlay } from "./overlay/Overlay";
import { SettingsView } from "./settings/SettingsView";

const appWindow = getCurrentWindow();
const overlay = appWindow.label === "overlay";
if (overlay) document.documentElement.dataset.window = "overlay";

export function App() {
  const { config, locations, models, error, save } = useBackend();
  const [settings, setSettings] = useState(false);
  useEffect(() => {
    const opened = listen("open-settings", () => setSettings(true));
    return () => {
      opened.then((stop) => stop());
    };
  }, []);

  if (overlay) return config ? <Overlay config={config} /> : null;
  return (
    <div className="app">
      <TitleBar
        onMinimize={() => appWindow.minimize()}
        onMaximize={() => appWindow.toggleMaximize()}
        onClose={() => appWindow.close()}
        actions={
          <button
            className={`ix-window-button${settings ? " is-on" : ""}`}
            aria-label="Settings"
            aria-pressed={settings}
            onClick={() => setSettings(!settings)}
          >
            <GearIcon size={15} />
          </button>
        }
      >
        {settings ? (
          <button className="titlebar-back" onClick={() => setSettings(false)}>
            <BackIcon size={15} />
            Settings
          </button>
        ) : (
          <span className="ix-titlebar-name" data-tauri-drag-region>
            <img src={logo} alt="" width={18} height={18} />
            Ixos
          </span>
        )}
        {error && <span className="titlebar-error">{error}</span>}
      </TitleBar>
      {!config ? (
        <Loading logo={logo} />
      ) : settings ? (
        <SettingsView config={config} locations={locations} models={models} save={save} />
      ) : (
        <SearchView config={config} locations={locations} save={save} />
      )}
    </div>
  );
}
