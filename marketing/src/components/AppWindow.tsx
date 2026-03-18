import React from "react";
import { BG, BORDER, SHADOW, RADIUS, WINDOW_DOTS } from "../lib/tokens";

/**
 * macOS-style app window chrome for the Ixos desktop app mockup.
 * Purely visual — no interactivity.
 */
export const AppWindow: React.FC<{
  children: React.ReactNode;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
}> = ({ children, width = 860, height = 520, style }) => {
  return (
    <div
      style={{
        width,
        height,
        backgroundColor: BG.graphite1,
        borderRadius: RADIUS.lg,
        border: `1px solid ${BORDER.hairline}`,
        boxShadow: SHADOW.lift,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* Title bar */}
      <div
        style={{
          height: 36,
          display: "flex",
          alignItems: "center",
          paddingLeft: 14,
          gap: 7,
          backgroundColor: BG.graphite0,
          borderBottom: `1px solid ${BORDER.hairline}`,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 11,
            height: 11,
            borderRadius: "50%",
            backgroundColor: WINDOW_DOTS.close,
            opacity: 0.7,
          }}
        />
        <div
          style={{
            width: 11,
            height: 11,
            borderRadius: "50%",
            backgroundColor: WINDOW_DOTS.minimize,
            opacity: 0.7,
          }}
        />
        <div
          style={{
            width: 11,
            height: 11,
            borderRadius: "50%",
            backgroundColor: WINDOW_DOTS.maximize,
            opacity: 0.7,
          }}
        />
      </div>
      {/* Content area */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {children}
      </div>
    </div>
  );
};
