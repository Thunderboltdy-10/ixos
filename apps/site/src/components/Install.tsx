"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState, useSyncExternalStore } from "react";
import { RELEASES, type Installer, type System } from "@/lib/github";
import { Copy } from "./Copy";
import { EASE } from "./Stage";

const CLONE = ["git clone https://github.com/Thunderboltdy-10/ixos", "cd ixos"];
const BUILDS = "Needs Rust. Builds the ixos command and downloads its two small models from Hugging Face.";

const TABS = [
  { id: "windows", label: "Windows", lines: [...CLONE, "./scripts/install-cli.ps1"], note: BUILDS },
  { id: "unix", label: "macOS and Linux", lines: [...CLONE, "sh scripts/install-cli.sh"], note: BUILDS },
  {
    id: "agents",
    label: "AI agents",
    lines: ["claude mcp add --transport stdio ixos -- ixos mcp --dir /your/project --profile code"],
    note: "Install the command first. Codex and other MCP clients are in the docs.",
  },
];

const NAMES: Record<System, string> = { windows: "Windows", mac: "macOS", linux: "Linux" };

function detect(): System {
  const platform = navigator.userAgent;
  if (/Mac/i.test(platform)) return "mac";
  if (/Linux|X11/i.test(platform) && !/Android/i.test(platform)) return "linux";
  return "windows";
}

const noChange = () => () => {};

export function Install({ release }: { release: { version: string; files: Installer[] } | null }) {
  // The system is only known in the browser; the server renders the Windows tab.
  const system = useSyncExternalStore(noChange, detect, () => null);
  const [chosen, setTab] = useState<string | null>(null);
  const tab = chosen ?? (system === "mac" || system === "linux" ? "unix" : "windows");
  const current = TABS.find((entry) => entry.id === tab)!;
  const installer = system && release?.files.find((file) => file.system === system);

  return (
    <div className="install">
      <div className="install-box">
        <div className="install-tabs" role="tablist" aria-label="Install">
          {TABS.map((entry) => (
            <button key={entry.id} role="tab" aria-selected={entry.id === tab} onClick={() => setTab(entry.id)}>
              {entry.label}
              {entry.id === tab && <motion.span className="install-tab-line" layoutId="install-tab" transition={{ duration: 0.35, ease: EASE }} />}
            </button>
          ))}
        </div>
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
              {current.lines.map((line) => (
                <code key={line}>
                  <span aria-hidden>$ </span>
                  {line}
                </code>
              ))}
            </div>
            <Copy text={current.lines.join("\n")} label="Copy commands" />
          </motion.div>
        </AnimatePresence>
      </div>
      <p className="install-note">{current.note}</p>
      <div className="download">
        <a className="ix-button ix-button--primary ix-button--large" href={installer ? installer.url : RELEASES}>
          {system ? `Download the app for ${NAMES[system]}` : "Download the app"}
        </a>
        <a className="download-other" href={RELEASES}>
          {release ? `Version ${release.version}, other systems` : "All systems"}
        </a>
      </div>
    </div>
  );
}
