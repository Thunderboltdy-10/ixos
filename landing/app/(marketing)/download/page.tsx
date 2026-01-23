"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, Check, Copy, ChevronDown, AlertCircle } from "lucide-react";
import { RELEASES, SITE_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { WaitlistForm } from "@/components/shared/waitlist-form";

type Platform = "windows" | "macos" | "linux";

function detectOS(): Platform {
    if (typeof window === "undefined") return "windows";
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("win")) return "windows";
    if (ua.includes("mac")) return "macos";
    if (ua.includes("linux")) return "linux";
    return "windows";
}

export default function DownloadPage() {
    const [detectedOS, setDetectedOS] = useState<Platform>("windows");
    const [selectedOS, setSelectedOS] = useState<Platform>("windows");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const os = detectOS();
        setDetectedOS(os);
        setSelectedOS(os);
    }, []);

    const currentPlatform = RELEASES.platforms[selectedOS];
    const downloadUrl = `${process.env.NEXT_PUBLIC_DOWNLOAD_BASE_URL || "https://github.com/ixos-protocol/ixos/releases/download"}/v${RELEASES.latest}/${currentPlatform.filename}`;

    const copyChecksum = () => {
        // In production, fetch actual checksums
        navigator.clipboard.writeText("sha256:abc123...");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-surface-0 pt-24 pb-16">
            {/* Background */}
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(13,148,136,0.1)_0%,rgba(10,10,15,0)_50%)] pointer-events-none" />

            <div className="container mx-auto px-4 relative z-10">
                {/* Header */}
                <div className="text-center mb-12">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-5xl font-display font-bold text-white mb-4"
                    >
                        Download Ixos
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-content-secondary text-lg"
                    >
                        Version {RELEASES.latest} • Released {RELEASES.date}
                    </motion.p>
                </div>

                {/* Main Download Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="max-w-2xl mx-auto mb-12"
                >
                    <div className="bg-surface-1 rounded-2xl border border-white/10 p-8">
                        {/* OS Selector */}
                        <div className="flex gap-2 mb-8 p-1 bg-surface-0 rounded-xl">
                            {(Object.keys(RELEASES.platforms) as Platform[]).map((os) => (
                                <button
                                    key={os}
                                    onClick={() => setSelectedOS(os)}
                                    className={cn(
                                        "flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all",
                                        selectedOS === os
                                            ? "bg-brand-teal text-white"
                                            : "text-content-muted hover:text-white"
                                    )}
                                >
                                    {os === "windows" && "🪟 Windows"}
                                    {os === "macos" && "🍎 macOS"}
                                    {os === "linux" && "🐧 Linux"}
                                    {detectedOS === os && (
                                        <span className="ml-2 text-xs opacity-70">(detected)</span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {currentPlatform.available ? (
                            <>
                                {/* Download Button */}
                                <a
                                    href={downloadUrl}
                                    className="flex items-center justify-center gap-3 w-full py-4 px-6 bg-brand-teal hover:bg-brand-teal/90 text-white rounded-xl font-semibold text-lg transition-colors mb-6"
                                >
                                    <Download className="w-6 h-6" />
                                    Download for {currentPlatform.name}
                                </a>

                                {/* File Info */}
                                <div className="flex items-center justify-between text-sm text-content-muted mb-6">
                                    <span>{currentPlatform.filename}</span>
                                    <span>{currentPlatform.size}</span>
                                </div>

                                {/* Requirements */}
                                <p className="text-sm text-content-secondary mb-6">
                                    <strong>Requirements:</strong> {currentPlatform.requirements}
                                </p>

                                {/* Checksum */}
                                <div className="bg-surface-0 rounded-lg p-4 border border-white/5">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs text-content-muted">SHA-256 Checksum</span>
                                        <button
                                            onClick={copyChecksum}
                                            className="flex items-center gap-1 text-xs text-brand-teal hover:text-brand-teal/80 transition-colors"
                                        >
                                            {copied ? (
                                                <>
                                                    <Check className="w-3 h-3" />
                                                    Copied
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="w-3 h-3" />
                                                    Copy
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <code className="text-xs text-content-secondary font-mono break-all">
                                        sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
                                    </code>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-8">
                                <AlertCircle className="w-12 h-12 text-content-muted mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-white mb-2">
                                    Coming Soon
                                </h3>
                                <p className="text-content-secondary mb-6">
                                    {currentPlatform.name} support is in development.
                                </p>
                                <WaitlistForm source="download" />
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Installation Instructions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="max-w-2xl mx-auto"
                >
                    <h2 className="text-xl font-semibold text-white mb-4">
                        Installation
                    </h2>
                    <div className="bg-surface-1 rounded-2xl border border-white/5 p-6">
                        {selectedOS === "windows" && (
                            <ol className="list-decimal list-inside space-y-3 text-content-secondary">
                                <li>Download the MSI installer above</li>
                                <li>Run the installer and follow the prompts</li>
                                <li>Launch Ixos from the Start menu or press <code className="bg-surface-0 px-2 py-0.5 rounded text-xs">Ctrl+Shift+Space</code> anywhere</li>
                            </ol>
                        )}
                        {selectedOS === "macos" && (
                            <ol className="list-decimal list-inside space-y-3 text-content-secondary">
                                <li>Download the DMG file above</li>
                                <li>Open the DMG and drag Ixos to Applications</li>
                                <li>Launch Ixos from Applications or press <code className="bg-surface-0 px-2 py-0.5 rounded text-xs">Cmd+Shift+Space</code> anywhere</li>
                                <li>If blocked, go to System Settings → Privacy & Security and click "Open Anyway"</li>
                            </ol>
                        )}
                        {selectedOS === "linux" && (
                            <div className="space-y-4">
                                <p className="text-content-secondary font-medium">AppImage (recommended):</p>
                                <ol className="list-decimal list-inside space-y-3 text-content-secondary">
                                    <li>Download the AppImage above</li>
                                    <li>Make it executable: <code className="bg-surface-0 px-2 py-0.5 rounded text-xs">chmod +x ixos-*.AppImage</code></li>
                                    <li>Run it: <code className="bg-surface-0 px-2 py-0.5 rounded text-xs">./ixos-*.AppImage</code></li>
                                </ol>
                                <p className="text-content-secondary font-medium mt-4">Or install via package manager:</p>
                                <div className="bg-surface-0 rounded-lg p-3 font-mono text-sm text-content-secondary">
                                    <p># Debian/Ubuntu</p>
                                    <p>sudo dpkg -i ixos-0.2.0-x64.deb</p>
                                    <p className="mt-2"># Fedora/RHEL</p>
                                    <p>sudo rpm -i ixos-0.2.0-x64.rpm</p>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Verify Download */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="max-w-2xl mx-auto mt-8"
                >
                    <h2 className="text-xl font-semibold text-white mb-4">
                        Verify Your Download
                    </h2>
                    <div className="bg-surface-1 rounded-2xl border border-white/5 p-6">
                        <p className="text-content-secondary mb-4">
                            Always verify your download matches our published checksums:
                        </p>
                        <div className="bg-surface-0 rounded-lg p-3 font-mono text-sm text-content-secondary">
                            {selectedOS === "windows" && (
                                <p>certutil -hashfile ixos-{RELEASES.latest}-x64.msi SHA256</p>
                            )}
                            {selectedOS === "macos" && (
                                <p>shasum -a 256 ixos-{RELEASES.latest}-universal.dmg</p>
                            )}
                            {selectedOS === "linux" && (
                                <p>sha256sum ixos-{RELEASES.latest}-x64.AppImage</p>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
