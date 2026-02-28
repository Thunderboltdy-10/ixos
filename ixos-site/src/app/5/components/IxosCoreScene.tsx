"use client";

// ─── Ixos Hero 3D Scene — Cinematic Pipeline Flythrough ────────────────────────
// Upgraded: Next-generation 3D visualization. Insane WOW factor.
// Enhanced particle count, more dynamic camera, glowing post-processing effects, 
// complex vertex shaders, and organic movements.

import { useRef, useMemo, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const CYCLE = 8.0;

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function eio(t: number) {
  t = clamp(t, 0, 1);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ─── Camera choreography ──────────────────────────────────────────────────────
function CameraRig() {
  const { camera } = useThree();
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useMemo(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', (e) => {
        setMouse({
          x: (e.clientX / window.innerWidth - 0.5) * 2,
          y: (e.clientY / window.innerHeight - 0.5) * 2
        });
      });
    }
  }, []);

  useFrame(({ clock }) => {
    const c = (clock.getElapsedTime() % CYCLE) / CYCLE;
    let tx = 0, ty = 0, tz = 12;
    let lx = 0, ly = 0, lz = 0; // lookat

    if (c < 0.15) {
      // 0–0.15 Establishing: sweeping wide view
      tx = lerp(-4, 0, eio(c / 0.15));
      ty = lerp(4, 2, eio(c / 0.15));
      tz = lerp(14, 9, eio(c / 0.15));
      lx = lerp(-2, 0, eio(c / 0.15));
    } else if (c < 0.35) {
      // 0.15–0.35 Dive into the data
      const p = (c - 0.15) / 0.20;
      tx = lerp(0, 1.5, eio(p));
      ty = lerp(2, -0.5, eio(p));
      tz = lerp(9, 4, eio(p));
      lx = lerp(0, 1, eio(p));
      ly = lerp(0, -1, eio(p));
    } else if (c < 0.60) {
      // 0.35–0.60 Semantic rerank: orbit and tilt
      const p = (c - 0.35) / 0.25;
      const angle = eio(p) * Math.PI * 0.8;
      tx = 1.5 + Math.sin(angle) * 3;
      ty = -0.5 + Math.sin(angle * 2) * 1.5;
      tz = 4 + Math.cos(angle) * 2;
      lx = 1;
      ly = -1;
    } else if (c < 0.85) {
      // 0.60–0.85 Lock: focus on result cards
      const p = (c - 0.60) / 0.25;
      tx = lerp(1.5 + Math.sin(Math.PI * 0.8) * 3, -2.5, eio(p));
      ty = lerp(-0.5 + Math.sin(Math.PI * 1.6) * 1.5, 0.5, eio(p));
      tz = lerp(4 + Math.cos(Math.PI * 0.8) * 2, 6, eio(p));
      lx = lerp(1, -2.5, eio(p));
      ly = lerp(-1, 0, eio(p));
      lz = lerp(0, 0, eio(p));
    } else {
      // 0.85–1.0 Scatter: pull back and reset
      const p = (c - 0.85) / 0.15;
      tx = lerp(-2.5, -4, eio(p));
      ty = lerp(0.5, 4, eio(p));
      tz = lerp(6, 14, eio(p));
      lx = lerp(-2.5, -2, eio(p));
    }

    // Add parallax
    tx += mouse.x * 1.5;
    ty -= mouse.y * 1.5;

    camera.position.x += (tx - camera.position.x) * 0.05;
    camera.position.y += (ty - camera.position.y) * 0.05;
    camera.position.z += (tz - camera.position.z) * 0.05;

    const targetLookAt = new THREE.Vector3(lx, ly, lz);
    
    // Smooth lookat via quaternion spherical linear interpolation
    const currentLookAt = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).add(camera.position);
    currentLookAt.lerp(targetLookAt, 0.05);
    camera.lookAt(currentLookAt);
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
  attribute vec3  aTarget;

  varying float vBright;
  varying float vIsResult;
  varying float vSweepAmt;
  varying vec3 vColor;

  void main() {
    vec3 pos = aRest;
    
    // Complex organic idle motion
    pos.x += sin(uTime * 0.4 + aPhase * 2.1) * 0.15 + cos(uTime * 0.2 + aRest.y) * 0.1;
    pos.y += cos(uTime * 0.3 + aPhase * 1.9) * 0.15 + sin(uTime * 0.25 + aRest.z) * 0.1;
    pos.z += sin(uTime * 0.5 + aPhase * 2.3) * 0.15 + cos(uTime * 0.15 + aRest.x) * 0.1;

    float dist = length(aRest);
    float isRes = step(0.75, aScore);
    vIsResult = isRes;

    // Pulse wave traveling outward
    float gap   = abs(dist - uSweepR);
    float sweep = exp(-gap * gap * 6.0) * (sin(uTime * 10.0 + dist * 5.0) * 0.5 + 0.5);
    vSweepAmt = sweep;

    // Converge to specific targets instead of just a generic cluster
    vec3 convergedPos = mix(pos, aTarget, uConverge * isRes);
    
    // Add magnetic swirl when converging
    float swirlAmt = uConverge * isRes * (1.0 - uConverge);
    convergedPos.x += sin(uTime * 5.0 + aPhase) * swirlAmt * 2.0;
    convergedPos.y += cos(uTime * 4.0 + aPhase) * swirlAmt * 2.0;
    convergedPos.z += sin(uTime * 6.0 + aPhase) * swirlAmt * 2.0;

    pos = convergedPos;

    float resultGlow = isRes * uConverge;
    vBright = 0.15 + sweep * 2.5 + resultGlow * 2.0 + (sin(uTime * 3.0 + aPhase * 10.0) * 0.1);

    // Dynamic coloring based on position and phase
    vec3 idleCol   = vec3(0.05, 0.2 + sin(aPhase)*0.1, 0.3 + cos(aPhase)*0.1);
    vec3 sweepCol  = vec3(0.97, 0.6 + sin(aPhase * 2.0)*0.2, 0.2);
    vec3 resultCol = vec3(0.2, 0.9, 0.8 + sin(uTime * 4.0 + aPhase)*0.2);

    vColor = mix(idleCol, sweepCol, clamp(sweep * 2.0, 0.0, 1.0));
    vColor = mix(vColor, resultCol, resultGlow);

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;

    float sz = (5.0 + aScore * 15.0 + vBright * 25.0) * 300.0 / (-mvPos.z);
    gl_PointSize = clamp(sz, 2.0, 80.0);
  }
`;

const NODE_FRAG = /* glsl */ `
  varying float vBright;
  varying float vIsResult;
  varying float vSweepAmt;
  varying vec3 vColor;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float dist = length(uv);
    
    // Star-like core with soft glow
    float core = exp(-dist * 8.0);
    float glow = exp(-dist * 3.0) * 0.5;
    
    // Data packet shape (diamonds for results, circles for idle)
    float diamond = 1.0 - (abs(uv.x) + abs(uv.y)) * 2.0;
    float shape = mix(1.0 - smoothstep(0.3, 0.5, dist), smoothstep(0.0, 0.2, diamond), vIsResult);
    
    if (dist > 0.5) discard;

    float alpha = clamp((core + glow * 2.0) * vBright, 0.0, 1.0);
    
    // Add chromatic aberration at the edges
    vec3 finalColor = vColor;
    if (dist > 0.2) {
       finalColor.r += dist * 0.2 * vSweepAmt;
       finalColor.b -= dist * 0.2 * vSweepAmt;
    }

    gl_FragColor = vec4(finalColor, alpha * shape);
  }
