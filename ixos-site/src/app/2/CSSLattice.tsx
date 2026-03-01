"use client";

import { useEffect, useRef, useState } from "react";

interface Node {
  x: number;
  y: number;
  z: number;
  id: number;
}

// A few representative edges between nearby nodes in the 4x4x3 grid
// These form visible connecting lines in 3D space
const EDGE_PAIRS: [number, number][] = [
  [0, 1], [1, 2], [2, 3],
  [4, 5], [5, 6], [6, 7],
  [8, 9], [9, 10], [10, 11],
  [0, 4], [4, 8], [1, 5], [5, 9],
  [2, 6], [6, 10], [3, 7], [7, 11],
  [12, 13], [13, 14], [14, 15],
  [12, 16], [16, 20], [13, 17], [17, 21],
  [0, 12], [1, 13], [4, 16], [5, 17],
  [24, 25], [25, 26], [26, 27],
  [24, 28], [28, 32], [25, 29],
  [12, 24], [13, 25], [16, 28],
];

// The "semantic match" path — a diagonal trace through the lattice
const MATCH_PATH = [0, 5, 10, 15, 16, 21, 26, 27, 38, 39, 40, 41, 42, 43];

export function CSSLattice() {
  const [activeNodes, setActiveNodes] = useState<Set<number>>(new Set());
  const [rotation, setRotation] = useState(0);
  const animFrameRef = useRef<number>(0);

  // Generate 4x4x3 grid = 48 nodes
  const nodes: Node[] = [];
  for (let x = 0; x < 4; x++) {
    for (let y = 0; y < 4; y++) {
      for (let z = 0; z < 3; z++) {
        nodes.push({
          x: (x - 1.5) * 72,
          y: (y - 1.5) * 72,
          z: (z - 1) * 72,
          id: nodes.length,
        });
      }
    }
  }

  // Slow continuous rotation
  useEffect(() => {
    let angle = 0;
    const tick = () => {
      angle += 0.0025;
      setRotation(angle);
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  // Periodic "semantic match" wave — lights amber nodes sequentially
  useEffect(() => {
    const triggerMatch = () => {
      const validPath = MATCH_PATH.filter((id) => id < nodes.length);
      validPath.forEach((id, i) => {
        setTimeout(() => {
          setActiveNodes((prev) => new Set([...prev, id]));
          setTimeout(() => {
            setActiveNodes((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
          }, 1000);
        }, i * 55);
      });
    };

    triggerMatch();
    const interval = setInterval(triggerMatch, 3800);
    return () => clearInterval(interval);
  }, [nodes.length]);

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: "300px", perspective: "900px", perspectiveOrigin: "50% 50%" }}
    >
      {/* Radial fog vignette — fades edges into background */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background:
            "radial-gradient(ellipse 75% 65% at 50% 50%, transparent 45%, #080c14 88%)",
        }}
      />

      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none z-10"
        style={{
          background: "linear-gradient(to top, #080c14 0%, transparent 100%)",
        }}
      />

      {/* 3D scene root */}
      <div
        style={{
          transformStyle: "preserve-3d",
          transform: `rotateY(${rotation}rad) rotateX(0.18rad)`,
          position: "absolute",
          top: "50%",
          left: "50%",
        }}
      >
        {/* SVG overlay for edges — rendered in 3D space */}
        {EDGE_PAIRS.map(([a, b]) => {
          if (a >= nodes.length || b >= nodes.length) return null;
          const nodeA = nodes[a];
          const nodeB = nodes[b];
          const isActive = activeNodes.has(a) && activeNodes.has(b);
          const dx = nodeB.x - nodeA.x;
          const dy = nodeB.y - nodeA.y;
          const dz = nodeB.z - nodeA.z;
          const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const rotY = -Math.atan2(dz, dx);
          const rotZ = Math.atan2(dy, Math.sqrt(dx * dx + dz * dz));
          return (
            <div
              key={`edge-${a}-${b}`}
              style={{
                position: "absolute",
                width: `${len}px`,
                height: "1px",
                background: isActive
                  ? "rgba(246,185,76,0.4)"
                  : "rgba(20,184,166,0.08)",
                transformOrigin: "0 50%",
                transform: `translate3d(${nodeA.x}px, ${nodeA.y}px, ${nodeA.z}px) rotateY(${rotY}rad) rotateZ(${rotZ}rad)`,
                transition: "background 0.25s",
              }}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const isActive = activeNodes.has(node.id);
          return (
            <div
              key={node.id}
              style={{
                position: "absolute",
                transform: `translate3d(${node.x}px, ${node.y}px, ${node.z}px)`,
                width: isActive ? "8px" : "5px",
                height: isActive ? "8px" : "5px",
                borderRadius: "50%",
                marginLeft: isActive ? "-4px" : "-2.5px",
                marginTop: isActive ? "-4px" : "-2.5px",
                background: isActive
                  ? "#F6B94C"
                  : "rgba(20,184,166,0.28)",
                boxShadow: isActive
                  ? "0 0 14px rgba(246,185,76,0.9), 0 0 28px rgba(246,185,76,0.4)"
                  : "none",
                transition: "all 0.18s ease",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
