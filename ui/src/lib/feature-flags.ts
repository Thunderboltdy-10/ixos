/**
 * Feature Flags - Centralized control for experimental/heavy features
 * 
 * Used to safely toggle components that might cause crashes during development.
 */

export const FEATURES = {
    // Master switch for 3D visualization
    ENABLE_VIZ: true,

    // Sub-features
    ENABLE_POST_PROCESSING: false, // DISABLED for stability (suspected crash source)
    ENABLE_ANIMATION: false,       // DISABLED - Animation system removed
    ENABLE_PARTICLES: true,        // Ambient dust and motes

    // Debug modes
    DEBUG_MODE: false,
};
