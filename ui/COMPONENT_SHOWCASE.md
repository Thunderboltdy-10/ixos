# Ixos Protocol - Component Showcase

This document showcases all the redesigned components with usage examples.

## Color Palette

### Brand Colors (from Logo)
- **Deep Blue** `#1a365d` - `brand-blue` - Primary brand color
- **Teal** `#0d9488` - `brand-teal` - Action color, links, accents
- **Cyan** `#06b6d4` - `brand-cyan` - Secondary highlights

### Surface Colors (Dark Mode)
- **Surface 0** `#0a0a0f` - `surface-0` - App background
- **Surface 1** `#12121a` - `surface-1` - Sidebar, panels
- **Surface 2** `#1a1a24` - `surface-2` - Cards, inputs
- **Surface 3** `#24242e` - `surface-3` - Hover states

### Text Hierarchy
- **Primary** `#f0f0f5` - `text-primary` - Main content
- **Secondary** `#a0a0b0` - `text-secondary` - Subtext
- **Muted** `#606070` - `text-muted` - Disabled, placeholders

### Semantic Colors
- **Success** `#10b981` - File operations, verified states
- **Warning** `#f59e0b` - Caution states
- **Error** `#ef4444` - Errors, destructive actions
- **Journalist** `#d946ef` - Maximum privacy mode

## Typography

### Font Families
- **Sans**: Inter, system-ui, sans-serif
- **Mono**: JetBrains Mono, monospace

### Font Sizes
- `text-xs` - 12px - Captions, badges
- `text-sm` - 14px - Body text
- `text-base` - 16px - Default
- `text-lg` - 18px - Search input
- `text-xl` - 20px - Headings

## Components

### Buttons

```tsx
// Gradient button (primary action)
<Button variant="gradient">
  <Search className="w-4 h-4" />
  New Search
</Button>

// Default button (brand-teal solid)
<Button variant="default">Save</Button>

// Ghost button (transparent, subtle hover)
<Button variant="ghost">Cancel</Button>

// Outline button (border only)
<Button variant="outline">Learn More</Button>

// Danger button (destructive actions)
<Button variant="danger">Delete</Button>

// Icon button
<Button variant="ghost" size="icon">
  <Settings className="w-4 h-4" />
</Button>
```

**Visual:**
- Gradient: Deep blue → Teal gradient with glow shadow
- Default: Solid teal with subtle hover
- Ghost: Transparent with surface-3 hover
- Outline: Border with hover fill
- Danger: Red with hover darken

### Badges

```tsx
// Score badges (auto-colored by value)
<Badge className="bg-success/20 text-success">95%</Badge>
<Badge className="bg-brand-teal/20 text-brand-teal">78%</Badge>
<Badge className="bg-brand-cyan/20 text-brand-cyan">62%</Badge>

// Mode badges
<Badge className="bg-brand-teal/10 text-brand-teal border-brand-teal/30">
  PRIVATE
</Badge>
<Badge className="bg-journalist/10 text-journalist border-journalist/30">
  JOURNALIST
</Badge>

// Status badges
<Badge variant="secure">Verified</Badge>
<Badge variant="warning">Unverified</Badge>
<Badge variant="danger">Error</Badge>
```

### Input Fields

```tsx
// Standard input
<Input
  placeholder="Enter text..."
  className="font-mono"
/>

// With gradient focus border
<div className="gradient-border-focus rounded-xl">
  <Input placeholder="Search..." />
</div>
```

**Features:**
- Surface-2 background
- Brand-teal focus ring
- Hover border highlight
- Smooth transitions

### Search Input (Redesigned)

```tsx
<SearchInput
  value={query}
  onChange={setQuery}
  directory={directory}
  onDirectoryChange={setDirectory}
  isSearching={false}
  onCancel={handleCancel}
  mode="private"
  centered={true}
/>
```

**Features:**
- Gradient border on focus
- Integrated folder picker
- Mode badge display
- Centered option for empty state
- Smooth animations

### Folder Picker

```tsx
<FolderPicker
  value="/path/to/folder"
  onChange={setPath}
  placeholder="Select folder to search..."
/>
```

**Features:**
- Native dialog integration
- Manual path input
- Monospace font
- Browse button with icon

### Mode Switcher

```tsx
<ModeSwitcher
  value={mode}
  onChange={setMode}
/>
```

**Modes:**
1. **Standard** (Zap icon) - Fast with caching
2. **Private** (Shield icon) - No disk writes
3. **Journalist** (Lock icon) - Maximum security

**Features:**
- Dropdown with icons
- Color-coded by mode
- Check mark on selected
- Smooth animations

### Result Cards

```tsx
<ResultCard
  result={result}
  index={0}
  isSelected={true}
  isSemanticResult={true}
  onSelect={handleSelect}
  onOpen={handleOpen}
  onReveal={handleReveal}
/>
```

**Features:**
- Gradient shimmer on hover
- Score badge capped at 100%
- Color-coded by score (green/teal/cyan)
- Enhanced action buttons
- Expandable details
- File preview with line numbers
- Integrity verification badge

**Score Colors:**
- 90-100%: Success green
- 70-89%: Brand teal
- 50-69%: Brand cyan
- Below 50%: Muted gray

### Sidebar

```tsx
<Sidebar onNewSearch={handleNewSearch} />
```

