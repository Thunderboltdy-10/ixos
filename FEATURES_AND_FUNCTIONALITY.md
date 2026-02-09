# Ixos Protocol - Comprehensive Features and Functionality

An exhaustive inventory of every feature, module, and capability within the Ixos ecosystem, spanning the core Rust protocol, the desktop application, and the developmental tooling.

---

## 🔒 1. Privacy & Security Infrastructure (Core Philosophy)
The foundation of Ixos is a "privacy-first" architecture that ensures data never leaves the local machine.

*   **DB-less Architecture**: No global persistent manifest of all files; "JIT (Just-In-Time) remains the product story."
*   **Journalist Mode / Incognito**: Maximum privacy search mode with **zero persistent writes** to disk (no history, no cache, no xattrs).
*   **Hardened Mode (Pro)**: Enhanced Journalist mode with **Secure Timing Protection**, visible shield state, and verified diagnostics.
*   **Memory Protection**:
    *   **SecureBuffer**: Prevents sensitive data from being swapped to disk using `mlock`.
    *   **Zeroize-on-drop**: Automatically clears sensitive memory (embeddings/keys) when deleted.
*   **Cryptographic Attestation**: Digital signing of search results (Ed25519) to prove integrity.
*   **Timing Attack Protection**: Configurable floors (Fast vs. Secure) to prevent side-channel analysis of file contents.
*   **HMAC-SHA256 Signed Caching**: Prevents cache poisoning by signing metadata stored in ADS/xattr.
*   **Secure Path Validation**: Sandbox environment to prevent path traversal and unauthorized directory access.
*   **Device Binding**: AES-256-GCM encryption keys derived from machine fingerprint (MAC/HWID) to prevent history decryption on other devices.
*   **Emergency Clear**: Global hotkey (Ctrl+Shift+X) to instantly wipe all embeddings, history, and stats.

---

## 🔎 2. Advanced Semantic Search Engine
The core search technology built in Rust (`ixos-protocol`).

*   **Hybrid Ranking Engine**: Blends **Lexical (Keyword)** and **Semantic (Vector)** search using adaptive weights.
*   **Ripgrep-style Lexical Funnel**: Utilizes ripgrep's core library for ultra-fast initial candidate filtering.
*   **Model2Vec Integration**: High-performance, local-only embeddings (no GPU/API required).
*   **Progressive Search**: Real-time streaming of search results as they are found.
*   **Cross-Platform Cache Backends**:
    *   **Windows**: NTFS Alternate Data Streams (ADS).
    *   **Unix/macOS**: Extended Attributes (`xattr`).
    *   **Fallback**: Bounded LRU map for unsupported filesystems.
*   **Document Parsing**: Native extraction for **PDF**, **Excel (XLSX)**, **Word (DOCX)**, and **Zip** archives.
*   **Asset Preprocessing**:
    *   **Snippet Highlighting**: Smart context extraction with regex matching.
    *   **Evidence Extraction**: Identifies relevant passages and ranks them.
    *   **Directory Centroids**: Semantic relevance based on folder structure.
*   **Attack Detection**: Identifies relevance degradation attacks and automatically adjusts engine weights.

---

## 💻 3. Desktop Experience (Tauri + React)
The user-facing application providing a premium, high-performance interface.

*   **Search Deck**: Main interface with "Ghost Scaffolding" (skeleton loaders) and smooth animations.
*   **Command Palette**: Global command entry (Ctrl+P) for quick navigation.
*   **Model Switcher**: On-the-fly switching between **Ixos Flash V2** (Speed) and **Ixos Pro V2** (Precision).
*   **Mode Switcher**: Toggle between JIT (Privacy) and Cache (Speed) modes.
*   **Result Card Features**:
    *   **Score Breakdown**: Visual explanation of why a file rank (Semantic vs Lexical).
    *   **Explain Panel**: "Why this result?" breakdown.
    *   **Context Snippets**: Scrollable previews of matching text in the result.
    *   **Related Files Panel**: Shows files with high co-occurrence or similarity.
*   **Folder Picker**: Native OS dialog integration for selecting search roots.
*   **Global Hotkeys**: Configurable shortcut (default: Ctrl+Shift+Space) to bring Ixos to font.
*   **Tray Integration**: Minimalist background operation with "Minimize to Tray" on close.
*   **Single Instance Protection**: Ensures only one instance of the app runs at a time.

---

## 🧠 4. Second Brain & Personalization
Features that learn from user behavior to improve results over time without a database.

*   **Activity Ledger**:
    *   **Bounded Ring Buffer**: Encrypted log of file interactions (opens, pins, searches).
    *   **Co-Occurrence Analyzer**: Learns which files belong together based on usage patterns.
    *   **Periodic Autosave**: Efficient background persistence (every 5 mins).
