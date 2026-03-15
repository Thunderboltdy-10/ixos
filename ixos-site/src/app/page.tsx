"use client";

import Link from "next/link";
import { useRef, useState, useEffect, useMemo } from "react";
import { motion, useInView } from "framer-motion";
import { CSSLattice } from "@/components/effects/CSSLattice";
import { useDecodeEffect } from "@/hooks/useDecodeEffect";
import { CornerBrackets } from "@/components/effects/CornerBrackets";
import { WorkstreamsSection } from "@/components/sections/WorkstreamsSection";
import { DemoSurface } from "@/landing/DemoSurface";

/* ──────────────────────────────────────────────
   Ambient: subtle radar ping, no scan beam
   ────────────────────────────────────────────── */
function RadarPing() {
  const [pingKey, setPingKey] = useState(0);
  const [active, setActive] = useState(false);
  const [pingY, setPingY] = useState(50);

  useEffect(() => {
    function firePing() {
      setPingY(20 + Math.random() * 60);
      setPingKey((k) => k + 1);
      setActive(true);
      setTimeout(() => setActive(false), 3200);
    }

    const t = setTimeout(() => {
      firePing();
      const iv = setInterval(firePing, 14000);
      return () => clearInterval(iv);
    }, 5000);

    return () => clearTimeout(t);
  }, []);

  if (!active) return null;

  return (
    <div
      className="fixed pointer-events-none z-30"
      style={{ left: "50%", top: `${pingY}vh`, transform: "translate(-50%, -50%)" }}
    >
      <div
        key={`ping-${pingKey}`}
        style={{
          width: "80vw",
          height: "80vw",
          maxWidth: "80vw",
          borderRadius: "50%",
          border: "1px solid rgba(246,185,76,0.10)",
          animation: "radar-ping 3.2s ease-out forwards",
        }}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────
   Section kicker
   ────────────────────────────────────────────── */
function SectionKicker({
  label,
  color = "text-amber-400/60",
}: {
  label: string;
  color?: string;
}) {
  return (
    <div className={`text-xs font-mono tracking-[0.3em] uppercase mb-4 ${color}`}>
      ▸ {label}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Grid overlay — static only, no moving scan line
   ────────────────────────────────────────────── */
function GridOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(rgba(246,185,76,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(246,185,76,0.2) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `linear-gradient(rgba(246,185,76,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(246,185,76,0.3) 1px, transparent 1px)`,
          backgroundSize: "200px 200px",
        }}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────
   Decoded heading
   ────────────────────────────────────────────── */
function DecodedHeading({
  text,
  as: Tag = "h2",
  className = "text-4xl md:text-5xl font-bold font-mono",
  delay = 0,
}: {
  text: string;
  as?: "h1" | "h2" | "h3";
  className?: string;
  delay?: number;
}) {
  const { ref, display } = useDecodeEffect(text, delay);
  return (
    <Tag
      ref={ref as React.Ref<HTMLHeadingElement>}
      className={className}
      style={{ letterSpacing: "-0.02em", lineHeight: 1.1 }}
    >
      {display}
    </Tag>
  );
}

/* ──────────────────────────────────────────────
   Signal Locked badge
   ────────────────────────────────────────────── */
function SignalLocked({ delay = 0 }: { delay?: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 border border-amber-400/30 rounded text-xs font-mono text-amber-400/60 uppercase tracking-widest transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
      Signal Locked
    </div>
  );
}

/* ──────────────────────────────────────────────
   Scroll-triggered clip-path + fade reveal
   ────────────────────────────────────────────── */
function ScanSection({
  children,
  threshold = 0.05,
  clipFrom = "right",
}: {
  children: React.ReactNode;
  threshold?: number;
  clipFrom?: "left" | "right";
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px 0px 0px" }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);

  const clipStart = clipFrom === "right" ? "inset(0 100% 0 0)" : "inset(0 0 0 100%)";
  const clipEnd = "inset(0 0% 0 0)";

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0.04,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        clipPath: visible ? clipEnd : clipStart,
        transition: `opacity 1.2s ease, transform 1.2s ease, clip-path 1.8s cubic-bezier(0.16, 1, 0.3, 1) 200ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Score bar
   ────────────────────────────────────────────── */
function ScoreBar({
  label,
  value,
  color,
  inView,
  delay = 0,
}: {
  label: string;
  value: number;
  color: string;
  inView: boolean;
  delay?: number;
}) {
  return (
    <div className="mb-6">
      <div className="flex justify-between mb-2">
        <span className="text-sm text-white/50 font-mono uppercase tracking-widest">{label}</span>
        <span className="text-sm font-mono" style={{ color }}>
          {value.toFixed(2)}
        </span>
      </div>
      <div className="h-1.5 rounded-none bg-white/5 overflow-hidden">
        <motion.div
          className="h-full"
          style={{ backgroundColor: color }}
          initial={{ width: "0%" }}
          animate={inView ? { width: `${value * 100}%` } : {}}
          transition={{ duration: 0.8, delay, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Signal Feed
   ────────────────────────────────────────────── */
const LOG_LINES = [
  { time: "14:32:11", op: "SCAN ", file: "src/auth/token-manager.ts        ", status: "0.78", color: "text-teal-400" },
  { time: "14:32:11", op: "EMBED", file: "model2vec f16 vector             ", status: "DONE", color: "text-amber-400" },
  { time: "14:32:11", op: "HMAC ", file: "sha256 signature verified        ", status: "LOCKED", color: "text-amber-400" },
  { time: "14:32:12", op: "RANK ", file: "hybrid_engine candidates=47      ", status: "READY", color: "text-teal-400" },
  { time: "14:32:12", op: "CACHE", file: "ADS write completed              ", status: "✓", color: "text-green-400" },
  { time: "14:32:13", op: "SCAN ", file: "src/middleware/jwt.ts            ", status: "0.64", color: "text-teal-400" },
  { time: "14:32:13", op: "EMBED", file: "cache hit (ADS)                  ", status: "HIT", color: "text-amber-400" },
  { time: "14:32:14", op: "RANK ", file: "score=0.91 threshold=0.60        ", status: "MATCH", color: "text-green-400" },
  { time: "14:32:14", op: "ATTEST", file: "ed25519 signature applied       ", status: "SIGNED", color: "text-amber-400" },
];

function SignalFeed() {
  const [lines, setLines] = useState<typeof LOG_LINES>([]);
  const idx = useRef(0);

  useEffect(() => {
    const initial = LOG_LINES.slice(0, 4);
    setLines(initial);
    idx.current = 4;

    const interval = setInterval(() => {
      setLines((prev) => {
        const next = [...prev, LOG_LINES[idx.current % LOG_LINES.length]];
        idx.current++;
        return next.slice(-12);
      });
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <ScanSection clipFrom="left">
      <section className="py-24 px-6 relative">
        <div className="max-w-4xl mx-auto relative">
          <CornerBrackets size={20} color="rgba(246,185,76,0.15)" />
          <div className="p-8">
            <SectionKicker label="Signal Feed — Live" color="text-teal-400/70" />
            <DecodedHeading text="Every operation. Logged. Signed." delay={100} />
            <p className="mt-4 text-white/50 font-mono text-sm max-w-xl mb-8">
              Watch the engine in real-time: each file scan, embedding, HMAC verification,
              and ranking step surfaces as a timestamped operation record.
            </p>
            <div className="font-mono text-xs bg-[#0A0D0F]/90 border border-amber-400/10 p-6 h-64 overflow-hidden relative">
              <div className="absolute top-3 right-4 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse" />
                <span className="text-teal-400/50 text-[10px] uppercase tracking-widest">live</span>
              </div>
              <div
                className="absolute top-0 left-0 right-0 h-16 pointer-events-none z-10"
                style={{ background: "linear-gradient(to bottom, #0A0D0F 0%, transparent 100%)" }}
              />
              <div className="absolute bottom-6 left-6 right-6 space-y-1.5">
                {lines.map((line, i) => (
                  <div
                    key={i}
                    className="flex gap-3"
                    style={{
                      opacity: Math.min(1, (i + 1) / Math.max(lines.length, 1)),
                      transition: "opacity 0.6s ease",
                    }}
                  >
                    <span className="text-white/25 shrink-0">[{line.time}]</span>
                    <span className="text-white/50 shrink-0">{line.op}</span>
                    <span className="text-white/35 flex-1 truncate">{line.file}</span>
                    <span className={`${line.color} shrink-0`}>{line.status}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <SignalLocked delay={800} />
            </div>
          </div>
        </div>
      </section>
    </ScanSection>
  );
}

/* ──────────────────────────────────────────────
   Threat Model
   ────────────────────────────────────────────── */
function ThreatModelSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <ScanSection clipFrom="right">
      <section className="py-24 px-6 relative">
        <div className="max-w-4xl mx-auto relative">
          <CornerBrackets size={20} color="rgba(246,185,76,0.15)" />
          <div className="p-8">
            <SectionKicker label="Threat Model" />
            <DecodedHeading text="Cloud search = code exfiltration." delay={80} />
            <p className="mt-4 text-white/50 font-mono text-sm max-w-xl mb-10">
              Every cloud-based search indexes your proprietary codebase on remote servers.
              Every query you run teaches them your architecture. Ixos sends nothing.
            </p>

            <div ref={ref} className="space-y-5 max-w-2xl">
              <div>
                <div className="flex justify-between text-xs font-mono mb-1.5">
                  <span className="text-white/40 uppercase tracking-widest">Cloud Search</span>
                  <span className="text-red-400">~2.4 GB / month</span>
                </div>
                <div className="h-2 bg-white/5 overflow-hidden relative">
                  <motion.div
                    className="h-full bg-red-500/70 absolute left-0 top-0"
                    initial={{ width: "0%" }}
                    animate={inView ? { width: "100%" } : {}}
                    transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                  />
                </div>
                <div className="mt-1 text-[10px] font-mono text-white/20 uppercase tracking-widest">
                  Files indexed, queries logged, architecture exposed
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono mb-1.5">
                  <span className="text-amber-400 uppercase tracking-widest">Ixos Protocol</span>
                  <span className="text-amber-400">0 B</span>
                </div>
                <div className="h-2 bg-white/5 overflow-hidden relative">
                  <div className="h-full w-0 bg-amber-400" />
                </div>
                <div className="mt-1 text-[10px] font-mono text-amber-400/40 uppercase tracking-widest">
                  Zero bytes transmitted. Zero telemetry. Zero trust required.
                </div>
              </div>

              <div className="pt-4 font-mono text-[11px] text-white/15 leading-relaxed">
                <div>┌─────────────────────────────────────────────────────────┐</div>
                <div>│  IXOS SENDS: 0 bytes.  Every search stays on your SSD. │</div>
                <div>└─────────────────────────────────────────────────────────┘</div>
              </div>
            </div>

            <div className="mt-6">
              <SignalLocked delay={1200} />
            </div>
          </div>
        </div>
      </section>
    </ScanSection>
  );
}

/* ──────────────────────────────────────────────
   Footer CTA
   ────────────────────────────────────────────── */
function FooterCTA() {
  return (
    <ScanSection clipFrom="right">
      <section id="download" className="py-32 px-6 relative">
        <div className="max-w-3xl mx-auto text-center relative">
          <CornerBrackets size={24} color="rgba(246,185,76,0.2)" />
          <div className="p-12">
            <SectionKicker label="Acquire" color="text-amber-400/60" />
            <DecodedHeading
              text="Stop searching the cloud."
              as="h2"
              className="text-4xl md:text-5xl font-bold font-mono"
              delay={50}
            />
            <p className="mt-6 mb-10 text-white/45 font-mono text-sm max-w-lg mx-auto leading-relaxed">
              Your code deserves a search engine that respects it. Local-first.
              Sub-second. Cryptographically verifiable.
            </p>
            <Link
              href="/download"
              className="inline-block px-10 py-4 bg-amber-400 text-[#0A0D0F] font-mono font-bold text-sm hover:bg-amber-300 transition-colors shadow-lg shadow-amber-400/20"
            >
              ▸ Download Ixos
            </Link>
            <div className="mt-8 flex flex-wrap justify-center gap-6 text-xs font-mono text-white/25">
              <span>macOS / Windows / Linux</span>
              <span className="text-white/10">|</span>
              <span>MIT License</span>
              <span className="text-white/10">|</span>
              <span>Zero telemetry</span>
            </div>
          </div>
        </div>
        <div className="mt-12 text-center text-white/15 text-xs font-mono">
          © 2026 Ixos Inc. All rights reserved.
        </div>
      </section>
    </ScanSection>
  );
}

/* ──────────────────────────────────────────────
   Amber Lattice — 3D file graph for hero bg
   ────────────────────────────────────────────── */
const AMBER_CLUSTER_COLORS = [
  { color: "#F6B94C", glowColor: "rgba(246,185,76,0.8)" },
  { color: "#E8A93A", glowColor: "rgba(232,169,58,0.8)" },
  { color: "#14B8A6", glowColor: "rgba(20,184,166,0.8)" },
  { color: "#FCD34D", glowColor: "rgba(252,211,77,0.8)" },
  { color: "#D97706", glowColor: "rgba(217,119,6,0.8)" },
];

const LATTICE_CLUSTER_CENTERS: [number, number, number][] = [
  [-180, -120, 80],
  [170, -150, -100],
  [40, 160, 130],
  [-150, 100, -120],
  [240, 30, 50],
];
const LATTICE_NODES_PER_CLUSTER = 18;

interface LatticeNode {
  x: number; y: number; z: number;
  id: number; clusterId: number;
  freqX: number; freqY: number; freqZ: number;
  phaseX: number; phaseY: number; phaseZ: number;
  ampX: number; ampY: number; ampZ: number;
}

function buildLatticeNodes(): LatticeNode[] {
  const nodes: LatticeNode[] = [];
  for (let c = 0; c < 5; c++) {
    const [cx, cy, cz] = LATTICE_CLUSTER_CENTERS[c];
    for (let n = 0; n < LATTICE_NODES_PER_CLUSTER; n++) {
      const id = c * LATTICE_NODES_PER_CLUSTER + n;
      const golden = 2.399963;
      const theta = n * golden;
      const phi = Math.acos(1 - (2 * (n + 0.5)) / LATTICE_NODES_PER_CLUSTER);
      const r = 65 + (id % 9) * 10;
      const ox = Math.sin(phi) * Math.cos(theta) * r;
      const oy = Math.sin(phi) * Math.sin(theta) * r;
      const oz = Math.cos(phi) * r * 0.55;
      const freqBase = 0.00022 + (id % 9) * 0.000012;
      nodes.push({
        x: cx + ox, y: cy + oy, z: cz + oz,
        id, clusterId: c,
        freqX: freqBase * (1 + (id % 3) * 0.3),
        freqY: freqBase * (1 + (id % 5) * 0.2),
        freqZ: freqBase * (1 + (id % 7) * 0.15),
        phaseX: (id * 1.618) % (Math.PI * 2),
        phaseY: (id * 2.618) % (Math.PI * 2),
        phaseZ: (id * 0.987) % (Math.PI * 2),
        ampX: 10 + (id % 7) * 2, ampY: 8 + (id % 5) * 2, ampZ: 5 + (id % 4) * 1.5,
      });
    }
  }
  return nodes;
}

function buildLatticeEdges(nodes: LatticeNode[]): [number, number, number, boolean][] {
  const edges: [number, number, number, boolean][] = [];
  for (let c = 0; c < 5; c++) {
    const start = c * LATTICE_NODES_PER_CLUSTER;
    const end = start + LATTICE_NODES_PER_CLUSTER;
    for (let i = start; i < end; i++) {
      for (let j = i + 1; j < end; j++) {
        const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y, dz = nodes[i].z - nodes[j].z;
        if (Math.sqrt(dx*dx+dy*dy+dz*dz) < 130) edges.push([i, j, c, false]);
      }
    }
  }
  for (let c1 = 0; c1 < 5; c1++) {
    for (let c2 = c1+1; c2 < 5; c2++) {
      const s1 = c1*LATTICE_NODES_PER_CLUSTER, s2 = c2*LATTICE_NODES_PER_CLUSTER;
      for (let i = s1; i < s1+LATTICE_NODES_PER_CLUSTER; i+=3) {
        for (let j = s2; j < s2+LATTICE_NODES_PER_CLUSTER; j+=3) {
          const dx = nodes[i].x-nodes[j].x, dy = nodes[i].y-nodes[j].y, dz = nodes[i].z-nodes[j].z;
          if (Math.sqrt(dx*dx+dy*dy+dz*dz) < 230) edges.push([i, j, -1, true]);
        }
      }
    }
  }
  return edges;
}

function projectLattice(x:number,y:number,z:number,rotY:number,rotX:number,fov:number,cx:number,cy:number) {
  const cosY=Math.cos(rotY),sinY=Math.sin(rotY);
  const rx=x*cosY+z*sinY, rz=-x*sinY+z*cosY;
  const cosX=Math.cos(rotX),sinX=Math.sin(rotX);
  const ry=y*cosX-rz*sinX, rz2=y*sinX+rz*cosX;
  const depth=fov+rz2, scale=fov/Math.max(depth,1);
  return { sx: cx+rx*scale, sy: cy+ry*scale, scale };
}

const hexToRgbCache: Record<string, [number,number,number]> = {};
function hexToRgb(hex: string): [number,number,number] {
  if (hexToRgbCache[hex]) return hexToRgbCache[hex];
  const h = hex.replace("#","");
  const result: [number,number,number] = [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
  hexToRgbCache[hex] = result;
  return result;
}

function AmberLattice() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const tRef = useRef<number>(0);
  const nodes = useMemo(() => buildLatticeNodes(), []);
  const edges = useMemo(() => buildLatticeEdges(nodes), [nodes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width*dpr; canvas.height = rect.height*dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    let lastTime = performance.now();
    const tick = (now: number) => {
      const dt = now-lastTime; lastTime = now; tRef.current += dt;
      const t = tRef.current;
      const W = canvas.getBoundingClientRect().width;
      const H = canvas.getBoundingClientRect().height;
      const cx = W/2, cy = H/2, fov = 700;
      const rotY = t*0.00012, rotX = 0.12+Math.sin(t*0.00004)*0.04;
      const clusterPhases = LATTICE_CLUSTER_CENTERS.map((_,ci)=>({
        ox: Math.sin(t*0.00007+ci*1.3)*20, oy: Math.cos(t*0.00005+ci*0.9)*16, oz: Math.sin(t*0.00003+ci*2.1)*12,
      }));
      const pos = nodes.map((nd) => {
        const cp = clusterPhases[nd.clusterId];
        return projectLattice(
          nd.x+Math.sin(t*nd.freqX+nd.phaseX)*nd.ampX+cp.ox,
          nd.y+Math.sin(t*nd.freqY+nd.phaseY)*nd.ampY+cp.oy,
          nd.z+Math.sin(t*nd.freqZ+nd.phaseZ)*nd.ampZ+cp.oz,
          rotY, rotX, fov, cx, cy
        );
      });
      ctx.clearRect(0, 0, W, H);
      for (const [a,b,clusterId,isInter] of edges) {
        const pa=pos[a], pb=pos[b];
        const baseAlpha = isInter ? 0.015+pa.scale*0.025 : 0.04+pa.scale*0.06;
        ctx.beginPath(); ctx.moveTo(pa.sx,pa.sy); ctx.lineTo(pb.sx,pb.sy);
        if (isInter) ctx.strokeStyle=`rgba(246,185,76,${(baseAlpha*0.5).toFixed(3)})`;
        else {
          const cc = AMBER_CLUSTER_COLORS[Math.max(0,clusterId)];
          const [r2,g2,b2] = hexToRgb(cc.color);
          ctx.strokeStyle=`rgba(${r2},${g2},${b2},${baseAlpha.toFixed(3)})`;
        }
        ctx.lineWidth = isInter ? 0.3 : 0.6;
        ctx.stroke();
      }
      for (const nd of nodes) {
        const p=pos[nd.id];
        const cc=AMBER_CLUSTER_COLORS[nd.clusterId];
        const [r2,g2,b2]=hexToRgb(cc.color);
        const r=1.8+p.scale*1.6;
        const alpha=0.2+p.scale*0.4;
        ctx.beginPath(); ctx.arc(p.sx,p.sy,r,0,Math.PI*2);
        ctx.fillStyle=`rgba(${r2},${g2},${b2},${alpha.toFixed(3)})`;
        ctx.fill();
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, [nodes, edges]);

  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute inset-0 pointer-events-none z-10" style={{ background: "radial-gradient(ellipse 85% 85% at 50% 50%, transparent 20%, #0A0D0F 80%)" }} />
      <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none z-10" style={{ background: "linear-gradient(to top, #0A0D0F 0%, transparent 100%)" }} />
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
    </div>
  );
}

/* ──────────────────────────────────────────────
   Comparison Table
   ────────────────────────────────────────────── */
type CellValue = 'yes' | 'no' | 'partial' | 'pro';
interface CompFeature {
  feature: string;
  ixos: CellValue;
  grep: CellValue;
  spotlight: CellValue;
  vscode: CellValue;
  note: string;
}
const COMP_FEATURES: CompFeature[] = [
  { feature: 'Full-text keyword search', ixos: 'yes', grep: 'yes', spotlight: 'yes', vscode: 'yes', note: 'Industry baseline — all tools handle this.' },
  { feature: 'Semantic understanding', ixos: 'yes', grep: 'no', spotlight: 'partial', vscode: 'no', note: 'Meaning-based matching, not just string proximity.' },
  { feature: 'Local-first / no egress', ixos: 'yes', grep: 'yes', spotlight: 'partial', vscode: 'partial', note: 'Spotlight may sync via iCloud; VS Code extensions vary.' },
  { feature: 'Progressive results', ixos: 'yes', grep: 'no', spotlight: 'no', vscode: 'no', note: 'Results stream as confidence increases.' },
  { feature: 'No background daemon', ixos: 'yes', grep: 'yes', spotlight: 'no', vscode: 'partial', note: 'Spotlight indexes continuously. VS Code workspace indexing varies.' },
  { feature: 'Hybrid retrieval', ixos: 'yes', grep: 'no', spotlight: 'no', vscode: 'no', note: 'Lexical + semantic in a single pass.' },
  { feature: 'Cryptographic cache signing', ixos: 'yes', grep: 'no', spotlight: 'no', vscode: 'no', note: 'HMAC-SHA256 on every cached embedding.' },
  { feature: 'Cross-platform', ixos: 'yes', grep: 'yes', spotlight: 'no', vscode: 'yes', note: 'Windows, macOS, Linux. Spotlight is macOS-only.' },
  { feature: 'Natural language queries', ixos: 'pro', grep: 'no', spotlight: 'no', vscode: 'no', note: 'Pro tier.' },
];
const COMP_TOOLS = ['Ixos', 'grep/rg', 'Spotlight', 'VS Code'];
function CompSymbol({ value, isIxos }: { value: CellValue; isIxos: boolean }) {
  if (value === 'yes') return <span style={{ fontSize: 14, color: isIxos ? '#F6B94C' : 'rgba(255,255,255,0.35)', fontWeight: isIxos ? 700 : 400 }}>■</span>;
  if (value === 'no') return <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.15)' }}>—</span>;
  if (value === 'partial') return <span style={{ fontSize: 14, color: 'rgba(245,158,11,0.6)' }}>◐</span>;
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, color: '#F6B94C', fontFamily: 'var(--font-ixo-mono, monospace)', letterSpacing: '0.05em' }}><span style={{ fontSize: 13 }}>◆</span><span style={{ fontSize: 8, opacity: 0.8 }}>PRO</span></span>;
}
function ComparisonTable() {
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <div style={{ background: 'rgb(16,20,26)', border: '1px solid rgba(246,185,76,0.15)', borderTop: '2px solid rgba(246,185,76,0.25)', borderRadius: 0, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '12px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(246,185,76,0.02)', gap: 8 }}>
        <div className="font-mono uppercase" style={{ fontSize: 9, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.2)' }}>Capability</div>
        {COMP_TOOLS.map((tool, i) => (
          <div key={tool} className="font-mono" style={{ fontSize: 10, textAlign: 'center', color: i === 0 ? 'rgba(246,185,76,0.85)' : 'rgba(255,255,255,0.3)', letterSpacing: '0.05em', fontWeight: i === 0 ? 600 : 400, background: i === 0 ? 'rgba(246,185,76,0.06)' : 'transparent', borderRadius: 3, padding: '2px 4px' }}>{tool}</div>
        ))}
      </div>
      <div style={{ padding: '8px 0' }}>
        {COMP_FEATURES.map((feat, i) => (
          <div key={feat.feature} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{ borderRadius: 4, background: hovered === i ? 'rgba(255,255,255,0.02)' : 'transparent', transition: 'background 0.2s', cursor: 'default' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', alignItems: 'center', padding: '11px 12px', gap: 8 }}>
              <div className="font-mono" style={{ fontSize: 12, color: 'rgba(243,245,247,0.65)', letterSpacing: '0.01em' }}>{feat.feature}</div>
              {(['ixos', 'grep', 'spotlight', 'vscode'] as const).map((k) => (
                <div key={k} style={{ textAlign: 'center', background: k === 'ixos' ? 'rgba(246,185,76,0.04)' : 'transparent', borderRadius: 3, padding: '2px 4px' }}>
                  <CompSymbol value={feat[k]} isIxos={k === 'ixos'} />
                </div>
              ))}
            </div>
            <div className="font-mono" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', padding: '0 12px 10px', lineHeight: 1.5, borderLeft: `2px solid rgba(246,185,76,${hovered === i ? 0.2 : 0})`, marginLeft: 12, marginRight: 12, marginBottom: 4, opacity: hovered === i ? 1 : 0, maxHeight: hovered === i ? 60 : 0, overflow: 'hidden', transition: 'opacity 0.2s, max-height 0.2s, border-color 0.2s' }}>{feat.note}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, padding: '12px', borderTop: '1px solid rgba(255,255,255,0.04)', alignItems: 'center' }}>
        {[{ symbol: '■', label: 'Supported', color: 'rgba(246,185,76,0.7)' }, { symbol: '◐', label: 'Partial', color: 'rgba(245,158,11,0.6)' }, { symbol: '—', label: 'Not supported', color: 'rgba(255,255,255,0.2)' }, { symbol: '◆', label: 'Pro tier', color: '#F6B94C' }].map((item) => (
          <div key={item.label} className="font-mono" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
            <span style={{ color: item.color, fontSize: 12 }}>{item.symbol}</span>{item.label}
          </div>
        ))}
        <div className="font-mono" style={{ marginLeft: 'auto', fontSize: 9, color: 'rgba(255,255,255,0.15)', letterSpacing: '0.05em' }}>From public documentation. Accurate as of 2026.</div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Hero Mockup — matches actual Ixos desktop app
   ────────────────────────────────────────────── */
const HERO_RESULTS = [
  {
    path: "C:\\Users\\pablo\\Downloads\\Ixos\\src\\auth\\token-manager.ts",
    short: "src/auth/token-manager.ts",
    line: 1,
    name: "token-manager.ts",
    snippet: "/// Handles authentication token rotation and refresh logic",
    score: "91.2%",
  },
  {
    path: "C:\\Users\\pablo\\Downloads\\Ixos\\src\\middleware\\jwt.ts",
    short: "src/middleware/jwt.ts",
    line: 1,
    name: "jwt.ts",
    snippet: "use ixos_protocol::auth::JwtMiddleware;",
    score: "88.4%",
  },
  {
    path: "C:\\Users\\pablo\\Downloads\\Ixos\\src\\api\\auth\\refresh.ts",
    short: "src/api/auth/refresh.ts",
    line: 1,
    name: "refresh.ts",
    snippet: "/// POST /auth/refresh — validates token, issues new JWT",
    score: "85.0%",
  },
  {
    path: "C:\\Users\\pablo\\Downloads\\Ixos\\src\\lib\\session.ts",
    short: "src/lib/session.ts",
    line: 1,
    name: "session.ts",
    snippet: "pub async fn rotate_session_token(user_id: UserId) -> Result<Token>",
    score: "81.7%",
  },
  {
    path: "C:\\Users\\pablo\\Downloads\\Ixos\\src\\security\\crypto.rs",
    short: "src/security/crypto.rs",
    line: 1,
    name: "crypto.rs",
    snippet: "/// HMAC-SHA256 signing and verification for cached embeddings",
    score: "74.3%",
  },
];

function HeroMockup() {
  const SIDEBAR_BG = "#0B0E12";
  const MAIN_BG = "#0E1218";
  const PANEL_BG = "#111620";
  const BORDER = "rgba(255,255,255,0.06)";

  return (
    <div
      className="w-full h-full font-mono flex overflow-hidden"
      style={{ background: MAIN_BG, color: "#E6EDF3", fontSize: 12 }}
    >
      {/* ── Left Sidebar ─────────────────────────────── */}
      <div
        style={{
          width: 188,
          flexShrink: 0,
          background: SIDEBAR_BG,
          borderRight: `1px solid ${BORDER}`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Logo + New */}
        <div
          style={{
            padding: "11px 14px",
            borderBottom: `1px solid ${BORDER}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 20,
                height: 20,
                background: "#14B8A6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 900,
                color: "#0A0D0F",
              }}
            >
              ✕
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#F3F5F7" }}>Ixos</span>
          </div>
          <div
            style={{
              padding: "3px 8px",
              fontSize: 10,
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${BORDER}`,
              color: "rgba(255,255,255,0.45)",
              cursor: "pointer",
            }}
          >
            + New
          </div>
        </div>

        {/* Nav */}
        <div style={{ padding: "6px 0" }}>
          {[
            { label: "Search", icon: "⌕", active: true, pro: false },
            { label: "Today", icon: "◷", active: false, pro: true },
            { label: "Workstreams", icon: "⋮", active: false, pro: true },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                padding: "7px 14px",
                display: "flex",
                alignItems: "center",
                gap: 9,
                background: item.active ? "rgba(20,184,166,0.09)" : "transparent",
                borderLeft: item.active ? "2px solid #14B8A6" : "2px solid transparent",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  color: item.active ? "#14B8A6" : "rgba(255,255,255,0.35)",
                }}
              >
                {item.icon}
              </span>
              <span
                style={{
                  flex: 1,
                  fontSize: 12,
                  color: item.active ? "#14B8A6" : "rgba(255,255,255,0.45)",
                }}
              >
                {item.label}
              </span>
              {item.pro && (
                <span
                  style={{
                    fontSize: 7,
                    padding: "1px 5px",
                    background: "rgba(246,185,76,0.15)",
                    color: "#F6B94C",
                    border: "1px solid rgba(246,185,76,0.25)",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                  }}
                >
                  PRO
                </span>
              )}
            </div>
          ))}
        </div>

        {/* History */}
        <div style={{ borderTop: `1px solid ${BORDER}`, padding: "10px 0", flex: 1, overflow: "hidden" }}>
          <div
            style={{
              padding: "0 14px 8px",
              display: "flex",
              gap: 12,
              fontSize: 10,
              color: "rgba(255,255,255,0.3)",
            }}
          >
            <span style={{ color: "rgba(255,255,255,0.65)", borderBottom: "1px solid rgba(255,255,255,0.3)", paddingBottom: 2 }}>
              Recent
            </span>
            <span>Starred</span>
          </div>
          <div
            style={{
              margin: "0 10px 8px",
              padding: "5px 8px",
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${BORDER}`,
              fontSize: 10,
              color: "rgba(255,255,255,0.2)",
            }}
          >
            Filter history...
          </div>
          {[
            { q: "authentication token refresh", n: 5, t: "18h" },
            { q: "ixos", n: 20, t: "18h" },
          ].map((item, i) => (
            <div
              key={item.q}
              style={{
                padding: "7px 14px",
                borderBottom: `1px solid ${BORDER}`,
                background: i === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.6)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  marginBottom: 2,
                }}
              >
                {item.q}
              </div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.22)" }}>
                {item.n} results · {item.t}
              </div>
            </div>
          ))}
        </div>

        {/* User */}
        <div
          style={{
            padding: "10px 14px",
            borderTop: `1px solid ${BORDER}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: "#7C5CFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
                color: "#fff",
                flexShrink: 0,
              }}
            >
              P
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.7)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                Pablo Martinez Dovale
              </div>
              <div style={{ fontSize: 9, color: "#F6B94C", fontWeight: 700, letterSpacing: "0.05em" }}>
                PRO
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: 10,
              fontSize: 9,
              color: "rgba(255,255,255,0.25)",
            }}
          >
            <span>Settings</span>
            <span>Billing</span>
            <span>Sign out</span>
          </div>
        </div>
      </div>

      {/* ── Center: Search + Results ──────────────────── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          borderRight: `1px solid ${BORDER}`,
        }}
      >
        {/* Breadcrumb */}
        <div
          style={{
            padding: "9px 16px",
            borderBottom: `1px solid ${BORDER}`,
            fontSize: 11,
            color: "rgba(255,255,255,0.28)",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span>Ixos</span>
          <span style={{ color: "rgba(255,255,255,0.15)" }}>/</span>
          <span style={{ color: "rgba(255,255,255,0.6)" }}>Search</span>
        </div>

        {/* Search input */}
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BORDER}` }}>
          <div
            style={{
              border: "1px solid rgba(20,184,166,0.35)",
              background: "rgba(20,184,166,0.03)",
              overflow: "hidden",
            }}
          >
            {/* Query row */}
            <div
              style={{
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 13 13"
                fill="none"
                style={{ opacity: 0.45, flexShrink: 0 }}
              >
                <circle cx="5.5" cy="5.5" r="4.5" stroke="#14B8A6" strokeWidth="1.2" />
                <path
                  d="M9 9l2.5 2.5"
                  stroke="#14B8A6"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
              <span style={{ fontSize: 14, color: "rgba(255,255,255,0.88)", flex: 1 }}>
                authentication token refresh
              </span>
            </div>
            {/* Folder path row */}
            <div
              style={{
                padding: "6px 14px 9px",
                borderTop: `1px solid rgba(255,255,255,0.04)`,
                display: "flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 11 11"
                fill="none"
                style={{ opacity: 0.3, flexShrink: 0 }}
              >
                <path
                  d="M1 3.5h9v5a1 1 0 01-1 1H2a1 1 0 01-1-1v-5z"
                  stroke="#F3F5F7"
                  strokeWidth="0.9"
                />
                <path d="M1 3.5V3a1 1 0 011-1h2l1 1.5H1z" stroke="#F3F5F7" strokeWidth="0.9" />
              </svg>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.32)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                C:\Users\pablo\Downloads\Ixos
              </span>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", cursor: "pointer" }}>↗</span>
            </div>
          </div>
        </div>

        {/* Results status bar */}
        <div
          style={{
            padding: "6px 16px",
            borderBottom: `1px solid ${BORDER}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 5, color: "rgba(255,255,255,0.3)" }}>
            <span style={{ color: "rgba(20,184,166,0.75)" }}>lexical</span>
            <span style={{ color: "rgba(255,255,255,0.18)" }}>→</span>
            <span style={{ color: "rgba(246,185,76,0.75)" }}>semantic</span>
            <span style={{ color: "rgba(255,255,255,0.18)" }}>→</span>
            <span>lock</span>
            <span style={{ marginLeft: 8, color: "rgba(255,255,255,0.2)" }}>·</span>
            <span style={{ marginLeft: 4 }}>5 matches</span>
            <span style={{ color: "rgba(255,255,255,0.18)", margin: "0 4px" }}>|</span>
            <span>local-first</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "rgba(246,185,76,0.7)", display: "flex", alignItems: "center", gap: 3 }}>
              ✦ FLASH
            </span>
            <span style={{ color: "rgba(20,184,166,0.6)" }}>⊕ LOCAL</span>
            <span style={{ color: "rgba(255,255,255,0.35)", padding: "1px 6px", border: `1px solid rgba(255,255,255,0.12)` }}>
              ⊕ LOCKED
            </span>
          </div>
        </div>

        {/* Results list */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          {HERO_RESULTS.map((r, i) => (
            <div
              key={r.name}
              style={{
                padding: "8px 16px",
                borderBottom: `1px solid rgba(255,255,255,0.025)`,
                background: i === 0 ? "rgba(20,184,166,0.05)" : "transparent",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  color: "rgba(255,255,255,0.22)",
                  flexShrink: 0,
                  paddingTop: 2,
                  width: 18,
                  textAlign: "right",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    color: i === 0 ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.75)",
                    fontWeight: i === 0 ? 600 : 400,
                    marginBottom: 2,
                  }}
                >
                  {r.name}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: "rgba(255,255,255,0.28)",
                    marginBottom: 3,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.short}:{r.line}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.22)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.snippet}
                </div>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: i === 0 ? "#14B8A6" : "rgba(255,255,255,0.32)",
                  flexShrink: 0,
                  paddingTop: 2,
                }}
              >
                {r.score}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right: About Match panel ──────────────────── */}
      <div
        style={{
          width: 260,
          flexShrink: 0,
          background: PANEL_BG,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Panel header */}
        <div
          style={{
            padding: "9px 14px",
            borderBottom: `1px solid ${BORDER}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
            <span style={{ color: "#14B8A6" }}>✦</span>
            <span style={{ fontWeight: 600 }}>About Match</span>
          </div>
          <span
            style={{
              fontSize: 8,
              padding: "2px 6px",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.4)",
              letterSpacing: "0.1em",
            }}
          >
            ⊕ LOCKED
          </span>
        </div>

        {/* File info */}
        <div style={{ padding: "12px 14px", borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.88)", marginBottom: 6 }}>
            token-manager.ts
          </div>
          <div
            style={{
              fontSize: 9,
              color: "rgba(255,255,255,0.3)",
              marginBottom: 4,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            C:\Users\pablo\Downloads\Ixos\src\auth\token-manager.ts
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 9,
              padding: "2px 7px",
              background: "rgba(20,184,166,0.1)",
              border: "1px solid rgba(20,184,166,0.2)",
              color: "#14B8A6",
            }}
          >
            Line 1
          </div>
          <div style={{ marginTop: 10, fontSize: 10, color: "rgba(255,255,255,0.3)", lineHeight: 1.5 }}>
            Rank stabilized by relevance, recency, and integrity-safe retrieval.
          </div>
        </div>

        {/* Score analysis */}
        <div style={{ padding: "12px 14px", flex: 1 }}>
          <div
            style={{
              fontSize: 9,
              color: "rgba(255,255,255,0.25)",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Score Analysis
          </div>
          {[
            { label: "Semantic Similarity", value: 0.28, color: "#14B8A6", display: "28.0%" },
            { label: "Quality Boost", value: 0.73, color: "#7C5CFF", display: "+73.1%" },
          ].map((bar) => (
            <div key={bar.label} style={{ marginBottom: 8 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 10,
                  color: "rgba(255,255,255,0.45)",
                  marginBottom: 4,
                }}
              >
                <span>{bar.label}</span>
                <span style={{ color: bar.color }}>{bar.display}</span>
              </div>
              <div
                style={{
                  height: 3,
                  background: "rgba(255,255,255,0.06)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${bar.value * 100}%`,
                    background: bar.color,
                  }}
                />
              </div>
            </div>
          ))}
          <div
            style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: `1px solid ${BORDER}`,
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
            }}
          >
            <span style={{ color: "rgba(255,255,255,0.4)" }}>Final Match Score</span>
            <span style={{ color: "#14B8A6", fontWeight: 700 }}>91.2%</span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: "10px 14px", borderTop: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", gap: 6 }}>
          {["Open in Editor", "Reveal File"].map((label, i) => (
            <div
              key={label}
              style={{
                padding: "7px 10px",
                background: i === 0 ? "rgba(20,184,166,0.12)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${i === 0 ? "rgba(20,184,166,0.25)" : BORDER}`,
                color: i === 0 ? "#14B8A6" : "rgba(255,255,255,0.5)",
                fontSize: 10,
                textAlign: "center" as const,
                cursor: "pointer",
              }}
            >
              {label}
            </div>
          ))}
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", textAlign: "center" as const, cursor: "pointer" }}>
            ⎘ Copy file path
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   PAGE
   ══════════════════════════════════════════════ */
export default function HomePage() {
  const scoreRef = useRef<HTMLDivElement>(null);
  const scoreInView = useInView(scoreRef, { once: true, margin: "-100px" });

  return (
    <div
      className="relative min-h-screen text-[#f3f5f7] font-mono selection:bg-amber-400/30"
      style={{ overflowX: "clip" }}
    >
      <style>{`
        @keyframes radar-ping {
          0% { transform: scale(0); opacity: 0.22; }
          100% { transform: scale(1); opacity: 0; }
        }
      `}</style>

      <main className="relative z-10">
        {/* ═══════════════════════════════════
            1. HERO
            ═══════════════════════════════════ */}
        <section
          id="hero"
          className="relative min-h-screen flex flex-col items-center justify-center pt-36 pb-16 px-6 z-10"
        >
          {/* Subtle amber glow center */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              width: "60vw",
              height: "40vh",
              background: "radial-gradient(ellipse, rgba(246,185,76,0.04) 0%, transparent 70%)",
            }}
          />

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="relative z-10 text-center mb-12 max-w-4xl mx-auto"
          >
            <div className="mb-6">
              <SectionKicker label="Local-first semantic search — Ixos Protocol" />
            </div>

            <h1
              className="text-5xl sm:text-6xl md:text-8xl font-bold font-mono mb-6"
              style={{ letterSpacing: "-0.03em", lineHeight: 1.05, color: "#F6B94C" }}
            >
              The impact of
              <br />
              <span className="text-[#f3f5f7]">instant search.</span>
            </h1>
            <p className="text-base md:text-lg max-w-2xl mx-auto font-mono text-white/50 leading-relaxed">
              Drop Ixos into your codebase. Watch clarity ripple through your engineering
              workflow. Local-first. Sub-second. Deterministic.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="relative z-10 w-full max-w-5xl overflow-hidden shadow-2xl shadow-black/50"
            style={{ height: 520 }}
          >
            <DemoSurface
              autoType={true}
              autoRun={true}
              displayMode="search-only"
              className="w-full h-full"
              style={{ width: '100%', height: '100%' }}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0 }}
            className="relative z-10 flex flex-wrap justify-center gap-4 mt-10"
          >
            <Link
              href="/download"
              className="px-8 py-3.5 bg-amber-400 text-[#0A0D0F] font-mono font-semibold text-sm hover:bg-amber-300 transition-colors"
            >
              ▸ Download Ixos
            </Link>
            <a
              href="#pipeline"
              className="px-8 py-3.5 border border-amber-400/20 text-amber-400/60 font-mono text-sm hover:bg-amber-400/5 transition-colors"
            >
              Explore Pipeline
            </a>
          </motion.div>
        </section>

        {/* ═══════════════════════════════════
            2. SPEED
            ═══════════════════════════════════ */}
        <ScanSection clipFrom="right">
          <section id="speed" className="relative z-10 py-28 px-6 overflow-hidden">
            <GridOverlay />
            <div className="max-w-5xl mx-auto relative">
              <CornerBrackets size={20} color="rgba(246,185,76,0.12)" />
              <div className="p-8">
                <SectionKicker label="Performance" />
                <DecodedHeading text="Frictionless speed." />
                <p className="mt-4 mb-12 text-white/45 font-mono text-sm max-w-xl leading-relaxed">
                  Every millisecond matters. Ixos searches your entire codebase before your
                  finger lifts off the key.
                </p>

                <div className="flex flex-col gap-4">
                  {[
                    {
                      metric: "Sub-second search",
                      detail: "Average query resolves in under 50ms across 10k+ files",
                      color: "#F6B94C",
                      tag: "LATENCY",
                    },
                    {
                      metric: "312 files in 7ms",
                      detail: "Parallel Rayon-powered file scanning with zero blocking I/O",
                      color: "#F6B94C",
                      tag: "THROUGHPUT",
                    },
                    {
                      metric: "94% cache reuse",
                      detail: "HMAC-SHA256 signed embeddings cached in NTFS ADS or xattr",
                      color: "#F6B94C",
                      tag: "EFFICIENCY",
                    },
                  ].map((row) => (
                    <div
                      key={row.metric}
                      className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-5 px-6 border border-amber-400/10 bg-amber-400/[0.02] relative"
                    >
                      <span
                        className="absolute top-2 right-3 text-[9px] font-mono tracking-widest"
                        style={{ color: "rgba(246,185,76,0.3)" }}
                      >
                        [{row.tag}]
                      </span>
                      <span
                        className="text-2xl md:text-3xl font-bold font-mono"
                        style={{ color: row.color }}
                      >
                        {row.metric}
                      </span>
                      <span className="text-sm font-mono text-white/40">{row.detail}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6">
                  <SignalLocked delay={600} />
                </div>
              </div>
            </div>
          </section>
        </ScanSection>


        {/* ═══════════════════════════════════
            3. PRIVACY
            ═══════════════════════════════════ */}
        <ScanSection clipFrom="left">
          <section id="privacy" className="relative z-10 py-28 px-6 overflow-hidden">
            <GridOverlay />
            <div className="max-w-5xl mx-auto relative">
              <CornerBrackets size={20} color="rgba(20,184,166,0.15)" />
              <div className="p-8">
                <SectionKicker label="Security Posture" color="text-teal-400/60" />
                <DecodedHeading text="Zero-trust by default." delay={60} />
                <p className="mt-4 mb-12 text-white/45 font-mono text-sm max-w-xl leading-relaxed">
                  Your intellectual property never leaves your SSD. Not a single byte is
                  transmitted, logged, or telemetered.
                </p>

                <div className="flex flex-col gap-4">
                  {[
                    {
                      metric: "Zero cloud dependency",
                      detail: "All embedding generation and search ranking runs on your local CPU",
                      color: "#14B8A6",
                      tag: "ISOLATION",
                    },
                    {
                      metric: "HMAC-SHA256 signing",
                      detail: "Every cached embedding is cryptographically signed to prevent tampering",
                      color: "#14B8A6",
                      tag: "INTEGRITY",
                    },
                    {
                      metric: "mlock memory protection",
                      detail:
                        "Sensitive buffers locked in RAM and zeroized on drop. Never swapped to disk.",
                      color: "#14B8A6",
                      tag: "SECMEM",
                    },
                  ].map((row) => (
                    <div
                      key={row.metric}
                      className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-5 px-6 border border-teal-400/10 bg-teal-400/[0.02] relative"
                    >
                      <span
                        className="absolute top-2 right-3 text-[9px] font-mono tracking-widest"
                        style={{ color: "rgba(20,184,166,0.3)" }}
                      >
                        [{row.tag}]
                      </span>
                      <span
                        className="text-2xl md:text-3xl font-bold font-mono"
                        style={{ color: row.color }}
                      >
                        {row.metric}
                      </span>
                      <span className="text-sm font-mono text-white/40">{row.detail}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6">
                  <SignalLocked delay={600} />
                </div>
              </div>
            </div>
          </section>
        </ScanSection>


        {/* ═══════════════════════════════════
            4. PIPELINE
            ═══════════════════════════════════ */}
        <ScanSection clipFrom="right">
          <section id="pipeline" className="relative z-10 py-28 px-6 overflow-hidden">
            <GridOverlay />
            <div className="max-w-5xl mx-auto relative">
              <div className="text-center mb-14">
                <SectionKicker label="Pipeline" />
                <DecodedHeading text="The crystallized pipeline." delay={40} />
                <p className="mt-4 text-white/45 font-mono text-sm max-w-xl mx-auto">
                  Four stages. From raw filesystem scan to cryptographically locked results.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    stage: "01",
                    title: "Scan",
                    desc: "Rust file-watcher daemon monitors your project in real-time. Rate-limited at 100 events/sec with dedup and symlink protection. Changes are captured instantly.",
                    color: "#F6B94C",
                    tag: "FS_WATCH",
                  },
                  {
                    stage: "02",
                    title: "Lexical",
                    desc: "BM25-powered keyword matching with parallel Rayon processing. Pre-filters millions of tokens across your entire directory tree in under 10ms.",
                    color: "#14B8A6",
                    tag: "BM25_ENGINE",
                  },
                  {
                    stage: "03",
                    title: "Semantic",
                    desc: "Model2Vec embeddings generated locally via ONNX runtime. Cosine similarity ranking surfaces intent-matching results that keyword search alone would miss.",
                    color: "#7C5CFF",
                    tag: "EMBED_LOCAL",
                  },
                  {
                    stage: "04",
                    title: "Locked",
                    desc: "Final hybrid score fuses lexical, semantic, and quality signals. Results are integrity-verified with behavioral scoring and attack detection. Deterministic output.",
                    color: "#F6B94C",
                    tag: "HYBRID_LOCK",
                  },
                ].map((item) => (
                  <div
                    key={item.stage}
                    className="p-8 border relative"
                    style={{ borderColor: `${item.color}22`, background: `${item.color}04` }}
                  >
                    <CornerBrackets size={12} color={`${item.color}30`} />
                    <div
                      className="font-mono text-[10px] font-semibold tracking-[0.3em] uppercase mb-4 flex items-center justify-between"
                      style={{ color: item.color }}
                    >
                      <span>Phase {item.stage}</span>
                      <span className="opacity-40">[{item.tag}]</span>
                    </div>
                    <h3 className="text-2xl font-bold font-mono mb-3" style={{ color: item.color }}>
                      {item.title}
                    </h3>
                    <p className="text-sm font-mono leading-relaxed text-white/40">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </ScanSection>

        {/* ═══════════════════════════════════
            4.5 KNOWLEDGE GRAPH
            ═══════════════════════════════════ */}
        <section className="relative z-10 py-28 px-6 overflow-hidden">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <SectionKicker label="Architecture" />
              <DecodedHeading text="Your filesystem. Mapped." delay={30} />
              <p className="mt-4 text-white/45 font-mono text-sm max-w-xl mx-auto">
                Ixos builds a live semantic graph across your codebase — clusters emerge from
                co-edited, co-searched, and semantically similar files.
              </p>
            </div>
            <div className="relative overflow-hidden" style={{ height: 580 }}>
              <CSSLattice />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-8 z-30">
                {[
                  { color: '#14B8A6', label: 'auth/' },
                  { color: '#7C5CFF', label: 'api/' },
                  { color: '#F6B94C', label: 'ui/' },
                  { color: '#2DD4BF', label: 'db/' },
                  { color: '#5EEAD4', label: 'core/' },
                ].map((c) => (
                  <div key={c.label} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color, boxShadow: `0 0 6px ${c.color}` }} />
                    <span className="font-mono text-[10px] text-white/30">{c.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════
            5. RESULT ANATOMY
            ═══════════════════════════════════ */}
        <ScanSection clipFrom="left">
          <section className="relative z-10 py-28 px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-14">
                <SectionKicker label="Evidence" />
                <DecodedHeading text="Anatomy of a result." delay={50} />
                <p className="mt-4 text-white/45 font-mono text-sm max-w-xl mx-auto">
                  Every result is a self-contained evidence object. File, line, snippet, and
                  full score breakdown.
                </p>
              </div>

              <div className="border border-amber-400/10 bg-[#0A0D0F]/90 overflow-hidden relative">
                <CornerBrackets size={16} color="rgba(246,185,76,0.2)" />
                <div className="flex items-start justify-between p-6 pb-4 border-b border-amber-400/8">
                  <div>
                    <div className="font-mono text-[10px] text-amber-400/40 mb-1.5 uppercase tracking-widest">
                      ▸ src/middleware/jwt.ts:42
                    </div>
                    <h4 className="text-lg font-bold font-mono text-white/90">
                      validateAndRefreshToken()
                    </h4>
                  </div>
                  <div
                    className="w-11 h-11 border-2 flex items-center justify-center text-sm font-bold font-mono"
                    style={{ borderColor: "#F6B94C", color: "#F6B94C" }}
                  >
                    96
                  </div>
                </div>

                <div className="p-6 font-mono text-[13px] leading-relaxed text-white/55">
                  {[
                    { num: 40, text: "export async function validateAndRefreshToken(req: Request) {", highlight: false },
                    { num: 41, text: "  const bearer = extractBearerToken(req.headers);", highlight: false },
                    { num: 42, text: "  if (isExpired(bearer)) return await rotateToken(bearer);", highlight: true },
                    { num: 43, text: "  return { valid: true, token: bearer };", highlight: false },
                    { num: 44, text: "}", highlight: false },
                  ].map((line) => (
                    <div
                      key={line.num}
                      className={`flex ${line.highlight ? "bg-amber-400/[0.06] border-l-2 border-amber-400 -ml-px pl-0" : ""}`}
                    >
                      <span className="select-none w-10 shrink-0 text-white/20 text-right pr-4">
                        {line.num}
                      </span>
                      <span style={{ color: line.highlight ? "#F6B94C" : undefined }}>
                        {line.text}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="px-6 pb-6 pt-4 border-t border-amber-400/8">
                  <div className="grid grid-cols-3 gap-6">
                    {[
                      { label: "lexical", value: 0.82, color: "#F6B94C" },
                      { label: "semantic", value: 0.91, color: "#14B8A6" },
                      { label: "quality", value: 0.88, color: "#7C5CFF" },
                    ].map((bar) => (
                      <div key={bar.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-mono text-white/30 uppercase tracking-widest">
                            {bar.label}
                          </span>
                          <span className="font-mono" style={{ color: bar.color }}>
                            {bar.value.toFixed(2)}
                          </span>
                        </div>
                        <div className="h-1.5 bg-white/5 overflow-hidden">
                          <div
                            className="h-full"
                            style={{ width: `${bar.value * 100}%`, backgroundColor: bar.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </ScanSection>

        {/* ═══════════════════════════════════
            6. SCORE BREAKDOWN
            ═══════════════════════════════════ */}
        <ScanSection clipFrom="right">
          <section className="relative z-10 py-28 px-6">
            <div ref={scoreRef} className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-start">
                <div className="md:sticky md:top-32">
                  <SectionKicker label="Transparency" />
                  <DecodedHeading text="The math is transparent." delay={60} />
                  <p className="mt-4 mb-6 text-white/45 font-mono text-sm leading-relaxed max-w-md">
                    Every Ixos result carries a deterministic score breakdown you can inspect
                    and verify. No black boxes. No hidden weights.
                  </p>
                  <div className="space-y-4 text-sm font-mono">
                    {[
                      {
                        color: "#F6B94C",
                        label: "Lexical score",
                        desc: "Exact keyword overlap using BM25 term-frequency analysis.",
                      },
                      {
                        color: "#14B8A6",
                        label: "Semantic score",
                        desc: "Conceptual similarity via Model2Vec embeddings, local only.",
                      },
                      {
                        color: "#7C5CFF",
                        label: "Quality boost",
                        desc: "File recency, code structure quality, and access patterns.",
                      },
                    ].map((item) => (
                      <div key={item.label} className="flex items-start gap-3">
                        <span
                          className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-white/40">
                          <span className="text-white/70">{item.label}</span> — {item.desc}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <div className="p-8 border border-amber-400/10 bg-[#0A0D0F]/90 relative">
                    <CornerBrackets size={16} color="rgba(246,185,76,0.15)" />
                    <div className="font-mono text-[10px] text-white/20 uppercase tracking-[0.3em] mb-8">
                      ▸ Score Breakdown
                    </div>
                    <ScoreBar label="lexical" value={0.82} color="#F6B94C" inView={scoreInView} delay={0} />
                    <ScoreBar label="semantic" value={0.91} color="#14B8A6" inView={scoreInView} delay={0.15} />
                    <ScoreBar label="quality" value={0.88} color="#7C5CFF" inView={scoreInView} delay={0.3} />
                    <div className="mt-8 pt-6 border-t border-amber-400/8">
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-xs text-white/30 uppercase tracking-widest">
                          Final score
                        </span>
                        <motion.span
                          className="text-3xl font-bold font-mono"
                          style={{ color: "#F6B94C" }}
                          initial={{ opacity: 0 }}
                          animate={scoreInView ? { opacity: 1 } : {}}
                          transition={{ delay: 0.6, duration: 0.4 }}
                        >
                          0.96
                        </motion.span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </ScanSection>

        {/* ═══════════════════════════════════
            7. WORKSTREAMS
            ═══════════════════════════════════ */}
        <section id="workstreams" className="relative z-10">
          <WorkstreamsSection />
        </section>

        {/* ═══════════════════════════════════
            8. CLI FLOW
            ═══════════════════════════════════ */}
        <ScanSection clipFrom="right">
          <section id="cli" className="relative z-10 py-28 px-6">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-14">
                <SectionKicker label="CLI Interface" />
                <DecodedHeading text="For the terminal native." delay={50} />
                <p className="mt-4 text-white/45 font-mono text-sm max-w-lg mx-auto">
                  Full CLI with progressive output, JSON export, and journalist mode for maximum
                  privacy.
                </p>
              </div>

              <div className="border border-amber-400/8 bg-[#0A0D0F] overflow-hidden relative">
                <CornerBrackets size={14} color="rgba(246,185,76,0.12)" />
                <div className="flex items-center gap-3 px-5 py-3 border-b border-amber-400/8 bg-amber-400/[0.02]">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-white/10" />
                    <span className="w-3 h-3 rounded-full bg-white/10" />
                    <span className="w-3 h-3 rounded-full bg-white/10" />
                  </div>
                  <span className="font-mono text-xs text-amber-400/30 ml-2 uppercase tracking-widest">
                    ixos v0.4.0 — terminal
                  </span>
                </div>

                <div className="p-6 font-mono text-[13px] leading-[2.2] space-y-4">
                  {[
                    {
                      cmd: 'search "authentication token refresh" --progressive',
                      hint: "Stream results as each pipeline stage completes",
                    },
                    {
                      cmd: "search --show-scores --json",
                      hint: "Pipe structured JSON with full score breakdown",
                    },
                    {
                      cmd: 'search "source protection" --journalist-mode',
                      hint: "Maximum privacy: ephemeral cache, no logs, no history",
                    },
                    {
                      cmd: 'search "config" --cache-mode ephemeral',
                      hint: "All embeddings discarded after query. Zero footprint.",
                    },
                  ].map((item, i) => (
                    <div key={i}>
                      <div>
                        <span className="text-white/25">$ </span>
                        <span className="text-amber-400">ixos</span>
                        <span className="text-white/65"> {item.cmd}</span>
                      </div>
                      <div className="text-white/20 ml-4 text-xs mt-0.5"># {item.hint}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </ScanSection>

        {/* ═══════════════════════════════════
            9. AUDITABLE
            ═══════════════════════════════════ */}
        <ScanSection clipFrom="left">
          <section className="relative z-10 py-28 px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-14">
                <SectionKicker label="Auditable" />
                <DecodedHeading text="Auditable by design." delay={40} />
                <p className="mt-4 text-white/45 font-mono text-sm max-w-xl mx-auto">
                  Every claim is verifiable. The core engine is open source.
                  Every search path is deterministic.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    text: "Every search runs locally",
                    detail:
                      "Zero network calls. Works offline. Your filesystem is the only data source. No data ever leaves your SSD.",
                    color: "#F6B94C",
                    tag: "LOCAL_ONLY",
                  },
                  {
                    text: "Every score is deterministic",
                    detail:
                      "Same query, same files, same result. No probabilistic re-ranking or opaque server-side logic.",
                    color: "#14B8A6",
                    tag: "DETERMINISTIC",
                  },
                  {
                    text: "Every path is verifiable",
                    detail:
                      "Ed25519 cryptographic attestation signs every search result for provenance.",
                    color: "#7C5CFF",
                    tag: "ATTESTATION",
                  },
                ].map((card) => (
                  <div
                    key={card.text}
                    className="p-7 border relative"
                    style={{ borderColor: `${card.color}20`, background: `${card.color}04` }}
                  >
                    <CornerBrackets size={12} color={`${card.color}25`} />
                    <div
                      className="text-[9px] font-mono tracking-[0.3em] uppercase mb-4 opacity-40"
                      style={{ color: card.color }}
                    >
                      [{card.tag}]
                    </div>
                    <h3 className="text-lg font-bold font-mono mb-3" style={{ color: card.color }}>
                      {card.text}
                    </h3>
                    <p className="text-xs font-mono leading-relaxed text-white/35">{card.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </ScanSection>

        {/* ═══════════════════════════════════
            10. COMPARISON TABLE
            ═══════════════════════════════════ */}
        <ScanSection clipFrom="left">
          <section className="relative z-10 py-28 px-6">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-14">
                <SectionKicker label="Feature Matrix" />
                <DecodedHeading text="Desktop search. Plainly compared." delay={40} />
                <p className="mt-4 text-white/45 font-mono text-sm max-w-xl mx-auto">
                  Capability matrix grounded in shipped behavior and CLI flags.
                </p>
              </div>
              <ComparisonTable />
            </div>
          </section>
        </ScanSection>

        {/* ═══════════════════════════════════
            11. PRICING TEASER
            ═══════════════════════════════════ */}
        <ScanSection clipFrom="right">
          <section className="relative z-10 py-28 px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-14">
                <SectionKicker label="Licensing" />
                <DecodedHeading text="Simple pricing." delay={40} />
                <p className="mt-4 text-white/45 font-mono text-sm max-w-xl mx-auto">
                  Start free. Upgrade when your workstreams demand it.
                </p>
              </div>

              <div className="relative">
                <div className="w-full border border-amber-400/8 bg-amber-400/[0.01] p-8 md:p-12 relative">
                  <CornerBrackets size={20} color="rgba(246,185,76,0.08)" />
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8 mb-10">
                    <div>
                      <div className="text-[10px] font-mono tracking-[0.3em] text-white/30 uppercase mb-1">
                        [FREE_TIER]
                      </div>
                      <h3 className="text-xl font-bold font-mono text-white/70 mb-1">Community</h3>
                      <div className="text-4xl font-bold font-mono">
                        $0
                        <span className="text-base font-normal text-white/25 ml-1">/ forever</span>
                      </div>
                    </div>
                    <ul className="space-y-2 text-sm font-mono text-white/40">
                      {[
                        "Local vector search with Flash and Auto modes",
                        "VS Code extension and standard CLI",
                        "Up to 3 active workstreams",
                        "HMAC-SHA256 cache signing",
                      ].map((feat) => (
                        <li key={feat} className="flex items-center gap-2">
                          <span className="text-amber-400/30">▸</span>
                          {feat}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="border border-amber-400/25 bg-amber-400/[0.03] p-8 md:p-10 relative overflow-hidden">
                    <CornerBrackets size={16} color="rgba(246,185,76,0.3)" />
                    <div
                      className="absolute -top-20 -right-20 w-60 h-60 rounded-full pointer-events-none"
                      style={{
                        background: "rgba(246,185,76,0.04)",
                        filter: "blur(80px)",
                      }}
                    />
                    <div className="relative z-10">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8 mb-8">
                        <div>
                          <div className="text-[10px] font-mono tracking-[0.3em] text-amber-400/50 uppercase mb-1">
                            [PRO_TIER]
                          </div>
                          <h3 className="text-xl font-bold font-mono text-amber-400 mb-1">Pro</h3>
                          <div className="text-4xl font-bold font-mono">
                            $6.99
                            <span className="text-base font-normal text-white/25 ml-1">/ month</span>
                          </div>
                        </div>
                        <ul className="space-y-2 text-sm font-mono text-white/50">
                          {[
                            "JIT Pro embedding models with deep reasoning",
                            "Unlimited workstreams with session recovery",
                            "Journalist mode and ephemeral cache",
                            "Ed25519 cryptographic attestation",
                            "Priority support and early access",
                          ].map((feat) => (
                            <li key={feat} className="flex items-center gap-2">
                              <span className="text-amber-400">▸</span>
                              {feat}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <Link
                        href="/pricing"
                        className="inline-block px-8 py-3 bg-amber-400 text-[#0A0D0F] font-mono font-semibold text-sm hover:bg-amber-300 transition-colors"
                      >
                        ▸ Get Pro
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </ScanSection>

        {/* ═══════════════════════════════════
            11. THREAT MODEL
            ═══════════════════════════════════ */}
        <ThreatModelSection />

        {/* ═══════════════════════════════════
            12. SIGNAL FEED
            ═══════════════════════════════════ */}
        <SignalFeed />

        {/* ═══════════════════════════════════
            13. FOOTER CTA
            ═══════════════════════════════════ */}
        <FooterCTA />
      </main>
    </div>
  );
}
