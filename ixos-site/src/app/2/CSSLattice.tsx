"use client";

import { useEffect, useRef, useMemo } from "react";

/* ─── File-type cluster definitions ────────────────────────────────────────── */

const FILE_CLUSTERS = [
  { id: 0, label: ".ts",   color: "#14B8A6", glowColor: "rgba(20,184,166,0.8)"  },
  { id: 1, label: ".py",   color: "#7C5CFF", glowColor: "rgba(124,92,255,0.8)"  },
  { id: 2, label: ".rs",   color: "#F6B94C", glowColor: "rgba(246,185,76,0.8)"  },
  { id: 3, label: ".md",   color: "#2DD4BF", glowColor: "rgba(45,212,191,0.8)"  },
  { id: 4, label: ".json", color: "#5EEAD4", glowColor: "rgba(94,234,212,0.8)"  },
];

/* ─── Deterministic node layout ─────────────────────────────────────────────
   90 nodes, grouped in 5 clusters. Each cluster has a center point in 3D space.
   Node positions are offset from cluster center using index-based trig patterns.
   No Math.random() — all values derived from node index.
──────────────────────────────────────────────────────────────────────────── */

const CLUSTER_CENTERS: [number, number, number][] = [
  [-140, -90,  40],
  [ 100, -80, -60],
  [  30,  80,  80],
  [-100,  70, -80],
  [ 160,  20,  20],
];

const NODES_PER_CLUSTER = 18; // 5 * 18 = 90 nodes

interface NodeDef {
  x: number;
  y: number;
  z: number;
  id: number;
  clusterId: number;
  // Drift parameters — index-derived, deterministic
  freqX: number;
  freqY: number;
  freqZ: number;
  phaseX: number;
  phaseY: number;
  phaseZ: number;
  ampX: number;
  ampY: number;
  ampZ: number;
}

function buildNodes(): NodeDef[] {
  const nodes: NodeDef[] = [];
  for (let c = 0; c < 5; c++) {
    const [cx, cy, cz] = CLUSTER_CENTERS[c];
    for (let n = 0; n < NODES_PER_CLUSTER; n++) {
      const id = c * NODES_PER_CLUSTER + n;
      // Spread nodes around cluster center using fibonacci-sphere-like pattern
      const golden = 2.399963; // golden angle in radians
      const theta = n * golden;
      const phi = Math.acos(1 - (2 * (n + 0.5)) / NODES_PER_CLUSTER);
      const r = 48 + (id % 7) * 8; // radius 48..96

      const ox = Math.sin(phi) * Math.cos(theta) * r;
      const oy = Math.sin(phi) * Math.sin(theta) * r;
      const oz = Math.cos(phi) * r * 0.6; // flatten Z

      // Drift parameters — fully deterministic from index
      const freqBase = 0.00035 + (id % 11) * 0.000018;
      nodes.push({
        x: cx + ox,
        y: cy + oy,
        z: cz + oz,
        id,
        clusterId: c,
        freqX: freqBase * (1 + (id % 3) * 0.3),
        freqY: freqBase * (1 + (id % 5) * 0.2),
        freqZ: freqBase * (1 + (id % 7) * 0.15),
        phaseX: (id * 1.618) % (Math.PI * 2),
        phaseY: (id * 2.618) % (Math.PI * 2),
        phaseZ: (id * 0.987) % (Math.PI * 2),
        ampX: 6 + (id % 9) * 1.5,
        ampY: 5 + (id % 7) * 1.5,
        ampZ: 3 + (id % 5) * 1.0,
      });
    }
  }
  return nodes;
}

