import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Download, Clock, CheckCircle } from 'lucide-react';

// Mock data - in production, fetch from database
const mockDownloads = [
    {
        id: 1,
        version: '0.2.0',
        platform: 'Windows',
        downloadedAt: '2026-01-15T10:30:00Z',
    },
    {
        id: 2,
        version: '0.1.9',
        platform: 'Windows',
        downloadedAt: '2026-01-10T14:20:00Z',
    },
];

export default async function DownloadsPage() {
    const { userId } = await auth();

    if (!userId) {
        redirect('/sign-in');
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-display font-bold text-white">Downloads</h1>
                <p className="text-content-secondary mt-2">
                    Download Ixos for your platform and view your download history
                </p>
            </div>

            {/* Download Buttons */}
            <div className="bg-surface-1 rounded-2xl border border-white/10 p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Latest Version: v0.2.0</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <DownloadButton
                        platform="Windows"
                        icon="🪟"
                        filename="ixos-0.2.0-x64.msi"
                        size="~45 MB"
                    />
                    <DownloadButton
                        platform="macOS"
                        icon="🍎"
                        filename="ixos-0.2.0-universal.dmg"
                        size="~50 MB"
                    />
                    <DownloadButton
                        platform="Linux"
                        icon="🐧"
                        filename="ixos-0.2.0-x64.AppImage"
                        size="~48 MB"
                    />
                </div>
            </div>

            {/* Download History */}
            <div className="bg-surface-1 rounded-2xl border border-white/10 p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Download History</h2>
                {mockDownloads.length > 0 ? (
                    <div className="space-y-3">
                        {mockDownloads.map((download) => (
                            <div
                                key={download.id}
                                className="flex items-center justify-between p-4 bg-surface-0 rounded-lg border border-white/5"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-surface-2 flex items-center justify-center">
                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-white">
                                            Ixos v{download.version}
                                        </p>
                                        <p className="text-sm text-content-muted">
                                            {download.platform}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-content-muted text-sm">
                                    <Clock className="w-4 h-4" />
                                    {new Date(download.downloadedAt).toLocaleDateString()}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-content-muted text-center py-8">
                        No downloads yet. Download Ixos above to get started.
                    </p>
                )}
            </div>
        </div>
    );
}

function DownloadButton({
    platform,
    icon,
    filename,
    size,
}: {
    platform: string;
    icon: string;
    filename: string;
    size: string;
}) {
    return (
        <a
            href={`/download?platform=${platform.toLowerCase()}`}
            className="flex items-center gap-4 p-4 bg-surface-0 rounded-lg border border-white/5 hover:border-brand-teal/30 transition-colors group"
        >
            <span className="text-3xl">{icon}</span>
            <div className="flex-1">
                <p className="font-medium text-white group-hover:text-brand-teal transition-colors">
                    {platform}
                </p>
                <p className="text-xs text-content-muted">{size}</p>
            </div>
            <Download className="w-5 h-5 text-content-muted group-hover:text-brand-teal transition-colors" />
        </a>
    );
}
