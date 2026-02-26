"use client";

// ─── Ixos Hero 3D Scene — Cinematic Pipeline Flythrough ────────────────────────
// Upgraded: camera moves through phases, result card meshes, much larger points.
// 6-second cycle: establishing → query fires → lexical sweep → semantic rerank → lock/orbit → scatter

import { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const CYCLE = 6.5;

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function eio(t: number) {
  t = clamp(t, 0, 1);
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

// ─── Camera choreography ──────────────────────────────────────────────────────
function CameraRig() {
  const { camera } = useThree();

  useFrame(({ clock }) => {
    const c = (clock.getElapsedTime() % CYCLE) / CYCLE;

    let tx = 0, ty = 0, tz = 7;

    if (c < 0.12) {
      // 0–0.12 Establishing: high angle, wide view
      tx = 0;
      ty = lerp(2.8, 1.2, eio(c / 0.12));
      tz = lerp(10.5, 8.0, eio(c / 0.12));
    } else if (c < 0.28) {
      // 0.12–0.28 Query fires: zoom in smoothly
      const p = (c - 0.12) / 0.16;
      tx = 0;
      ty = lerp(1.2, 0.3, eio(p));
      tz = lerp(8.0, 6.5, eio(p));
    } else if (c < 0.52) {
      // 0.28–0.52 Lexical sweep: pull back slightly, tilt right
      const p = (c - 0.28) / 0.24;
      tx = lerp(0, 0.7, eio(p));
      ty = lerp(0.3, 0.1, p);
      tz = lerp(6.5, 7.0, eio(p));
    } else if (c < 0.70) {
      // 0.52–0.70 Rerank: track toward result cluster
      const p = (c - 0.52) / 0.18;
      tx = lerp(0.7, -0.2, eio(p));
      ty = lerp(0.1, 0.1, p);
      tz = lerp(7.0, 5.8, eio(p));
    } else if (c < 0.86) {
      // 0.70–0.86 Lock/orbit: gentle orbit around result panel
      const p = (c - 0.70) / 0.16;
      const angle = eio(p) * Math.PI * 0.4;
      tx = Math.sin(angle) * 1.0;
      ty = 0.1 + Math.sin(angle * 0.6) * 0.2;
      tz = 5.8 + Math.cos(angle) * 0.5;
    } else {
      // 0.86–1.0 Scatter: pull back to establishing position
      const p = (c - 0.86) / 0.14;
      tx = lerp(Math.sin(0.4) * 1.0, 0, eio(p));
      ty = lerp(0.3, 2.8, eio(p));
      tz = lerp(6.3, 10.5, eio(p));
    }

    // Smooth interpolation
    camera.position.x += (tx - camera.position.x) * 0.04;
    camera.position.y += (ty - camera.position.y) * 0.04;
    camera.position.z += (tz - camera.position.z) * 0.04;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

// ─── File Node Shaders ────────────────────────────────────────────────────────
const NODE_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uSweepR;
  uniform float uConverge;

  attribute float aPhase;
  attribute float aScore;
  attribute vec3  aRest;

  varying float vBright;
  varying float vIsResult;
  varying float vSweepAmt;

  void main() {
    vec3 pos = aRest;
    pos.x += sin(uTime * 0.20 + aPhase * 1.1) * 0.09;
    pos.y += cos(uTime * 0.15 + aPhase * 0.9) * 0.08;
    pos.z += sin(uTime * 0.12 + aPhase * 1.3) * 0.05;

    float dist = length(aRest);
    float isRes = step(0.64, aScore);
    vIsResult = isRes;

    float gap   = abs(dist - uSweepR);
    float sweep = exp(-gap * gap * 4.5);
    vSweepAmt = sweep;

    vec3 clusterPos = vec3(
      sin(aPhase * 6.1 + 0.5) * 0.65,
      cos(aPhase * 4.8 + 1.2) * 0.60,
      sin(aPhase * 3.3 + 0.8) * 0.30
    );
    pos = mix(pos, clusterPos, isRes * uConverge * 0.90);

    float resultGlow = isRes * uConverge;
    vBright = 0.20 + sweep * 1.8 + resultGlow * 1.5;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;

    float sz = (3.0 + aScore * 9.0 + vBright * 14.0) * 240.0 / (-mvPos.z);
    gl_PointSize = clamp(sz, 1.2, 42.0);
  }
`;

const NODE_FRAG = /* glsl */ `
  uniform float uConverge;
  varying float vBright;
  varying float vIsResult;
  varying float vSweepAmt;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float sq = max(abs(uv.x), abs(uv.y)) * 2.0;
    float shape = 1.0 - smoothstep(0.50, 0.80, sq);
    if (shape < 0.01) discard;

    // File fold mark (top-right corner)
    float fold = step(uv.x + uv.y, 0.32) * step(uv.x, 0.20) * step(uv.y, 0.20);

    vec3 idleCol   = vec3(0.10, 0.26, 0.31);
    vec3 sweepCol  = vec3(0.97, 0.74, 0.20);
    vec3 resultCol = vec3(0.14, 0.88, 0.76);

    float sweepAmt  = clamp(vSweepAmt * 1.5, 0.0, 1.0);
    float resultAmt = vIsResult * uConverge;

    vec3 col = idleCol;
    col = mix(col, sweepCol, sweepAmt * (1.0 - resultAmt));
    col = mix(col, resultCol, resultAmt);
    col += fold * 0.06;

    float alpha = shape * clamp(0.25 + vBright * 0.75, 0.0, 1.0);
    gl_FragColor = vec4(col, alpha);
  }
`;

function FileNodes({ n }: { n: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const [restArr, phaseArr, scoreArr] = useMemo(() => {
    const rest  = new Float32Array(n * 3);
    const phase = new Float32Array(n);
    const score = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(1 - 2 * Math.random());
      const r     = 1.5 + Math.random() * 2.8;

      rest[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      rest[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      rest[i * 3 + 2] = r * Math.cos(phi) * 0.5;

      phase[i] = Math.random() * Math.PI * 2;
      score[i] = Math.pow(Math.random(), 1.5);
    }

    const nResult = Math.max(12, Math.floor(n * 0.15));
    for (let i = 0; i < nResult; i++) {
      score[i] = 0.68 + Math.random() * 0.32;
    }

    return [rest, phase, score];
  }, [n]);

  const uniforms = useMemo(() => ({
    uTime:     { value: 0 },
    uSweepR:   { value: -1 },
    uConverge: { value: 0 },
  }), []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(restArr.slice(), 3));
    geo.setAttribute("aRest",    new THREE.BufferAttribute(restArr, 3));
    geo.setAttribute("aPhase",   new THREE.BufferAttribute(phaseArr, 1));
    geo.setAttribute("aScore",   new THREE.BufferAttribute(scoreArr, 1));
    return geo;
  }, [restArr, phaseArr, scoreArr]);

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    const t = clock.getElapsedTime();
    const c = (t % CYCLE) / CYCLE;
    const u = matRef.current.uniforms;
    u.uTime.value = t;

    if (c < 0.12) {
      u.uSweepR.value   = -1;
      u.uConverge.value = 0;
    } else if (c < 0.28) {
      const p = Math.max(0, (c - 0.22) / 0.06);
      u.uSweepR.value   = p * 0.8;
      u.uConverge.value = 0;
    } else if (c < 0.52) {
      const p = (c - 0.28) / 0.24;
      u.uSweepR.value   = p * 5.5;
      u.uConverge.value = 0;
    } else if (c < 0.70) {
      const p = (c - 0.52) / 0.18;
      u.uSweepR.value   = 5.8;
      u.uConverge.value = eio(p);
    } else if (c < 0.86) {
      u.uSweepR.value   = 5.8;
      u.uConverge.value = 1.0;
    } else {
      const p = (c - 0.86) / 0.14;
      u.uSweepR.value   = 5.8;
      u.uConverge.value = 1.0 - eio(p);
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

// ─── Result Card Shaders ──────────────────────────────────────────────────────
const CARD_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const CARD_FRAG = /* glsl */ `
  uniform vec3 uBorderColor;
  uniform float uAlpha;
  uniform float uRank;
  varying vec2 vUv;

  void main() {
    float bw = 0.045;
    float ex = step(1.0 - bw, vUv.x) + step(vUv.x, bw);
    float ey = step(1.0 - bw, vUv.y) + step(vUv.y, bw);
    float isEdge = clamp(ex + ey, 0.0, 1.0);

    // Card body
    vec3 body = vec3(0.042, 0.062, 0.072);

    // Content lines (simulate file text)
    float lp = fract(vUv.y * 4.5 + 0.15);
    float lineOn = step(lp, 0.22);
    float lineX = step(0.10, vUv.x) * step(vUv.x, 0.72 - uRank * 0.06);
    float lines = lineOn * lineX * 0.055;

    // Score bar at bottom
    float barY = step(vUv.y, 0.14) * step(0.0, vUv.y);
    float barX = step(0.10, vUv.x) * step(vUv.x, 0.85 - uRank * 0.08);
    vec3 barCol = uBorderColor * 0.55;

    // Fold (top-right corner)
    float fx = 1.0 - vUv.x;
    float fy = vUv.y;
    float fold = step(fx + fy, 0.18) * step(fx, 0.12) * step(fy, 0.12);

    vec3 col = body + vec3(lines);
    col = mix(col, uBorderColor, isEdge * 0.92);
    col = mix(col, barCol, barY * barX * (1.0 - isEdge));
    col += fold * 0.04;

    gl_FragColor = vec4(col, uAlpha);
  }
`;

const CARD_COLORS = [
  "#2DD4BF", "#2DD4BF", "#2DD4BF",
  "#7C3AED", "#7C3AED", "#F59E0B",
];

const CARD_REST: [number, number, number][] = [
  [-3.2, 1.4, -0.8],
  [3.0, 0.8, -0.5],
  [-2.8, -0.8, 0.4],
  [2.5, -1.2, -0.3],
  [-2.2, 2.0, 0.2],
  [3.4, 0.2, 0.5],
];

// Target: vertical list on left side of viewport
const CARD_TARGET: [number, number, number][] = [
  [-1.4, 1.55, 0.6],
  [-1.4, 1.00, 0.6],
  [-1.4, 0.45, 0.6],
  [-1.4, -0.10, 0.6],
  [-1.4, -0.65, 0.6],
  [-1.4, -1.20, 0.6],
];

function ResultCard({
  index, rest, target,
}: {
  index: number;
  rest: [number, number, number];
  target: [number, number, number];
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef  = useRef<THREE.ShaderMaterial>(null);

  const borderColor = useMemo(() => new THREE.Color(CARD_COLORS[index]), [index]);

  const uniforms = useMemo(() => ({
    uBorderColor: { value: borderColor },
    uAlpha:       { value: 0 },
    uRank:        { value: index / 5 },
  }), [borderColor, index]);

  useFrame(({ clock }) => {
    if (!meshRef.current || !matRef.current) return;
    const c = (clock.getElapsedTime() % CYCLE) / CYCLE;

    let converge = 0;
    if (c > 0.52 && c < 0.70) {
      converge = eio((c - 0.52) / 0.18);
    } else if (c >= 0.70 && c < 0.86) {
      converge = 1.0;
    } else if (c >= 0.86) {
      converge = Math.max(0, 1.0 - eio((c - 0.86) / 0.14));
    }

    // Stagger entry per card (card 0 enters first)
    const stagger = clamp(converge * 2.2 - index * 0.22, 0, 1);

    meshRef.current.position.set(
      lerp(rest[0], target[0], eio(stagger)),
      lerp(rest[1], target[1], eio(stagger)),
      lerp(rest[2], target[2], eio(stagger)),
    );
    meshRef.current.scale.setScalar(stagger < 0.05 ? 0 : lerp(0.4, 1, clamp(stagger * 2, 0, 1)));
    meshRef.current.rotation.y = lerp(0.4, 0, eio(stagger)) * (index % 2 === 0 ? 1 : -1);
    matRef.current.uniforms.uAlpha.value = stagger;
  });

  return (
    <mesh ref={meshRef} position={rest}>
      <planeGeometry args={[1.15, 0.44]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={CARD_VERT}
        fragmentShader={CARD_FRAG}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// ─── Sweep Ring ───────────────────────────────────────────────────────────────
function SweepRing() {
  const ref    = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    if (!ref.current || !matRef.current) return;
    const c = (clock.getElapsedTime() % CYCLE) / CYCLE;

    if (c > 0.24 && c < 0.54) {
      const p = (c - 0.24) / 0.30;
      ref.current.scale.setScalar(p * 5.5);
      matRef.current.opacity = (1 - p * 0.55) * 0.40;
      ref.current.visible = true;
    } else {
      ref.current.visible = false;
    }
  });

  return (
    <mesh ref={ref}>
      <torusGeometry args={[1, 0.030, 10, 144]} />
      <meshBasicMaterial ref={matRef} color="#F59E0B" transparent opacity={0} />
    </mesh>
  );
}

// A second, inner ring for depth
function InnerRing() {
  const ref    = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    if (!ref.current || !matRef.current) return;
    const c = (clock.getElapsedTime() % CYCLE) / CYCLE;

    if (c > 0.26 && c < 0.50) {
      const p = (c - 0.26) / 0.24;
      ref.current.scale.setScalar(p * 3.0);
      matRef.current.opacity = (1 - p) * 0.20;
      ref.current.visible = true;
    } else {
      ref.current.visible = false;
    }
  });

  return (
    <mesh ref={ref}>
      <torusGeometry args={[1, 0.015, 8, 96]} />
      <meshBasicMaterial ref={matRef} color="#2DD4BF" transparent opacity={0} />
    </mesh>
  );
}

// ─── Query Pulse ──────────────────────────────────────────────────────────────
function QueryPulse() {
  const ref    = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    if (!ref.current || !matRef.current) return;
    const c = (clock.getElapsedTime() % CYCLE) / CYCLE;

    if (c > 0.20 && c < 0.30) {
      const p = (c - 0.20) / 0.10;
      ref.current.scale.setScalar(p * 2.2);
      matRef.current.opacity = (1 - p) * 0.70;
      ref.current.visible = true;
    } else {
      ref.current.visible = false;
    }
  });

  return (
    <mesh ref={ref}>
      <torusGeometry args={[1, 0.040, 12, 72]} />
      <meshBasicMaterial ref={matRef} color="#2DD4BF" transparent opacity={0} />
    </mesh>
  );
}

// ─── Result Glow ─────────────────────────────────────────────────────────────
function ResultGlow() {
  const ref    = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    if (!ref.current || !matRef.current) return;
    const c = (clock.getElapsedTime() % CYCLE) / CYCLE;

    if (c > 0.58 && c < 0.90) {
      const t = (c - 0.58) / 0.32;
      const pulse = Math.sin(t * Math.PI);
      matRef.current.opacity = pulse * 0.10;
      ref.current.scale.setScalar(0.85 + pulse * 0.25);
      ref.current.visible = true;
    } else {
      ref.current.visible = false;
    }
  });

  return (
    <mesh ref={ref} position={[-1.4, 0.2, 0.2]}>
      <sphereGeometry args={[1.8, 24, 24]} />
      <meshBasicMaterial ref={matRef} color="#2DD4BF" transparent opacity={0} />
    </mesh>
  );
}

// ─── Depth grid ───────────────────────────────────────────────────────────────
function DepthGrid() {
  const geo = useMemo(() => {
    const verts: number[] = [];
    const ext = 6.0;
    const step = 1.5;
    for (let x = -ext; x <= ext; x += step) {
      verts.push(x, -ext, -2.5, x, ext, -2.5);
    }
    for (let y = -ext; y <= ext; y += step) {
      verts.push(-ext, y, -2.5, ext, y, -2.5);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(verts), 3));
    return g;
  }, []);

  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#081818" transparent opacity={0.6} />
    </lineSegments>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
interface IxosCoreSceneProps {
  lowEnd?: boolean;
}

export function IxosCoreScene({ lowEnd = false }: IxosCoreSceneProps) {
  const n = lowEnd ? 48 : 160;

  return (
    <Canvas
      camera={{ position: [0, 2.8, 10.5], fov: 52 }}
      gl={{ antialias: !lowEnd, alpha: true }}
      dpr={lowEnd ? 1 : [1, 1.6]}
    >
      <CameraRig />
      <DepthGrid />
      <FileNodes n={n} />
      <SweepRing />
      <InnerRing />
      <QueryPulse />
      <ResultGlow />
      {!lowEnd && CARD_REST.map((rest, i) => (
        <ResultCard
          key={i}
          index={i}
          rest={rest}
          target={CARD_TARGET[i]}
        />
      ))}
    </Canvas>
  );
}
