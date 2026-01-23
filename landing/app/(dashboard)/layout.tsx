import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { Home, Download, Key, Settings, ArrowLeft } from 'lucide-react';

const sidebarItems = [
    { href: '/account', label: 'Overview', icon: Home },
    { href: '/account/downloads', label: 'Downloads', icon: Download },
    { href: '/account/settings', label: 'Settings', icon: Settings },
];

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { userId } = await auth();

    if (!userId) {
        redirect('/sign-in');
    }

    return (
        <div className="min-h-screen bg-surface-0 flex">
            {/* Sidebar */}
            <aside className="w-64 border-r border-white/5 bg-surface-1/50 flex flex-col">
                {/* Logo */}
                <div className="p-6 border-b border-white/5">
                    <Link href="/" className="flex items-center gap-2 text-brand-teal hover:opacity-80 transition-opacity">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="font-display font-bold text-lg">Ixos</span>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4">
                    <ul className="space-y-2">
                        {sidebarItems.map((item) => (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-content-secondary hover:text-white hover:bg-surface-2 transition-colors"
                                >
                                    <item.icon className="w-5 h-5" />
                                    {item.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* User */}
                <div className="p-4 border-t border-white/5">
                    <div className="flex items-center gap-3 px-4 py-2">
                        <UserButton
                            appearance={{
                                elements: {
                                    avatarBox: 'w-8 h-8',
                                },
                            }}
                        />
                        <span className="text-sm text-content-secondary">Account</span>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 p-8">
                <div className="max-w-4xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
