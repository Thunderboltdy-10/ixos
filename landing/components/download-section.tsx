"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, Copy, Check, ExternalLink } from "lucide-react";
import { RELEASES, SITE_CONFIG } from "@/lib/constants";
import { TerminalWindow } from "@/components/electric-glass/TerminalWindow";
import { cn } from "@/lib/utils";

/**
 * DownloadSection - Primary conversion point
 *
 * Components:
 * - OS Tabs (auto-detect)
 * - Download button with filename + size
 * - File info (version, checksum)
 * - Release notes
 * - Post-install guarantees
 */

type Platform = "windows" | "macos" | "linux";

const OS_LABELS: Record<Platform, string> = {
    windows: "Windows",
    macos: "macOS",
    linux: "Linux",
};

// Simulated checksums (would be real in production)
const CHECKSUMS: Record<Platform, string> = {
    windows: "sha256:8f4e3b2c1d0a...7890abcdef12",
    macos: "sha256:2a1b3c4d5e6f...fedcba987654",
    linux: "sha256:9e8d7c6b5a4f...123456789abc",
};

const RELEASE_NOTES = [
    "Added PDF text extraction (Pro)",
    "Fixed Windows ADS cache validation",
    "Improved lexical scoring accuracy",
];

export function DownloadSection() {
    const [platform, setPlatform] = useState<Platform>("windows");
    const [copied, setCopied] = useState(false);

    // Auto-detect OS on mount
    useEffect(() => {
        if (typeof navigator !== "undefined") {
            const ua = navigator.userAgent.toLowerCase();
            if (ua.includes("mac")) {
                setPlatform("macos");
            } else if (ua.includes("linux")) {
                setPlatform("linux");
            } else {
                setPlatform("windows");
            }
        }
    }, []);

    const currentRelease = RELEASES.platforms[platform];
    const checksum = CHECKSUMS[platform];

    const copyChecksum = () => {
        navigator.clipboard.writeText(checksum);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <section className="py-24 relative" id="download">
            {/* Subtle gradient background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(20,184,166,0.06)_0%,transparent_60%)] pointer-events-none" />

            <div className="container mx-auto px-4 relative z-10">
                {/* Header */}
                <div className="text-center mb-12">
                    <h2 className="text-2xl md:text-4xl font-bold mb-4">
                        Download Ixos
                    </h2>
                    <p className="text-content-secondary max-w-lg mx-auto">
                        Free to use. No account required. No telemetry.
                    </p>
                </div>

                <div className="max-w-xl mx-auto">
                    {/* OS Tabs */}
                    <div className="flex justify-center gap-2 mb-8">
                        {(Object.keys(OS_LABELS) as Platform[]).map((os) => (
                            <button
                                key={os}
                                onClick={() => setPlatform(os)}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                    platform === os
                                        ? "bg-brand-teal/10 text-brand-teal border border-brand-teal/30"
                                        : "text-content-muted hover:text-content-secondary border border-transparent"
                                )}
                            >
                                {OS_LABELS[os]}
                            </button>
                        ))}
                    </div>

                    {/* Download Terminal */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <TerminalWindow title={`download — ${OS_LABELS[platform]}`}>
                            <div className="space-y-4">
                                {/* File Info */}
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-content-muted">
                                        {currentRelease.filename}
                                    </span>
                                    <span className="text-content-secondary">
                                        {currentRelease.size}
                                    </span>
                                </div>

                                {/* Download Button */}
                                <a
                                    href={`/releases/${RELEASES.latest}/${currentRelease.filename}`}
                                    className="flex items-center justify-center gap-2 w-full h-12 bg-brand-teal hover:bg-brand-teal/90 text-surface-0 rounded-lg font-medium transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                    Download v{RELEASES.latest}
                                </a>

                                {/* Requirements */}
                                <p className="text-xs text-content-muted text-center">
                                    Requires {currentRelease.requirements}
                                </p>

                                {/* Checksum */}
                                <div className="flex items-center justify-between pt-4 border-t border-white/[0.04]">
                                    <span className="font-mono text-[10px] text-content-muted truncate flex-1">
                                        {checksum}
                                    </span>
                                    <button
                                        onClick={copyChecksum}
                                        className="ml-2 p-1.5 hover:bg-surface-2 rounded transition-colors"
                                        title="Copy checksum"
                                    >
                                        {copied ? (
                                            <Check className="w-3 h-3 text-brand-teal" />
                                        ) : (
                                            <Copy className="w-3 h-3 text-content-muted" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </TerminalWindow>
                    </motion.div>

                    {/* Release Notes */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="mt-8 card-technical p-4"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="mono-caps text-[10px]">What's new in v{RELEASES.latest}</span>
                            <a
                                href="/changelog"
                                className="text-xs text-content-muted hover:text-brand-teal transition-colors flex items-center gap-1"
                            >
                                Full changelog
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                        <ul className="space-y-1">
                            {RELEASE_NOTES.map((note, index) => (
                                <li key={index} className="flex items-start gap-2 text-xs text-content-secondary">
                                    <span className="text-brand-teal mt-0.5">+</span>
                                    {note}
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                    {/* Post-Install Info */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="mt-8 text-center space-y-2"
                    >
                        <p className="text-xs text-content-muted">
                            No telemetry • No account required • Uninstall leaves nothing behind
                        </p>
                        <div className="flex justify-center gap-4 text-xs">
                            <a
                                href={SITE_CONFIG.links.github}
                                className="text-content-muted hover:text-brand-teal transition-colors"
                            >
                                View source
                            </a>
                            <span className="text-content-muted">•</span>
                            <a
                                href="/security"
                                className="text-content-muted hover:text-brand-teal transition-colors"
                            >
                                Security
                            </a>
                            <span className="text-content-muted">•</span>
                            <a
                                href="/docs"
                                className="text-content-muted hover:text-brand-teal transition-colors"
                            >
                                Documentation
                            </a>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}

export default DownloadSection;
