import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Changelog | Ixos",
    description: "See what's new in Ixos. Release notes and version history.",
};

const RELEASES = [
    {
        version: "0.2.0",
        date: "January 15, 2026",
        highlights: [
            "Ixos-Flash-v2 model (0.766 MRR@10, 181ms P50)",
            "Auto mode with learned fusion weights",
            "Evidence rendering with score explanations",
            "Cross-platform desktop UI (Tauri + React)",
        ],
        changes: [
            { type: "added", text: "New Flash mode with Ixos-Flash-v2 model" },
            { type: "added", text: "Auto mode for intelligent query refinement" },
            { type: "added", text: "Evidence panel showing matched passages" },
            { type: "added", text: "Score breakdown display" },
            { type: "improved", text: "TTFR reduced to 181ms P50" },
            { type: "improved", text: "Cache hit rate increased to 80%" },
            { type: "fixed", text: "Memory leak in long-running sessions" },
        ],
    },
    {
        version: "0.1.9",
        date: "December 20, 2025",
        highlights: [
            "Journalist mode for maximum privacy",
            "Cryptographic attestation (Ed25519)",
            "EU AI Act compliance reports",
        ],
        changes: [
            { type: "added", text: "Journalist mode with auto-clear on exit" },
            { type: "added", text: "Cryptographic attestation for search results" },
            { type: "added", text: "GDPR Article 15/17/20 compliance" },
            { type: "added", text: "EU AI Act documentation generation" },
            { type: "improved", text: "Secure timing mode (100ms floor)" },
            { type: "fixed", text: "xattr permissions on macOS Sonoma" },
        ],
    },
    {
        version: "0.1.8",
        date: "November 30, 2025",
        highlights: [
            "File watcher with DoS resilience",
            "Progressive search results",
            "CLI improvements",
        ],
        changes: [
            { type: "added", text: "Real-time file watching with rate limiting" },
            { type: "added", text: "Progressive result streaming" },
            { type: "added", text: "JSON, CSV, and ripgrep output formats" },
            { type: "improved", text: "CLI UX with colored output" },
            { type: "fixed", text: "ADS handling on ReFS volumes" },
        ],
    },
];

export default function ChangelogPage() {
    return (
        <div className="min-h-screen bg-surface-0 pt-24 pb-16">
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(13,148,136,0.1)_0%,rgba(10,10,15,0)_50%)] pointer-events-none" />

            <div className="container mx-auto px-4 relative z-10 max-w-3xl">
                <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
                    Changelog
                </h1>
                <p className="text-content-secondary text-lg mb-12">
                    See what's new in each release of Ixos.
                </p>

                <div className="space-y-16">
                    {RELEASES.map((release) => (
                        <div key={release.version} className="relative">
                            {/* Version Header */}
                            <div className="flex items-baseline gap-4 mb-6">
                                <h2 className="text-2xl font-bold text-white">
                                    v{release.version}
                                </h2>
                                <span className="text-content-muted text-sm">
                                    {release.date}
                                </span>
                            </div>

                            {/* Highlights */}
                            <div className="bg-surface-1 rounded-2xl border border-white/5 p-6 mb-6">
                                <h3 className="text-sm font-semibold text-brand-teal uppercase tracking-wide mb-4">
                                    Highlights
                                </h3>
                                <ul className="space-y-2">
                                    {release.highlights.map((highlight, i) => (
                                        <li key={i} className="flex items-start gap-3 text-content-secondary">
                                            <span className="text-brand-teal">✦</span>
                                            {highlight}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* All Changes */}
                            <div className="space-y-3">
                                {release.changes.map((change, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                            change.type === "added"
                                                ? "bg-green-500/10 text-green-400"
                                                : change.type === "improved"
                                                ? "bg-blue-500/10 text-blue-400"
                                                : "bg-yellow-500/10 text-yellow-400"
                                        }`}>
                                            {change.type}
                                        </span>
                                        <span className="text-content-secondary text-sm">
                                            {change.text}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
