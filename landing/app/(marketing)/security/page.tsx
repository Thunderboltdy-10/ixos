import { Metadata } from "next";
import { Shield, Wifi, Eye, Lock, Server, Key } from "lucide-react";

export const metadata: Metadata = {
    title: "Security | Ixos",
    description: "Learn about Ixos security architecture, threat model, and privacy guarantees.",
};

export default function SecurityPage() {
    return (
        <div className="min-h-screen bg-surface-0 pt-24 pb-16">
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(13,148,136,0.1)_0%,rgba(10,10,15,0)_50%)] pointer-events-none" />

            <div className="container mx-auto px-4 relative z-10 max-w-3xl">
                <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
                    Security
                </h1>
                <p className="text-content-secondary text-lg mb-12">
                    Our security posture and what we do (and don't do) with your data.
                </p>

                {/* Key Principles */}
                <div className="grid md:grid-cols-2 gap-6 mb-16">
                    <div className="bg-surface-1 rounded-2xl border border-white/5 p-6">
                        <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4">
                            <Wifi className="w-6 h-6 text-green-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">Offline by Default</h3>
                        <p className="text-content-secondary text-sm">
                            Ixos requires no network connection to function. All processing happens locally on your device.
                        </p>
                    </div>

                    <div className="bg-surface-1 rounded-2xl border border-white/5 p-6">
                        <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4">
                            <Eye className="w-6 h-6 text-green-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">No Telemetry</h3>
                        <p className="text-content-secondary text-sm">
                            We don't collect usage data, search queries, or file metadata. We literally cannot see what you search for.
                        </p>
                    </div>

                    <div className="bg-surface-1 rounded-2xl border border-white/5 p-6">
                        <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4">
                            <Server className="w-6 h-6 text-green-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">No Cloud Storage</h3>
                        <p className="text-content-secondary text-sm">
                            Your files and embeddings stay on your device. No data is uploaded to our servers or any third party.
                        </p>
                    </div>

                    <div className="bg-surface-1 rounded-2xl border border-white/5 p-6">
                        <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4">
                            <Lock className="w-6 h-6 text-green-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">Optional Encryption</h3>
                        <p className="text-content-secondary text-sm">
                            Enable XChaCha20-Poly1305 encryption for cached embeddings. Your key, your data.
                        </p>
                    </div>
                </div>

                {/* Threat Model */}
                <h2 className="text-2xl font-semibold text-white mb-6">
                    Threat Model
                </h2>
                <div className="bg-surface-1 rounded-2xl border border-white/5 p-8 mb-12">
                    <h3 className="text-lg font-semibold text-white mb-4">What we protect against:</h3>
                    <ul className="space-y-3 text-content-secondary mb-8">
                        <li className="flex items-start gap-3">
                            <Shield className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                            <span><strong>Network eavesdropping:</strong> All operations are local. No network traffic to intercept.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <Shield className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                            <span><strong>Cloud data breaches:</strong> No cloud storage means no cloud to breach.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <Shield className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                            <span><strong>Metadata leakage:</strong> Embeddings are stored in file metadata (xattr/ADS), not a central database.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <Shield className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                            <span><strong>Memory forensics:</strong> JIT mode keeps embeddings in memory only. Journalist mode auto-clears on exit.</span>
                        </li>
                    </ul>

                    <h3 className="text-lg font-semibold text-white mb-4">What we don't protect against:</h3>
                    <ul className="space-y-3 text-content-secondary">
                        <li className="flex items-start gap-3">
                            <Key className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                            <span><strong>Physical device access:</strong> If someone has physical access to your unlocked device, they can access your files.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <Key className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                            <span><strong>OS-level compromise:</strong> Ixos runs with user privileges. A compromised OS can access anything the user can.</span>
                        </li>
                    </ul>
                </div>

                {/* What We Collect */}
                <h2 className="text-2xl font-semibold text-white mb-6">
                    What We Collect
                </h2>
                <div className="bg-surface-1 rounded-2xl border border-white/5 p-8 mb-12">
                    <p className="text-content-secondary mb-4">
                        <strong className="text-white">From the app:</strong> Nothing. Zero telemetry, zero analytics.
                    </p>
                    <p className="text-content-secondary mb-4">
                        <strong className="text-white">From the website:</strong> If you enable Plausible analytics (privacy-first, no cookies), we see aggregate page views. No personal data.
                    </p>
                    <p className="text-content-secondary">
                        <strong className="text-white">From purchases:</strong> Payment processor (Lemon Squeezy) collects billing information for transactions. We store your email to deliver license keys.
                    </p>
                </div>

                {/* Security Contact */}
                <h2 className="text-2xl font-semibold text-white mb-6">
                    Security Contact
                </h2>
                <p className="text-content-secondary mb-4">
                    Found a security issue? Please report it responsibly.
                </p>
                <a
                    href="mailto:security@ixos.app"
                    className="text-brand-teal hover:text-brand-teal/80 font-medium"
                >
                    security@ixos.app
                </a>
            </div>
        </div>
    );
}
