import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ixos — Precision search, zero abstraction",
  description:
    "Local-first semantic file search. Every pipeline stage visible. No black box. No cloud.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Satoshi for The Chamber */}
      <link
        href="https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,700,800,900&display=swap"
        rel="stylesheet"
      />
      {children}
    </>
  );
}
