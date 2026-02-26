import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ixos — Search that thinks before it retrieves",
  description:
    "Local-first semantic file search. Progressive retrieval, hybrid intelligence, entirely on-device.",
};

export default function Layout4({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
