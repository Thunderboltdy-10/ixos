import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Shield, Lock, Eye } from "lucide-react";
import { ACCENT, FG } from "../lib/tokens";
import { fontBody, fontDisplay } from "../lib/fonts";
import { fadeIn, slideUp } from "../lib/motion";

const TRUST_ICONS: Record<string, React.FC<{ size: number; color: string }>> = {
  shield: Shield,
  lock: Lock,
  eye: Eye,
};

export const TrustBlock: React.FC<{
  icon: "shield" | "lock" | "eye";
  title: string;
  subtitle: string;
  startFrame: number;
  accentColor?: string;
}> = ({ icon, title, subtitle, startFrame, accentColor = ACCENT.amber }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = fadeIn(frame, startFrame, 15);
  const y = slideUp(frame, fps, startFrame, 24);

  const IconComponent = TRUST_ICONS[icon];

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${y}px)`,
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
      }}
    >
      <IconComponent size={20} color={accentColor} />
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <span
          style={{
            fontFamily: fontDisplay,
            fontSize: 18,
            fontWeight: 600,
            color: FG.porcelain,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </span>
        <span
          style={{
            fontFamily: fontBody,
            fontSize: 12,
            color: FG.dim,
          }}
        >
          {subtitle}
        </span>
      </div>
    </div>
  );
};
