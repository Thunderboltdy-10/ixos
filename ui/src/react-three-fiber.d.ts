/// <reference types="react" />

declare module '@react-three/fiber' {
  import type * as THREE from 'three';
  import type * as React from 'react';

  export interface ThreeElements {
    primitive: React.DetailedHTMLProps<any, any>;
    group: React.DetailedHTMLProps<any, any>;
    mesh: React.DetailedHTMLProps<any, any>;
    instancedMesh: React.DetailedHTMLProps<any, any>;
    sphereGeometry: React.DetailedHTMLProps<any, any>;
    meshStandardMaterial: React.DetailedHTMLProps<any, any>;
    ambientLight: React.DetailedHTMLProps<any, any>;
    pointLight: React.DetailedHTMLProps<any, any>;
  }

  export interface Props {
    children?: React.ReactNode;
    gl?: any;
    camera?: any;
    [key: string]: any;
  }

  export const Canvas: React.ForwardRefExoticComponent<Props & React.RefAttributes<HTMLCanvasElement>>;
  export function useFrame(callback: (state: any, delta?: number) => void): void;
}

declare module '@react-three/drei' {
  import type * as React from 'react';

  export const OrbitControls: React.FC<any>;
  export const Stars: React.FC<any>;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      primitive: any;
      group: any;
      mesh: any;
      instancedMesh: any;
      sphereGeometry: any;
      meshStandardMaterial: any;
      ambientLight: any;
      pointLight: any;
    }
  }
}

export {};
