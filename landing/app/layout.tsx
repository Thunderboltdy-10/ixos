import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Outfit, Instrument_Serif } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { ClerkProvider } from '@clerk/nextjs';
import Script from 'next/script';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
    display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ['latin'],
    variable: '--font-jetbrains-mono',
    display: 'swap',
});

const outfit = Outfit({
    subsets: ['latin'],
    variable: '--font-outfit',
    display: 'swap',
});

// V2 Theme: Instrument Serif for display typography
const instrumentSerif = Instrument_Serif({
    subsets: ['latin'],
    weight: '400',
    variable: '--font-instrument-serif',
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'Ixos | Search by Meaning, Not Just Filenames',
    description: 'Local-first semantic file search powered by Ixos-Flash-v2. Sub-200ms results, 100% offline. Your files never leave your device.',
    keywords: ['semantic search', 'local first', 'privacy', 'file search', 'desktop search', 'offline search', 'meaning-based search'],
    authors: [{ name: 'Ixos Team' }],
    creator: 'Ixos',
    openGraph: {
        type: 'website',
        locale: 'en_US',
        url: 'https://ixos.app',
        title: 'Ixos | Search by Meaning',
        description: 'Local-first semantic file search. Sub-200ms results. 100% offline.',
        siteName: 'Ixos',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Ixos',
        description: 'Search by meaning, not just filenames. 100% offline.',
        creator: '@ixos_protocol',
    },
    icons: {
        icon: [{ url: '/favicon.ico' }, { url: '/icon.svg', type: 'image/svg+xml' }],
        apple: [{ url: '/apple-touch-icon.png' }],
    },
};

import { SmoothScrollProvider } from '@/components/smooth-scroll-provider';

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

    return (
        <ClerkProvider
            appearance={{
                variables: {
                    colorPrimary: '#0d9488',
                    colorBackground: '#0a0a0f',
                    colorInputBackground: '#12121a',
                    colorInputText: '#f8fafc',
                    colorText: '#f8fafc',
                    colorTextSecondary: '#94a3b8',
                },
                elements: {
                    card: 'bg-surface-1 border border-white/10',
                    headerTitle: 'text-white',
                    headerSubtitle: 'text-content-secondary',
                    socialButtonsBlockButton: 'bg-surface-2 border-white/10 text-white hover:bg-surface-3',
                    formButtonPrimary: 'bg-brand-teal hover:bg-brand-teal/90',
                    footerActionLink: 'text-brand-teal hover:text-brand-teal/80',
                },
            }}
        >
            <html lang="en" className="dark">
                <head>
                    {plausibleDomain && (
                        <Script
                            defer
                            data-domain={plausibleDomain}
                            src="https://plausible.io/js/script.js"
                            strategy="afterInteractive"
                        />
                    )}
                </head>
                <body className={cn(
                    inter.variable,
                    jetbrainsMono.variable,
                    outfit.variable,
                    instrumentSerif.variable,
                    "bg-surface-0 text-content-primary min-h-screen font-sans"
                )}>
                    <SmoothScrollProvider>
                        {children}
                    </SmoothScrollProvider>
                </body>
            </html>
        </ClerkProvider>
    );
}
