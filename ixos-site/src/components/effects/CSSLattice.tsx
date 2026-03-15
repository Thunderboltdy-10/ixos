"use client";

import { useEffect, useRef, useMemo } from "react";

/* ─── File-type cluster definitions ────────────────────────────────────────── */

const CLUSTER_COLORS = [
  { color: "#14B8A6", glowColor: "rgba(20,184,166,0.8)" },
  { color: "#7C5CFF", glowColor: "rgba(124,92,255,0.8)" },
  { color: "#F6B94C", glowColor: "rgba(246,185,76,0.8)" },
  { color: "#2DD4BF", glowColor: "rgba(45,212,191,0.8)" },
  { color: "#5EEAD4", glowColor: "rgba(94,234,212,0.8)" },
];

const RANDOM_LABELS = [
  "auth/", "db/", "core/", "ui/", "api/", "tests/", "utils/", "config/", "scripts/", "docs/",
  "models/", "routes/", "services/", "types/", "assets/"
];

/* ─── Deterministic node layout ─────────────────────────────────────────────
   We'll make it much bigger since it's the main hero background.
──────────────────────────────────────────────────────────────────────────── */

const CLUSTER_CENTERS: [number, number, number][] = [
  [-220, -140, 80],
  [200, -180, -120],
  [50, 180, 160],
  [-180, 120, -140],
  [280, 40, 60],
];

const NODES_PER_CLUSTER = 24;

interface NodeDef {
  x: number;
  y: number;
  z: number;
  id: number;
  clusterId: number;
  label: string;
  // Drift parameters
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
  // Randomize labels per cluster
  const shuffledLabels = [...RANDOM_LABELS].sort(() => Math.random() - 0.5);

  for (let c = 0; c < 5; c++) {
    const [cx, cy, cz] = CLUSTER_CENTERS[c];
    const clusterLabel = shuffledLabels[c % shuffledLabels.length];

    for (let n = 0; n < NODES_PER_CLUSTER; n++) {
      const id = c * NODES_PER_CLUSTER + n;
      const golden = 2.399963;
      const theta = n * golden;
      const phi = Math.acos(1 - (2 * (n + 0.5)) / NODES_PER_CLUSTER);
      const r = 80 + (id % 11) * 12; // much larger radius

      const ox = Math.sin(phi) * Math.cos(theta) * r;
      const oy = Math.sin(phi) * Math.sin(theta) * r;
      const oz = Math.cos(phi) * r * 0.6;

      const freqBase = 0.00025 + (id % 11) * 0.000015;
      nodes.push({
        x: cx + ox,
        y: cy + oy,
        z: cz + oz,
        id,
        clusterId: c,
        label: n === 0 ? clusterLabel : "", // label the center-ish node
        freqX: freqBase * (1 + (id % 3) * 0.3),
        freqY: freqBase * (1 + (id % 5) * 0.2),
        freqZ: freqBase * (1 + (id % 7) * 0.15),
        phaseX: (id * 1.618) % (Math.PI * 2),
        phaseY: (id * 2.618) % (Math.PI * 2),
        phaseZ: (id * 0.987) % (Math.PI * 2),
        ampX: 12 + (id % 9) * 2.5,
        ampY: 10 + (id % 7) * 2.5,
        ampZ: 6 + (id % 5) * 1.5,
      });
    }
  }
  return nodes;
}