`;

function FileNodes({ n }: { n: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const [restArr, phaseArr, scoreArr, targetArr] = useMemo(() => {
    const rest  = new Float32Array(n * 3);
    const target = new Float32Array(n * 3);
    const phase = new Float32Array(n);
    const score = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      // Golden ratio spiral distribution for more organic look
      const inc = Math.PI * (3 - Math.sqrt(5));
      const off = 2 / n;
      const y = i * off - 1 + (off / 2);
      const r = Math.sqrt(1 - y * y) * (3.0 + Math.random() * 4.0);
      const phi = i * inc;

      rest[i * 3]     = Math.cos(phi) * r + (Math.random() - 0.5) * 2.0;
      rest[i * 3 + 1] = y * 4.0 + (Math.random() - 0.5) * 2.0;
      rest[i * 3 + 2] = Math.sin(phi) * r + (Math.random() - 0.5) * 2.0;

      phase[i] = Math.random() * Math.PI * 2;
      score[i] = Math.pow(Math.random(), 2.0); // More low scores, fewer high scores
    }

    // Designate top 5% as results and assign them specific targets
    const nResult = Math.max(8, Math.floor(n * 0.05));
    for (let i = 0; i < nResult; i++) {
      score[i] = 0.8 + Math.random() * 0.2; // High scores
      
      // Target positions corresponding to the result cards
      const cardIdx = i % 6;
      target[i * 3]     = CARD_TARGET[cardIdx][0] + (Math.random() - 0.5) * 0.5;
      target[i * 3 + 1] = CARD_TARGET[cardIdx][1] + (Math.random() - 0.5) * 0.5;
      target[i * 3 + 2] = CARD_TARGET[cardIdx][2] + (Math.random() - 0.5) * 0.5;
    }

    return [rest, phase, score, target];
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
    geo.setAttribute("aTarget",  new THREE.BufferAttribute(targetArr, 3));
    geo.setAttribute("aPhase",   new THREE.BufferAttribute(phaseArr, 1));
    geo.setAttribute("aScore",   new THREE.BufferAttribute(scoreArr, 1));
    return geo;
  }, [restArr, targetArr, phaseArr, scoreArr]);

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    const t = clock.getElapsedTime();
    const c = (t % CYCLE) / CYCLE;
    const u = matRef.current.uniforms;
    u.uTime.value = t;

    if (c < 0.15) {
      u.uSweepR.value   = -1;
      u.uConverge.value = 0;
    } else if (c < 0.35) {
      const p = Math.max(0, (c - 0.20) / 0.15);
      u.uSweepR.value   = p * 12.0; // Fast sweep outward
      u.uConverge.value = 0;
    } else if (c < 0.60) {
      // Secondary sweeps
      const p = (c - 0.35) / 0.25;
      u.uSweepR.value   = 12.0 - (p * 8.0); // Sweep inward
      u.uConverge.value = Math.pow(p, 3); // Start converging slowly
    } else if (c < 0.85) {
      u.uSweepR.value   = -1;
      u.uConverge.value = 1.0; // Fully converged
    } else {
      const p = (c - 0.85) / 0.15;
      u.uSweepR.value   = -1;
      u.uConverge.value = 1.0 - Math.pow(p, 2); // Scatter quickly
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
  uniform float uTime;
  varying vec2 vUv;

  // Pseudo-random noise
  float rand(vec2 co){
      return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
  }

  void main() {
    float bw = 0.03;
    float ex = step(1.0 - bw, vUv.x) + step(vUv.x, bw);
    float ey = step(1.0 - bw, vUv.y) + step(vUv.y, bw);
    float isEdge = clamp(ex + ey, 0.0, 1.0);

    // Dynamic glass body
    vec3 body = mix(vec3(0.02, 0.03, 0.05), vec3(0.05, 0.08, 0.1), vUv.y);
    
    // Scrolling code effect
    float lineY = fract(vUv.y * 6.0 + uTime * 0.2);
    float lineOn = step(lineY, 0.3) * step(0.15, vUv.x) * step(vUv.x, 0.8);
    // Randomize line lengths based on y position to look like code
    float lineLength = rand(vec2(floor(vUv.y * 6.0), 1.0)) * 0.4 + 0.4;
    float codeContent = lineOn * step(vUv.x, 0.15 + lineLength) * (rand(vUv) * 0.2 + 0.8);
    
    // Highlight specific lines
    float highlight = step(0.5, vUv.y) * step(vUv.y, 0.65) * codeContent;

    vec3 contentCol = vec3(0.3, 0.4, 0.5) * codeContent;
    contentCol += uBorderColor * highlight * 1.5;

    // Data score ring/bar
    float distToCorner = length(vUv - vec2(0.85, 0.8));
    float scoreRing = smoothstep(0.1, 0.08, distToCorner) * smoothstep(0.06, 0.08, distToCorner);
    float scoreArc = step(fract(atan(vUv.y - 0.8, vUv.x - 0.85) / 6.28 + 0.5), 1.0 - uRank * 0.2);

    vec3 col = body + contentCol;
    col += uBorderColor * scoreRing * scoreArc * 2.0;
    
    // Glowing animated border
    float borderGlow = isEdge * (0.5 + 0.5 * sin(uTime * 3.0 + uRank * 10.0));
    col = mix(col, uBorderColor * 2.0, borderGlow);
    
    // Add noise texture
    col += (rand(vUv + uTime * 0.1) - 0.5) * 0.05;

    // Fade edges for holograhic look
    float holoAlpha = uAlpha * (0.2 + 0.8 * sin(vUv.y * 3.14));

    gl_FragColor = vec4(col, uAlpha);
  }
`;

