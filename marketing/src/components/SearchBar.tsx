import React from "react";
import { Search, Zap } from "lucide-react";
import { BORDER, ACCENT, FG, RADIUS } from "../lib/tokens";
import { fontBody, fontDisplay } from "../lib/fonts";

export const SearchBar: React.FC<{
  children?: React.ReactNode;
  glowColor?: string;
  placeholder?: string;
  showGlow?: boolean;
}> = ({
  children,
  glowColor = ACCENT.teal,
  placeholder,
  showGlow = true,
}) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        height: 56,
        padding: "0 20px",
        backgroundColor: showGlow ? `${glowColor}10` : "transparent",
        borderRadius: RADIUS.lg,
        border: `1px solid ${showGlow ? `${glowColor}30` : BORDER.medium}`,
        boxShadow: showGlow
          ? `0 0 30px ${glowColor}15, inset 4px 0 12px -4px ${glowColor}33`
          : "none",
        borderBottom: `1px solid ${showGlow ? `${glowColor}50` : BORDER.medium}`,
      }}
    >
      <Search size={18} color={showGlow ? glowColor : FG.dim} strokeWidth={2} />
      <div
        style={{
          flex: 1,
          fontFamily: fontDisplay,
          fontSize: 18,
          color: FG.porcelain,
          display: "flex",
          alignItems: "center",
          letterSpacing: "-0.01em",
        }}
      >
        {children ?? (
          <span style={{ color: FG.dim }}>{placeholder ?? ""}</span>
        )}
      </div>

      {/* Mode Badge - Memory / Local / Deep */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 8px",
          borderRadius: RADIUS.sm,
          backgroundColor: `${glowColor}20`,
          border: `1px solid ${glowColor}40`,
        }}
      >
        <Zap size={12} color={glowColor} fill={glowColor} />
        <span
          style={{
            fontFamily: fontBody,
            fontSize: 10,
            fontWeight: 600,
            color: glowColor,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          LOCAL
        </span>
      </div>
    </div>
  );
};