/* ─── Build edge pairs within each cluster ──────────────────────────────────
   Connect nodes within the same cluster if their base distance is < threshold.
   Also add inter-cluster connections to show relationships between file types.
─────────────────────────────────────────────────────────────────────────── */
function buildEdges(nodes: NodeDef[]): [number, number, number, boolean][] {
  const edges: [number, number, number, boolean][] = []; // [nodeA, nodeB, clusterId, isInterCluster]
  const INTRA_THRESHOLD = 90;
  const INTER_THRESHOLD = 140; // Larger threshold for inter-cluster
  
  // Within cluster connections
  for (let c = 0; c < 5; c++) {
    const start = c * NODES_PER_CLUSTER;
    const end = start + NODES_PER_CLUSTER;
    for (let i = start; i < end; i++) {
      for (let j = i + 1; j < end; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dz = nodes[i].z - nodes[j].z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < INTRA_THRESHOLD) {
          edges.push([i, j, c, false]);
        }
      }
    }
  }
  
  // Inter-cluster connections (between different clusters)
  // This creates a more web-like structure showing relationships
  for (let c1 = 0; c1 < 5; c1++) {
    for (let c2 = c1 + 1; c2 < 5; c2++) {
      const start1 = c1 * NODES_PER_CLUSTER;
      const end1 = start1 + NODES_PER_CLUSTER;
      const start2 = c2 * NODES_PER_CLUSTER;
      
      // Connect a few representative nodes between clusters
      for (let i = start1; i < end1; i += 3) { // Every 3rd node
        for (let j = start2; j < start2 + NODES_PER_CLUSTER; j += 3) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dz = nodes[i].z - nodes[j].z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist < INTER_THRESHOLD) {
            edges.push([i, j, -1, true]); // -1 for inter-cluster
          }
        }
      }
    }
  }
  return edges;
}

/* ─── Project 3D → 2D ───────────────────────────────────────────────────── */
function project(
  x: number,
  y: number,
  z: number,
  rotY: number,
  rotX: number,
  fov: number,
  cx: number,
  cy: number
): { sx: number; sy: number; scale: number } {
  // Rotate Y
  const cosY = Math.cos(rotY);
  const sinY = Math.sin(rotY);
  const rx = x * cosY + z * sinY;
  const rz = -x * sinY + z * cosY;

  // Rotate X
  const cosX = Math.cos(rotX);
  const sinX = Math.sin(rotX);
  const ry = y * cosX - rz * sinX;
  const rz2 = y * sinX + rz * cosX;

  const depth = fov + rz2;
  const scale = fov / Math.max(depth, 1);
  return {
    sx: cx + rx * scale,
    sy: cy + ry * scale,
    scale,
  };
}

/* ─── Path tracer particle ─────────────────────────────────────────────── */
interface PathTracer {
  fromNode: number;
  toNode: number;
  progress: number; // 0-1
  speed: number;
  isInterCluster: boolean;
}

