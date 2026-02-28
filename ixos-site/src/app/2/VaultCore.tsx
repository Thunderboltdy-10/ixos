"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { MeshTransmissionMaterial } from "@react-three/drei";
import * as THREE from "three";

/* ── Slowly rotating icosahedron with amber emissive core + teal wireframe ── */

function CoreGeometry({ scrollDepth }: { scrollDepth: number }) {
  const innerRef = useRef<THREE.Mesh>(null);
  const wireRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (innerRef.current) {
      innerRef.current.rotation.y += delta * 0.15;
      innerRef.current.rotation.x += delta * 0.08;
    }
    if (wireRef.current) {
      wireRef.current.rotation.y += delta * 0.15;
      wireRef.current.rotation.x += delta * 0.08;
    }

    // Scale responds to scroll depth (subtle)
    const targetScale = 1.0 + scrollDepth * 0.15;
    if (innerRef.current) {
      innerRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        0.05
      );
    }
    if (wireRef.current) {
      wireRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        0.05
      );
    }
  });

  return (
    <group>
      {/* Amber emissive core */}
      <mesh ref={innerRef}>
        <icosahedronGeometry args={[1.8, 2]} />
        <meshStandardMaterial
          color="#1a0f00"
          emissive="#F6B94C"
          emissiveIntensity={0.6}
          transparent
          opacity={0.35}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Teal wireframe overlay */}
      <mesh ref={wireRef}>
        <icosahedronGeometry args={[2.0, 1]} />
        <meshStandardMaterial
          color="#14B8A6"
          wireframe
          emissive="#14B8A6"
          emissiveIntensity={0.4}
          transparent
          opacity={0.55}
        />
      </mesh>
    </group>
  );
}

function AmbientParticles() {
  const ref = useRef<THREE.Points>(null);

  const [positions, sizes] = useMemo(() => {
    const count = 200;
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 8;
      sz[i] = Math.random() * 2 + 0.5;
    }
    return [pos, sz];
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.rotation.y = t * 0.02;
    ref.current.rotation.x = Math.sin(t * 0.01) * 0.1;
  });

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, [positions, sizes]);

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial
        color="#F6B94C"
        size={0.04}
        transparent
        opacity={0.3}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

interface VaultCoreProps {
  className?: string;
}

export default function VaultCore({ className }: VaultCoreProps) {
  const [scrollDepth, setScrollDepth] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const depth = Math.min(window.scrollY / window.innerHeight, 1);
      setScrollDepth(depth);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 50 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        dpr={[1, 2]}
        style={{ background: "transparent" }}
      >
        <fog attach="fog" args={["#030508", 4, 14]} />
        <ambientLight intensity={0.3} />
        <pointLight position={[3, 3, 4]} intensity={1.2} color="#F6B94C" distance={12} />
        <pointLight position={[-3, -2, 3]} intensity={0.6} color="#14B8A6" distance={10} />
        <CoreGeometry scrollDepth={scrollDepth} />
        <AmbientParticles />
      </Canvas>
    </div>
  );
}
