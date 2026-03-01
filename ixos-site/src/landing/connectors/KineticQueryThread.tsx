"use client";

/**
 * KineticQueryThread — /1 connector
 *
 * A living curved spline that emerges from the hero search box and routes
 * through each section's "routing node". Nodes animate like routing decisions
 * when sections enter view. Hovering a node previews that section.
 * Clicking snaps scroll + triggers a ripple pulse.
 *
 * 9 micro-animations:
 * 1. Spline draws-in on page load (strokeDashoffset animation)
 * 2. Active section node pulses with a glow ring
 * 3. Inactive nodes float with a slow sine drift
 * 4. Spline segment between active nodes brightens
 * 5. Hover state: node expands + section title fades in
 * 6. Click state: node fires a "routing burst" (expanding rings)
 * 7. Amber → teal spline color transition on search lock
 * 8. Traveling packet dots along the spline path
 * 9. Active node burst ring (scale 1→3→0)
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ConnectorProps } from "./types";
import { SECTION_MAP, SECTION_BY_ID } from "../SECTION_MAP";

const NODE_TONE: Record<string, string> = {
  cyan: "#2DD4BF",
  amber: "#F59E0B",
  violet: "#7C3AED",
};

/* Amber = active / searching; Teal = locked / complete */
const SPLINE_AMBER = "#F6B94C";
const SPLINE_TEAL = "#14B8A6";

interface NodeState {
  id: string;
  label: string;
  tone: string;
  isActive: boolean;
  isHovered: boolean;
  isBursting: boolean;
  scrollY: number;
}

function getSectionScrollY(sectionId: string): number {
  if (typeof document === "undefined") return 0;
  const el = document.querySelector(`[data-section-id="${sectionId}"]`);
  if (!el) return 0;
  return (el as HTMLElement).offsetTop - 80;
}

/* CSS keyframes injected once for node-burst ring */
const BURST_STYLE = `
@keyframes kqt-node-burst {
  0%   { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
  100% { transform: translate(-50%, -50%) scale(3); opacity: 0; }
}
.kqt-burst-ring {
  position: absolute;
  border-radius: 50%;
  border: 1.5px solid #F6B94C;
  width: 14px;
  height: 14px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: kqt-node-burst 0.7s ease-out forwards;
}
.kqt-burst-ring:nth-child(2) { animation-delay: 0.12s; border-color: #F6B94C99; }
.kqt-burst-ring:nth-child(3) { animation-delay: 0.24s; border-color: #F6B94C55; }
`;

