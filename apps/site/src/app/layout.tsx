import "@fontsource-variable/instrument-sans";
import "@fontsource-variable/jetbrains-mono";
import "@ixos/ui/theme.css";
import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Footer, Nav } from "@/components/Nav";
import { Motion } from "@/components/Motion";
import { starCount } from "@/lib/github";

export const metadata: Metadata = {
  title: "Ixos",
  description: "Search your code and documents by meaning, on your own computer.",
  icons: { icon: "/assets/logo.png", apple: "/assets/logo.png" },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const stars = await starCount();
  return (
    <html lang="en">
      <body>
        <Motion>
          <Nav stars={stars} />
          {children}
          <Footer />
        </Motion>
      </body>
    </html>
  );
}
