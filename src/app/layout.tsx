import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google"; // Removed Playfair
import "./globals.css";
import { SmoothScrollProvider } from "@/components/providers/SmoothScrollProvider";
import { ArcNoiseBackground } from "@/components/effects/ArcNoiseBackground";
import { ParticlesFieldV3 } from "@/components/effects/ParticlesFieldV3";
import { ElectricTracesV3 } from "@/components/effects/ElectricTracesV3";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
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
        className={`${jetbrainsMono.variable} antialiased`}
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
            <ElectricTracesV3 />
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
