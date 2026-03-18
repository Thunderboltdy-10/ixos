import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from "remotion";
import { BG, FG, ACCENT, BORDER, RADIUS } from "../lib/tokens";
import { fadeIn, slideRight } from "../lib/motion";
import { fontBody } from "../lib/fonts";
import { NoiseOverlay } from "../components/NoiseOverlay";
import { QualitySwitcher } from "../components/QualitySwitcher";
import { TerminalWindow } from "../components/TerminalWindow";
import { CLI_OUTPUT } from "../lib/data";
import { Clock, FileText } from "lucide-react";

/**
 * Scene 5: "Modes" — Product Depth (5.0s / 162 frames)
 *
 * Three rapid panels: Quality switcher, CLI, Today tab.
 * ~54 frames each, slide-right transitions.
 */
const PANEL_DURATION = 54;

const Panel: React.FC<{
  children: React.ReactNode;
  label: string;
}> = ({ children, label }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterX = slideRight(frame, fps, 0, 60);
  const enterOpacity = fadeIn(frame, 0, 12);

  return (
    <AbsoluteFill style={{ backgroundColor: BG.graphite0 }}>
      <NoiseOverlay />
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          padding: 80,
          opacity: enterOpacity,
          transform: `translateX(${enterX}px)`,
        }}
      >
        {children}
        <span
          style={{
            fontFamily: fontBody,
            fontSize: 11,
            color: FG.dim,
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            marginTop: 8,
          }}
        >
          {label}
        </span>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Panel 3: Today / resume view */
const TodayPanel: React.FC = () => {
  const frame = useCurrentFrame();

  const recentFiles = [
    { name: "auth_api_reference.md", time: "2 min ago" },
    { name: "team_standup_notes.md", time: "28 min ago" },
    { name: "ci_pipeline.yml", time: "1 hour ago" },
  ];

  return (
    <Panel label="Pick up where you left off">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          width: 400,
          backgroundColor: BG.graphite1,
          borderRadius: RADIUS.lg,
          border: `1px solid ${BORDER.hairline}`,
          padding: "14px 18px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 6,
          }}
        >
          <Clock size={14} color={ACCENT.teal} />
          <span
            style={{
              fontFamily: fontBody,
              fontSize: 11,
              fontWeight: 600,
              color: FG.muted,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
            }}
          >
            Today
          </span>
        </div>
        {recentFiles.map((file, i) => (
          <div
            key={file.name}
            style={{
              opacity: fadeIn(frame, 8 + i * 5, 10),
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 8px",
              borderRadius: RADIUS.sm,
              backgroundColor: i === 0 ? BG.graphite2 : "transparent",
            }}
          >
            <FileText size={13} color={FG.dim} />
            <span
              style={{
                fontFamily: fontBody,
                fontSize: 12,
                color: FG.porcelain,
                flex: 1,
              }}
            >
              {file.name}
            </span>
            <span
              style={{
                fontFamily: fontBody,
                fontSize: 10,
                color: FG.ghost,
              }}
            >
              {file.time}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
};

export const Scene5_Modes: React.FC = () => {
  return (
    <AbsoluteFill>
      {/* Panel 1: Quality switcher */}
      <Sequence durationInFrames={PANEL_DURATION} premountFor={10}>
        <Panel label="Choose your depth">
          <QualitySwitcher startFrame={8} framesPerMode={14} />
        </Panel>
      </Sequence>

      {/* Panel 2: CLI */}
      <Sequence
        from={PANEL_DURATION}
        durationInFrames={PANEL_DURATION}
        premountFor={10}
      >
        <Panel label="Terminal-native">
          <TerminalWindow content={CLI_OUTPUT} startFrame={5} />
        </Panel>
      </Sequence>

      {/* Panel 3: Today */}
      <Sequence
        from={PANEL_DURATION * 2}
        durationInFrames={PANEL_DURATION}
        premountFor={10}
      >
        <TodayPanel />
      </Sequence>
    </AbsoluteFill>
  );
};
