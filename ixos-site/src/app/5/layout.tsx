"use client";

import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { V4Nav } from "./_v4/V4Nav";
import { V4AmbientField } from "./_v4/V4AmbientField";

export default function V5Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div
      data-theme="desktop"
      className="min-h-screen text-white font-mono relative"
      style={{ backgroundColor: "#0C0E10", overflowX: "clip" }}
    >
      <V4AmbientField />
      <V4Nav />

      <main className="relative z-10">
        {children}
      </main>
    </div>
  );
}
