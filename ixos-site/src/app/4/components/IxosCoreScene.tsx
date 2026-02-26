"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ─── File Node Vertex Shader ──────────────────────────────────────────────────
// Each "point" is a file in the filesystem.
// Animation cycle (4s):
//   0→35%  — sweep ring expands out from center (lexical scan)
//   35→65% — top-scored files converge toward center (semantic rerank)
//   65→80% — hold (results locked)
//   80→100%— scatter back out (reset)
const NODE_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uSweepR;   // expanding sweep ring radius (0 → 4.5)
  uniform float uConverge; // 0→1, result-node convergence

  attribute float aPhase;  // per-node random seed
  attribute float aScore;  // 0–1 pre-assigned relevance
  attribute vec3  aRest;   // resting position in 3D space

  varying float vBright;
  varying float vIsResult;

  void main() {
    vec3 pos = aRest;

    // Ambient drift — gentle, organic
    pos.x += sin(uTime * 0.22 + aPhase * 1.1) * 0.07;
    pos.y += cos(uTime * 0.17 + aPhase * 0.9) * 0.06;
    pos.z += sin(uTime * 0.13 + aPhase * 1.3) * 0.04;

    float dist = length(aRest);

    // isResult: 1.0 if high-relevance, else 0.0
    float isRes = step(0.64, aScore);
    vIsResult = isRes;

    // Sweep proximity — Gaussian ring centered at uSweepR
    float gap   = abs(dist - uSweepR);
    float sweep = exp(-gap * gap * 9.0);

    // Result convergence — top files drift to result cluster near center
    vec3 clusterPos = vec3(
      sin(aPhase * 6.1 + 0.5) * 0.55,
      cos(aPhase * 4.8 + 1.2) * 0.50,
      sin(aPhase * 3.3 + 0.8) * 0.25
    );
    pos = mix(pos, clusterPos, isRes * uConverge * 0.85);

    // Brightness: ambient baseline + sweep flash + result glow
    float resultGlow = isRes * uConverge;
    vBright = 0.14 + sweep * 1.3 + resultGlow * 1.1;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;

    // Point size scales with score + brightness
    float sz = (1.8 + aScore * 5.0 + vBright * 8.0) * 175.0 / (-mvPos.z);
    gl_PointSize = clamp(sz, 0.8, 26.0);
  }
`;

// ─── File Node Fragment Shader ────────────────────────────────────────────────
// Renders each node as a small square "file icon" with chamfered corners.
// Color:
//   idle     → dim teal-gray
//   sweep    → amber (lexical match flash)
//   result   → bright teal (semantic result)
const NODE_FRAG = /* glsl */ `
  uniform float uConverge;
  varying float vBright;
  varying float vIsResult;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;

    // Square file-icon silhouette with slight chamfer
    float sq = max(abs(uv.x), abs(uv.y)) * 2.0;
    float shape = 1.0 - smoothstep(0.58, 0.88, sq);
    if (shape < 0.01) discard;

    vec3 idleCol   = vec3(0.10, 0.26, 0.30);  // dim teal-gray
    vec3 sweepCol  = vec3(0.97, 0.74, 0.22);  // amber lexical hit
    vec3 resultCol = vec3(0.16, 0.88, 0.78);  // teal semantic result

    float sweepAmt  = clamp(vBright - vIsResult * uConverge * 0.9, 0.0, 1.2);
    float resultAmt = vIsResult * uConverge;

    vec3 col = idleCol + sweepCol * sweepAmt + resultCol * resultAmt;
    float alpha = shape * clamp(0.18 + vBright * 0.82, 0.0, 1.0);

    gl_FragColor = vec4(col, alpha);
  }
