/**
 * Layout Store - DOM-to-3D Coordinate Synchronization
 * 
 * Tracks bounding boxes of search bar and result cards,
 * enabling precise 3D spline targeting from React Three Fiber.
 */

import { create } from 'zustand';
import * as THREE from 'three';

export interface LayoutBox {
  x: number;      // Viewport X center
  y: number;      // Viewport Y center
  width: number;
  height: number;
  top: number;
  left: number;
}

interface LayoutState {
  // DOM measurements
  searchBarBox: LayoutBox | null;
  statusBox: LayoutBox | null;
  resultBoxes: Map<number, LayoutBox>;

  // Signal Rail measurements
  deckUnderlineBox: LayoutBox | null;
  ghostSlotBoxes: Map<number, LayoutBox>;

  // Canvas dimensions for coordinate conversion
  canvasSize: { width: number; height: number };

  // Animation state
  animationPhase: 'idle' | 'launching' | 'impacting' | 'materializing' | 'complete';
  splineProgress: number[];      // 0-1 for each spline
  planeScales: number[];         // 0-1 for wireframe planes
  cardOpacities: number[];       // 0-1 for DOM cards

  // Actions
  setSearchBarBox: (box: LayoutBox) => void;
  setStatusBox: (box: LayoutBox) => void;
  setResultBox: (index: number, box: LayoutBox) => void;
  setCanvasSize: (width: number, height: number) => void;
  clearResultBoxes: () => void;

  // Signal Rail actions
  setDeckUnderlineBox: (box: LayoutBox) => void;
  setGhostSlotBox: (index: number, box: LayoutBox) => void;
  clearGhostSlots: () => void;


  // Animation actions
  setAnimationPhase: (phase: LayoutState['animationPhase']) => void;
  setSplineProgress: (index: number, progress: number) => void;
  setPlaneScale: (index: number, scale: number) => void;
  setCardOpacity: (index: number, opacity: number) => void;
  resetAnimation: () => void;
  initializeAnimation: (resultCount: number) => void;

  // Coordinate conversion - viewport pixels to normalized device coords
  viewportToNDC: (x: number, y: number) => { x: number; y: number };

  // Get 3D world position for a result card (for orthographic camera)
  get3DPosition: (index: number) => THREE.Vector3 | null;
  getSearchBar3DPosition: () => THREE.Vector3 | null;
}

// Safe window dimensions getter
const getWindowDimensions = () => {
  if (typeof window === 'undefined') {
    return { width: 1920, height: 1080 }; // Default fallback
  }
  return { width: window.innerWidth, height: window.innerHeight };
};

export const useLayoutStore = create<LayoutState>((set, get) => ({
  // Initial state
  searchBarBox: null,
  statusBox: null,
  resultBoxes: new Map(),

  // Signal Rail state
  deckUnderlineBox: null,
  ghostSlotBoxes: new Map(),

  canvasSize: getWindowDimensions(),

  // Animation state
  animationPhase: 'idle',
  splineProgress: [],
  planeScales: [],
  cardOpacities: [],

  // DOM measurement actions
  setSearchBarBox: (box) => set({ searchBarBox: box }),

  setStatusBox: (box) => set({ statusBox: box }),

  setResultBox: (index, box) => set((state) => {

    const newBoxes = new Map(state.resultBoxes);
    newBoxes.set(index, box);
    return { resultBoxes: newBoxes };
  }),

  setCanvasSize: (width, height) => set({ canvasSize: { width, height } }),

  clearResultBoxes: () => set({ resultBoxes: new Map() }),

  // Signal Rail actions
  setDeckUnderlineBox: (box) => set({ deckUnderlineBox: box }),

  setGhostSlotBox: (index, box) => set((state) => {
    const newBoxes = new Map(state.ghostSlotBoxes);
    newBoxes.set(index, box);
    return { ghostSlotBoxes: newBoxes };
  }),

  clearGhostSlots: () => set({ ghostSlotBoxes: new Map() }),

  // Animation state actions
  setAnimationPhase: (phase) => set({ animationPhase: phase }),

  setSplineProgress: (index, progress) => set((state) => {
    const newProgress = [...state.splineProgress];
    newProgress[index] = progress;
    return { splineProgress: newProgress };
  }),

  setPlaneScale: (index, scale) => set((state) => {
    const newScales = [...state.planeScales];
    newScales[index] = scale;
    return { planeScales: newScales };
  }),

  setCardOpacity: (index, opacity) => set((state) => {
    const newOpacities = [...state.cardOpacities];
    newOpacities[index] = opacity;
    return { cardOpacities: newOpacities };
  }),

  resetAnimation: () => set({
    animationPhase: 'idle',
    splineProgress: [],
    planeScales: [],
    cardOpacities: [],
  }),

  initializeAnimation: (resultCount) => {
    const count = Math.min(resultCount, 6); // Limit to 6 animated results
    set({
      animationPhase: 'launching',
      splineProgress: new Array(count).fill(0),
      planeScales: new Array(count).fill(0),
      cardOpacities: new Array(count).fill(0),
    });
  },

  // Viewport to Normalized Device Coordinates
  // Maps screen pixels to -1 to 1 range for Three.js
  viewportToNDC: (x, y) => {
    const { canvasSize } = get();
    return {
      x: (x / canvasSize.width) * 2 - 1,
      y: -(y / canvasSize.height) * 2 + 1, // Y is inverted in WebGL
    };
  },

  // Convert result card position to 3D world coordinates
  // Uses orthographic-style mapping for overlay positioning
  get3DPosition: (index) => {
    const state = get();
    const box = state.resultBoxes.get(index);
    if (!box) return null;

    const { canvasSize } = state;

    // Calculate center of the box in viewport coords
    const centerX = box.left + box.width / 2;
    const centerY = box.top + box.height / 2;

    // Convert to normalized coords (-1 to 1)
    // Scale factor maps viewport to world units (adjust based on camera frustum)
    const worldScale = 20; // Matches camera frustum size
    const x = ((centerX / canvasSize.width) - 0.5) * worldScale;
    const y = -((centerY / canvasSize.height) - 0.5) * worldScale * (canvasSize.height / canvasSize.width);
    const z = -5; // Fixed depth in front of background

    return new THREE.Vector3(x, y, z);
  },

  getSearchBar3DPosition: () => {
    const state = get();
    const box = state.searchBarBox;
    if (!box) return null;

    const { canvasSize } = state;

    const centerX = box.left + box.width / 2;
    const centerY = box.top + box.height / 2;

    const worldScale = 20;
    const x = ((centerX / canvasSize.width) - 0.5) * worldScale;
    const y = -((centerY / canvasSize.height) - 0.5) * worldScale * (canvasSize.height / canvasSize.width);
    const z = -3; // Slightly in front of result targets

    return new THREE.Vector3(x, y, z);
  },
}));
