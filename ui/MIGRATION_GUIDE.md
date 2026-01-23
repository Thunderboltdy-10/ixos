# Ixos UI Redesign - Migration Guide

## Overview
This guide helps you migrate existing code to use the new redesigned components and color scheme.

## Color Palette Changes

### Before (Old Purple Theme)
```tsx
className="bg-accent text-white"           // Purple accent
className="text-text-tertiary"             // Gray tertiary text
className="bg-surface border-border"       // Dark surface
```

### After (New Brand Theme)
```tsx
className="bg-brand-teal text-white"       // Teal accent (auto via Button)
className="text-text-muted"                // Clearer naming
className="bg-surface-2 border-border"     // Explicit surface level
```

### Automatic Migrations
These colors automatically map to new values (no changes needed):
- `accent` → `brand-teal` (#0d9488)
- `base` → `surface-0` (#0a0a0f)
- `surface` → `surface-1` (#12121a)
- `elevated` → `surface-3` (#24242e)
- `secure` → `success` (#10b981)

### New Colors Available
```tsx
// Brand colors
className="bg-brand-blue"    // Deep blue from logo
className="bg-brand-teal"    // Teal from logo
className="bg-brand-cyan"    // Cyan highlight

// Explicit surfaces
className="bg-surface-0"     // App background
className="bg-surface-1"     // Sidebar
className="bg-surface-2"     // Cards
className="bg-surface-3"     // Hover states

// Gradients
className="bg-gradient-brand"        // Blue → Teal
className="bg-gradient-brand-hover"  // Lighter version
className="bg-gradient-glass"        // Transparent version
```

## Component Migrations

### 1. Buttons

#### Before
```tsx
<button className="bg-accent text-white px-4 py-2 rounded">
  Click me
</button>
```

#### After (Recommended)
```tsx
<Button variant="gradient">
  Click me
</Button>

// Or for simple actions
<Button variant="default">
  Click me
</Button>
```

**New Button Variants:**
- `gradient` - Branded gradient (NEW)
- `default` - Solid brand-teal (updated)
- `ghost` - Transparent hover
- `outline` - Border only
- `danger` - Destructive actions

### 2. Search Input

#### Before (SearchOverlay)
```tsx
<SearchInput
  value={query}
  onChange={setQuery}
  directory={directory}
  onDirectoryChange={setDirectory}
  isSearching={isSearching}
  onCancel={handleCancel}
/>
```

#### After (Same + New Props)
```tsx
<SearchInput
  value={query}
  onChange={setQuery}
  directory={directory}
  onDirectoryChange={setDirectory}
  isSearching={isSearching}
  onCancel={handleCancel}
  mode="standard"        // NEW: Shows mode badge
  centered={false}       // NEW: Centers when true
/>
```

**New Props:**
- `mode?: 'standard' | 'private' | 'journalist'` - Shows badge
- `centered?: boolean` - Centers input (for empty state)

### 3. Result Cards

#### Before
```tsx
<ResultCard
  result={result}
  index={index}
  isSelected={selected === index}
  isSemanticResult={true}
  onSelect={() => setSelected(index)}
  onOpen={handleOpen}
  onReveal={handleReveal}
/>
```

#### After (Same API, Better Visuals)
```tsx
// No changes needed! But benefits from:
// - Gradient hover effects
// - Better score display (capped at 100%)
// - Color-coded badges
// - Enhanced action buttons
<ResultCard
  result={result}
  index={index}
  isSelected={selected === index}
  isSemanticResult={true}
  onSelect={() => setSelected(index)}
  onOpen={handleOpen}
  onReveal={handleReveal}
/>
```

### 4. Window Layout

#### Before (Overlay-based)
```tsx
function App() {
  return <SearchOverlay />;
}
```

#### After (Windowed App)
```tsx
import { AppShell } from '@/components/layout';
import { MainSearchView } from '@/components/search/MainSearchView';

function App() {
  const [windowType, setWindowType] = useState<'overlay' | 'main'>('main');

  if (windowType === 'overlay') {
    return <SearchOverlay />; // Legacy overlay still works
  }

  return (
    <AppShell>
      <MainSearchView mode="standard" />
    </AppShell>
  );
}
```

## New Components

### 1. ModeSwitcher
```tsx
import { ModeSwitcher } from '@/components/search/ModeSwitcher';

const [mode, setMode] = useState<'standard' | 'private' | 'journalist'>('standard');

<ModeSwitcher value={mode} onChange={setMode} />
```

### 2. FolderPicker
```tsx
import { FolderPicker } from '@/components/search/FolderPicker';

const [path, setPath] = useState('');

<FolderPicker
  value={path}
  onChange={setPath}
  placeholder="Select folder..."
/>
```

### 3. Sidebar
```tsx
import { Sidebar } from '@/components/layout/Sidebar';

<Sidebar onNewSearch={() => console.log('New search')} />
```

### 4. AppShell
```tsx
import { AppShell } from '@/components/layout/AppShell';

<AppShell>
  {/* Your content here */}
</AppShell>
```

### 5. MainSearchView
```tsx
import { MainSearchView } from '@/components/search/MainSearchView';

<MainSearchView mode="standard" />
```

## Styling Patterns

### Gradient Borders (NEW)
```tsx
// Animated gradient border on focus
<div className="gradient-border-focus rounded-xl">
  <input className="..." />
</div>
```

### Glass Morphism (NEW)
```tsx
// Semi-transparent card with backdrop blur
<div className="glass-card p-4">
  <h2>Glass Card</h2>
  <p>Content here</p>
</div>
```

### Hover Shimmer (NEW)
```tsx
// Gradient shimmer on hover
<div className="hover-gradient-accent p-4">
  <p>Hover me</p>
</div>
```

### Gradient Buttons (NEW)
```tsx
// Branded gradient button
<button className="btn-gradient">
  Click me
</button>

// Or use Button component
<Button variant="gradient">
  Click me
</Button>
```

## Utility Class Updates

### Before
```tsx
className="glow-accent"  // Purple glow
```

### After
```tsx
className="glow-accent"  // Now teal glow (auto-updated)
```

### New Utilities
```tsx
className="animate-shimmer"      // Horizontal shimmer
className="animate-slide-in"     // Slide down + fade
className="animate-fade-in"      // Simple fade
className="animate-pulse-slow"   // Gentle pulse
```

## Breaking Changes

### None!
All changes are backward compatible. Old code will continue to work with:
- Legacy color names automatically mapped
- Existing component APIs unchanged
- New props are optional

### Deprecated (Still Works)
Nothing deprecated yet, but consider migrating:
- Direct color classes → Use new surface-N naming
- Custom button styles → Use Button component variants
- Manual gradient styles → Use bg-gradient-brand

## Recommended Updates

### 1. Update Button Usage
Replace custom styled buttons with Button component:
```tsx
// Before
<button className="bg-accent hover:bg-accent-secondary text-white px-4 py-2 rounded">
  Save
</button>

// After
<Button variant="default">Save</Button>
```

### 2. Use New Surface Colors
Be explicit about surface levels:
```tsx
// Before
<div className="bg-surface">...</div>

// After (more explicit)
<div className="bg-surface-1">...</div>  // Sidebar
<div className="bg-surface-2">...</div>  // Cards
<div className="bg-surface-3">...</div>  // Hover
```

### 3. Add Gradient Effects
Enhance important actions:
```tsx
// Primary actions
<Button variant="gradient">
  <Search className="w-4 h-4" />
  New Search
</Button>

// Focus states
<div className="gradient-border-focus rounded-xl">
  <SearchInput ... />
</div>
```

### 4. Use Mode Switcher
Replace custom mode selection:
```tsx
// Before
<select value={mode} onChange={e => setMode(e.target.value)}>
  <option value="standard">Standard</option>
  <option value="private">Private</option>
  <option value="journalist">Journalist</option>
</select>

// After
<ModeSwitcher value={mode} onChange={setMode} />
```

## Testing Your Migration

### 1. Visual Check
- [ ] All colors match new brand palette
- [ ] Buttons have proper hover states
- [ ] Gradients appear correctly
- [ ] Focus rings are teal (not purple)

### 2. Functional Check
- [ ] All buttons still work
- [ ] Search functionality unchanged
- [ ] Mode switching works
- [ ] Folder picker opens dialog

### 3. Accessibility Check
- [ ] Focus indicators visible
- [ ] Keyboard navigation works
- [ ] Screen reader labels present
- [ ] Color contrast sufficient

## Common Issues

### Issue: Purple colors still showing
**Solution:** Check for hardcoded hex values. Replace:
```tsx
// Bad
className="bg-[#8b5cf6]"

// Good
className="bg-brand-teal"
```

### Issue: Gradients not appearing
**Solution:** Ensure Tailwind is processing the new config:
```bash
# Restart dev server
npm run dev
```

### Issue: Focus border wrong color
**Solution:** Update to new ring color:
```tsx
// Before
className="focus:ring-accent"

// After
className="focus:ring-brand-teal"
```

### Issue: Button variant not found
**Solution:** Import Button from ui components:
```tsx
import { Button } from '@/components/ui/button';
```

## Gradual Migration Strategy

### Phase 1: No Changes Required
Your app will work with zero changes. The color mapping handles most updates automatically.

### Phase 2: Update Critical Paths
Migrate high-visibility components:
1. Main buttons → `<Button variant="gradient">`
2. Search input → Add `mode` and `centered` props
3. Result cards → Already updated automatically

### Phase 3: Enhance UI
Add new features gradually:
1. Replace manual folder input with `<FolderPicker>`
2. Add `<ModeSwitcher>` to header
3. Implement `<AppShell>` layout

### Phase 4: Polish
Add visual enhancements:
1. Gradient borders on inputs
2. Glass morphism on overlays
3. Hover shimmer effects
4. Better animations

## Getting Help

### Documentation
- `UI_REDESIGN_SUMMARY.md` - Complete overview
- `COMPONENT_SHOWCASE.md` - Visual examples
- This file - Migration guide

### Code Examples
Check these files for examples:
- `ui/src/App.tsx` - AppShell usage
- `ui/src/components/search/MainSearchView.tsx` - Search view
- `ui/src/components/layout/AppShell.tsx` - Layout structure
- `ui/src/components/search/ResultCard.tsx` - Updated card

### Questions?
1. Check the component file for prop types
2. Look at existing usage in App.tsx
3. Review the COMPONENT_SHOWCASE.md

## Summary

✅ **Backward Compatible** - Old code works without changes
✅ **Gradual Migration** - Update at your own pace
✅ **Better Defaults** - New components have better styling
✅ **More Features** - New capabilities available
✅ **Consistent Design** - Brand colors throughout

Start with zero changes, then gradually adopt new components and patterns as needed.
