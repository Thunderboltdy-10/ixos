"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, Terminal, Copy, Check } from "lucide-react";
import { FadeInView } from "@/components/effects/FadeInView";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { Button } from "@/components/ui/Button";
import { getDownloadUrl } from "@/lib/downloads";
import { cn } from "@/lib/utils";

type OsKey = "windows-x64" | "macos-arm64" | "macos-x64" | "linux-x64";
export type InstallOs = "windows" | "macos" | "linux";

export const CLI_INSTALL_COMMANDS: Record<InstallOs, { label: string; shell: string; command: string }> = {
  windows: {
    label: "Windows",
    shell: "PowerShell",
    command: "irm https://ixos.dev/install.ps1 | iex",
  },
  macos: {
    label: "macOS",
    shell: "bash / zsh",
    command: "curl -fsSL https://ixos.dev/install.sh | sh",
  },
  linux: {
    label: "Linux",
    shell: "bash / zsh / fish",
    command: "curl -fsSL https://ixos.dev/install.sh | sh",
  },
};

function detectOS(): OsKey {
  if (typeof navigator === "undefined") return "windows-x64";

  const platform = (
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ||
    navigator.platform ||
    ""
  ).toLowerCase();
  const ua = navigator.userAgent.toLowerCase();

  if (platform.includes("mac") || ua.includes("mac os")) {
    return ua.includes("arm") || ua.includes("apple silicon") ? "macos-arm64" : "macos-x64";
  }
  if (platform.includes("linux") || ua.includes("linux")) return "linux-x64";
  return "windows-x64";
}

export function DownloadActions() {
  const [os, setOs] = useState<OsKey>("windows-x64");
  const [installOs, setInstallOs] = useState<InstallOs>("windows");
  const [copied, setCopied] = useState(false);
  const [copiedTest, setCopiedTest] = useState(false);
  const quickTestCommand = 'ixos search "release notes around auth" --dir .';

  useEffect(() => {
    const detected = detectOS();
    setOs(detected);
    setInstallOs(
      detected === "windows-x64"
        ? "windows"
        : detected === "linux-x64"
          ? "linux"
          : "macos"
    );
  }, []);

  const osLabel = useMemo(() => {
    if (os === "windows-x64") return "Windows x64";
    if (os === "macos-arm64") return "macOS (Apple Silicon)";
    if (os === "macos-x64") return "macOS (Intel)";
    return "Linux x64";
  }, [os]);

  const handleDesktopDownload = () => {
    const url = getDownloadUrl(os);
    window.location.href = url;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(CLI_INSTALL_COMMANDS[installOs].command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const handleCopyTest = async () => {
    try {
      await navigator.clipboard.writeText(quickTestCommand);
      setCopiedTest(true);
      window.setTimeout(() => setCopiedTest(false), 1600);
    } catch {
      setCopiedTest(false);
    }
  };

  return (
    <div className="relative" id="download-actions">
      <SectionDivider accent="teal" label="DOWNLOAD_ACTIONS" />

      <div className="container mx-auto px-6 py-24">
        <FadeInView direction="up">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-semibold md:text-4xl">
              Install Ixos Your Way
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-fg-muted/80">
              Desktop app for interactive workflows. CLI install for terminals, scripts, and
              reproducible environments.
            </p>
          </div>
        </FadeInView>

        <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-2">
          <FadeInView direction="up" delay={100}>
            <article className="h-full rounded-sm border border-accent-teal/25 bg-bg-graphite-1/70 p-8 hover-glow-subtle transition-all duration-300" style={{ "--accent-rgb": "20,184,166" } as any}>
              <p className="text-[10px] font-mono tracking-[0.2em] text-accent-teal/90">DESKTOP</p>
              <h3 className="mt-3 text-2xl font-semibold text-fg-porcelain">Download Desktop</h3>
              <p className="mt-3 text-sm leading-relaxed text-fg-muted/80">
                Recommended binary for {osLabel}. Includes the full UI, model manager, and guided
                local search experience.
              </p>
              <div className="mt-8">
                <Button onClick={handleDesktopDownload} className="h-12 px-8 bg-accent-teal hover:bg-accent-teal-glow text-bg-graphite-0 font-semibold shadow-glow-teal hover:scale-[1.02] transition-transform w-full md:w-auto">
                  <Download className="h-4 w-4 mr-2" />
                  Download for {osLabel}
                </Button>
              </div>
            </article>
          </FadeInView>

          <FadeInView direction="up" delay={200}>
            <article className="h-full rounded-sm border border-white/10 bg-bg-graphite-1/50 p-8 hover-glow-subtle transition-all duration-300" style={{ "--accent-rgb": "246,185,76" } as any}>
              <p className="text-[10px] font-mono tracking-[0.2em] text-accent-amber/90">CLI</p>
              <div className="flex items-center gap-3">
                <h3 className="mt-3 text-2xl font-semibold text-fg-porcelain">Install With One Command</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-fg-muted/80">
                Run this in your terminal. The script downloads the Ixos binary for your platform,
                adds it to your PATH, and verifies the install. No manual setup required.
              </p>
              <div className="mt-6 inline-flex rounded-md border border-white/10 bg-bg-graphite-0/40 p-1">
                {(Object.keys(CLI_INSTALL_COMMANDS) as InstallOs[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setInstallOs(key)}
                    className={cn(
                      "px-4 py-2 text-[10px] font-mono uppercase tracking-[0.12em] rounded-sm transition-all",
                      installOs === key
                        ? "bg-accent-amber/14 text-accent-amber border border-accent-amber/25 shadow-glow-amber/10"
                        : "text-fg-muted/65 hover:text-fg-secondary hover:bg-white/5"
                    )}
                  >
                    {CLI_INSTALL_COMMANDS[key].label}
                  </button>
                ))}
              </div>
              <div className="mt-6 rounded-lg border border-accent-amber/20 bg-bg-graphite-0/85 p-5 relative group/code">
                <div className="flex items-center gap-2 mb-3 text-[10px] font-mono text-fg-muted/40 uppercase tracking-wider">
                  <Terminal className="w-3 h-3" />
                  <span>{CLI_INSTALL_COMMANDS[installOs].shell}</span>
                </div>
                <code className="block overflow-x-auto text-sm text-accent-amber font-mono selection:bg-accent-amber/20">
                  {CLI_INSTALL_COMMANDS[installOs].command}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopy}
                  className="absolute top-2 right-2 h-8 w-8 p-0 hover:bg-white/10 text-fg-muted hover:text-fg-porcelain transition-colors"
                >
                  {copied ? <Check className="h-4 w-4 text-accent-amber" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button variant="outline" size="sm" onClick={handleCopyTest} className="border-white/10 hover:border-accent-amber/30 hover:bg-accent-amber/5 text-xs font-mono h-9">
                  {copiedTest ? <Check className="h-3.5 w-3.5 mr-2 text-accent-amber" /> : <Terminal className="h-3.5 w-3.5 mr-2" />}
                  {copiedTest ? "Test copied" : "Copy test query"}
                </Button>
                <Link href="/docs/cli-reference">
                  <Button variant="outline" size="sm" className="border-white/10 hover:border-accent-amber/30 hover:bg-accent-amber/5 text-xs font-mono h-9">
                    <Terminal className="h-3.5 w-3.5 mr-2" />
                    CLI reference
                  </Button>
                </Link>
              </div>
            </article>
          </FadeInView>
        </div>
      </div>
    </div>
  );
}
