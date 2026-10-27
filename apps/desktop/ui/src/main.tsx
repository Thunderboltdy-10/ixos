import "@fontsource-variable/instrument-sans";
import "@fontsource-variable/jetbrains-mono";
import "@ixos/ui/theme.css";
import "./styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
