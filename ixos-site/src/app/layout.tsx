import type { Metadata } from "next";
import { Space_Grotesk, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SmoothScrollProvider } from "@/components/providers/SmoothScrollProvider";
import { Analytics } from '@vercel/analytics/next';
import { IxosNav } from "@/components/IxosNav";
import { GridBackground } from "@/components/effects/GridBackground";
import { PageGlow } from "@/components/effects/PageGlow";

const analyticsEnabled = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "1";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-ixo-heading",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-ixo-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ixos",
  description: "Local-first semantic search for your files.",
  icons: {
    icon: [
      { url: "/assets/logo-v3.png", type: "image/png" },
      { url: "/favicon.ico", type: "image/x-icon" },
    ],
    shortcut: ["/assets/logo-v3.png"],
    apple: ["/assets/logo-v3.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${spaceGrotesk.variable} ${geistMono.variable} antialiased`}
        style={{ backgroundColor: '#0A0D0F' }}
      >
        <>
          <SmoothScrollProvider>
            <div id="app-root" className="relative min-h-screen flex flex-col">
              <GridBackground />
              <PageGlow color="amber" />
              <IxosNav />
              <div className="flex-1 flex flex-col">{children}</div>
              {analyticsEnabled ? <Analytics /> : null}
            </div>
          </SmoothScrollProvider>
        </>
      </body>
    </html>
  );
}
