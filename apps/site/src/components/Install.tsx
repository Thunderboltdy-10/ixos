"use client";

import { useState, useSyncExternalStore } from "react";
import type { System } from "@/lib/github";
import { downloadUrl, LINUX_APPIMAGE, type DesktopTarget } from "@/lib/downloads";

const TABS = [
  { id: "windows", label: "Windows" },
  { id: "mac", label: "macOS" },
  { id: "linux", label: "Linux" },
];

const NAMES: Record<System, string> = { windows: "Windows", mac: "macOS", linux: "Linux" };

export function detect(): System {
  const platform = navigator.userAgent;
  if (/Mac/i.test(platform)) return "mac";
  if (/Linux|X11/i.test(platform) && !/Android/i.test(platform)) return "linux";
  return "windows";
}

export const noChange = () => () => {};

export function Install() {
  // The system is only known in the browser; the server renders the Windows tab.
  const system = useSyncExternalStore(noChange, detect, () => null);
  const [chosen, setTab] = useState<System | null>(null);
  const tab = chosen ?? system ?? "windows";
  const targets: Record<System, DesktopTarget> = { windows: "Windows-X64", mac: "macOS-ARM64", linux: "Linux-X64" };
  const instructions: Record<System, string> = {
    windows: "Windows x64. Open the installer, then find Ixos on your desktop or in Start.",
    mac: "Apple silicon. Open the disk image and drag Ixos to Applications.",
    linux: "Linux x64. Open the Debian package, then find Ixos in Applications.",
  };

  return (
    <div className="install">
      <div className="install-tabs" role="group" aria-label="Your operating system">
        {TABS.map((entry) => (
          <button key={entry.id} aria-pressed={entry.id === tab} onClick={() => setTab(entry.id as System)}>
            {entry.label}
          </button>
        ))}
      </div>
      <div className="download">
        <a href={downloadUrl(targets[tab])} download className="ix-button ix-button--primary ix-button--large">
          Install for {NAMES[tab]}
        </a>
        {tab === "mac" && <a className="download-other" href={downloadUrl("macOS-X64")} download>Intel Mac</a>}
        {tab === "linux" && <a className="download-other" href={LINUX_APPIMAGE} download>AppImage</a>}
        <a className="download-other" href="#agents">Claude Code and Codex</a>
      </div>
      <p className="install-note">{instructions[tab]}</p>
    </div>
  );
}
