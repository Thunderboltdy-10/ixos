import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { UserProfile } from '@clerk/nextjs';

export default async function SettingsPage() {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
        redirect('/sign-in');
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-display font-bold text-white">Settings</h1>
                <p className="text-content-secondary mt-2">
                    Manage your account settings and profile
                </p>
            </div>

            {/* Clerk UserProfile */}
            <div className="bg-surface-1 rounded-2xl border border-white/10 overflow-hidden">
                <UserProfile
                    appearance={{
                        elements: {
                            rootBox: 'w-full',
                            card: 'bg-transparent shadow-none border-0',
                            navbar: 'hidden',
                            pageScrollBox: 'p-0',
                        },
                    }}
                />
            </div>
        </div>
    );
}
