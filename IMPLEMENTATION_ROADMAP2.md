IXOS PROTOCOL: MASTER IMPLEMENTATION ROADMAP
Version: 2.0 | Scope: P4.0 (UI) → P5.0 (Protocol)
Philosophy: Build what AI can't conceive, implement what research validates

---

## IMPLEMENTATION STATUS (Updated 2026-01-13)

### ✅ P0: Foundation Fixes - COMPLETE
- [x] P0.1: Command & Control Architecture
- [x] P0.2: Icon & System Integration
- [x] P0.3: Performance Baseline

### ✅ P1: Performance Revolution - COMPLETE
- [x] P1.1: Model Loading Optimization (MmapModel2VecEmbedder with lazy loading)
- [x] P1.2: Speculative Lexical Funnel (RipgrepLexicalEngine with SIMD & .gitignore)
- [x] P1.3: Integer Quantization (int8 model variant via new_int8())
- [x] P1.4: Ephemeral Sidecar Cache (LmdbSidecarCache for FAT32/USB/network)

### ✅ P2: Perceived Performance - COMPLETE
- [x] P2.1: Four-Stage Ramping Interface (SearchSuggestions + LateInsightBadge)
- [x] P2.2: Loading State Choreography (Enhanced ProgressIndicator)
- [x] P2.3: Speculative Work-Ahead (usePrefetch hook with hover preload)

### ✅ P3: 3D Visualization - COMPLETE
- [x] P3.1: "Neural Constellations" Core Design (NeuralConstellations.tsx)
- [x] P3.2: Performance Budget (InstancedMesh for 60fps)
- [x] P3.3: Three-phase animation (Vortex → Clustering → Crystal)

---


P0: FOUNDATION FIXES (Week 1)
The bedrock—nothing works without this
P0.1: Command & Control Architecture
Problem: UI buttons dead, state management chaotic
Solution: Implement event-driven architecture with Zustand as single source
Tasks:

    Map every UI element to Tauri command (create spreadsheet: Button → Command → Status)
    Implement optimistic updates: UI changes → command fires → success/failure toast → state rollback on error
    Add loading states (shimmer) to all interactive elements
    Create useCommand() hook that standardizes: invoke → loading → success/error

Success Metrics:

    100% button coverage (all 23 UI controls functional)
    <100ms response time for all commands
    Zero UI blocking during async operations

