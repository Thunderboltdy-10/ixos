"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { downloadUrl, type DesktopTarget } from "@/lib/downloads";
import { RELEASES } from "@/lib/github";

function detect(): DesktopTarget {
  const agent = navigator.userAgent;
  if (/Mac/i.test(agent)) return "macOS-ARM64";
  if (/Linux|X11/i.test(agent) && !/Android/i.test(agent)) return "Linux-X64";
  return "Windows-X64";
}

/** Mac browsers all claim "Intel Mac OS X", so ask for the real architecture. */
async function isIntelMac() {
  const { userAgentData } = navigator as Navigator & {
    userAgentData?: { getHighEntropyValues(hints: string[]): Promise<{ architecture?: string }> };
  };
  const architecture = await userAgentData?.getHighEntropyValues(["architecture"]).then((values) => values.architecture, () => undefined);
  if (architecture) return architecture === "x86";
  // Safari and Firefox: Apple GPUs lack this texture format.
  const gl = document.createElement("canvas").getContext("webgl");
  return !!gl?.getSupportedExtensions()?.includes("WEBGL_compressed_texture_s3tc_srgb");
}

const noChange = () => () => {};

const NOTES: Record<DesktopTarget, string> = {
  "Windows-X64": "Open the installer, then find Ixos in Start.",
  "macOS-ARM64": "Open the disk image and drag Ixos to Applications.",
  "macOS-X64": "Open the disk image and drag Ixos to Applications.",
  "Linux-X64": "Open the package in your software installer. For Debian and Ubuntu.",
};

export function Install() {
  // The system is only known in the browser.
  const system = useSyncExternalStore(noChange, detect, () => null);
  const [intelMac, setIntelMac] = useState(false);
  useEffect(() => {
    if (system === "macOS-ARM64") void isIntelMac().then(setIntelMac);
  }, [system]);
  const target = system === "macOS-ARM64" && intelMac ? "macOS-X64" : system;
  return (
    <div className="install">
      <div className="download">
        <a href={target ? downloadUrl(target) : `${RELEASES}/latest`} className="ix-button ix-button--primary ix-button--large">
          Install Ixos
        </a>
        {target === "macOS-ARM64" && <a className="download-other" href={downloadUrl("macOS-X64")}>Intel Mac</a>}
        {target === "macOS-X64" && <a className="download-other" href={downloadUrl("macOS-ARM64")}>Apple silicon Mac</a>}
      </div>
      {target && <p className="install-note">{NOTES[target]}</p>}
    </div>
  );
}