`;

// ─── File nodes ───────────────────────────────────────────────────────────────
function FileNodes({ n, lowEnd }: { n: number; lowEnd: boolean }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  // Build per-node attributes once
  const [restArr, phaseArr, scoreArr] = useMemo(() => {
    const rest  = new Float32Array(n * 3);
    const phase = new Float32Array(n);
    const score = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      // Scatter across hemisphere facing viewer
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(1 - 2 * Math.random());
      const r     = 1.3 + Math.random() * 2.2;

      rest[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      rest[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      rest[i * 3 + 2] = r * Math.cos(phi) * 0.55; // flatten Z for screen

      phase[i] = Math.random() * Math.PI * 2;
      score[i] = Math.pow(Math.random(), 1.6); // bias low
    }

    // Force ~14% to be "result" nodes with high scores
    const nResult = Math.max(8, Math.floor(n * 0.14));
    for (let i = 0; i < nResult; i++) {
      score[i] = 0.68 + Math.random() * 0.32;
    }

    return [rest, phase, score];
  }, [n]);

  const uniforms = useMemo(
    () => ({
      uTime:     { value: 0 },
      uSweepR:   { value: -1 },
      uConverge: { value: 0 },
    }),
    []
  );

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    // position = rest position (vertex shader will add drift)
    geo.setAttribute("position", new THREE.BufferAttribute(restArr.slice(), 3));
    geo.setAttribute("aRest",    new THREE.BufferAttribute(restArr, 3));
    geo.setAttribute("aPhase",   new THREE.BufferAttribute(phaseArr, 1));
    geo.setAttribute("aScore",   new THREE.BufferAttribute(scoreArr, 1));
    return geo;
  }, [restArr, phaseArr, scoreArr]);

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    const t = clock.getElapsedTime();
    const u = matRef.current.uniforms;
    u.uTime.value = t;

    // 4-second animation cycle
    const c = (t % 4.5) / 4.5;

    if (c < 0.32) {
      // Sweep expands
      u.uSweepR.value   = (c / 0.32) * 4.4;
      u.uConverge.value = 0;
    } else if (c < 0.60) {
      // Results converge
      u.uSweepR.value   = 5.0;
      u.uConverge.value = (c - 0.32) / 0.28;
    } else if (c < 0.78) {
      // Hold
      u.uSweepR.value   = 5.0;
      u.uConverge.value = 1.0;
    } else {
      // Scatter back
      u.uSweepR.value   = 5.0;
      u.uConverge.value = 1.0 - (c - 0.78) / 0.22;
    }
  });

  return (
    <points geometry={geometry}>
      <shaderMaterial
        ref={matRef}
        vertexShader={NODE_VERT}
        fragmentShader={NODE_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ─── Expanding sweep ring ─────────────────────────────────────────────────────
// Thin torus that scales out from center — the "lexical scan wave"
function SweepRing({ lowEnd }: { lowEnd: boolean }) {
  const ref    = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    if (!ref.current || !matRef.current) return;
    const c = (clock.getElapsedTime() % 4.5) / 4.5;

    if (c < 0.32) {
      const p = c / 0.32;
      ref.current.scale.setScalar(p * 4.4);
      matRef.current.opacity = (1 - p * 0.7) * 0.22;
    } else {
      ref.current.scale.setScalar(0.001);
      matRef.current.opacity = 0;
    }
  });

  if (lowEnd) return null;

  return (
    <mesh ref={ref}>
      <torusGeometry args={[1, 0.012, 6, 120]} />
      <meshBasicMaterial ref={matRef} color="#F59E0B" transparent opacity={0} />
    </mesh>
  );
}

// ─── Result cluster glow ──────────────────────────────────────────────────────
// Soft sphere that pulses at center when results are converged
function ResultGlow({ lowEnd }: { lowEnd: boolean }) {
  const ref    = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    if (!ref.current || !matRef.current) return;
    const c = (clock.getElapsedTime() % 4.5) / 4.5;

    if (c > 0.42 && c < 0.82) {
      const t = (c - 0.42) / 0.40;
      const pulse = Math.sin(t * Math.PI);
      matRef.current.opacity = pulse * 0.18;
      ref.current.scale.setScalar(0.55 + pulse * 0.15);
    } else {
      matRef.current.opacity = 0;
    }
  });

  if (lowEnd) return null;

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial ref={matRef} color="#2DD4BF" transparent opacity={0} />
    </mesh>
  );
}

// ─── Depth grid — faint reference lines ──────────────────────────────────────
function DepthGrid({ lowEnd }: { lowEnd: boolean }) {
  const geo = useMemo(() => {
    const verts: number[] = [];
    const ext = 4.5;
    const step = 1.5;

    for (let x = -ext; x <= ext; x += step) {
      verts.push(x, -ext, -1.5, x, ext, -1.5);
    }
    for (let y = -ext; y <= ext; y += step) {
      verts.push(-ext, y, -1.5, ext, y, -1.5);
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(verts), 3));
    return g;
  }, []);

  if (lowEnd) return null;

  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#0e2020" transparent opacity={0.45} />
    </lineSegments>
  );
}

// ─── Query pulse — brief ring from center at cycle start ──────────────────────
function QueryPulse({ lowEnd }: { lowEnd: boolean }) {
  const ref    = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    if (!ref.current || !matRef.current) return;
    const c = (clock.getElapsedTime() % 4.5) / 4.5;

    if (c < 0.08) {
      const p = c / 0.08;
      ref.current.scale.setScalar(p * 1.2);
      matRef.current.opacity = (1 - p) * 0.55;
    } else {
      matRef.current.opacity = 0;
    }
  });

  if (lowEnd) return null;

  return (
    <mesh ref={ref}>
      <torusGeometry args={[1, 0.025, 8, 64]} />
      <meshBasicMaterial ref={matRef} color="#2DD4BF" transparent opacity={0} />
    </mesh>
  );
}

// ─── Scene ────────────────────────────────────────────────────────────────────
interface IxosCoreSceneProps {
  lowEnd?: boolean;
}

export function IxosCoreScene({ lowEnd = false }: IxosCoreSceneProps) {
  const n = lowEnd ? 36 : 110;

  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 46 }}
      gl={{ antialias: !lowEnd, alpha: true }}
      dpr={lowEnd ? 1 : [1, 1.5]}
    >
      <DepthGrid lowEnd={lowEnd} />
      <FileNodes n={n} lowEnd={lowEnd} />
      <SweepRing lowEnd={lowEnd} />
      <QueryPulse lowEnd={lowEnd} />
      <ResultGlow lowEnd={lowEnd} />
    </Canvas>
  );
}
