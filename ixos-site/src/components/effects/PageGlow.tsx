"use client";

const GLOW_COLORS = {
  amber: "rgba(246, 185, 76, 0.08)",
  teal: "rgba(20, 184, 166, 0.08)",
  pink: "rgba(244, 114, 182, 0.08)",
  purple: "rgba(168, 85, 247, 0.08)",
} as const;

type GlowColor = keyof typeof GLOW_COLORS;

export function PageGlow({ color }: { color: GlowColor }) {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-0"
      style={{
        background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${GLOW_COLORS[color]}, transparent 70%)`,
        transition: "opacity 0.5s ease-in-out",
      }}
    />
  );
}