export function KineticQueryThread({
  sections,
  activeSectionId,
  pulseAt,
}: ConnectorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<NodeState[]>([]);
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 });
  const [pathDrawn, setPathDrawn] = useState(false);
  const [burstId, setBurstId] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const driftPhaseRef = useRef<Record<string, number>>({});

  /* Inject burst keyframe CSS once */
  useEffect(() => {
    if (document.getElementById("kqt-burst-style")) return;
    const style = document.createElement("style");
    style.id = "kqt-burst-style";
    style.textContent = BURST_STYLE;
    document.head.appendChild(style);
  }, []);

  /* Initialize nodes from SECTION_MAP */
  useEffect(() => {
    const nodeList = SECTION_MAP.map((s) => ({
      id: s.id,
      label: s.title,
      tone: s.tone,
      isActive: s.id === activeSectionId,
      isHovered: false,
      isBursting: false,
      scrollY: 0,
    }));
    nodeList.forEach((n, i) => {
      driftPhaseRef.current[n.id] = i * 0.7;
    });
    setNodes(nodeList);
  }, []);

  /* Update active state — trigger lock color after a delay */
  useEffect(() => {
    setNodes((prev) =>
      prev.map((n) => ({ ...n, isActive: n.id === activeSectionId }))
    );
    /* Simulate "search locked" teal state ~1.5s after section change */
    setIsLocked(false);
    const tid = setTimeout(() => setIsLocked(true), 1500);
    return () => clearTimeout(tid);
  }, [activeSectionId]);

  /* Resize observer */
  useEffect(() => {
    const onResize = () => {
      setSvgSize({ w: window.innerWidth, h: document.body.scrollHeight });
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* Path draw-in on mount */
  useEffect(() => {
    const tid = setTimeout(() => setPathDrawn(true), 600);
    return () => clearTimeout(tid);
  }, []);

  /* Node positions — left gutter */
  const getNodePos = useCallback(
    (sectionId: string, index: number): { x: number; y: number } => {
      const section = sections.find((s) => s.id === sectionId);
      const rawY = section?.element?.getBoundingClientRect().top
        ? section.element.offsetTop +
          section.element.getBoundingClientRect().height * 0.4
        : index * (svgSize.h / Math.max(nodes.length, 1));
      return { x: 60, y: rawY };
    },
    [sections, svgSize.h, nodes.length]
  );

  /* Build SVG cubic bezier path through all nodes */
  const buildSplinePath = useCallback((): string => {
    if (nodes.length < 2) return "";
    const pts = nodes.map((n, i) => getNodePos(n.id, i));
    if (pts.length < 2) return "";

    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const midY = (p0.y + p1.y) / 2;
      const ctrl1 = { x: p0.x + 30, y: midY };
      const ctrl2 = { x: p1.x + 30, y: midY };
      d += ` C ${ctrl1.x} ${ctrl1.y}, ${ctrl2.x} ${ctrl2.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  }, [nodes, getNodePos]);

  const handleNodeHover = (id: string, hovered: boolean) => {
    setNodes((prev) =>
      prev.map((n) => ({ ...n, isHovered: n.id === id && hovered }))
    );
  };

  const handleNodeClick = (node: NodeState, index: number) => {
    /* Burst animation */
    setBurstId(node.id);
    setTimeout(() => setBurstId(null), 900);

    /* Scroll to section */
    const scrollTarget = getSectionScrollY(node.id);
    window.scrollTo({ top: scrollTarget, behavior: "smooth" });

    /* Ripple from section origin */
    const section = SECTION_BY_ID[node.id];
    if (section) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const coords = (() => {
        switch (section.ripple_origin_hint) {
          case "search-box":
            return { x: vw / 2, y: vh * 0.22 };
          case "left-panel":
            return { x: vw * 0.25, y: vh * 0.5 };
          case "right-panel":
            return { x: vw * 0.72, y: vh * 0.5 };
          default:
            return { x: vw / 2, y: vh / 2 };
        }
      })();
      setTimeout(() => pulseAt(coords.x, coords.y, 1.5), 300);
    }
  };

  const splinePath = buildSplinePath();
  /* Active spline color: amber when searching, teal when locked */
  const activeSplineColor = isLocked ? SPLINE_TEAL : SPLINE_AMBER;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 10,
        overflow: "hidden",
      }}
    >
      {/* SVG spline */}
      <svg
        ref={svgRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          overflow: "visible",
        }}
        viewBox={`0 0 ${svgSize.w} ${svgSize.h}`}
        preserveAspectRatio="none"
      >
        <defs>
          {/* Animated gradient: amber → teal based on lock state */}
          <linearGradient id="kqt-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={activeSplineColor}
              stopOpacity="0.7"
              style={{ transition: "stop-color 0.8s ease" }}
            />
            <stop
              offset="50%"
              stopColor="#7C3AED"
              stopOpacity="0.4"
            />
            <stop
              offset="100%"
              stopColor={isLocked ? SPLINE_TEAL : SPLINE_AMBER}
              stopOpacity="0.35"
              style={{ transition: "stop-color 0.8s ease" }}
            />
          </linearGradient>
          {/* Packet dot filter */}
          <filter id="kqt-glow">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background trace — dim constant path */}
        {splinePath && (
          <path
            d={splinePath}
            fill="none"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="1"
          />
        )}

        {/* Animated draw-in path */}
        {splinePath && (
          <motion.path
            id="kqt-spline-path"
            d={splinePath}
            fill="none"
            stroke="url(#kqt-gradient)"
            strokeWidth="1.5"
            strokeDasharray="8 4"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={
              pathDrawn
                ? { pathLength: 1, opacity: 1 }
                : { pathLength: 0, opacity: 0 }
            }
            transition={{ duration: 2.4, ease: "easeOut", delay: 0.3 }}
          />
        )}

        {/* Traveling packet dots — 3 amber dots moving along spline */}
        {splinePath && pathDrawn && (
          <>
            {[0, 1, 2].map((i) => (
              <g key={`packet-${i}`} filter="url(#kqt-glow)">
                <circle r="2.5" fill={activeSplineColor} opacity="0.85">
                  <animateMotion
                    dur={`${2.2 + i * 0.7}s`}
                    begin={`${i * 0.55}s`}
                    repeatCount="indefinite"
                  >
                    <mpath href="#kqt-spline-path" />
                  </animateMotion>
                </circle>
              </g>
            ))}
          </>
        )}
      </svg>

      {/* Routing nodes */}
      {nodes.map((node, index) => {
        const pos = getNodePos(node.id, index);
        const color = NODE_TONE[node.tone] || "#2DD4BF";
        const isBursting = burstId === node.id;

        return (
          <div
            key={node.id}
            style={{
              position: "absolute",
              left: pos.x,
              top: pos.y,
              transform: "translate(-50%, -50%)",
              pointerEvents: "auto",
              cursor: "pointer",
            }}
            onMouseEnter={() => handleNodeHover(node.id, true)}
            onMouseLeave={() => handleNodeHover(node.id, false)}
            onClick={() => handleNodeClick(node, index)}
          >
            {/* Burst rings — CSS animation for the active-node burst */}
            {isBursting && (
              <>
                <div className="kqt-burst-ring" />
                <div className="kqt-burst-ring" />
                <div className="kqt-burst-ring" />
              </>
            )}

            {/* Framer burst rings for click */}
            <AnimatePresence>
              {isBursting && (
                <>
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      style={{
                        position: "absolute",
                        borderRadius: "50%",
                        border: `1px solid ${color}`,
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                      }}
                      initial={{ width: 12, height: 12, opacity: 0.9 }}
                      animate={{
                        width: 60 + i * 20,
                        height: 60 + i * 20,
                        opacity: 0,
                      }}
                      exit={{}}
                      transition={{
                        duration: 0.6 + i * 0.15,
                        ease: "easeOut",
                      }}
                    />
                  ))}
                </>
              )}
            </AnimatePresence>

            {/* Active glow ring */}
            {node.isActive && (
              <motion.div
                style={{
                  position: "absolute",
                  borderRadius: "50%",
                  border: `1px solid ${SPLINE_AMBER}`,
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  boxShadow: `0 0 8px ${SPLINE_AMBER}50`,
                }}
                animate={{
                  width: [20, 30, 20],
                  height: [20, 30, 20],
                  opacity: [0.8, 0.2, 0.8],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            )}

            {/* Node dot */}
            <motion.div
              style={{
                width: node.isActive ? 10 : 7,
                height: node.isActive ? 10 : 7,
                borderRadius: "50%",
                background: node.isActive
                  ? SPLINE_AMBER
                  : `${color}60`,
                border: `1px solid ${node.isActive ? SPLINE_AMBER : color}`,
                transition: "width 0.2s, height 0.2s, background 0.3s",
                boxShadow: node.isActive
                  ? `0 0 12px ${SPLINE_AMBER}90`
                  : "none",
              }}
              animate={
                !node.isActive
                  ? { y: [0, -3, 0] }
                  : {}
              }
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
                delay: driftPhaseRef.current[node.id] || 0,
              }}
            />

            {/* Hover label */}
            <AnimatePresence>
              {node.isHovered && (
                <motion.div
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: "absolute",
                    left: "calc(100% + 10px)",
                    top: "50%",
                    transform: "translateY(-50%)",
                    whiteSpace: "nowrap",
                    fontSize: "10px",
                    fontFamily: "monospace",
                    color: color,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    pointerEvents: "none",
                    background: "rgba(12,14,16,0.85)",
                    padding: "3px 7px",
                    borderRadius: "3px",
                    border: `1px solid ${color}30`,
                  }}
                >
                  {node.label}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