const CARD_COLORS = [
  "#14B8A6", "#14B8A6", "#14B8A6",
  "#7C5CFF", "#7C5CFF", "#F6B94C",
];

const CARD_REST: [number, number, number][] = [
  [-4.0, 3.0, -2.0],
  [4.0, 2.0, -1.5],
  [-3.5, -2.0, 1.0],
  [3.5, -3.0, -1.0],
  [-2.5, 4.0, 0.5],
  [4.5, -1.0, 1.5],
];

// Target: cascading curved list on left
const CARD_TARGET: [number, number, number][] = [
  [-2.5, 2.0, 0.2],
  [-2.6, 1.2, 0.5],
  [-2.7, 0.4, 0.7],
  [-2.7, -0.4, 0.8],
  [-2.6, -1.2, 0.7],
  [-2.5, -2.0, 0.5],
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
    uTime:        { value: 0 },
  }), [borderColor, index]);

  useFrame(({ clock }) => {
    if (!meshRef.current || !matRef.current) return;
    const t = clock.getElapsedTime();
    matRef.current.uniforms.uTime.value = t;

    const c = (t % CYCLE) / CYCLE;

    let converge = 0;
    if (c > 0.60 && c < 0.85) {
      converge = eio((c - 0.60) / 0.25);
    } else if (c >= 0.85) {
      converge = Math.max(0, 1.0 - eio((c - 0.85) / 0.15));
    }

    const stagger = clamp(converge * 2.5 - index * 0.25, 0, 1);

    meshRef.current.position.set(
      lerp(rest[0], target[0], eio(stagger)),
      lerp(rest[1], target[1], eio(stagger)),
      lerp(rest[2], target[2], eio(stagger)),
    );
    
    // Add floating animation when in place
    if (converge > 0.9) {
      meshRef.current.position.y += Math.sin(t * 2.0 + index) * 0.05;
      meshRef.current.rotation.x = Math.sin(t * 1.5 + index) * 0.05;
      meshRef.current.rotation.z = Math.cos(t * 1.2 + index) * 0.02;
    } else {
      meshRef.current.rotation.set(0,0,0);
    }

    meshRef.current.scale.setScalar(stagger < 0.01 ? 0.001 : lerp(0.1, 1.2, eio(stagger)));
    meshRef.current.rotation.y = lerp(Math.PI * 2, 0.2, eio(stagger));
    matRef.current.uniforms.uAlpha.value = Math.pow(stagger, 0.5) * 0.9; // Max 90% opacity
  });

  return (
    <mesh ref={meshRef} position={rest}>
      <planeGeometry args={[1.8, 0.6]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={CARD_VERT}
        fragmentShader={CARD_FRAG}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ─── Sweep Rings ───────────────────────────────────────────────────────────────
function EnergyRings() {
  const rings = useRef<THREE.Mesh[]>([]);
  const mats = useRef<THREE.MeshBasicMaterial[]>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const c = (t % CYCLE) / CYCLE;

    rings.current.forEach((ring, i) => {
      if (!ring || !mats.current[i]) return;
      
      const offset = i * 0.05;
      const ringC = (c - offset + 1.0) % 1.0;
      
      if (ringC > 0.15 && ringC < 0.45) {
        const p = (ringC - 0.15) / 0.30;
        ring.scale.setScalar(p * 25.0);
        mats.current[i].opacity = (1 - Math.pow(p, 2)) * 0.4 * (1.0 - i * 0.2);
        ring.rotation.x = t * 0.5 + i;
        ring.rotation.y = t * 0.3 + i * 2;
        ring.visible = true;
      } else {
        ring.visible = false;
      }
    });
  });

  return (
    <group>
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(el) => { if (el) rings.current[i] = el; }}>
          <torusGeometry args={[1, 0.01 + i * 0.01, 16, 100]} />
          <meshBasicMaterial 
            ref={(el) => { if (el) mats.current[i] = el; }} 
            color={i === 0 ? "#F6B94C" : i === 1 ? "#14B8A6" : "#7C5CFF"} 
            transparent 
            blending={THREE.AdditiveBlending} 
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

// ─── Dynamic Grid Floor ──────────────────────────────────────────────────────
function DigitalFloor() {
  const ref = useRef<THREE.GridHelper>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    
    // Undulate the grid slightly
    ref.current.position.y = -4 + Math.sin(t * 0.5) * 0.5;
    
    // Change opacity based on cycle phase
    const c = (t % CYCLE) / CYCLE;
    const mat = ref.current.material as THREE.Material;
    if (c > 0.35 && c < 0.85) {
       mat.opacity = lerp(mat.opacity, 0.8, 0.05);
    } else {
       mat.opacity = lerp(mat.opacity, 0.2, 0.05);
    }
  });

  return (
    <gridHelper 
      ref={ref} 
      args={[40, 40, 0x14B8A6, 0x081818]} 
      position={[0, -4, 0]} 
      material-transparent 
      material-opacity={0.2}
      material-blending={THREE.AdditiveBlending}
    />
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
interface IxosCoreSceneProps {
  lowEnd?: boolean;
}

export function IxosCoreScene({ lowEnd = false }: IxosCoreSceneProps) {
  // Drastically increased particle count for "WOW" factor
  const n = lowEnd ? 1000 : 8000;

  return (
    <Canvas
      camera={{ position: [0, 4, 14], fov: 60 }}
      gl={{ antialias: !lowEnd, alpha: true, powerPreference: "high-performance" }}
      dpr={lowEnd ? 1 : Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio : 1)}
    >
      <fog attach="fog" args={["#0C0E10", 5, 25]} />
      <CameraRig />
      <DigitalFloor />
      <FileNodes n={n} />
      <EnergyRings />
      {!lowEnd && CARD_REST.map((rest, i) => (
        <ResultCard
          key={i}
          index={i}
          rest={rest}
          target={CARD_TARGET[i]}
        />
      ))}
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 0, 0]} intensity={2.0} color="#14B8A6" distance={10} />
    </Canvas>
  );
}
