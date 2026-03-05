# Implementation Plan

## Goal Description
Overhaul the landing page variants (/1 through /5) to significantly improve the aesthetic quality, interactive animations, and structural layout based on recent feedback. The plan includes polishing the Hero sections across variants, fixing z-index layout bugs, refining the App surface visual representation in Prototype 4, adding scroll navigation, creating full custom subpages, and correcting git workspace settings.

## Proposed Changes

### Prototype 5 (`/5`) Polish
- **[MODIFY] `ixos-site/src/app/5/_v4/V4AmbientField.tsx`**: Increase the opacity or glow threshold of the background particles slightly to make them more visible in the hero without dominating the view.
- **[MODIFY] `ixos-site/src/app/5/_v4/V4DemoSurface...`**: Tone down the harsh glow and translucency effects on the desktop mockup and the internal text to achieve a more refined App surface feel.
- **[MODIFY] `ixos-site/src/app/5/_v4/V4Pipeline.tsx`**: Fix the React warning about mutating `border` and `borderTop` shorthands concurrently during the search results expanding animation.

### Prototype 1 (`/1`) Polish
- **[MODIFY] `ixos-site/src/app/1/...`**: Update the core theme glow colors to `amber-500` (#F6B94C) in the hero portion.
- **[MODIFY] `ixos-site/src/app/1/...`**: Apply a dimmed amber glow throughout the scroll, separating the intense hero glow from the subtle scrolling glow.

### Prototype 2 (`/2`) Polish
- **[MODIFY] `ixos-site/src/app/2/CSSLattice.tsx`**: Add path-limiting logic to restrict the rendering of connected paths to exactly two per cluster match (one extending to the next node and one resolving internally).
- **[MODIFY] `ixos-site/src/app/2/page.tsx`**: Revert the previously modified lower body sections back to their original component layouts, maintaining only the newly updated top hero and its 3D visuals.

### Prototype 3 (`/3`) Polish
- **[MODIFY] `ixos-site/src/components/ui/FloatingNav.tsx`** (or equivalent): Add smooth scrolling logic linked to page sections.
- **[MODIFY] `ixos-site/src/app/3/page.tsx`**: Add `IntersectionObserver` or scroll trackers to dynamically update the active pill state in the Floating Navbar.

### Prototype 4 (`/4`) Spatial Rewrite
- **[MODIFY] `ixos-site/src/app/4/page.tsx`**: Redesign the spatial zoom animation. The `DemoSurface` should act as the true background containing floating components rather than masking it.
- **[MODIFY] `ixos-site/src/app/4/...`**: Replace the basic scale-fade effect with a creative, localized expand effect transitioning into the full-screen view.

### Desktop UI Sidebar Polish
- **[MODIFY] `packages/ixos-ui/src/components/layout/Sidebar.tsx`**: Match exactly to the desktop screenshot (Ixos logo + New Button; Search/Today/Workstreams links; Recent/Starred tabs; accurate footer).

### Dropdowns & Z-Index Polish
- **[MODIFY] `packages/ixos-ui/src/components/search/QualitySwitcher.tsx` & `ModeSwitcher.tsx`**: Elevate the z-index to 15000+ so they render perfectly above the "About Match" and Right Rail components. Give the dropdown menus a deep solid `#1a1d24` background.

### Subpages Creation
- **[NEW] `ixos-site/src/app/[variant]/pricing/page.tsx`, `docs/page.tsx`, `signin/page.tsx`, `signup/page.tsx`, `account/page.tsx`, `download/page.tsx`**: Implement unique custom pages for variants 1 to 5 inheriting the aesthetic styles respectively. Do not just use one generic layout.

### Env / Github Fixes
- **[MODIFY] `<root>/.gitignore`**: Verify `.env` access rules for UI/demo sites and fix any workflow conflicts that block GitHub releases.

## Verification Plan

### Automated Tests
- Run `npm run dev` and navigate through `localhost:3000/1` to `/5` to visually confirm there are no React key or CSS shorthand warnings in the browser console.

### Manual Verification
1. **Prototype 5**: Open `/5`, check the particle layer is slightly brighter. Scroll down to trigger the V4Pipeline animation and check devtools for warnings.
2. **Prototype 1**: Load `/1`, confirm Amber glow in hero and dim glow below.
3. **Prototype 2**: Load `/2`, observe the 3D grid connecting paths limit to 2 per cluster. Ensure lower sections render correctly.
4. **Prototype 3**: Open `/3`, click the floating nav to auto-scroll. Ensure scrolling manually updates the active navigational bullet.
5. **Prototype 4**: Open `/4`, interact with the entry sequence and verify the spatial zooming feels unified and contents sit inside the window surface, not masked by a blue-black card.
6. **Sidebar & Dropdowns**: Open standard UI views with the sidebar and header. Ensure Quality and Mode switchers overlay properly without transparency.
7. **Subpages**: Navigate to `/1/pricing`, `/2/download`, etc., to confirm routing logic and tailored aesthetic changes format appropriately across variants.