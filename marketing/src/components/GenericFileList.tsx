import React from "react";
import { useCurrentFrame } from "remotion";
import { FileText } from "lucide-react";
import { FG, RADIUS } from "../lib/tokens";
import { fontBody } from "../lib/fonts";
import { fadeIn } from "../lib/motion";
import { SCENE1_FILES } from "../lib/data";

/**
 * Scene 1: Wall of unhelpful filenames.
 * Static, dim, intentionally frustrating.
 */
export const GenericFileList: React.FC<{
  startFrame?: number;
}> = ({ startFrame = 0 }) => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        padding: "8px 12px",
      }}
    >
      {SCENE1_FILES.map((file, i) => {
        const opacity = fadeIn(frame, startFrame + i * 3, 10);
        return (
          <div
            key={file}
            style={{
              opacity: opacity * 0.6,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              borderRadius: RADIUS.sm,
            }}
          >
            <FileText size={14} color={FG.ghost} />
            <span
              style={{
                fontFamily: fontBody,
                fontSize: 12,
                color: FG.dim,
              }}
            >
              {file}
            </span>
          </div>
        );
      })}
    </div>
  );
};