P0.2: Icon & System Integration
Problem: Dual tray icons, ghost processes, asset chaos
Solution: Single source asset pipeline with proper lifecycle management
Tasks:

    Consolidate to single Icon.png (256x256 source)
    Generate platform-specific sizes: 32px (tray), 64px (window), 128px (taskbar)
    Implement window manager: .exe launch → check existing process → focus/restore
    Tray menu: [Search] [Settings] [History] [Quit] (no duplicates)
    Window close = hide to tray (don't terminate)

Success Metrics:

    Single tray icon with full context menu
    App focuses within 50ms on relaunch
    Zero ghost processes after 10 open/close cycles

P0.3: Performance Baseline
Problem: Don't know where 17s is spent
Solution: Instrument everything before optimizing
Tasks:

    Add tracing spans to: model load, file discovery, content loading, embedding, ranking, UI render
    Run flamegraph on 30k file corpus
    Create latency breakdown: identify phase >200ms
    Compare CLI vs UI: find why UI is slower (thread blocking? model reload?)

Success Metrics:

    Flamegraph shows exact % per phase
    CLI vs UI gap identified and documented
    Clear bottleneck list prioritized by impact

P1: PERFORMANCE REVOLUTION (Weeks 2-3)
Turn 17s into 2s actual time
P1.1: Model Loading Optimization
Target: 3s → 0ms
Approach: Memory-mapped I/O + SafeTensors

    Replace std::fs::read() with memmap2::MmapOptions
    Use model2vec-rs with safetensors backend
    Model file stays on disk; OS pages in weights lazily
    30MB model → 0ms load time (tested on Raspberry Pi 4)

Fallback: If mmap fails (network drive), fall back to explicit read with progress bar
P1.2: Speculative Lexical Funnel
Target: 14s → 2s
Approach: Ripgrep-first filtering

    Query → ripgrep (librg) → candidate set (target: 1,000 files)
    Ripgrep config: SIMD acceleration, .gitignore respect, binary skip
    Candidate selection: fuzzy match + recency boost + file type filter
    Only candidates get embeddings (97% reduction in work)

Mathematical Guarantee:

    30,000 files → 1,000 candidates = 33x speedup
    1,000 files × 10ms embedding = 10s → 4 cores = 2.5s
    Int8 quantization (next step) → 1.25s

P1.3: Integer Quantization
Target: 2.5s → 1.25s
Approach: Convert Model2Vec weights to int8

    Use model2vec-rs int8 feature flag
    Model size: 30MB → 7.5MB
    SIMD throughput: 4x improvement (AVX2/NEON)
    Accuracy loss: <2% (benchmark on MTEB)

Tradeoff: Slightly lower accuracy for 2x speed—acceptable for local search
P1.4: Ephemeral Sidecar Cache
Target: Consistent <2s on repeat searches
Approach: LMDB for non-xattr filesystems

    Location: /tmp/ixos-sidecar or %TEMP%\\ixos-sidecar
    Size cap: 50MB LRU (configurable)
    Key: xxHash3(file_path + mtime)
    Value: int8 embedding vector
    Deleted on app exit (Zero-Storage promise)

Benefit: Fast on FAT32/USB drives without permanent storage
P2: PERCEIVED PERFORMANCE (Week 3-4)
Make 2s feel like 200ms
P2.1: Four-Stage Ramping Interface
Psychological Framework: Transform wait into engagement
Ramp 1: Instant Echo (0-50ms)

    In-memory history buffer (SQLite/Sled)
    Show recent searches + prefix matches
    User sees immediate response

Ramp 2: Lexical Stream (50-500ms)

    Stream ripgrep results via Tauri Channels
    Batch: 20 items or 50ms window
    Results appear with "Text Match" badge
    User starts reading → cognitive clock resets

Ramp 3: Semantic Injection (500-2000ms)

    Model2Vec results arrive
    "Gentle drift" animation: fade in at top, don't reorder list
    New section: "Conceptual Matches"
    Shows intelligence augmentation

Ramp 4: Deep Search Tail (2s+)

    Process remaining files silently
    Badge: "New Insight Found" (user can refresh)
    Respect focus, don't interrupt

P2.2: Loading State Choreography
Problem: Blank screens create anxiety
Solution: Progressive disclosure with purpose

    0ms: Search bar + "Neural Shield" logo pulses
    50ms: "Scanning 30,000 files..." with animated ellipsis
    200ms: First lexical results appear (even if incomplete)
    500ms: "Understanding meaning..." + 3D visualization starts
    2000ms: Semantic results populate
    >2000ms: If still processing, show "Large corpus detected. Enable Cache mode?"

P2.3: Speculative Work-Ahead
Steal time from the future:

    Hover preload: Mouse over result >200ms → preload file content
    Idle indexing: After 60s inactivity → low-priority embed of frequent folders
    Predictive caching: Based on time-of-day patterns (e.g., "work files" at 9am)

P3: 3D VISUALIZATION (Week 4-5)
Make search an experience
P3.1: "Neural Constellations" Core Design
Metaphor: Entropy → Order crystallization
Phase 1: Lexical Storm (0-500ms)

    30,000 dim particles swirl (vortex shader)
    Ripgrep matches ignite → teal pulses → streak to foreground
    Visual: System hunting in chaos

Phase 2: Semantic Web (500-2000ms)

    Ignited particles connect with glowing lines
    Force-directed clustering by cosine similarity
    Related documents form constellations
    Camera orbits slowly around densest cluster

Phase 3: Crystal Interface (2000ms+)

    Constellations morph into result list
    Smooth camera zoom → 2D cards
    Background fades to calm void

Technical Stack:

    React Three Fiber (R3F) for React integration
    InstancedMesh: single draw call for 30k particles
    Custom GLSL shaders for vortex motion
    Web Worker for physics simulation (d3-force-3d)
    SharedArrayBuffer for zero-copy position updates

P3.2: Performance Budget
Target: 60fps on Intel UHD Graphics (low-end)

    Max particles: 30,000 (instanced)
    Geometry: low-poly tetrahedron (32 vertices)
    Shaders: simple vertex transforms, no complex lighting
    LOD: far particles = points, near = tetrahedrons
    Fallback: 2D canvas if WebGL unsupported

P3.3: Interaction Design

    Click particle: Zoom to file preview
    Hover: Particle expands, shows filename
    Drag: Orbit camera around constellation
    Scroll: Zoom in/out of clusters

P4: SMART SEARCH (Week 5-6)
Intelligence without LLM (yet)
P4.1: Query Classification
Types:

    Keyword: "report" → lexical + semantic blend
    Question: "What is revenue?" → high semantic weight + answer extraction
    Phrase: "machine learning" → prioritize exact match + proximity
    Concept: "money earned" → synonym expansion
    Navigational: "~/Documents" → path resolution

Implementation: Regex patterns + heuristics (no ML)
P4.2: Synonym Expander
Approach: Local WordNet integration

    Crate: wordnet-db + wordnet-types
    Build synonym graph at startup (2MB memory)
    Lookup: microseconds
    Expansion: 2-3 synonyms per term
    Weight: original=1.0, synonyms=0.7

Example: "money earned" → [money, cash, revenue, earned, gained, profit]
P4.3: Answer Extraction
For Question queries:

    Scan top 5 semantic results
    Extract sentences with:
        Numbers after "what is" → Answer: €450K
        Dates after "when" → Answer: 2024-01-15
        Names after "who" → Answer: John Smith
    Show "Answer preview" in results

P4.4: Typo Tolerance
Approach: SymSpell algorithm

    Pre-index all filenames at startup
    On zero-result query: run SymSpell correction
    Suggest: "Showing results for receipt"
    Re-run automatically with corrected term

P5: UX REDESIGN (Weeks 6-7)
Polish that feels native
P5.1: Minimalist Interface ("The Blade")
Design System:

    Font: Inter (headings), JetBrains Mono (paths/code)
    Colors: Deep blue #1a365d → Teal #0d9488 gradient
    Glassmorphism: backdrop-blur-md, 80% opacity
    Spacing: 8px grid system

Layout:

    Floating search bar (centered, 480px width)
    No window chrome (borderless)
    Pulsing "Neural Shield" logo
    Results slide down from search bar

P5.2: Keyboard-First Interaction
Shortcuts:

    Ctrl+Space: Invoke app (global)
    Tab: Autocomplete path/synonym
    ↑↓: Navigate results
    Enter: Open file
    Shift+Enter: Reveal in Explorer
    Ctrl+P: Quick Look preview
    Ctrl+S: Star current search
    Esc: Clear/close

Vim mode: Optional j/k navigation
P5.3: Result Cards
Elements:

    File icon (by type)
    Title + path (monospace)
    Score bar (gradient: red→yellow→green)
    Hover: Show "Semantic: 85% + Freshness: +10%"
    Context preview: ±3 lines around match, highlighted

Actions:

    Click: Open file
    Right-arrow: Quick Look
    Star: Add to "Saved Searches"

P5.4: Trust Visualization
Privacy indicators:

    Green shield: No network traffic
    Red shield (pulse): Network attempt detected (should never happen)
    "Journalist Mode" badge: Memory-only, ephemeral
    Panic button: Ctrl+Shift+Del → immediate purge

P6: INTEGRATION & DEPLOYMENT (Week 8)
Ship with confidence
P6.1: Cross-Platform Polish
Windows:

    MSI installer with code signing
    ADS caching for NTFS
    System tray integration

macOS:

    PKG installer, notarized
    xattr for APFS
    Spotlight API integration (optional)

Linux:

    DEB/RPM packages
    ext4/btrfs xattr support
    AppImage for universal

P6.2: Beta Program
Recruit: 10 power users from r/privacy, r/selfhosted
Onboard:

    1-week usage
    Daily feedback form (3 questions)
    Performance logs (opt-in)
    Success criteria:
    8/10 users say "faster than Spotlight"
    0 critical bugs
    <5% crash rate

P6.3: Documentation
Required:

    IMPLEMENTATION_ROADMAP.md (this file)
    PERFORMANCE_BENCHMARKS.md (30k, 100k, 1M file results)
    USER_GUIDE.md (keyboard shortcuts, features)
    PRIVACY_MANIFESTO.md (data handling, forensic audit)

P7: POST-LAUNCH (Month 2-3)
Scale and differentiate
P7.1: LLM Integration (P4.1)
When: After core is stable and loved
Approach: Local Phi-3-mini (4GB RAM)

    Query refinement: "machine learning" → add "neural networks"
    Answer extraction: direct questions → direct answers
    Chat interface: "Find that invoice, then tell me the total"

P7.2: IDE Extensions
VSCode plugin:

    Semantic code search ("authentication logic" → finds functions)
    Results in tree view with file icons
    Jump-to-definition integration

JetBrains plugin:

    Use FileSearchProvider API
    Integrate with "Find Usages"

P7.3: Protocol Standard
Why: Create ecosystem moat
Deliverables:

    IETF-style specification document
    Reference Rust implementation
    Embedding format standard (225-byte binary)
    Third-party validation (1+ external contributor)

P7.4: Enterprise Features
For $25/user/month:

    SSO (SAML/OIDC)
    Audit logs (JSONL, signed)
    Network drive optimization
    Group Policy templates