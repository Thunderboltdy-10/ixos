"use client";

/**
 * Root landing page — randomly redirects to one of /1–/5 on every load/reload.
 * Each page variant is a distinct visual identity for the Ixos product.
 */

import { useEffect } from "react";

export default function RootPage() {
  useEffect(() => {
    const page = Math.floor(Math.random() * 5) + 1;
    window.location.replace(`/${page}`);
  }, []);

  // Minimal loading state shown while redirect fires
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#050507",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      aria-hidden
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "#F6B94C",
          opacity: 0.6,
        }}
      />
    </div>
  );
}