/* ─── Build edges forming a graph ─────────────────────────────────────────── */
function buildEdges(nodes: NodeDef[]): [number, number, number, boolean][] {
  const edges: [number, number, number, boolean][] = [];
  const INTRA_THRESHOLD = 150;
  const INTER_THRESHOLD = 260;

  // Within cluster
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

  // Inter-cluster
  for (let c1 = 0; c1 < 5; c1++) {
    for (let c2 = c1 + 1; c2 < 5; c2++) {
      const start1 = c1 * NODES_PER_CLUSTER;
      const end1 = start1 + NODES_PER_CLUSTER;
      const start2 = c2 * NODES_PER_CLUSTER;

      for (let i = start1; i < end1; i += 4) {
        for (let j = start2; j < start2 + NODES_PER_CLUSTER; j += 4) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dz = nodes[i].z - nodes[j].z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist < INTER_THRESHOLD) {
            edges.push([i, j, -1, true]);
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
  const cosY = Math.cos(rotY);
  const sinY = Math.sin(rotY);
  const rx = x * cosY + z * sinY;
  const rz = -x * sinY + z * cosY;

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

/* ─── Find continuous paths using BFS ────────────────────────────────────── */
function findPath(nodes: NodeDef[], edges: [number, number, number, boolean][], startNode: number, minLength: number, targetCluster: number): number[] {
  const currentCluster = nodes[startNode].clusterId;
  const adj = new Map<number, number[]>();

  // Build adjacency
  for (const [a, b, _cid, isInter] of edges) {
    if (isInter) {
      if (targetCluster === -1) continue;
      const aCluster = nodes[a].clusterId;
      const bCluster = nodes[b].clusterId;
      const connectsToTarget = (aCluster === currentCluster && bCluster === targetCluster) || (bCluster === currentCluster && aCluster === targetCluster);
      if (!connectsToTarget) continue;
    }
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a)!.push(b);
    adj.get(b)!.push(a);
  }

  // If we need to connect to targetCluster, find a bridge edge
  let bridgeNode = -1;
  let nextNode = -1;
  if (targetCluster !== -1) {
    for (const [a, b, _cid, isInter] of edges) {
      if (isInter) {
        if (nodes[a].clusterId === currentCluster && nodes[b].clusterId === targetCluster) { bridgeNode = a; nextNode = b; break; }
        if (nodes[b].clusterId === currentCluster && nodes[a].clusterId === targetCluster) { bridgeNode = b; nextNode = a; break; }
      }
    }
  }

  const path: number[] = [startNode];
  const visited = new Set<number>();
  visited.add(startNode);
  let curr = startNode;

  // Simple random walk
  for (let i = 0; i < minLength; i++) {
    // If we have a bridge destination, try to step toward it or literally just jump to it eventually
    if (bridgeNode !== -1 && i === Math.floor(minLength / 2)) {
      curr = bridgeNode;
      path.push(curr);
      visited.add(curr);
      path.push(nextNode);
      curr = nextNode;
      visited.add(curr);
      bridgeNode = -1; // cross the bridge
      continue;
    }

    const neighbors = adj.get(curr) || [];
    const unvisited = neighbors.filter(n => !visited.has(n));
    if (unvisited.length === 0) break;

    const next = unvisited[Math.floor(Math.random() * unvisited.length)];
    visited.add(next);
    path.push(next);
    curr = next;
  }
  return path;
}

interface PathTracer {
  path: number[];
  currentIndex: number;
  progress: number; // 0-1 between current and next
  speed: number;
}

export function CSSLattice() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const tRef = useRef<number>(0);

  const matchClusterRef = useRef<number>(-1);
  const matchProgressRef = useRef<number>(0);
  const matchTRef = useRef<number>(0);

  const pathTracersRef = useRef<PathTracer[]>([]);

  const nodes = useMemo(() => buildNodes(), []);
  const edges = useMemo(() => buildEdges(nodes), [nodes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

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

    let matchCluster = -1;
    const MATCH_PERIOD = 4000;

    const matchInterval = setInterval(() => {
      matchCluster = (matchCluster + 1) % 5;
      matchClusterRef.current = matchCluster;
      matchProgressRef.current = 0;
      matchTRef.current = 0;

      // Spawn exactly two path tracers
      const newTracers: PathTracer[] = [];
      const targetCluster = (matchCluster + 1) % 5;
      const startBase = matchCluster * NODES_PER_CLUSTER;

      // Path 1: Head to the next cluster
      const startNode1 = startBase + Math.floor(Math.random() * NODES_PER_CLUSTER);
      const path1 = findPath(nodes, edges, startNode1, 8 + Math.floor(Math.random() * 4), targetCluster);
      if (path1.length > 1) {
        newTracers.push({
          path: path1,
          currentIndex: 0,
          progress: 0,
          speed: 0.0015 + Math.random() * 0.0005,
        });
      }

      // Path 2: Stay inside current cluster
      const startNode2 = startBase + Math.floor(Math.random() * NODES_PER_CLUSTER);
      const path2 = findPath(nodes, edges, startNode2, 6 + Math.floor(Math.random() * 4), -1);
      if (path2.length > 1) {
        newTracers.push({
          path: path2,
          currentIndex: 0,
          progress: 0,
          speed: 0.0015 + Math.random() * 0.0005,
        });
      }

      // Overwrite the array to discard previous paths
      pathTracersRef.current = newTracers;
    }, MATCH_PERIOD);

    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = now - lastTime;
      lastTime = now;
      tRef.current += dt;
      const t = tRef.current;

      if (matchClusterRef.current >= 0) {
        matchTRef.current += dt;
        const fadeIn = 600;
        const hold = 1200;
        const fadeOut = 800;
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
      const cy = H / 2;
      const fov = 800;

      const rotY = t * 0.00015;
      const rotX = 0.15 + Math.sin(t * 0.00005) * 0.05;

      const clusterPhases = CLUSTER_CENTERS.map((_, ci) => ({
        ox: Math.sin(t * 0.00008 + ci * 1.3) * 25,
        oy: Math.cos(t * 0.00006 + ci * 0.9) * 20,
        oz: Math.sin(t * 0.00004 + ci * 2.1) * 15,
      }));

      const pos = nodes.map((nd) => {
        const cp = clusterPhases[nd.clusterId];
        const lx = nd.x + Math.sin(t * nd.freqX + nd.phaseX) * nd.ampX + cp.ox;
        const ly = nd.y + Math.sin(t * nd.freqY + nd.phaseY) * nd.ampY + cp.oy;
        const lz = nd.z + Math.sin(t * nd.freqZ + nd.phaseZ) * nd.ampZ + cp.oz;
        return project(lx, ly, lz, rotY, rotX, fov, cx, cy);
      });

      ctx.clearRect(0, 0, W, H);

      const matchC = matchClusterRef.current;
      const matchP = matchProgressRef.current;

      // Draw edges
      for (const edge of edges) {
        const [a, b, clusterId, isInter] = edge;
        const pa = pos[a];
        const pb = pos[b];
        const cid = isInter ? -1 : clusterId;
        const cluster = CLUSTER_COLORS[Math.max(0, cid)];
        const isMatch = !isInter && cid === matchC && matchP > 0;

        const baseAlpha = isInter ? 0.02 + pa.scale * 0.04 : 0.06 + pa.scale * 0.08;

        let strokeColor: string;
        if (isInter) {
          strokeColor = `rgba(139,92,246,${(baseAlpha * 0.7).toFixed(3)})`;
        } else {
          const [r, g, b2] = parseHex(cluster.color);
          strokeColor = `rgba(${r},${g},${b2},${baseAlpha.toFixed(3)})`;
        }

        ctx.beginPath();
        ctx.moveTo(pa.sx, pa.sy);
        ctx.lineTo(pb.sx, pb.sy);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = isInter ? 0.4 : 0.8;
        ctx.stroke();
      }

      // Draw path tracers (continuous line)
      for (let i = pathTracersRef.current.length - 1; i >= 0; i--) {
        const tracer = pathTracersRef.current[i];

        // Advance
        tracer.progress += tracer.speed * dt;
        while (tracer.progress >= 1 && tracer.currentIndex < tracer.path.length - 1) {
          tracer.progress -= 1;
          tracer.currentIndex++;
        }

        if (tracer.currentIndex >= tracer.path.length - 1) {
          pathTracersRef.current.splice(i, 1);
          continue;
        }

        const currNodeIdx = tracer.path[tracer.currentIndex];
        const nextNodeIdx = tracer.path[tracer.currentIndex + 1];

        const pCurr = pos[currNodeIdx];
        const pNext = pos[nextNodeIdx];

        const interpX = pCurr.sx + (pNext.sx - pCurr.sx) * tracer.progress;
        const interpY = pCurr.sy + (pNext.sy - pCurr.sy) * tracer.progress;

        // Draw continuous tail
        ctx.beginPath();
        let tailAlpha = 1;
        // Start from current segment
        ctx.moveTo(interpX, interpY);
        ctx.lineTo(pCurr.sx, pCurr.sy);

        // Go back up to 3 previous segments
        const tailLength = Math.min(tracer.currentIndex, 3);
        let lastPx = pCurr.sx, lastPy = pCurr.sy;
        for (let j = 0; j < tailLength; j++) {
          const prevIdx = tracer.path[tracer.currentIndex - j - 1];
          const pPrev = pos[prevIdx];
          ctx.lineTo(pPrev.sx, pPrev.sy);
          lastPx = pPrev.sx; lastPy = pPrev.sy;
        }

        const grad = ctx.createLinearGradient(interpX, interpY, lastPx, lastPy);
        grad.addColorStop(0, `rgba(246,185,76, 0.9)`);
        grad.addColorStop(1, `rgba(246,185,76, 0)`);

        ctx.strokeStyle = grad;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Glowing head
        const scale = (pCurr.scale + pNext.scale) / 2;
        const r = 3 + scale * 3;

        const headGrad = ctx.createRadialGradient(interpX, interpY, 0, interpX, interpY, r * 4);
        headGrad.addColorStop(0, 'rgba(246,185,76,1)');
        headGrad.addColorStop(0.4, 'rgba(246,185,76,0.4)');
        headGrad.addColorStop(1, 'rgba(246,185,76,0)');

        ctx.beginPath();
        ctx.arc(interpX, interpY, r * 4, 0, Math.PI * 2);
        ctx.fillStyle = headGrad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(interpX, interpY, r, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
      }

      // Draw nodes
      for (const nd of nodes) {
        const p = pos[nd.id];
        const cluster = CLUSTER_COLORS[nd.clusterId];
        const isMatch = nd.clusterId === matchC && matchP > 0;

        const baseR = 2.2 + p.scale * 2.0;
        const r = isMatch ? baseR + matchP * 3.0 : baseR;

        if (isMatch && matchP > 0.1) {
          const grad = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, r * 4.0);
          grad.addColorStop(0, `rgba(246,185,76,${(matchP * 0.4).toFixed(3)})`);
          grad.addColorStop(1, "rgba(246,185,76,0)");
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, r * 4.0, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        } else if (p.scale > 0.9) {
          const grad = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, r * 3.0);
          const [cr, cg, cb] = parseHex(cluster.color);
          grad.addColorStop(0, `rgba(${cr},${cg},${cb},0.25)`);
          grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, r * 3.0, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
        if (isMatch) {
          ctx.fillStyle = `rgba(246,185,76,${(0.7 + matchP * 0.3).toFixed(3)})`;
        } else {
          const [cr, cg, cb] = parseHex(cluster.color);
          const alpha = 0.3 + p.scale * 0.5;
          ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha.toFixed(3)})`;
        }
        ctx.fill();

        if (nd.label) {
          const alpha = isMatch ? 0.8 + matchP * 0.2 : 0.4;
          const [r2, g2, b3] = parseHex(cluster.color);
          ctx.font = "bold 13px 'Geist Mono', monospace";
          ctx.textAlign = "center";
          ctx.fillStyle = `rgba(${r2},${g2},${b3},${alpha.toFixed(3)})`;
          ctx.fillText(nd.label, p.sx, p.sy - 8 - r);
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearInterval(matchInterval);
      ro.disconnect();
    };
  }, [nodes, edges]);

  return (
    <div className="relative w-full h-full">
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background:
            "radial-gradient(ellipse 95% 95% at 50% 50%, transparent 60%, #0A0D0F 90%)",
        }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none z-10"
        style={{
          background: "linear-gradient(to top, #0A0D0F 0%, transparent 100%)",
        }}
      />
      <div
        className="absolute top-0 left-0 right-0 h-20 pointer-events-none z-10"
        style={{
          background: "linear-gradient(to bottom, #0A0D0F 0%, transparent 100%)",
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
