"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { Monitor, Terminal, Download, CheckCircle, Copy } from "lucide-react";

const DESKTOP_PLATFORMS = [
    { os: "macOS", arch: "Universal Binary", color: "text-fg-porcelain", border: "border-accent-amber/30", badge: "Intel + Apple Silicon", ext: ".dmg" },
    { os: "Windows", arch: "x64 / ARM64", color: "text-[#A5D6FF]", border: "border-[#A5D6FF]/30", badge: "Windows 10+", ext: ".exe" },
    { os: "Linux", arch: ".deb / .rpm / AppImage", color: "text-accent-teal", border: "border-accent-teal/30", badge: "Ubuntu 20.04+", ext: ".AppImage" },
];

const CLI_COMMANDS = [
    { platform: "macOS (Homebrew)", cmd: "brew install --cask ixos", prompt: "$", badge: "Universal Binary", badgeColor: "text-[#27C93F]" },
    { platform: "Windows (PowerShell)", cmd: "irm https://ixos.app/install | iex", prompt: ">", badge: "x64 / ARM64", badgeColor: "text-[#A5D6FF]" },
    { platform: "Linux (Curl)", cmd: "curl -sS https://ixos.app/install.sh | sh", prompt: "$", badge: ".deb / .rpm / AppImage", badgeColor: "text-[#FF7B72]" },
];

function CopyCmd({ cmd, prompt }: { cmd: string; prompt: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <div onClick={() => { navigator.clipboard.writeText(cmd); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="bg-[#0D1117] border border-white/5 p-4 flex items-center gap-4 cursor-copy hover:bg-white/[0.02] hover:border-accent-amber/30 transition-all group">
            <span className="text-accent-amber font-mono shrink-0">{prompt}</span>
            <span className="text-fg-porcelain font-mono text-sm flex-1 group-hover:text-accent-amber transition-colors">{cmd}</span>
            {copied
                ? <span className="text-[#27C93F] font-mono text-[10px] uppercase tracking-widest flex items-center gap-1 shrink-0"><CheckCircle className="w-3 h-3" />Copied</span>
                : <Copy className="w-3 h-3 text-fg-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            }
        </div>
    );
}

export function DownloadV2() {
    return (
        <section className="relative py-32 bg-bg-graphite-0 border-b border-white/5">
            <SectionDivider accent="amber" label="DISTRIBUTION" />

            <div className="container mx-auto px-6 max-w-5xl">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-display font-medium text-fg-porcelain tracking-tight mb-4">
                        Install <span className="bg-gradient-to-r from-accent-amber to-accent-teal bg-clip-text text-transparent italic">anywhere.</span>
                    </h2>
                    <p className="font-mono text-fg-muted">Available across all major platforms and package managers. The same Rust binary. Everywhere.</p>
                </div>

                <div className="mb-12">
                    <div className="flex items-center gap-3 mb-4">
                        <Download className="w-4 h-4 text-accent-amber" />
                        <span className="font-mono text-xs text-fg-muted uppercase tracking-widest">Desktop Application</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {DESKTOP_PLATFORMS.map((p, i) => (
                            <motion.button
                                key={p.os}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className={`flex flex-col gap-3 p-6 bg-bg-graphite-1 border ${p.border} hover:bg-bg-graphite-2 transition-all text-left group`}
                            >
                                <div className="flex items-center justify-between">
                                    <Monitor className={`w-6 h-6 ${p.color}`} />
                                    <span className="font-mono text-[10px] text-fg-muted border border-white/10 px-2 py-0.5 uppercase tracking-widest">{p.badge}</span>
                                </div>
                                <div>
                                    <div className={`font-display font-semibold text-xl mb-1 ${p.color}`}>{p.os}</div>
                                    <div className="font-mono text-xs text-fg-muted">{p.arch}</div>
                                </div>
                                <div className={`font-mono text-xs uppercase tracking-widest ${p.color} flex items-center gap-2`}>
                                    <Download className="w-3 h-3" />Download {p.ext}
                                </div>
                            </motion.button>
                        ))}
                    </div>
                </div>

                <div className="bg-[#0A0D14] border border-white/10">
                    <div className="h-10 bg-[#161B22] border-b border-white/10 flex items-center px-4 gap-4">
                        <Terminal className="w-4 h-4 text-fg-muted" />
                        <span className="font-mono text-xs text-fg-muted">CLI — package manager install</span>
                        <span className="ml-auto font-mono text-[10px] text-accent-amber uppercase tracking-widest">Click to copy</span>
                    </div>
                    <div className="p-6 flex flex-col gap-6">
                        {CLI_COMMANDS.map((c) => (
                            <div key={c.platform}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-mono text-xs text-fg-muted uppercase tracking-widest">{c.platform}</span>
                                    <span className={`font-mono text-[10px] lowercase ${c.badgeColor}`}>{c.badge}</span>
                                </div>
                                <CopyCmd cmd={c.cmd} prompt={c.prompt} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
