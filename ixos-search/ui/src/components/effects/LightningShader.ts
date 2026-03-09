/**
 * LightningShader - Custom GLSL shader for electricity pulse effect
 * 
 * Creates the effect of data packets zipping along fiber optic cables.
 * Uses sine waves and noise for traveling light pulses.
 */

import * as THREE from 'three';

// Simple hash-based noise function for GLSL
const noise = `
float hash(float n) {
    return fract(sin(n) * 43758.5453123);
}

float noise(float x) {
    float i = floor(x);
    float f = fract(x);
    return mix(hash(i), hash(i + 1.0), smoothstep(0.0, 1.0, f));
}
`;

export const lightningVertexShader = `
uniform float uTime;
varying float vProgress;
varying vec2 vUv;

void main() {
    vUv = uv;
    vProgress = uv.x; // Progress along the line (0 to 1)
    
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
}
`;

export const lightningFragmentShader = `
${noise}

uniform float uTime;
uniform vec3 uBaseColor;
uniform vec3 uPulseColor;
uniform float uSpeed;
uniform float uPulseCount;
uniform float uPulseWidth;

varying float vProgress;
varying vec2 vUv;

void main() {
    // Create multiple pulses traveling along the line
    float pulseOffset = uTime * uSpeed;
    
    // Create several pulse waves
    float pulse = 0.0;
    for (float i = 0.0; i < 4.0; i++) {
        float phaseOffset = i * 0.25;
        float t = fract(vProgress - pulseOffset + phaseOffset);
        
        // Sharp pulse shape
        float pulsePower = smoothstep(0.0, uPulseWidth, t) * smoothstep(uPulseWidth * 2.0, uPulseWidth, t);
        
        // Add some noise for organic feel
        float n = noise(vProgress * 20.0 + uTime * 5.0 + i * 10.0);
        pulsePower *= 0.7 + 0.3 * n;
        
        pulse += pulsePower;
    }
    
    pulse = clamp(pulse, 0.0, 1.0);
    
    // Mix between base color and hot white pulse color
    vec3 color = mix(uBaseColor, uPulseColor, pulse);
    
    // Add core glow - brighter in the center
    float centerGlow = 1.0 - abs(vUv.y - 0.5) * 2.0;
    centerGlow = pow(centerGlow, 2.0);
    color += uPulseColor * pulse * centerGlow * 0.5;
    
    // Base alpha with pulse enhancement
    float alpha = 0.3 + pulse * 0.7;
    alpha *= centerGlow;
    
    gl_FragColor = vec4(color, alpha);
}
`;

/**
 * Creates a lightning shader material with animated electricity pulses
 */
export function createLightningMaterial(options: {
    baseColor?: THREE.Color;
    pulseColor?: THREE.Color;
    speed?: number;
    pulseWidth?: number;
} = {}): THREE.ShaderMaterial {
    const {
        baseColor = new THREE.Color('#0d9488'), // Teal
        pulseColor = new THREE.Color('#ffffff'), // Hot white
        speed = 0.8,
        pulseWidth = 0.08
    } = options;

    return new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uBaseColor: { value: baseColor },
            uPulseColor: { value: pulseColor },
            uSpeed: { value: speed },
            uPulseWidth: { value: pulseWidth },
            uPulseCount: { value: 4 }
        },
        vertexShader: lightningVertexShader,
        fragmentShader: lightningFragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
    });
}

/**
 * Updates the shader time uniform for animation
 */
export function updateLightningMaterial(material: THREE.ShaderMaterial, time: number): void {
    if (material.uniforms.uTime) {
        material.uniforms.uTime.value = time;
    }
}
