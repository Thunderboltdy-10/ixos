import React from "react";
import { useCurrentFrame, useVideoConfig, Img, staticFile } from "remotion";
import { scaleIn, fadeIn } from "../lib/motion";

/**
 * Logo entrance with spring scale + fade.
 */
export const LogoReveal: React.FC<{
  startFrame?: number;
  size?: number;
}> = ({ startFrame = 0, size = 64 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = scaleIn(frame, fps, startFrame);
  const opacity = fadeIn(frame, startFrame, 12);

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Img src={staticFile("logo-v3.png")} width={size} height={size} />
    </div>
  );
};
