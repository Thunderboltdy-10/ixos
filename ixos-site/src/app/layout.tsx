import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google"; // New premium font system
import "./globals.css";
import { SmoothScrollProvider } from "@/components/providers/SmoothScrollProvider";
import { ArcNoiseBackground } from "@/components/effects/ArcNoiseBackground";
import { ParticlesFieldV3 } from "@/components/effects/ParticlesFieldV3";
// import { TraceLayer } from "@/components/effects/TraceLayer";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-ixo-heading",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ixo-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  // ...
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} antialiased`}
      >
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
          </div>
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