*   **Workstreams**:
    *   **Auto-clustering**: Automatic grouping of related search sessions.
    *   **Manual Management**: Create, Rename, Pin, and Merge workstreams.
    *   **Context Preservation**: Save and resume work across sessions.
*   **"Today" Tab**:
    *   **Daily Brief**: Summary of activity.
    *   **Recently Touched**: Instant access to recent files.
    *   **Pinned Section**: Long-term access to critical documents.
    *   **Suggested Next**: ML-driven prediction of what you might need.
*   **Personal Ranking (Pro Memory Lite)**:
    *   `open_score`: Decayed frequency/recency boost.
    *   `last_open_ts`: Recency tracking.
    *   **Manual Pins/Ignores**: Explicit feedback to the ranker.

---

## ✨ 5. Pro Features & Intelligence
Advanced capabilities gated for Pro users.

*   **Ask Mode Plus**: Advanced reasoning over search results (Evidence-first, no hallucinations).
*   **Answer Cards**: Automatic extraction of dates, numbers, and names as summary cards with citations.
*   **JIT Accelerator**:
    *   **RAM Memoization**: Session-level file list caching for instant repeat searches.
    *   **Change-Journal Cursors (USN/FSEvents)**: OS-level delta tracking for instant updates without rescanning.
*   **Path-Augmented Embeddings**: Incorporating folder paths into semantic vectors for deep context.
*   **Personalized Reranking**: Full recency + frequency learning weights.

---

## 🎮 6. Gamification & Engagement
Keeping users engaged with statistics and rewards.

*   **Encrypted Statistics Tracking**: Tracks 10+ metrics (Total searches, Cache hits, Speed, Streaks).
*   **Achievement System**: 11 unique badges (e.g., "Speed Demon", "Privacy Pro", "Cache Master").
    *   **Progress Tracking**: Visual indicators for locked achievements.
    *   **Toast Notifications**: Real-time feedback when unlocking a badge.
*   **Milestone System**: Special notifications for search counts (10, 50, 100...) and streaks.

---

## 🛠️ 7. Tooling & Diagnostics
Maintainability and developer tools for ensuring the "Ixos Standard."

*   **Ixos Doctor**:
    *   **CLI & UI Panels**: Extensive checks for ADS/xattr capability, model health, and config integrity.
    *   **Automated Capability Matrix**: Generates a report on what the current OS/FS supports.
*   **Golden Query Suite**: Suite of ~100 "hard" queries to prevent relevance regressions.
*   **Performance Benchmarking**:
    *   `ixos bench`: E2E search benchmarks.
    *   `ixos profile`: Detailed performance profiling.
    *   **Scale Bench**: Tests behavior on 10k+ files.
*   **Settings Matrix Smoke Suite**: Automated runner checking all combinations of JIT/Cache/Privacy/Model settings.
*   **Model Management**:
    *   **Preloading/Warming**: Background loading of models to eliminate first-search latency.
    *   **Dynamic Downloading**: Model installer with progress indicators.
*   **Instrumentation**: Internal metrics for stage-by-stage latency analysis (e.g., candidate vs ranking vs highlighting).

---

## ⚖️ 8. Compliance & Ethics
Ensuring the tool follows global digital rights standards.

*   **GDPR / CCPA Modules**:
    *   **Data Portability**: Local export of all search history and stats as JSON.
    *   **Right to be Forgotten**: Comprehensive deletion of all user data.
    *   **Transparency Layer**: Public disclosure of AI model usage and data handling.
*   **Consent Manager**: Granular toggles for optional features (Analytics, Telemetry, Personal Learning).
*   **Audit Logging**: Transparent trail of system actions for user review.
*   **EU AI Act Compliance**: Documentation and disclosure implementation markers.

---

## 🎨 9. Design System & UI Architecture
Ixos uses a custom-built, premium design system focused on "Rich Aesthetics" and "Visual Excellence."

*   **Tailored Color Palette**: Custom HSL-based dark mode system (`Surface 0-3`) with brand-specific Deep Blue, Teal, and Cyan accents.
*   **Aesthetics (Shared UI Package)**:
    *   **Glassmorphism**: Backdrop blur effects for cards and panels.
    *   **Micro-animations**: Seamless transitions using Framer Motion (glow, pulse, shimmer, slide).
    *   **Shimmer Effects**: Dynamic loading states and hover effects.
*   **Typography**: Optimized hierarchy using **Inter** (Sans) and **JetBrains Mono** (Code).
*   **Responsiveness**: Designed for desktop with a flexible grid system (Sidebar at 280px, flexible content).
*   **WCAG Compliance**: High-contrast text colors and full keyboard accessibility.
