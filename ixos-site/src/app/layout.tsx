import type { Metadata } from "next";
import { Space_Grotesk, Geist_Mono } from "next/font/google"; // New premium font system
import "./globals.css";
import { SmoothScrollProvider } from "@/components/providers/SmoothScrollProvider";
import { ArcNoiseBackground } from "@/components/effects/ArcNoiseBackground";
import { ParticlesFieldV3 } from "@/components/effects/ParticlesFieldV3";
// import { TraceLayer } from "@/components/effects/TraceLayer";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from '@vercel/analytics/next';

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
      >
        <ClerkProvider>
          <SmoothScrollProvider>
            {/* bg-root: fixed particle canvas only - no texture overlays */}
            <div
              id="bg-root"
              className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
              aria-hidden="true"
            >
              <ArcNoiseBackground />
              <ParticlesFieldV3 />
              {/* <TraceLayer /> */}
            </div>

            {/* app-root: relative, z-10 */}
            <div id="app-root" className="relative z-10 min-h-screen flex flex-col">
              {children}
              <Analytics />
            </div>
          </SmoothScrollProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
