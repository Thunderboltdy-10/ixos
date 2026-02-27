import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ixos — Pipeline search architecture",
  description:
    "Local-first semantic file search. Four-stage pipeline, explicit sources, zero telemetry.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
