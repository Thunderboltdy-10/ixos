"use client";

import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { Terminal, Monitor, Copy, Check, Download, Apple, Cpu } from "lucide-react";

type Platform = {
  id: string;
  name: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  icon: React.ComponentType<{ className?: string }>;
  url: string;
};

const DESKTOP_PLATFORMS: Platform[] = [
  {
    id: "mac",
    name: "macOS",
    subtitle: ".dmg Universal Binary",
    badge: "Apple Silicon + Intel",
    badgeColor: "text-[#A5D6FF]",
    icon: Apple,
    url: "#",
  },
  {
    id: "win",
    name: "Windows",
    subtitle: ".exe Installer",
    badge: "x64 / ARM64",
    badgeColor: "text-[#BD93F9]",
    icon: Monitor,
    url: "#",
  },
  {
    id: "linux",
    name: "Linux",
    subtitle: ".AppImage",
    badge: ".deb / .rpm also available",
    badgeColor: "text-[#27C93F]",
    icon: Cpu,
    url: "#",
  },
];

type CliInstall = {
  id: string;
  label: string;
  badge: string;
  badgeColor: string;
  prompt: string;
  command: string;
};

const CLI_INSTALLS: CliInstall[] = [
  {
    id: "mac",
    label: "macOS (Homebrew)",
    badge: "Universal Binary",
    badgeColor: "text-[#27C93F]",
    prompt: "$",
    command: "brew install --cask ixos",
  },
  {
    id: "win",
    label: "Windows (PowerShell)",
    badge: "x64 / ARM64",
    badgeColor: "text-[#A5D6FF]",
    prompt: ">",
    command: "irm https://ixos.app/install | iex",
  },
  {
    id: "linux",
    label: "Linux (Curl)",
    badge: ".deb / .rpm / AppImage",
    badgeColor: "text-[#FF7B72]",
    prompt: "$",
    command: "curl -sS https://ixos.app/install.sh | sh",
  },
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
      className="bg-[#0D1117] border border-white/5 p-4 flex items-center gap-4 cursor-copy hover:bg-white/[0.02] hover:border-accent-amber/30 transition-all group w-full text-left"
    >
      <span className="text-accent-amber font-mono">{prompt}</span>
      <span className="text-fg-porcelain font-mono group-hover:text-accent-amber transition-colors flex-1">
        {command}
      </span>
      <div className="shrink-0 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-fg-muted">
        {copied ? (
          <>
            <Check className="w-3 h-3 text-accent-amber" />
            <span className="text-accent-amber">Copied!</span>
          </>
        ) : (
          <>
            <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">
              Copy
            </span>
          </>
        )}
      </div>
    </button>
  );
}

export function DownloadV1() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      ref={sectionRef}
      className="py-32 bg-[#0A0D14] border-b border-white/5"
    >
      <SectionDivider accent="amber" label="DISTRIBUTION" />

      <div className="container mx-auto px-6 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-display font-bold text-fg-porcelain tracking-tight mb-4">
            Get started
            <br />
            <span className="text-accent-amber italic">now.</span>
          </h2>
          <p className="font-mono text-fg-muted">
            Available as a desktop app or CLI via all major package managers.
            No sudo required for the core CLI.
          </p>
        </motion.div>

        {/* Desktop App Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-6">
            <Monitor className="w-5 h-5 text-accent-amber" />
            <h3 className="font-mono text-sm text-fg-porcelain uppercase tracking-widest">
              Desktop Application
            </h3>
            <div className="flex-1 h-px bg-white/10" />
            <span className="font-mono text-[10px] text-fg-muted uppercase tracking-widest">
              v3.2.0
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {DESKTOP_PLATFORMS.map((platform, index) => {
              const Icon = platform.icon;
              return (
                <motion.a
                  key={platform.id}
                  href={platform.url}
                  initial={{ opacity: 0, y: 15 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                  className="bg-bg-graphite-1 border border-white/10 p-6 flex flex-col items-center text-center gap-4 hover:border-accent-amber/40 hover:bg-accent-amber/5 transition-all group cursor-pointer"
                  whileHover={{ y: -2 }}
                >
                  <div className="w-12 h-12 bg-bg-graphite-2 border border-white/10 flex items-center justify-center group-hover:border-accent-amber/30 group-hover:bg-accent-amber/10 transition-all">
                    <Icon className="w-6 h-6 text-fg-muted group-hover:text-accent-amber transition-colors" />
                  </div>
                  <div>
                    <div className="font-display font-medium text-fg-porcelain mb-1">
                      {platform.name}
                    </div>
                    <div className="font-mono text-xs text-fg-muted">
                      {platform.subtitle}
                    </div>
                  </div>
                  <div
                    className={`font-mono text-[10px] uppercase tracking-widest ${platform.badgeColor}`}
                  >
                    {platform.badge}
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-xs text-fg-muted group-hover:text-accent-amber transition-colors mt-auto">
                    <Download className="w-3 h-3" />
                    Download
                  </div>
                </motion.a>
              );
            })}
          </div>
        </motion.div>

        {/* CLI Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <Terminal className="w-5 h-5 text-accent-amber" />
            <h3 className="font-mono text-sm text-fg-porcelain uppercase tracking-widest">
              Command Line Interface
            </h3>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <div className="bg-[#0A0D14] border border-white/10 font-mono text-sm w-full overflow-hidden">
            {/* Terminal Header */}
            <div className="h-10 bg-[#161B22] border-b border-white/10 flex items-center px-4 gap-4">
              <Terminal className="w-4 h-4 text-fg-muted" />
              <span className="font-mono text-xs text-fg-muted">
                installation instructions
              </span>
              <div className="ml-auto flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#27C93F]/60" />
              </div>
            </div>

            {/* Content */}
            <div className="p-8 flex flex-col gap-8">
              {CLI_INSTALLS.map((install, index) => (
                <motion.div
                  key={install.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.45 + index * 0.1 }}
                >
                  <div className="text-xs text-fg-muted uppercase tracking-widest mb-3 flex justify-between items-center">
                    <span>{install.label}</span>
                    <span className={`lowercase ${install.badgeColor}`}>
                      {install.badge}
                    </span>
                  </div>
                  <CopyCommand
                    command={install.command}
                    prompt={install.prompt}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