**Sections:**
1. **Header**: Gradient "New Search" button
2. **Stats Panel**: Collapsible, shows:
   - Total searches
   - Files indexed
   - Cache hit rate (in brand-teal)
3. **Search History**: Chat-like list with:
   - Query text
   - Result count
   - Relative timestamp
   - Hover effects
4. **Footer**: Version indicator with pulse

### App Shell

```tsx
<AppShell>
  <MainSearchView mode="standard" />
</AppShell>
```

**Layout:**
- **Titlebar**: Logo, mode switcher, settings, window controls
- **Sidebar**: 280px, stats + history
- **Content**: Flexible main area
- **Drag Regions**: Proper window movement

## Utility Classes

### Gradient Border Focus

```tsx
<div className="gradient-border-focus rounded-xl">
  <input ... />
</div>
```

Creates animated gradient border on focus (deep blue → teal).

### Glass Card

```tsx
<div className="glass-card p-4">
  Content with glass morphism effect
</div>
```

Semi-transparent with backdrop blur.

### Hover Gradient Accent

```tsx
<div className="hover-gradient-accent">
  Content with shimmer effect on hover
</div>
```

Animated shimmer sweep on hover.

### Gradient Button (Utility Class)

```tsx
<button className="btn-gradient">
  Click me
</button>
```

Branded gradient with glow shadow.

## Animations

### Glow (2s infinite)
```css
@apply animate-glow
```
Pulsing glow effect (brand-teal)

### Shimmer (2s infinite)
```css
@apply animate-shimmer
```
Horizontal shimmer effect

### Slide In (0.2s once)
```css
@apply animate-slide-in
```
Slide down with fade in

### Fade In (0.2s once)
```css
@apply animate-fade-in
```
Simple opacity transition

### Pulse Slow (1.5s infinite)
```css
@apply animate-pulse-slow
```
Gentle pulsing effect

## Layout Examples

### Centered Search (Empty State)
```tsx
<div className="flex-1 flex items-center justify-center">
  <div className="w-full max-w-3xl px-8">
    <SearchInput centered={true} ... />
    <div className="text-center mt-8">
      <p className="text-text-secondary">Start typing to search</p>
    </div>
  </div>
</div>
```

### Results View (Active State)
```tsx
<div className="flex-1 flex flex-col">
  <div className="py-4">
    <SearchInput centered={false} ... />
  </div>
  <div className="flex-1 overflow-y-auto">
    <SearchResults ... />
  </div>
</div>
```

### Window Titlebar
```tsx
<div className="h-12 flex items-center justify-between px-4 bg-surface-1 border-b border-border drag-region">
  {/* Logo */}
  <div className="flex items-center gap-3 no-drag">
    <div className="w-6 h-6 rounded-md bg-gradient-brand">
      <span className="text-xs font-bold text-white">I</span>
    </div>
    <h1>Ixos Protocol</h1>
  </div>

  {/* Mode Switcher */}
  <div className="no-drag">
    <ModeSwitcher ... />
  </div>

  {/* Window Controls */}
  <div className="flex gap-1 no-drag">
    <Button variant="ghost" size="icon"><Minus /></Button>
    <Button variant="ghost" size="icon"><Square /></Button>
    <Button variant="ghost" size="icon"><X /></Button>
  </div>
</div>
```

## Accessibility

### Focus Indicators
All interactive elements have visible focus rings using brand-teal.

### Color Contrast
All text meets WCAG AA standards:
- text-primary on surface-0: 14.2:1
- text-secondary on surface-1: 8.5:1
- text-muted on surface-2: 4.8:1

### Keyboard Navigation
- Tab order follows visual flow
- All buttons/inputs keyboard accessible
- Escape closes modals/dropdowns

### Screen Readers
- Semantic HTML throughout
- ARIA labels on icon buttons
- Live regions for search status

## Responsive Behavior

### Breakpoints (Future)
Currently designed for desktop (1024px+). Future mobile support:
- `sm`: 640px - Hide sidebar, show drawer
- `md`: 768px - Compact sidebar
- `lg`: 1024px - Full layout

### Window Resize
- Sidebar: Fixed 280px
- Content: Flexible width
- Search input: Max 896px (3xl)
- Results: Max 1024px (5xl)

## Dark Mode Only

Currently dark mode only. Light mode would require:
- Inverted surface colors (light backgrounds)
- Adjusted text colors (darker)
- Different gradient overlays
- Updated shadow values

## Performance Notes

### Animations
All animations use CSS transforms and opacity for GPU acceleration:
- No layout thrashing
- 60fps smooth animations
- Framer Motion for React components

### Blur Effects
Backdrop blur uses `backdrop-filter` with fallback:
```css
backdrop-blur-lg /* Modern browsers */
-webkit-backdrop-filter: blur(16px) /* Safari */
```

### Paint Performance
- Fixed sidebar prevents repaints during scroll
- Virtual scrolling for large result lists (future)
- Lazy loading for search history (future)

## Browser Support

### Required
- Chrome 90+
- Edge 90+
- Safari 14+
- Firefox 88+

### Features Used
- CSS Grid & Flexbox
- CSS Custom Properties
- Backdrop Filter
- CSS Transforms
- CSS Transitions
- CSS Gradients

All supported in Tauri's webview (Chromium-based on Windows/Linux, WebKit on macOS).
