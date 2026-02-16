"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { Download, Terminal, Copy, Check } from "lucide-react";
import { FadeInView } from "@/components/effects/FadeInView";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { Button } from "@/components/ui/Button";
import {
  CLI_INSTALL_COMMANDS,
  CLI_INSTALL_LOCATIONS,
  detectDesktopPlatform,
  detectInstallOs,
  getDownloadUrl,
  type DownloadPlatform,
  type InstallOs,
} from "@/lib/downloads";
import { cn } from "@/lib/utils";

type DesktopPlatform = {
  id: DownloadPlatform;
  label: string;
  shortLabel: string;
};

export const DESKTOP_PLATFORMS: DesktopPlatform[] = [
  { id: "windows-x64", label: "Windows (x64)", shortLabel: "Windows" },
  { id: "macos-arm64", label: "macOS (Apple Silicon)", shortLabel: "macOS ARM" },
  { id: "macos-x64", label: "macOS (Intel)", shortLabel: "macOS Intel" },
  { id: "linux-x64", label: "Linux (AppImage)", shortLabel: "Linux" },
];

export function DownloadActions() {
  const [selectedPlatform, setSelectedPlatform] = useState<DownloadPlatform>(() => detectDesktopPlatform());
  const [installOs, setInstallOs] = useState<InstallOs>(() => detectInstallOs());
  const [copied, setCopied] = useState(false);
  const [copiedTest, setCopiedTest] = useState(false);
  const quickTestCommand = 'ixos search "release notes around auth" --dir .';

  const handleDesktopDownload = () => {
    window.location.assign(getDownloadUrl(selectedPlatform));
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

  // CLI: show Windows vs macOS/Linux toggle (macOS and Linux share the same command)
  const cliTabs: { key: InstallOs; label: string }[] = [
    { key: "windows", label: "Windows" },
    { key: "macos", label: "macOS / Linux" },
  ];

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
          {/* Desktop Downloads */}
          <FadeInView direction="up" delay={100}>
            <article className="h-full rounded-sm border border-accent-teal/25 bg-bg-graphite-1/70 p-8 hover-glow-subtle transition-all duration-300" style={{ "--accent-rgb": "20,184,166" } as CSSProperties}>
              <p className="text-[10px] font-mono tracking-[0.2em] text-accent-teal/90">DESKTOP</p>
              <h3 className="mt-3 text-2xl font-semibold text-fg-porcelain">Download Desktop</h3>
              <p className="mt-3 text-sm leading-relaxed text-fg-muted/80">
                Full UI with model manager, guided search, and local-first privacy.
              </p>

              {/* Platform selector */}
              <div className="mt-6 grid grid-cols-2 gap-2">
                {DESKTOP_PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPlatform(p.id)}
                    className={cn(
                      "px-3 py-2.5 rounded-md text-[11px] font-mono tracking-wide transition-all border",
                      selectedPlatform === p.id
                        ? "bg-accent-teal/12 text-accent-teal border-accent-teal/30 shadow-[0_0_12px_rgba(20,184,166,0.1)]"
                        : "text-fg-muted/60 border-white/8 hover:border-white/15 hover:bg-white/5"
                    )}
                  >
                    {p.shortLabel}
                  </button>
                ))}
              </div>

              <div className="mt-6">
                <Button onClick={handleDesktopDownload} className="h-12 px-8 bg-accent-teal hover:bg-accent-teal-glow text-bg-graphite-0 font-semibold shadow-glow-teal hover:scale-[1.02] transition-transform w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download for {DESKTOP_PLATFORMS.find((p) => p.id === selectedPlatform)?.label}
                </Button>
              </div>
              <p className="mt-3 text-[10px] font-mono text-fg-muted/40 text-center">
                Auto-detected your platform &middot; <Link href="/download" className="text-accent-teal/60 hover:text-accent-teal transition-colors">All downloads</Link>
              </p>
            </article>
          </FadeInView>

          {/* CLI */}
          <FadeInView direction="up" delay={200}>
            <article className="h-full rounded-sm border border-white/10 bg-bg-graphite-1/50 p-8 hover-glow-subtle transition-all duration-300" style={{ "--accent-rgb": "246,185,76" } as CSSProperties}>
              <p className="text-[10px] font-mono tracking-[0.2em] text-accent-amber/90">CLI</p>
              <h3 className="mt-3 text-2xl font-semibold text-fg-porcelain">Install With One Command</h3>
              <p className="mt-3 text-sm leading-relaxed text-fg-muted/80">
                The script downloads the Ixos binary for your platform,
                adds it to your PATH, verifies checksum when available, and installs into an
                isolated CLI path so it does not conflict with the desktop app.
              </p>

              <div className="mt-6 inline-flex rounded-md border border-white/10 bg-bg-graphite-0/40 p-1">
                {cliTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setInstallOs(tab.key)}
                    className={cn(
                      "px-4 py-2 text-[10px] font-mono uppercase tracking-[0.12em] rounded-sm transition-all",
                      (installOs === tab.key || (installOs === "linux" && tab.key === "macos"))
                        ? "bg-accent-amber/14 text-accent-amber border border-accent-amber/25 shadow-glow-amber/10"
                        : "text-fg-muted/65 hover:text-fg-secondary hover:bg-white/5"
                    )}
                  >
                    {tab.label}
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

              <p className="mt-3 text-[10px] font-mono text-fg-muted/45">
                Installs to {CLI_INSTALL_LOCATIONS[installOs]}
              </p>

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

              <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] font-mono text-fg-muted/35">
                <span>Desktop assets:</span>
                <Link
                  href="https://github.com/IxosProtocol/ixos-releases/releases"
                  className="text-accent-teal/75 hover:text-accent-teal transition-colors"
                >
                  ixos-releases
                </Link>
                <span>&middot;</span>
                <span>CLI source:</span>
                <Link
                  href="https://github.com/IxosProtocol/ixos-cli"
                  className="text-accent-amber/80 hover:text-accent-amber transition-colors"
                >
                  ixos-cli
                </Link>
              </div>
            </article>
          </FadeInView>
        </div>
      </div>
    </div>
  );
}
