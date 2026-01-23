"use client";

import { useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { PerspectiveCamera, Environment, Float, PresentationControls } from "@react-three/drei";
import { TextureLoader } from 'three';
import * as THREE from "three";
import { motion } from "framer-motion";

const SCREENSHOTS = [
    '/screenshot-results-final.png',
    '/screenshot-empty-state.png',
    '/screenshot-3d-active.png',
];

function CarouselItem({ textureUrl, position, rotation, isActive, scale = 1 }: any) {
    const texture = useLoader(TextureLoader, textureUrl) as THREE.Texture;
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state, delta) => {
        if (!meshRef.current) return;

        // Float
        meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5 + position[0]) * 0.2;

        // Smooth lerp for rotation
        meshRef.current.rotation.y = THREE.MathUtils.lerp(
            meshRef.current.rotation.y,
            rotation[1],
            delta * 2

        );

        // Smooth lerp for scale (Active is bigger)
        const targetScale = isActive ? 1.1 : 0.9;
        meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 2);

        // Dynamic material update for opacity
        (meshRef.current.material as THREE.MeshStandardMaterial).opacity = THREE.MathUtils.lerp(
            (meshRef.current.material as THREE.MeshStandardMaterial).opacity,
            isActive ? 1 : 0.3,
            delta * 3
        );
    });

    return (
        <mesh ref={meshRef} position={position} rotation={rotation}>
            <planeGeometry args={[16, 10]} />
            <meshStandardMaterial
                map={texture}
                transparent
                side={THREE.DoubleSide}
                envMapIntensity={1}
            />
        </mesh>
    );
}

function Scene() {
    const [activeIndex, setActiveIndex] = useState(0);

    // Auto rotate faster for the demo
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % SCREENSHOTS.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    return (
        <group position={[0, -0.5, 0]}> {/* Centered vertically */}
            {SCREENSHOTS.map((src, i) => {
                const offset = (i - activeIndex + SCREENSHOTS.length) % SCREENSHOTS.length;

                let position = [0, 0, 0];
                let rotation = [0, 0, 0];

                // 0 = Center
                // 1 = Right
                // 2 = Left (since len is 3)

                if (offset === 0) { // Center Active
                    position = [0, 0, 1.5]; // Closer to cam
                    rotation = [0, 0, 0];
                } else if (offset === 1) { // Right
                    position = [12, 0, -5];
                    rotation = [0, -0.4, 0];
                } else { // Left
                    position = [-12, 0, -5];
                    rotation = [0, 0.4, 0];
                }

                return (
                    <CarouselItem
                        key={src}
                        textureUrl={src}
                        position={position}
                        rotation={rotation}
                        isActive={offset === 0}
                    />
                );
            })}
        </group>
    );
}

export function ScreenshotCarousel() {
    return (
        <div className="w-full h-full relative z-10">
            <Canvas dpr={[1, 2]} shadows>
                <PerspectiveCamera makeDefault position={[0, 0, 20]} fov={40} />
                <ambientLight intensity={0.7} />
                <pointLight position={[10, 10, 10]} intensity={1.5} color="#0d9488" />
                <pointLight position={[-10, 5, -5]} intensity={1} color="#8b5cf6" />
                <Environment preset="city" />
                <Scene />
            </Canvas>
        </div>
    );
}
