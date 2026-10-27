"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState, useSyncExternalStore } from "react";
import { RELEASES, type System } from "@/lib/github";
import { executableCommand, type Platform } from "@/lib/install";
import { Copy } from "./Copy";
import { EASE } from "./Stage";

const TABS = [
  { id: "windows", label: "Windows" },
  { id: "unix", label: "macOS and Linux" },
];

const NAMES: Record<System, string> = { windows: "Windows", mac: "macOS", linux: "Linux" };

export function detect(): System {
  const platform = navigator.userAgent;
  if (/Mac/i.test(platform)) return "mac";
  if (/Linux|X11/i.test(platform) && !/Android/i.test(platform)) return "linux";
  return "windows";
}

export const noChange = () => () => {};

export function DesktopOption({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="install-option">
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    Include desktop app <span>Recommended</span>
  </label>;
}

export function Install() {
  // The system is only known in the browser; the server renders the Windows tab.
  const system = useSyncExternalStore(noChange, detect, () => null);
  const [chosen, setTab] = useState<Platform | null>(null);
  const [desktop, setDesktop] = useState(true);
  const tab = chosen ?? (system === "mac" || system === "linux" ? "unix" : "windows");
  const command = executableCommand(tab, desktop);

  return (
    <div className="install">
      <div className="install-box">
        <div className="install-tabs" role="tablist" aria-label="Install">
          {TABS.map((entry) => (
            <button key={entry.id} role="tab" aria-selected={entry.id === tab} onClick={() => setTab(entry.id as Platform)}>
              {entry.label}
              {entry.id === tab && <motion.span className="install-tab-line" layoutId="install-tab" transition={{ duration: 0.35, ease: EASE }} />}
            </button>
          ))}
          <button role="tab" aria-selected={false} onClick={() => {
            const target = document.getElementById("agents");
            target?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
            target?.focus({ preventScroll: true });
          }}>AI agents <span aria-hidden>↓</span></button>
        </div>
        <DesktopOption checked={desktop} onChange={setDesktop} />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            className="install-body"
            role="tabpanel"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            <div className="install-lines">
                <code>
                  <span aria-hidden>$ </span>
                  {command}
                </code>
            </div>
            <Copy text={command} label="Copy commands" />
          </motion.div>
        </AnimatePresence>
      </div>
      <p className="install-note">Latest stable binaries. CLI, MCP and skill{desktop ? ", plus desktop" : ""}. No Rust needed.</p>
      <div className="download">
        <Copy text={command} label="Copy executable install command" className="ix-button ix-button--primary ix-button--large">
          Copy {tab === "windows" ? "Windows" : system && system !== "windows" ? NAMES[system] : "macOS / Linux"} install
        </Copy>
        <a className="download-other" href={RELEASES}>
          All systems
        </a>
      </div>
    </div>
  );
}
