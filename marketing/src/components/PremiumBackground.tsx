import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { BG } from "../lib/tokens";

export const PremiumBackground: React.FC = () => {
  const frame = useCurrentFrame();

  // Color orb logic based on timeline
  // 0-150: Graphite (Dim)
  // 150-500: Teal Glow (Search & Results)
  // 500-800: Amber Glow (Trust)
  // 800-1000: Violet Glow (Modes)
  // 1000-1140: Back to Graphite

  const tealOpacity = interpolate(
    frame,
    [100, 150, 500, 600],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const amberOpacity = interpolate(
    frame,
    [450, 550, 750, 850],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const violetOpacity = interpolate(
    frame,
    [700, 800, 950, 1050],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Grid moves backwards in Z or Y
  const gridY = (frame * 0.5) % 40;

  return (
    <AbsoluteFill style={{ backgroundColor: BG.graphite0, overflow: "hidden" }}>
      {/* Deep space radial glow that shifts colors */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(20, 184, 166, ${tealOpacity * 0.08}), transparent 60%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 60% 40%, rgba(246, 185, 76, ${amberOpacity * 0.08}), transparent 60%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 40% 60%, rgba(124, 92, 255, ${violetOpacity * 0.1}), transparent 60%)`,
        }}
      />

      {/* Perspective Grid */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "-50%",
          right: "-50%",
          bottom: "-50%",
          perspective: 800,
          transformStyle: "preserve-3d",
          opacity: 0.15,
        }}
      >
        <div
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            transform: "rotateX(75deg)",
            transformOrigin: "top center",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `
                linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)
              `,
              backgroundSize: "40px 40px",
              transform: `translateY(${gridY}px)`,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
