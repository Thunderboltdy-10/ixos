"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Terminal, Copy, Check } from "lucide-react";
import { FadeInView } from "@/components/effects/FadeInView";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { Button } from "@/components/ui/Button";
import { getDownloadUrl } from "@/lib/downloads";
import { cn } from "@/lib/utils";

type OsKey = "windows-x64" | "macos-arm64" | "macos-x64" | "linux-x64";
type InstallOs = "windows" | "macos" | "linux";

const CLI_INSTALL_COMMANDS: Record<InstallOs, { label: string; shell: string; command: string }> = {
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
            <article className="h-full rounded-xl border border-accent-teal/25 bg-bg-graphite-1/70 p-7">
              <p className="text-[10px] font-mono tracking-[0.2em] text-accent-teal/90">DESKTOP</p>
              <h3 className="mt-3 text-2xl font-semibold text-fg-porcelain">Download Desktop</h3>
              <p className="mt-3 text-sm leading-relaxed text-fg-muted/80">
                Recommended binary for {osLabel}. Includes the full UI, model manager, and guided
                local search experience.
              </p>
              <div className="mt-6">
                <Button onClick={handleDesktopDownload} className="h-11 px-6">
                  <Download className="h-4 w-4" />
                  Download for {osLabel}
                </Button>
              </div>
            </article>
          </FadeInView>

          <FadeInView direction="up" delay={200}>
            <article className="h-full rounded-xl border border-white/10 bg-bg-graphite-1/50 p-7">
              <p className="text-[10px] font-mono tracking-[0.2em] text-accent-amber/90">CLI</p>
              <h3 className="mt-3 text-2xl font-semibold text-fg-porcelain">Install With One Command</h3>
              <p className="mt-3 text-sm leading-relaxed text-fg-muted/80">
                Run this in your terminal. The script downloads the Ixos binary for your platform,
                adds it to your PATH, and verifies the install. No manual setup required.
              </p>
              <div className="mt-5 inline-flex rounded-md border border-white/10 bg-bg-graphite-0/40 p-1">
                {(Object.keys(CLI_INSTALL_COMMANDS) as InstallOs[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setInstallOs(key)}
                    className={cn(
                      "px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.12em] rounded-sm transition-colors",
                      installOs === key
                        ? "bg-accent-teal/14 text-accent-teal border border-accent-teal/25"
                        : "text-fg-muted/65 hover:text-fg-secondary"
                    )}
                  >
                    {CLI_INSTALL_COMMANDS[key].label}
                  </button>
                ))}
              </div>
              <div className="mt-5 rounded-lg border border-white/10 bg-bg-graphite-0/85 p-4">
                <div className="flex items-center gap-2 mb-2 text-[10px] font-mono text-fg-muted/40">
                  <Terminal className="w-3 h-3" />
                  <span>{CLI_INSTALL_COMMANDS[installOs].shell}</span>
                </div>
                <code className="mt-1 block overflow-x-auto text-sm text-fg-porcelain">
                  {CLI_INSTALL_COMMANDS[installOs].command}
                </code>
              </div>
              <div className="mt-3 rounded-lg border border-white/6 bg-bg-graphite-0/40 px-4 py-3">
                <p className="text-[11px] text-fg-muted/50 leading-relaxed font-mono">
                  <span className="text-accent-teal/70">What it does:</span>{" "}
                  Downloads the latest CLI release &rarr; installs to <code className="text-fg-muted/65">~/.ixos/bin/ixos</code> (Unix) or <code className="text-fg-muted/65">%LOCALAPPDATA%\\Ixos\\bin\\ixos.exe</code> (Windows) &rarr;
                  adds to PATH &rarr; runs <code className="text-fg-muted/65">ixos --version</code> to verify.
                  This command installs the CLI only. Desktop installers are in the left card.
                </p>
              </div>
              <p className="mt-3 text-[11px] text-fg-muted/45 font-mono">
                Releases are automated by GitHub Actions (`release.yml` for desktop, `cli-release.yml` for CLI).
              </p>
              <div className="mt-4 rounded-lg border border-white/10 bg-bg-graphite-0/65 p-4">
                <div className="flex items-center gap-2 mb-2 text-[10px] font-mono text-fg-muted/45">
                  <Terminal className="w-3 h-3" />
                  <span>Quick test after install</span>
                </div>
                <code className="block overflow-x-auto text-sm text-fg-porcelain">
                  {quickTestCommand}
                </code>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button variant="secondary" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy command"}
                </Button>
                <Button variant="secondary" onClick={handleCopyTest}>
                  {copiedTest ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedTest ? "Test copied" : "Copy test query"}
                </Button>
                <Button variant="secondary" onClick={() => (window.location.href = "/docs/cli-reference")}>
                  <Terminal className="h-4 w-4" />
                  CLI reference
                </Button>
              </div>
            </article>
          </FadeInView>
        </div>
      </div>
    </div>
  );
}
