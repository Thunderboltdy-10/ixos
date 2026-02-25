"use client";

import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { Terminal, Monitor, Copy, Check, Download, Apple, Cpu } from "lucide-react";

type Platform = {
  id: string;
  name: string;
  arch: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  url: string;
};

const DESKTOP_PLATFORMS: Platform[] = [
  { id: "mac", name: "macOS", arch: "Universal Binary", label: ".dmg", icon: Apple, url: "#" },
  { id: "win", name: "Windows", arch: "x64 / ARM64", label: ".exe Installer", icon: Monitor, url: "#" },
  { id: "linux", name: "Linux", arch: ".deb / .rpm", label: ".AppImage", icon: Cpu, url: "#" },
];

type CliInstall = {
  id: string;
  label: string;
  prompt: string;
  command: string;
};

const CLI_INSTALLS: CliInstall[] = [
  { id: "mac", label: "macOS (Homebrew)", prompt: "$", command: "brew install --cask ixos" },
  { id: "win", label: "Windows (PowerShell)", prompt: ">", command: "irm https://ixos.app/install | iex" },
  { id: "linux", label: "Linux (Curl)", prompt: "$", command: "curl -sS https://ixos.app/install.sh | sh" },
];

function CopyCommand({ command, prompt }: { command: string; prompt: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(command).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      onClick={handleCopy}
      className="bg-[#0D1117] border border-white/5 p-4 flex items-center gap-4 cursor-copy hover:bg-white/[0.02] hover:border-white/15 transition-all group w-full text-left"
    >
      <span className="text-accent-amber font-mono">{prompt}</span>
      <span className="text-fg-porcelain font-mono flex-1">{command}</span>
      <div className="shrink-0 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-fg-muted">
        {copied ? (
          <><Check className="w-3 h-3 text-accent-amber" /><span className="text-accent-amber">Copied!</span></>
        ) : (
          <><Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /><span className="opacity-0 group-hover:opacity-100 transition-opacity">Copy</span></>
        )}
      </div>
    </button>
  );
}

export function DownloadV3() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-80px" });

  return (
    <section
      ref={sectionRef}
      className="py-32 bg-[#0A0D14] border-b border-white/5"
    >
      <SectionDivider accent="amber" label="DISTRIBUTION" />

      <div className="container mx-auto px-6 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-display font-bold text-fg-porcelain leading-[1.05] mb-4">
            Install{" "}
            <span className="text-accent-amber italic">globally.</span>
          </h2>
          <p className="font-mono text-fg-muted">
            One binary. Three platforms. Zero configuration.
          </p>
        </motion.div>

        {/* Desktop App */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.07 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-6">
            <Monitor className="w-4 h-4 text-fg-muted" />
            <h3 className="font-mono text-sm text-fg-porcelain uppercase tracking-widest">Desktop Application</h3>
            <div className="flex-1 h-px bg-white/10" />
            <span className="font-mono text-[10px] text-fg-muted uppercase tracking-widest">v3.2.0</span>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {DESKTOP_PLATFORMS.map((platform, index) => {
              const Icon = platform.icon;
              return (
                <motion.a
                  key={platform.id}
                  href={platform.url}
                  initial={{ opacity: 0, y: 16 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.14 + index * 0.07 }}
                  className="p-6 bg-bg-graphite-1 border border-white/10 hover:border-white/20 transition-colors group flex flex-col items-center text-center gap-3 cursor-pointer"
                >
                  <Icon className="w-8 h-8 text-fg-muted" />
                  <div>
                    <div className="font-display text-lg text-fg-porcelain font-medium">{platform.name}</div>
                    <div className="font-mono text-xs text-fg-muted mt-0.5">{platform.arch}</div>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-xs text-fg-muted group-hover:text-fg-porcelain transition-colors mt-auto">
                    <Download className="w-3 h-3" />
                    {platform.label}
                  </div>
                </motion.a>
              );
            })}
          </div>
        </motion.div>

        {/* CLI */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.28 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <Terminal className="w-4 h-4 text-fg-muted" />
            <h3 className="font-mono text-sm text-fg-porcelain uppercase tracking-widest">Command Line Interface</h3>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <div className="bg-[#0A0D14] border border-white/10">
            {/* Terminal Header */}
            <div className="h-10 bg-[#161B22] border-b border-white/10 flex items-center px-4 gap-3">
              <Terminal className="w-4 h-4 text-fg-muted" />
              <span className="font-mono text-xs text-fg-muted">installation</span>
            </div>

            {/* Commands */}
            <div className="p-8 flex flex-col gap-8">
              {CLI_INSTALLS.map((install, index) => (
                <motion.div
                  key={install.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.35 + index * 0.07 }}
                >
                  <div className="font-mono text-[10px] text-fg-muted uppercase tracking-widest mb-3">
                    {install.label}
                  </div>
                  <CopyCommand command={install.command} prompt={install.prompt} />
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
