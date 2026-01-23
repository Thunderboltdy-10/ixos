import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Copy, Download, Key, ExternalLink } from 'lucide-react';

export default async function AccountPage() {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
        redirect('/sign-in');
    }

    // In production, fetch from database
    const mockLicense = {
        key: 'IXOS-FREE-0000-0000-0000',
        tier: 'Free',
        status: 'Active',
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-display font-bold text-white">
                    Welcome back, {user.firstName || 'there'}
                </h1>
                <p className="text-content-secondary mt-2">
                    Manage your Ixos license and downloads
                </p>
            </div>

            {/* Plan Card */}
            <div className="bg-surface-1 rounded-2xl border border-white/10 p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm text-content-muted uppercase tracking-wide">Current Plan</p>
                        <h2 className="text-2xl font-bold text-white mt-1">{mockLicense.tier}</h2>
                        <p className="text-content-secondary text-sm mt-2">
                            {mockLicense.tier === 'Free'
                                ? 'Flash mode + 10 Auto refines per day'
                                : 'Unlimited Auto + evidence depth + advanced filters'
                            }
                        </p>
                    </div>
                    {mockLicense.tier === 'Free' && (
                        <a
                            href="/pricing"
                            className="px-4 py-2 bg-brand-teal text-white rounded-lg text-sm font-medium hover:bg-brand-teal/90 transition-colors flex items-center gap-2"
                        >
                            Upgrade to Pro
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    )}
                </div>
            </div>

            {/* License Key Card */}
            <div className="bg-surface-1 rounded-2xl border border-white/10 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-surface-2 flex items-center justify-center">
                        <Key className="w-5 h-5 text-brand-teal" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">License Key</h3>
                        <p className="text-xs text-content-muted">Use this to activate Ixos on your devices</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-surface-0 rounded-lg p-4 border border-white/5">
                    <code className="flex-1 font-mono text-sm text-content-primary">
                        {mockLicense.key}
                    </code>
                    <button
                        className="p-2 hover:bg-surface-2 rounded-lg transition-colors text-content-muted hover:text-white"
                        title="Copy license key"
                    >
                        <Copy className="w-4 h-4" />
                    </button>
                </div>

                <p className="text-xs text-content-muted mt-3">
                    Status: <span className="text-green-500">{mockLicense.status}</span>
                </p>
            </div>

            {/* Quick Download */}
            <div className="bg-surface-1 rounded-2xl border border-white/10 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-surface-2 flex items-center justify-center">
                        <Download className="w-5 h-5 text-brand-teal" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">Quick Download</h3>
                        <p className="text-xs text-content-muted">Get the latest version for your platform</p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <a
                        href="/download"
                        className="flex flex-col items-center gap-2 p-4 bg-surface-0 rounded-lg border border-white/5 hover:border-brand-teal/30 transition-colors"
                    >
                        <span className="text-2xl">🪟</span>
                        <span className="text-sm text-content-secondary">Windows</span>
                    </a>
                    <a
                        href="/download"
                        className="flex flex-col items-center gap-2 p-4 bg-surface-0 rounded-lg border border-white/5 hover:border-brand-teal/30 transition-colors"
                    >
                        <span className="text-2xl">🍎</span>
                        <span className="text-sm text-content-secondary">macOS</span>
                    </a>
                    <a
                        href="/download"
                        className="flex flex-col items-center gap-2 p-4 bg-surface-0 rounded-lg border border-white/5 hover:border-brand-teal/30 transition-colors"
                    >
                        <span className="text-2xl">🐧</span>
                        <span className="text-sm text-content-secondary">Linux</span>
                    </a>
                </div>
            </div>
        </div>
    );
}
