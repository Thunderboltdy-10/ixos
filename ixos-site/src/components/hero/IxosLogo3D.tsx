"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, MeshTransmissionMaterial } from "@react-three/drei";
import type { Mesh } from "three";
import { useReducedMotion } from "@/hooks/useReducedMotion";

function LogoMark({ reducedMotion }: { reducedMotion: boolean }) {
  const ringRef = useRef<Mesh | null>(null);
  const coreRef = useRef<Mesh | null>(null);
  const shardRef = useRef<Mesh | null>(null);

  useFrame((_, delta) => {
    if (reducedMotion) return;
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.25;
      ringRef.current.rotation.x = Math.sin(Date.now() * 0.0005) * 0.2;
    }
    if (coreRef.current) {
      coreRef.current.rotation.y += delta * 0.5;
      coreRef.current.rotation.x += delta * 0.25;
    }
    if (shardRef.current) {
      shardRef.current.rotation.x -= delta * 0.4;
      shardRef.current.rotation.y += delta * 0.32;
    }
  });

  return (
    <Float
      speed={reducedMotion ? 0 : 1.1}
      rotationIntensity={reducedMotion ? 0 : 0.55}
      floatIntensity={reducedMotion ? 0 : 0.65}
    >
      <group>
        <mesh ref={ringRef}>
          <torusGeometry args={[1.08, 0.08, 20, 120]} />
          <meshStandardMaterial
            color="#14B8A6"
            roughness={0.25}
            metalness={0.6}
            emissive="#14B8A6"
            emissiveIntensity={0.25}
          />
        </mesh>

        <mesh ref={coreRef}>
          <icosahedronGeometry args={[0.62, 1]} />
          <MeshTransmissionMaterial
            clearcoat={1}
            chromaticAberration={0.08}
            thickness={0.36}
            roughness={0.05}
            distortion={0.14}
            distortionScale={0.18}
            temporalDistortion={reducedMotion ? 0 : 0.03}
            ior={1.2}
            attenuationColor="#7C5CFF"
            attenuationDistance={0.85}
          />
        </mesh>

        <mesh ref={shardRef} position={[0.92, -0.28, 0.24]} rotation={[0.4, 0.2, 0.7]}>
          <octahedronGeometry args={[0.28, 0]} />
          <meshStandardMaterial
            color="#F6B94C"
            roughness={0.2}
            metalness={0.75}
            emissive="#F6B94C"
            emissiveIntensity={0.18}
          />
        </mesh>
      </group>
    </Float>
  );
}

export function IxosLogo3D() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="relative h-20 w-20 sm:h-24 sm:w-24 lg:h-28 lg:w-28">
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-accent-amber/20 via-accent-teal/10 to-accent-violet/20 blur-xl" />
      <Canvas
        className="relative z-10"
        camera={{ position: [0, 0, 3.9], fov: 45 }}
        dpr={[1, 1.7]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.55} />
        <directionalLight position={[2.4, 2.5, 3]} intensity={0.9} />
        <directionalLight position={[-2.1, -1.8, 2.2]} intensity={0.48} color="#14B8A6" />
        <Suspense fallback={null}>
          <Environment preset="city" />
          <LogoMark reducedMotion={prefersReducedMotion} />
        </Suspense>
      </Canvas>
    </div>
  );
}
