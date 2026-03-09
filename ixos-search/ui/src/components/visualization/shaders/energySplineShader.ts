/**
 * Energy Spline Shader Material
 * 
 * Custom GLSL shader for the glimmering energy beams that connect
 * the search bar to result cards. Features:
 * - White-hot "head" at the leading edge
 * - Teal/purple fading "tail"
 * - Pulsing width distortion
 * - Progress-based reveal
 */

import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';

// Vertex Shader - Handles pulsing width and position
const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uProgress;
  uniform float uPulseSpeed;
  uniform float uPulseAmount;
  
  attribute float aPathProgress; // 0 at start, 1 at end (custom attribute)
  
  varying float vPathProgress;
  varying vec2 vUv;
  
  void main() {
    vPathProgress = uv.x; // UV.x maps along the tube
    vUv = uv;
    
    // Pulsing width distortion - makes the beam "breathe"
    float pulse = 1.0 + sin(uTime * uPulseSpeed + vPathProgress * 10.0) * uPulseAmount;
    
    // Scale perpendicular to path (y component in tube space)
    vec3 displaced = position;
    
    // Apply pulse only to the visible portion
    float visibleMask = smoothstep(uProgress - 0.1, uProgress, vPathProgress);
    displaced.y *= mix(pulse, 1.0, visibleMask);
    displaced.z *= mix(pulse, 1.0, visibleMask);
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

// Fragment Shader - Hot head, fading tail gradient
const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uProgress;
  uniform vec3 uHeadColor;
  uniform vec3 uTailColor;
  uniform vec3 uMidColor;
  uniform float uOpacity;
  uniform float uGlowIntensity;
  
  varying float vPathProgress;
  varying vec2 vUv;
  
  void main() {
    // Discard pixels beyond current progress
    if (vPathProgress > uProgress + 0.02) discard;
    
    // Calculate proximity to the "head" of the beam
    float headProximity = 1.0 - clamp((uProgress - vPathProgress) * 8.0, 0.0, 1.0);
    
    // Three-color gradient: tail -> mid -> head
    vec3 color;
    if (headProximity > 0.5) {
      // Near head: mid to white-hot
      color = mix(uMidColor, uHeadColor, (headProximity - 0.5) * 2.0);
    } else {
      // Near tail: tail to mid
      color = mix(uTailColor, uMidColor, headProximity * 2.0);
    }
    
    // Add glow/bloom contribution at the head
    float glow = pow(headProximity, 3.0) * uGlowIntensity;
    color += vec3(glow);
    
    // Alpha: bright head, fading tail
    float alpha = mix(0.3, 1.0, headProximity);
    
    // Fade at the very origin for soft launch
    alpha *= smoothstep(0.0, 0.05, vPathProgress);
    
    // Fade out the trailing edge
    float trailFade = smoothstep(0.0, 0.3, uProgress - vPathProgress);
    alpha *= mix(0.0, 1.0, trailFade);
    
    // Add subtle shimmer
    float shimmer = sin(vPathProgress * 50.0 + uTime * 10.0) * 0.1 + 0.9;
    alpha *= shimmer;
    
    // Apply global opacity
    alpha *= uOpacity;
    
    gl_FragColor = vec4(color, alpha);
  }
`;

// Create the shader material
const EnergySplineMaterialImpl = shaderMaterial(
    {
        uTime: 0,
        uProgress: 0,
        uPulseSpeed: 4.0,
        uPulseAmount: 0.15,
        uHeadColor: new THREE.Color('#ffffff'),     // White hot
        uTailColor: new THREE.Color('#0d9488'),     // Teal
        uMidColor: new THREE.Color('#06b6d4'),      // Cyan
        uOpacity: 1.0,
        uGlowIntensity: 0.5,
    },
    vertexShader,
    fragmentShader
);

// Extend Three.js with our custom material
extend({ EnergySplineMaterial: EnergySplineMaterialImpl });

// TypeScript declaration for JSX
declare global {
    namespace JSX {
        interface IntrinsicElements {
            energySplineMaterial: React.DetailedHTMLProps<
                React.HTMLAttributes<HTMLElement> & {
                    uTime?: number;
                    uProgress?: number;
                    uPulseSpeed?: number;
                    uPulseAmount?: number;
                    uHeadColor?: THREE.Color;
                    uTailColor?: THREE.Color;
                    uMidColor?: THREE.Color;
                    uOpacity?: number;
                    uGlowIntensity?: number;
                    transparent?: boolean;
                    depthWrite?: boolean;
                    side?: THREE.Side;
                    blending?: THREE.Blending;
                    ref?: React.Ref<THREE.ShaderMaterial>;
                },
                HTMLElement
            >;
        }
    }
}

export { EnergySplineMaterialImpl as EnergySplineMaterial };