// Precompute random path connections between clusters
function buildPathConnections(nodes: NodeDef[]): [number, number, boolean][] {
  const paths: [number, number, boolean][] = [];
  
  // Same-cluster paths (intra)
  for (let c = 0; c < 5; c++) {
    const start = c * NODES_PER_CLUSTER;
    const end = start + NODES_PER_CLUSTER;
    // Pick 2-3 random connections within each cluster
    for (let i = 0; i < 3; i++) {
      const a = start + ((c * 7 + i * 5) % NODES_PER_CLUSTER);
      const b = start + ((c * 11 + i * 7) % NODES_PER_CLUSTER);
      if (a !== b) paths.push([a, b, false]);
    }
  }
  
  // Inter-cluster paths
  const clusterPairs = [[0,1], [1,2], [2,3], [3,4], [4,0], [0,2], [1,3], [2,4]];
  for (const [c1, c2] of clusterPairs) {
    const a = c1 * NODES_PER_CLUSTER + ((c1 * 3) % NODES_PER_CLUSTER);
    const b = c2 * NODES_PER_CLUSTER + ((c2 * 7) % NODES_PER_CLUSTER);
    paths.push([a, b, true]);
  }
  
  return paths;
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export function CSSLattice() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const tRef = useRef<number>(0);
  const matchClusterRef = useRef<number>(-1);
  const matchProgressRef = useRef<number>(0); // 0=off, 0-1=fade-in, -1=fading out
  const matchTRef = useRef<number>(0);
  const pathTracersRef = useRef<PathTracer[]>([]);
  const tracePhaseRef = useRef<number>(0); // 0=no trace, 1=intra, 2=inter

  const nodes = useMemo(() => buildNodes(), []);
  const edges = useMemo(() => buildEdges(nodes), [nodes]);
  const pathConnections = useMemo(() => buildPathConnections(nodes), [nodes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // DPI-aware sizing
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // ── Match wave scheduler ─────────────────────────────────────────────
    let matchCluster = -1;
    let matchT = 0; // time elapsed within match cycle
    const MATCH_PERIOD = 3500; // ms

    const matchInterval = setInterval(() => {
      // Advance to next cluster in round-robin
      matchCluster = (matchCluster + 1) % 5;
      matchClusterRef.current = matchCluster;
      matchProgressRef.current = 0;
      matchTRef.current = 0;
    }, MATCH_PERIOD);

    // ── Path tracer scheduler ─────────────────────────────────────────────
    let tracePhase = 0;
    let traceT = 0;
    const TRACE_PERIOD = 4500; // ms
    
    const traceInterval = setInterval(() => {
      tracePhase = (tracePhase + 1) % 3; // 0=off, 1=intra, 2=inter
      tracePhaseRef.current = tracePhase;
      traceT = 0;
      
      // Spawn new tracers based on phase
      pathTracersRef.current = [];
      if (tracePhase === 1) {
        // Intra-cluster: 3-4 tracers within same cluster
        for (let i = 0; i < 4; i++) {
          const cluster = (i + matchCluster) % 5;
          const start = cluster * NODES_PER_CLUSTER;
          const pathsInCluster = pathConnections.filter(([a, b, inter]) => !inter && 
            (a >= start && a < start + NODES_PER_CLUSTER));
          if (pathsInCluster.length > 0) {
            const [from, to] = pathsInCluster[i % pathsInCluster.length];
            pathTracersRef.current.push({
              fromNode: from,
              toNode: to,
              progress: 0,
              speed: 0.0008 + Math.random() * 0.0004,
              isInterCluster: false,
            });
          }
        }
      } else if (tracePhase === 2) {
        // Inter-cluster: 2-3 tracers between clusters
        const interPaths = pathConnections.filter(([,,inter]) => inter);
        for (let i = 0; i < 3; i++) {
          if (interPaths.length > 0) {
            const [from, to] = interPaths[i % interPaths.length];
            pathTracersRef.current.push({
              fromNode: from,
              toNode: to,
              progress: 0,
              speed: 0.0006 + Math.random() * 0.0003,
              isInterCluster: true,
            });
          }
        }
      }
    }, TRACE_PERIOD);

    // ── RAF render loop ──────────────────────────────────────────────────
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = now - lastTime;
      lastTime = now;
      tRef.current += dt;
      const t = tRef.current;

      // Update match progress
      if (matchClusterRef.current >= 0) {
        matchTRef.current += dt;
        const fadeIn = 400;
        const hold = 800;
        const fadeOut = 600;
        const total = fadeIn + hold + fadeOut;
        const mt = matchTRef.current;
        if (mt < fadeIn) {
          matchProgressRef.current = mt / fadeIn;
        } else if (mt < fadeIn + hold) {
          matchProgressRef.current = 1.0;
        } else if (mt < total) {
          matchProgressRef.current = 1.0 - (mt - fadeIn - hold) / fadeOut;
        } else {
          matchProgressRef.current = 0;
          matchClusterRef.current = -1;
        }
      }

      const W = canvas.getBoundingClientRect().width;
      const H = canvas.getBoundingClientRect().height;
      const cx = W / 2;
      const cy = H / 2 - 50;
      const fov = 600;

      // Slow global rotation
      const rotY = t * 0.00025;
      const rotX = 0.22 + Math.sin(t * 0.000082) * 0.08;

      // Cluster-level drift phases
      const clusterPhases = CLUSTER_CENTERS.map((_, ci) => ({
        ox: Math.sin(t * 0.000095 + ci * 1.3) * 18,
        oy: Math.cos(t * 0.000078 + ci * 0.9) * 14,
        oz: Math.sin(t * 0.000061 + ci * 2.1) * 10,
      }));

      // Compute live positions for all nodes
      const pos = nodes.map((nd) => {
        const cp = clusterPhases[nd.clusterId];
        const lx = nd.x + Math.sin(t * nd.freqX + nd.phaseX) * nd.ampX + cp.ox;
        const ly = nd.y + Math.sin(t * nd.freqY + nd.phaseY) * nd.ampY + cp.oy;
        const lz = nd.z + Math.sin(t * nd.freqZ + nd.phaseZ) * nd.ampZ + cp.oz;
        return project(lx, ly, lz, rotY, rotX, fov, cx, cy);
      });

      // ── Clear ──────────────────────────────────────────────────────────
      ctx.clearRect(0, 0, W, H);

      const matchC = matchClusterRef.current;
      const matchP = matchProgressRef.current;

      // ── Draw edges ─────────────────────────────────────────────────────
      for (const edge of edges) {
        const [a, b, clusterId, isInter] = edge;
        const pa = pos[a];
        const pb = pos[b];
        const cid = isInter ? -1 : clusterId;
        const cluster = FILE_CLUSTERS[Math.max(0, cid)];
        const isMatch = !isInter && cid === matchC && matchP > 0;

        const baseAlpha = isInter ? 0.04 + pa.scale * 0.06 : 0.08 + pa.scale * 0.12;

        let strokeColor: string;
        if (isMatch) {
          // Interpolate from teal to amber
          const t2 = matchP;
          strokeColor = `rgba(246,185,76,${(baseAlpha * 0.5 + t2 * 0.55).toFixed(3)})`;
        } else if (isInter) {
          // Inter-cluster connections are more subtle, purple-tinted
          strokeColor = `rgba(139,92,246,${baseAlpha.toFixed(3)})`;
        } else {
          const [r, g, b2] = parseHex(cluster.color);
          strokeColor = `rgba(${r},${g},${b2},${baseAlpha.toFixed(3)})`;
        }

        ctx.beginPath();
        ctx.moveTo(pa.sx, pa.sy);
        ctx.lineTo(pb.sx, pb.sy);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = isMatch ? 1.0 + matchP * 0.5 : isInter ? 0.3 : 0.6;
        ctx.stroke();
      }

      // ── Draw path tracers ─────────────────────────────────────────────────
      for (const tracer of pathTracersRef.current) {
        tracer.progress += tracer.speed * dt;
        
        if (tracer.progress >= 1) {
          tracer.progress = 0; // Loop the tracer
        }
        
        const pa = pos[tracer.fromNode];
        const pb = pos[tracer.toNode];
        
        // Draw the full path line (faint)
        ctx.beginPath();
        ctx.moveTo(pa.sx, pa.sy);
        ctx.lineTo(pb.sx, pb.sy);
        ctx.strokeStyle = 'rgba(246,185,76,0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Interpolate position along the path
        const interpX = pa.sx + (pb.sx - pa.sx) * tracer.progress;
        const interpY = pa.sy + (pb.sy - pa.sy) * tracer.progress;
        
        // Calculate particle size based on scale
        const scale = (pa.scale + pb.scale) / 2;
        const r = 2 + scale * 2;
        
        // Draw tracer particle with glow
        const glowSize = r * 4;
        const grad = ctx.createRadialGradient(interpX, interpY, 0, interpX, interpY, glowSize);
        grad.addColorStop(0, 'rgba(246,185,76,0.8)');
        grad.addColorStop(0.3, 'rgba(246,185,76,0.3)');
        grad.addColorStop(1, 'rgba(246,185,76,0)');
        
        ctx.beginPath();
        ctx.arc(interpX, interpY, glowSize, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        
        // Core bright point
        ctx.beginPath();
        ctx.arc(interpX, interpY, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(246,185,76,1)';
        ctx.fill();
        
        // Draw trail (line from start to current position)
        ctx.beginPath();
        ctx.moveTo(pa.sx, pa.sy);
        ctx.lineTo(interpX, interpY);
        ctx.strokeStyle = `rgba(246,185,76,${0.3 + tracer.progress * 0.3})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // ── Draw nodes ─────────────────────────────────────────────────────
      for (const nd of nodes) {
        const p = pos[nd.id];
        const cluster = FILE_CLUSTERS[nd.clusterId];
        const isMatch = nd.clusterId === matchC && matchP > 0;

        const baseR = 1.8 + p.scale * 1.6;
        const r = isMatch ? baseR + matchP * 2.2 : baseR;

        if (isMatch && matchP > 0.2) {
          // Glow halo
          const grad = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, r * 3.5);
          grad.addColorStop(0, `rgba(246,185,76,${(matchP * 0.35).toFixed(3)})`);
          grad.addColorStop(1, "rgba(246,185,76,0)");
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, r * 3.5, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        } else if (p.scale > 0.85) {
          // Subtle teal glow for close nodes
          const grad = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, r * 2.5);
          const [cr, cg, cb] = parseHex(cluster.color);
          grad.addColorStop(0, `rgba(${cr},${cg},${cb},0.18)`);
          grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, r * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        }

        // Core dot
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
        if (isMatch) {
          ctx.fillStyle = `rgba(246,185,76,${(0.6 + matchP * 0.4).toFixed(3)})`;
        } else {
          const [cr, cg, cb] = parseHex(cluster.color);
          const alpha = 0.25 + p.scale * 0.45;
          ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha.toFixed(3)})`;
        }
        ctx.fill();
      }

      // ── Cluster labels (file type tags) ─────────────────────────────────
      // Draw a small label near the centroid of each cluster
      for (let c = 0; c < 5; c++) {
        const clusterNodes = nodes.filter((n) => n.clusterId === c);
        let sumX = 0, sumY = 0;
        for (const n of clusterNodes) {
          sumX += pos[n.id].sx;
          sumY += pos[n.id].sy;
        }
        const lx = sumX / clusterNodes.length;
        const ly = sumY / clusterNodes.length;
        const cl = FILE_CLUSTERS[c];
        const isMatch = c === matchC && matchP > 0;
        const alpha = isMatch ? 0.6 + matchP * 0.4 : 0.2;
        const [r2, g2, b3] = parseHex(cl.color);

        ctx.font = "bold 9px 'Geist Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = `rgba(${r2},${g2},${b3},${alpha.toFixed(3)})`;
        ctx.fillText(cl.label, lx, ly - 2);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearInterval(matchInterval);
      clearInterval(traceInterval);
      ro.disconnect();
    };
  }, [nodes, edges, pathConnections]);

  return (
    <div
      className="relative w-full"
      style={{ height: "600px" }}
    >
      {/* Radial fog vignette */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 50% 50%, transparent 40%, #080c14 85%)",
        }}
      />
      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none z-10"
        style={{
          background: "linear-gradient(to top, #080c14 0%, transparent 100%)",
        }}
      />
      {/* Top fade */}
      <div
        className="absolute top-0 left-0 right-0 h-20 pointer-events-none z-10"
        style={{
          background: "linear-gradient(to bottom, #080c14 0%, transparent 100%)",
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
}

/* ─── Hex color parser (cached) ─────────────────────────────────────────── */
const hexCache: Record<string, [number, number, number]> = {};

function parseHex(hex: string): [number, number, number] {
  if (hexCache[hex]) return hexCache[hex];
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  hexCache[hex] = [r, g, b];
  return [r, g, b];
}
