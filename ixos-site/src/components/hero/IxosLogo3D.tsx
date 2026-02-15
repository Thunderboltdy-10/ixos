"use client";

import { Suspense, useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float } from "@react-three/drei";
import type { Mesh, Group } from "three";
import * as THREE from "three";
import { useReducedMotion } from "@/hooks/useReducedMotion";

function LogoMark({ reducedMotion }: { reducedMotion: boolean }) {
  const groupRef = useRef<Group | null>(null);
  const outerRingRef = useRef<Mesh | null>(null);
  const innerRingRef = useRef<Mesh | null>(null);
  const coreRef = useRef<Mesh | null>(null);
  const shard1Ref = useRef<Mesh | null>(null);
  const shard2Ref = useRef<Mesh | null>(null);
  const shard3Ref = useRef<Mesh | null>(null);

  const tealMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#14B8A6"),
        roughness: 0.15,
        metalness: 0.85,
        emissive: new THREE.Color("#14B8A6"),
        emissiveIntensity: 0.35,
      }),
    []
  );

  const violetMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#7C5CFF"),
        roughness: 0.08,
        metalness: 0.92,
        emissive: new THREE.Color("#7C5CFF"),
        emissiveIntensity: 0.5,
      }),
    []
  );

  const amberMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#F6B94C"),
        roughness: 0.12,
        metalness: 0.88,
        emissive: new THREE.Color("#F6B94C"),
        emissiveIntensity: 0.3,
      }),
    []
  );

  const coreMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#1a1a2e"),
        roughness: 0.02,
        metalness: 0.1,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        reflectivity: 1.0,
        transmission: 0.82,
        thickness: 0.6,
        ior: 1.45,
        envMapIntensity: 2.5,
        attenuationColor: new THREE.Color("#7C5CFF"),
        attenuationDistance: 0.4,
      }),
    []
  );

  useFrame((_, delta) => {
    if (reducedMotion) return;
    const t = Date.now() * 0.001;

    if (outerRingRef.current) {
      outerRingRef.current.rotation.z += delta * 0.18;
      outerRingRef.current.rotation.x = Math.sin(t * 0.4) * 0.12;
    }
    if (innerRingRef.current) {
      innerRingRef.current.rotation.z -= delta * 0.28;
      innerRingRef.current.rotation.y = Math.cos(t * 0.35) * 0.15;
    }
    if (coreRef.current) {
      coreRef.current.rotation.y += delta * 0.35;
      coreRef.current.rotation.x += delta * 0.15;
    }
    if (shard1Ref.current) {
      const angle1 = t * 0.6;
      shard1Ref.current.position.set(
        Math.cos(angle1) * 1.35,
        Math.sin(angle1) * 0.4,
        Math.sin(angle1 * 0.7) * 0.3
      );
      shard1Ref.current.rotation.x += delta * 0.5;
      shard1Ref.current.rotation.z += delta * 0.3;
    }
    if (shard2Ref.current) {
      const angle2 = t * 0.45 + Math.PI * 0.7;
      shard2Ref.current.position.set(
        Math.cos(angle2) * 1.2,
        Math.sin(angle2 * 0.8) * 0.5,
        Math.cos(angle2 * 0.5) * 0.4
      );
      shard2Ref.current.rotation.y += delta * 0.4;
      shard2Ref.current.rotation.x -= delta * 0.25;
    }
    if (shard3Ref.current) {
      const angle3 = t * 0.55 + Math.PI * 1.4;
      shard3Ref.current.position.set(
        Math.sin(angle3) * 1.1,
        Math.cos(angle3 * 0.6) * 0.6,
        Math.sin(angle3 * 0.9) * 0.35
      );
      shard3Ref.current.rotation.z -= delta * 0.35;
      shard3Ref.current.rotation.y += delta * 0.45;
    }
  });

  return (
    <Float
      speed={reducedMotion ? 0 : 1.4}
      rotationIntensity={reducedMotion ? 0 : 0.3}
      floatIntensity={reducedMotion ? 0 : 0.5}
    >
      <group ref={groupRef}>
        {/* Outer ring - teal */}
        <mesh ref={outerRingRef}>
          <torusGeometry args={[1.12, 0.045, 32, 128]} />
          <primitive object={tealMat} />
        </mesh>

        {/* Inner ring - tilted, violet */}
        <mesh ref={innerRingRef} rotation={[Math.PI / 3, 0, Math.PI / 6]}>
          <torusGeometry args={[0.82, 0.035, 28, 96]} />
          <primitive object={violetMat} />
        </mesh>

        {/* Core sphere - glass-like with violet attenuation */}
        <mesh ref={coreRef}>
          <icosahedronGeometry args={[0.52, 2]} />
          <primitive object={coreMat} />
        </mesh>

        {/* Inner glow sphere */}
        <mesh>
          <sphereGeometry args={[0.28, 24, 24]} />
          <meshStandardMaterial
            color="#7C5CFF"
            emissive="#7C5CFF"
            emissiveIntensity={1.2}
            transparent
            opacity={0.4}
          />
        </mesh>

        {/* Orbiting shards */}
        <mesh ref={shard1Ref} position={[1.35, 0, 0]}>
          <octahedronGeometry args={[0.14, 0]} />
          <primitive object={amberMat} />
        </mesh>

        <mesh ref={shard2Ref} position={[-0.8, 0.9, 0.3]}>
          <tetrahedronGeometry args={[0.11, 0]} />
          <primitive object={tealMat} />
        </mesh>

        <mesh ref={shard3Ref} position={[0.4, -1.0, 0.2]}>
          <octahedronGeometry args={[0.09, 0]} />
          <primitive object={violetMat} />
        </mesh>
      </group>
    </Float>
  );
}

export function IxosLogo3D() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="relative h-24 w-24 sm:h-28 sm:w-28 lg:h-32 lg:w-32">
      {/* Multi-layered glow backdrop */}
      <div className="absolute inset-[-30%] rounded-full bg-gradient-to-br from-accent-teal/20 via-accent-violet/15 to-accent-amber/20 blur-2xl" />
      <div className="absolute inset-[-15%] rounded-full bg-gradient-radial from-accent-violet/12 to-transparent blur-xl" />
      <Canvas
        className="relative z-10"
        camera={{ position: [0, 0, 3.6], fov: 48 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[3, 3, 4]} intensity={1.1} color="#ffffff" />
        <directionalLight position={[-2, -1, 3]} intensity={0.5} color="#14B8A6" />
        <pointLight position={[0, 0, 2]} intensity={0.6} color="#7C5CFF" distance={8} />
        <pointLight position={[1.5, -1, 1]} intensity={0.3} color="#F6B94C" distance={6} />
        <Suspense fallback={null}>
          <Environment preset="city" />
          <LogoMark reducedMotion={prefersReducedMotion} />
        </Suspense>
      </Canvas>
    </div>
  );
}
