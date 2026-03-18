import React from "react";
import { useCurrentFrame } from "remotion";
import { Search, Folder, ChevronRight, HardDrive, Clock, FileText } from "lucide-react";
import { BG, BORDER, FG, RADIUS, ACCENT } from "../lib/tokens";
import { fontBody, fontDisplay } from "../lib/fonts";
import { TypewriterText } from "./TypewriterText";
import { fadeIn, fadeOut } from "../lib/motion";

export const FileExplorer: React.FC<{
  startFrame: number;
}> = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const opacity = fadeIn(frame, startFrame, 20);

  return (
    <div
      style={{
        opacity,
        width: 1000,
        height: 600,
        backgroundColor: BG.graphite1,
        borderRadius: RADIUS.lg,
        border: `1px solid ${BORDER.medium}`,
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Top Bar */}
      <div
        style={{
          height: 52,
          backgroundColor: BG.graphite2,
          borderBottom: `1px solid ${BORDER.hairline}`,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 16,
        }}
      >
        {/* Navigation arrows */}
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: BG.graphite3 }}>
            <ChevronRight size={16} color={FG.dim} style={{ transform: "rotate(180deg)" }} />
          </div>
          <div style={{ width: 28, height: 28, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronRight size={16} color={FG.ghost} />
          </div>
        </div>

        {/* Breadcrumb / Address Bar */}
        <div
          style={{
            flex: 1,
            height: 32,
            backgroundColor: BG.graphite0,
            borderRadius: RADIUS.sm,
            border: `1px solid ${BORDER.hairline}`,
            display: "flex",
            alignItems: "center",
            padding: "0 12px",
            gap: 8,
          }}
        >
          <HardDrive size={14} color={FG.dim} />
          <ChevronRight size={14} color={FG.ghost} />
          <span style={{ fontFamily: fontDisplay, fontSize: 13, color: FG.porcelain }}>Users</span>
          <ChevronRight size={14} color={FG.ghost} />
          <span style={{ fontFamily: fontDisplay, fontSize: 13, color: FG.porcelain }}>Projects</span>
          <ChevronRight size={14} color={FG.ghost} />
          <span style={{ fontFamily: fontDisplay, fontSize: 13, color: FG.porcelain }}>Ixos</span>
        </div>

        {/* Search Bar */}
        <div
          style={{
            width: 280,
            height: 32,
            backgroundColor: BG.graphite0,
            borderRadius: RADIUS.sm,
            border: `1px solid ${frame > startFrame + 60 ? ACCENT.error : BORDER.hairline}`,
            boxShadow: frame > startFrame + 60 ? `0 0 0 1px ${ACCENT.error}40` : "none",
            display: "flex",
            alignItems: "center",
            padding: "0 12px",
            gap: 8,
            transition: "all 0.2s ease",
          }}
        >
          <Search size={14} color={frame > startFrame + 60 ? ACCENT.error : FG.dim} />
          {frame > startFrame + 10 && frame < startFrame + 80 && (
            <TypewriterText text="where is that token thing..." startFrame={startFrame + 10} charsPerFrame={1} fontSize={13} color={FG.dim} />
          )}
          {frame >= startFrame + 80 && (
            <TypewriterText text="config auth setup" startFrame={startFrame + 80} charsPerFrame={1.5} fontSize={13} color={FG.dim} />
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar */}
        <div
          style={{
            width: 220,
            backgroundColor: BG.graphite2,
            borderRight: `1px solid ${BORDER.hairline}`,
            padding: "16px 8px",
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ padding: "6px 12px", display: "flex", alignItems: "center", gap: 8, borderRadius: RADIUS.sm, backgroundColor: `${BG.graphite3}80` }}>
              <Clock size={16} color={FG.dim} />
              <span style={{ fontFamily: fontDisplay, fontSize: 13, color: FG.porcelain }}>Recent</span>
            </div>
            <div style={{ padding: "6px 12px", display: "flex", alignItems: "center", gap: 8, borderRadius: RADIUS.sm }}>
              <Folder size={16} color={FG.dim} />
              <span style={{ fontFamily: fontDisplay, fontSize: 13, color: FG.porcelain }}>Documents</span>
            </div>
            <div style={{ padding: "6px 12px", display: "flex", alignItems: "center", gap: 8, borderRadius: RADIUS.sm }}>
              <Folder size={16} color={FG.dim} />
              <span style={{ fontFamily: fontDisplay, fontSize: 13, color: FG.porcelain }}>Downloads</span>
            </div>
          </div>
        </div>

        {/* File List */}
        <div style={{ flex: 1, padding: 24, backgroundColor: BG.graphite0 }}>
          <div style={{ display: "flex", paddingBottom: 8, borderBottom: `1px solid ${BORDER.hairline}`, marginBottom: 16 }}>
            <span style={{ flex: 2, fontFamily: fontDisplay, fontSize: 12, color: FG.dim }}>Name</span>
            <span style={{ flex: 1, fontFamily: fontDisplay, fontSize: 12, color: FG.dim }}>Date modified</span>
            <span style={{ flex: 1, fontFamily: fontDisplay, fontSize: 12, color: FG.dim }}>Type</span>
          </div>

          <div style={{ opacity: fadeIn(frame, startFrame + 35, 10) * fadeOut(frame, startFrame + 70, 5) + fadeIn(frame, startFrame + 100, 5) }}>
            {/* Hardcoded generic files for the problem scene */}
            {["old_tokens_backup_2024.txt", "v1_config.json", "auth_ideas.md", "README_draft.md", "Untitled-1.txt"].map((file, i) => (
              <div key={i} style={{ display: "flex", padding: "8px 0", alignItems: "center" }}>
                <div style={{ flex: 2, display: "flex", alignItems: "center", gap: 8 }}>
                  <FileText size={16} color={FG.dim} />
                  <span style={{ fontFamily: fontBody, fontSize: 13, color: FG.muted }}>{file}</span>
                </div>
                <span style={{ flex: 1, fontFamily: fontDisplay, fontSize: 12, color: FG.ghost }}>{10 + i} Mar 2024</span>
                <span style={{ flex: 1, fontFamily: fontDisplay, fontSize: 12, color: FG.ghost }}>File</span>
              </div>
            ))}

            {frame > startFrame + 110 && (
               <div style={{ marginTop: 40, display: "flex", justifyContent: "center" }}>
                 <span style={{ fontFamily: fontDisplay, fontSize: 14, color: FG.dim }}>No items match your search.</span>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};