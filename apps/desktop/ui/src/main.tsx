import { useEffect } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";

function Root() {
  useEffect(() => {
    if (typeof window === "undefined" || !("__TAURI__" in window)) return;

    const onContextMenu = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      if (
        target.closest(
          'input, textarea, [contenteditable="true"], [data-selectable="true"], [data-allow-context-menu="true"], .context-snippet',
        )
      ) {
        return;
      }

      event.preventDefault();
    };

    document.addEventListener("contextmenu", onContextMenu);
    return () => document.removeEventListener("contextmenu", onContextMenu);
  }, []);

  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(<Root />);
