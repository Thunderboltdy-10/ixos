// Type declarations for troika-three-text
declare module 'troika-three-text' {
    import { Mesh, BufferGeometry, Material, Object3D } from 'three';

    export class Text extends Mesh {
        text: string;
        fontSize: number;
        color: string | number;
        font?: string;
        anchorX: 'left' | 'center' | 'right' | number;
        anchorY: 'top' | 'top-baseline' | 'middle' | 'bottom-baseline' | 'bottom' | number;
        outlineWidth: number;
        outlineColor: string | number;
        maxWidth?: number;
        textAlign?: 'left' | 'center' | 'right' | 'justify';
        lineHeight?: number;
        letterSpacing?: number;
        sync(callback?: () => void): void;
        dispose(): void;
    }
}
