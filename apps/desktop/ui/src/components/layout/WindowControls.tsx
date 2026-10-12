import { useEffect, useState } from "react";
import { Copy, Settings, Minus, Square, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { platform as getOsPlatform } from "@tauri-apps/plugin-os";
import { useUIStore } from "@/stores/uiStore";

// Safe Tauri window import - falls back to no-op in browser
const getTauriWindow = async () => {
  try {
    return getCurrentWindow();
  } catch {
    console.log("Tauri window API not available (browser mode)");
    return {
      minimize: async () => {},
      toggleMaximize: async () => {},
      close: async () => {},
      isMaximized: async () => false,
      onResized: async () => () => {},
    };
  }
};

export function WindowControls() {
  const [osFamily, setOsFamily] = useState<"windows" | "macos" | "linux">(
    "windows",
  );
  const [isMaximized, setIsMaximized] = useState(true);
  const openSettings = useUIStore((state) => state.openSettings);

  const showSettings = true;

  useEffect(() => {
    let cancelled = false;

    const resolveOs = async () => {
      try {
        const os = await getOsPlatform();
        if (cancelled) return;
        if (os === "macos") {
          setOsFamily("macos");
          return;
        }
        if (os === "linux") {
          setOsFamily("linux");
          return;
        }
        setOsFamily("windows");
        return;
      } catch {
        // Fallback for browser/non-Tauri dev mode.
      }

      const platform = (navigator.platform || "").toLowerCase();
      if (platform.includes("mac")) {
        setOsFamily("macos");
      } else if (platform.includes("linux")) {
        setOsFamily("linux");
      } else {
        setOsFamily("windows");
      }
    };

    void resolveOs();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unlistenResized: (() => void) | null = null;

    const syncMaximized = async () => {
      try {
        const window = await getTauriWindow();
        const value = await window.isMaximized();
        if (cancelled) return;
        setIsMaximized(value);
        if (typeof document !== "undefined") {
          document.documentElement.dataset.windowMaximized = value ? "1" : "0";
        }
      } catch {
        if (typeof document !== "undefined") {
          document.documentElement.dataset.windowMaximized = "0";
        }
      }
    };

    const setup = async () => {
      await syncMaximized();
      try {
        const window = await getTauriWindow();
        unlistenResized = await window.onResized(() => {
          void syncMaximized();
        });
      } catch {
        // no-op in browser mode
      }
    };

    void setup();

    return () => {
      cancelled = true;
      if (unlistenResized) unlistenResized();
    };
  }, []);

  const handleMinimize = async () => {
    try {
      const window = await getTauriWindow();
      await window.minimize();
    } catch (err) {
      console.error("Failed to minimize:", err);
    }
  };

  const handleMaximize = async () => {
    try {
      const window = await getTauriWindow();
      await window.toggleMaximize();
    } catch (err) {
      console.error("Failed to maximize:", err);
    }
  };

  const handleClose = async () => {
    try {
      const window = await getTauriWindow();
      await window.close();
    } catch (err) {
      console.error("Failed to close:", err);
    }
  };

  return (
    <>
      {/* Invisible drag region - covers top of window */}
      <div
        data-tauri-drag-region
        className="fixed top-0 left-0 right-0 h-10 z-[2147483000] pointer-events-auto"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      />

      {osFamily === "macos" ? (
        <>
          <div
            className="fixed top-0 left-4 h-10 z-[2147483001] flex items-center gap-2"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            <button
              type="button"
              title="Close"
              aria-label="Close"
              onClick={handleClose}
              className="h-3.5 w-3.5 rounded-full bg-[#ff5f57] ring-1 ring-black/35 transition-transform hover:scale-105"
            />
            <button
              type="button"
              title="Minimize"
              aria-label="Minimize"
              onClick={handleMinimize}
              className="h-3.5 w-3.5 rounded-full bg-[#febc2e] ring-1 ring-black/35 transition-transform hover:scale-105"
            />
            <button
              type="button"
              title="Zoom"
              aria-label="Zoom"
              onClick={handleMaximize}
              className="h-3.5 w-3.5 rounded-full bg-[#28c840] ring-1 ring-black/35 transition-transform hover:scale-105"
            />
          </div>

          {showSettings && (
            <div
              className="fixed top-0 right-3 h-10 z-[2147483001] flex items-center"
              style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            >
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  openSettings("search");
                }}
                title="Settings"
                aria-label="Settings"
                className="h-7 w-7 rounded-md text-fg-muted transition-colors hover:bg-white/[0.06] hover:text-porcelain"
              >
                <Settings className="mx-auto h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </>
      ) : (
        <div
          className="fixed top-0 right-0 h-10 z-[2147483001] flex items-stretch"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          {showSettings && (
            <button
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                openSettings("search");
              }}
              title="Settings"
              aria-label="Settings"
              className="mr-1.5 h-10 w-10 text-fg-muted transition-colors hover:bg-white/[0.05] hover:text-porcelain"
            >
              <Settings className="mx-auto h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void handleMinimize();
            }}
            title="Minimize"
            aria-label="Minimize"
            className="h-10 w-11 text-fg-muted transition-colors hover:bg-white/[0.05] hover:text-porcelain"
          >
            <Minus className="mx-auto h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void handleMaximize();
            }}
            title={isMaximized ? "Restore" : "Maximize"}
            aria-label={isMaximized ? "Restore" : "Maximize"}
            className="h-10 w-11 text-fg-muted transition-colors hover:bg-white/[0.05] hover:text-porcelain"
          >
            {isMaximized ? (
              <Copy className="mx-auto h-3 w-3" />
            ) : (
              <Square className="mx-auto h-3 w-3" />
            )}
          </button>

          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void handleClose();
            }}
            title="Close"
            aria-label="Close"
            className="h-10 w-11 text-fg-muted transition-colors hover:bg-[#e81123] hover:text-white"
          >
            <X className="mx-auto h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </>
  );
}
