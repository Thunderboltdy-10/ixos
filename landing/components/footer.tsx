"use client";

import Link from "next/link";
import { SITE_CONFIG } from "@/lib/constants";
import { Github, Twitter } from "lucide-react";
import { WaitlistForm } from "@/components/shared/waitlist-form";

export function Footer() {
    return (
        <footer className="border-t border-white/5 bg-surface-0 pt-16 pb-8">
            <div className="container mx-auto px-4">
                <div className="grid md:grid-cols-4 gap-12 mb-16">
                    {/* Brand + Waitlist */}
                    <div className="col-span-2">
                        <h2 className="text-2xl font-bold text-white mb-4">Ixos</h2>
                        <p className="text-content-secondary max-w-sm mb-6">
                            Search by meaning, not just filenames. Local-first semantic file search that runs 100% offline.
                        </p>
                        <div className="mb-6">
                            <p className="text-sm text-content-muted mb-3">Get notified about updates:</p>
                            <WaitlistForm source="footer" />
                        </div>
                        <div className="flex gap-4">
                            <a
                                href={SITE_CONFIG.links.github}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-content-muted hover:text-white transition-colors"
                            >
                                <Github className="w-5 h-5" />
                            </a>
                            <a
                                href={SITE_CONFIG.links.twitter}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-content-muted hover:text-white transition-colors"
                            >
                                <Twitter className="w-5 h-5" />
                            </a>
                        </div>
                    </div>

                    {/* Product */}
                    <div>
                        <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Product</h3>
                        <ul className="space-y-3 text-sm text-content-muted">
                            <li><Link href="/download" className="hover:text-brand-teal transition-colors">Download</Link></li>
                            <li><Link href="/pricing" className="hover:text-brand-teal transition-colors">Pricing</Link></li>
                            <li><Link href="/changelog" className="hover:text-brand-teal transition-colors">Changelog</Link></li>
                            <li><Link href="/docs" className="hover:text-brand-teal transition-colors">Documentation</Link></li>
                        </ul>
                    </div>

                    {/* Company */}
                    <div>
                        <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Company</h3>
                        <ul className="space-y-3 text-sm text-content-muted">
                            <li><Link href="/about" className="hover:text-brand-teal transition-colors">About</Link></li>
                            <li><Link href="/security" className="hover:text-brand-teal transition-colors">Security</Link></li>
                            <li><Link href="/privacy" className="hover:text-brand-teal transition-colors">Privacy Policy</Link></li>
                            <li><Link href="/terms" className="hover:text-brand-teal transition-colors">Terms of Service</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-content-muted">
                    <p>© 2026 Ixos. MIT License for core, proprietary for Pro features.</p>
                    <p>Your files stay on your device. Always.</p>
                </div>
            </div>
        </footer>
    );
}
