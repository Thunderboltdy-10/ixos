"use client";

import { useRef, useState } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { useScroll, useTexture, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { TextureLoader } from 'three';

function Scene() {
    const meshRef = useRef<THREE.Mesh>(null);
    // Use a fallback or real texture. For now, we'll try to load the screenshot or fallback color
    const texture = useLoader(TextureLoader, '/screenshot-results-final.png');
    // const scroll = useScroll(); // Optional integration with scroll

    useFrame((state, delta) => {
        if (meshRef.current) {
            // Gentle floating rotation
            meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
            meshRef.current.rotation.x = Math.cos(state.clock.elapsedTime * 0.2) * 0.05;
        }
    });

    return (
        <mesh ref={meshRef} position={[0, 0, 0]} rotation={[0, -0.2, 0]}>
            {/* 16:10 Aspect Ratio Plane */}
            <planeGeometry args={[16, 10]} />
            <meshStandardMaterial
                map={texture}
                transparent
                opacity={0.95}
                side={THREE.DoubleSide}
                roughness={0.2}
                metalness={0.1}
            />
        </mesh>
    );
}

export function ThreeScreenshot() {
    return (
        <div className="w-full h-[400px] md:h-[600px] relative z-10">
            <Canvas>
                <PerspectiveCamera makeDefault position={[0, 0, 18]} fov={50} />
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} color="#0d9488" />
                <pointLight position={[-10, -10, -10]} intensity={0.5} color="#1a365d" />

                <Scene />

            </Canvas>
        </div>
    );
}
