# Ixos Protocol - Implementation Roadmap

> **Document Version**: 2.2 (Complete Implementation)
> **Last Updated**: January 10, 2026
> **Purpose**: Complete development guide for Claude Code. Load this file in every session.
> **Status**: ✅ ALL FEATURES COMPLETE (P0-P3.4)
> **Test Results**: 278/278 tests passing, 0 failures, 0 warnings

---

## Quick Reference

### Project Structure

```
ixos-protocol/
├── Cargo.toml                    # Workspace manifest
├── IMPLEMENTATION_ROADMAP.md     # This file (always loaded)
├── TECHNICAL_DEEP_DIVE.md        # For stakeholders
├── src/
│   ├── main.rs                   # CLI entry point
│   ├── lib.rs                    # Library exports
│   ├── storage/                  # P0.1 Cross-platform cache (COMPLETE)
│   │   ├── mod.rs                # Trait + auto-detection
│   │   ├── validator.rs          # HMAC signing (shared)
│   │   ├── ads_windows.rs        # Windows NTFS ADS
│   │   ├── xattr_unix.rs         # Linux/macOS xattr
│   │   └── null.rs               # Pure JIT fallback
│   ├── ixos_watcher/             # P0.5 File system monitoring (COMPLETE)
│   │   ├── mod.rs                # ResilientWatcher
│   │   ├── events.rs             # FileEvent, ProcessedEvent
│   │   └── resilience.rs         # EventLimiter, DedupCache, AttackDetector
│   ├── ixos_embed/               # P0.2-P0.3 Embedding generation (COMPLETE)
│   │   ├── mod.rs
│   │   ├── model.rs              # EmbeddingModel trait
│   │   ├── secure_embedder.rs    # P0.2 (COMPLETE)
│   │   └── memory_protection.rs  # P0.3 (COMPLETE)
│   ├── ixos_rank/                # P0.4, P0.6 Similarity ranking (P0.4 COMPLETE)
│   │   ├── mod.rs
│   │   ├── types.rs              # Shared types
│   │   ├── lexical_engine.rs     # Keyword-based search
│   │   ├── semantic_engine.rs    # Embedding-based search
│   │   ├── hybrid_engine.rs      # P0.4 (COMPLETE)
│   │   ├── secure_ranker.rs      # P0.6
│   │   └── simd_cosine.rs
│   ├── ixos_refine/              # LLM query refinement
│   │   ├── mod.rs
│   │   └── llm_client.rs
│   ├── ixos_ui/                  # Tauri frontend
│   │   ├── mod.rs
│   │   └── tauri_app.rs
│   ├── security/                 # Security implementations
│   │   ├── mod.rs
│   │   ├── crypto.rs
│   │   └── sandbox.rs            # Path validation & access control
│   └── compliance/               # P1 Legal compliance
│       ├── mod.rs
│       ├── transparency.rs       # P1.1
│       ├── gdpr.rs               # P1.2
│       ├── ccpa.rs               # P1.3
│       └── documentation.rs      # P1.4
├── tests/
│   ├── storage_tests.rs          # Cross-platform storage tests
│   ├── timing_tests.rs           # Constant-time embedding tests
│   ├── latency_benchmarks.rs
│   ├── security_vulnerabilities.rs
│   └── compliance_tests.rs
├── benches/
│   └── search_latency.rs
├── docs/
│   ├── cold_start_manifesto.md
│   └── privacy_manifesto.md
└── scripts/
    ├── build_all.sh
    └── deploy_enterprise.sh
```

### Key Dependencies (Cargo.toml)

```toml
[workspace]
members = [".", "ixos-ui"]

[dependencies]
# Async runtime
tokio = { version = "1.43", features = ["full", "time", "sync"] }

# Embedding model (future)
ort = "2.0"                 # ONNX Runtime for Model2Vec

# Security
ring = "0.17"               # HMAC-SHA256, Ed25519
zeroize = "1.7"             # Secure memory clearing
memsec = "0.7"              # mlock/munlock

# File watching
notify = "6.1"              # Cross-platform file watcher

# Search
simsimd = "4.0"             # SIMD cosine similarity

# CLI
clap = { version = "4.5", features = ["derive"] }

# Serialization
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

# Half-precision floats (for compact embedding storage)
half = { version = "2.4", features = ["bytemuck"] }

# Config directory detection
dirs = "5.0"

# Cross-platform extended attributes
[target.'cfg(unix)'.dependencies]
xattr = "1.3"               # Unix xattr

[target.'cfg(windows)'.dependencies]
windows-sys = { version = "0.59", features = ["Win32_Storage_FileSystem"] }

# LLM (optional)
llama-cpp-rs = "0.3"        # For Phi-3-mini

# Time
chrono = "0.4"

# Error handling
anyhow = "1.0"
thiserror = "1.0"

# Logging
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }

[dev-dependencies]
criterion = "0.5"           # Benchmarking
tempfile = "3.15"           # Test file creation
tokio-test = "0.4"          # Async testing
```

---

## Progress Tracking

### Status Legend

- `[ ]` Not started
- `[~]` In progress
- `[x]` Complete
- `[!]` Blocked

### Current Sprint Focus

**Priority**: Complete P0 (Security Foundation) before any public release

---

## P0: Critical Security & Foundation (Launch Blockers)

> ⚠️ **STOP**: Do NOT proceed beyond P0 until ALL items are complete and tested.

### P0.1: Cross-Platform Metadata Storage

**Status**: `[x]` Complete
**Estimated Time**: 5-6 days
**Dependencies**: None
**Files**: `src/storage/mod.rs`, `src/storage/validator.rs`, `src/storage/ads_windows.rs`, `src/storage/xattr_unix.rs`, `src/storage/null.rs`

**Why**: Core caching mechanism. Must work on Windows (ADS) and Unix (xattr) with zero extra files.

**Architecture Overview**:

```
┌─────────────────────────────────────────────────────────────────┐
│                  UNIFIED CACHE ABSTRACTION                      │
├─────────────────────────────────────────────────────────────────┤
│  trait EmbeddingCache { get, set, delete, is_supported }       │
├──────────────────┬──────────────────┬───────────────────────────┤
│   XattrCache     │    AdsCache      │      NullCache            │
│   (Unix)         │    (Windows)     │      (Fallback)           │
├──────────────────┼──────────────────┼───────────────────────────┤
│ user.ixos.embed  │ file:ixos_embed  │  No storage               │
│ Linux, macOS,    │ Windows NTFS     │  FAT32, exFAT,            │
│ FreeBSD, etc.    │ only             │  cloud sync, network      │
└──────────────────┴──────────────────┴───────────────────────────┘
```

**Binary Format** (225 bytes for 64-dim embedding):

```
[version:u8][model_fingerprint:32b][file_hash:32b][embedding:128b][signature:32b]
     1     +        32            +      32      +    64*2(f16)  +      32
```

**Implementation - Trait Definition** (`src/storage/mod.rs`):

```rust
use std::path::Path;

pub mod validator;
#[cfg(unix)]
pub mod xattr_unix;
#[cfg(windows)]
pub mod ads_windows;
pub mod null;

/// Unified trait for embedding cache backends
pub trait EmbeddingCache: Send + Sync {
    /// Get cached embedding if valid (checks file hash + signature)
    fn get(&self, path: &Path, file_hash: &[u8; 32]) -> Result<Option<Vec<f32>>, CacheError>;

    /// Store signed embedding in file metadata
    fn set(&self, path: &Path, file_hash: &[u8; 32], embedding: &[f32]) -> Result<(), CacheError>;

    /// Remove cached embedding
    fn delete(&self, path: &Path) -> Result<(), CacheError>;

    /// Check if this cache backend works for the given path
    fn is_supported(&self, path: &Path) -> bool;
}

/// Auto-detect best cache backend for a path
pub fn get_cache_for_path(path: &Path) -> Box<dyn EmbeddingCache> {
    #[cfg(windows)]
    {
        if ads_windows::AdsCache::is_supported_static(path) {
            return Box::new(ads_windows::AdsCache::new());
        }
    }

    #[cfg(unix)]
    {
        if xattr_unix::XattrCache::is_supported_static(path) {
            return Box::new(xattr_unix::XattrCache::new());
        }
    }

    // Fallback: pure JIT (no caching)
    Box::new(null::NullCache)
}

#[derive(Debug, thiserror::Error)]
pub enum CacheError {
    #[error("Invalid signature - possible tampering")]
    InvalidSignature,
    #[error("Stale cache - file modified")]
    StaleCache,
    #[error("Model version mismatch")]
    ModelMismatch,
    #[error("Unsupported filesystem")]
    UnsupportedFilesystem,
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}
```

**Implementation - Shared Validator** (`src/storage/validator.rs`):

```rust
use ring::{hmac, digest};
use half::f16;

const VERSION_SIGNED: u8 = 2;
const EMBEDDING_DIMS: usize = 64;

pub struct MetadataValidator {
    hmac_key: hmac::Key,
    model_fingerprint: [u8; 32],
}

impl MetadataValidator {
    pub fn new(key_bytes: &[u8; 32], model_fingerprint: [u8; 32]) -> Self {
        Self {
            hmac_key: hmac::Key::new(hmac::HMAC_SHA256, key_bytes),
            model_fingerprint,
        }
    }

    /// Create signed binary blob from embedding
    pub fn sign(&self, embedding: &[f32], file_hash: &[u8; 32]) -> Vec<u8> {
        let mut payload = Vec::with_capacity(225);

        payload.push(VERSION_SIGNED);
        payload.extend_from_slice(&self.model_fingerprint);
        payload.extend_from_slice(file_hash);

        for val in embedding.iter().take(EMBEDDING_DIMS) {
            let f16_val = f16::from_f32(*val);
            payload.extend_from_slice(&f16_val.to_le_bytes());
        }

        let signature = hmac::sign(&self.hmac_key, &payload);
        payload.extend_from_slice(signature.as_ref());

        payload
    }

    /// Verify and decode signed blob
    pub fn verify(&self, data: &[u8], expected_file_hash: &[u8; 32]) -> Result<Vec<f32>, ValidatorError> {
        if data.len() < 225 {
            return Err(ValidatorError::InvalidFormat);
        }

        if data[0] != VERSION_SIGNED {
            return Err(ValidatorError::UnsupportedVersion(data[0]));
        }

        // Check model fingerprint
        if &data[1..33] != self.model_fingerprint {
            return Err(ValidatorError::ModelMismatch);
        }

        // Check file hash
        if &data[33..65] != expected_file_hash {
            return Err(ValidatorError::FileHashMismatch);
        }

        // Verify HMAC
        let signature_start = data.len() - 32;
        hmac::verify(&self.hmac_key, &data[..signature_start], &data[signature_start..])
            .map_err(|_| ValidatorError::InvalidSignature)?;

        // Decode embedding
        let mut embedding = Vec::with_capacity(EMBEDDING_DIMS);
        for chunk in data[65..signature_start].chunks(2) {
            embedding.push(f16::from_le_bytes([chunk[0], chunk[1]]).to_f32());
        }

        Ok(embedding)
    }
}

#[derive(Debug, thiserror::Error)]
pub enum ValidatorError {
    #[error("Invalid data format")]
    InvalidFormat,
    #[error("Unsupported version: {0}")]
    UnsupportedVersion(u8),
    #[error("Model version mismatch")]
    ModelMismatch,
    #[error("File hash mismatch")]
    FileHashMismatch,
    #[error("Invalid signature")]
    InvalidSignature,
}
```

**Platform Support Matrix**:
| Platform | Filesystem | Cache Backend | Notes |
|----------|------------|---------------|-------|
| Windows | NTFS | ADS | Primary target |
| Windows | FAT32/exFAT | NullCache | USB drives |
| Windows | OneDrive | NullCache | Cloud strips ADS |
| Linux | ext4/btrfs | xattr | Full support |
| macOS | APFS | xattr | Full support |
| Network | SMB/NFS | NullCache | Usually no support |

**Tests Required** (`tests/storage_tests.rs`):

- [ ] Validator sign/verify roundtrip
- [ ] Validator rejects tampered data
- [ ] Validator rejects wrong file hash
- [ ] Validator rejects old model version
- [ ] AdsCache roundtrip (Windows only)
- [ ] XattrCache roundtrip (Unix only)
- [ ] Auto-detection picks correct backend
- [ ] NullCache always returns None
- [ ] Performance: <1ms sign/verify

**Acceptance Criteria**:

- Works on Windows NTFS (ADS)
- Works on Linux ext4/btrfs (xattr)
- Gracefully falls back to pure JIT on FAT32/exFAT
- HMAC-SHA256 signed entries
- Model version mismatch triggers regeneration
- File modification triggers regeneration
- Storage overhead: 225 bytes per cached file

---

### P0.2: Constant-Time Embedding Generation

**Status**: `[x]` Complete
**Estimated Time**: 2-3 days
**Dependencies**: P0.1
**Files**: `src/ixos_embed/secure_embedder.rs`, `src/ixos_embed/model.rs`

**Why**: Variable timing leaks content information through timing analysis.

**Update (v0.2.0)**: Timing protection is now **opt-in** via `--secure-timing` flag.

- Default: Fast mode (no timing floor, 4 concurrent embeddings)
- Secure: `--secure-timing` enables 100ms floor + single-threaded

**Implementation**:

```rust
// src/ixos-embed/secure_embedder.rs
use std::time::{Duration, Instant};
use tokio::sync::Semaphore;

/// Secure embedder with constant-time operation and rate limiting
pub struct SecureEmbedder {
    model: Model2Vec,
    rate_limiter: Semaphore,
    min_processing_time: Duration,
    content_size_limit: usize,
}

impl SecureEmbedder {
    pub fn new(model: Model2Vec) -> Self {
        Self {
            model,
            rate_limiter: Semaphore::new(1), // Only 1 concurrent embedding
            min_processing_time: Duration::from_millis(100),
            content_size_limit: 2048, // Normalize to this length
        }
    }

    /// Generate embedding with timing attack protection
    pub async fn embed(&self, content: &str) -> Result<Vec<f32>, EmbedError> {
        // Acquire rate limiter (only 1 at a time)
        let _permit = self.rate_limiter.acquire().await
            .map_err(|_| EmbedError::RateLimited)?;

        let start = Instant::now();

        // Normalize content to constant length
        let normalized = self.normalize_content(content);

        // Generate embedding
        let embedding = self.model.embed(&normalized)?;

        // Enforce minimum processing time (constant-time)
        let elapsed = start.elapsed();
        if elapsed < self.min_processing_time {
            tokio::time::sleep(self.min_processing_time - elapsed).await;
        }

        Ok(embedding)
    }

    /// Normalize content to constant size to prevent length-based timing attacks
    fn normalize_content(&self, content: &str) -> String {
        let mut normalized = content.chars()
            .take(self.content_size_limit)
            .collect::<String>();

        // Pad to constant length with null chars (ignored by model)
        while normalized.len() < self.content_size_limit {
            normalized.push('\0');
        }

        normalized
    }
}

#[derive(Debug, thiserror::Error)]
pub enum EmbedError {
    #[error("Rate limited - too many concurrent requests")]
    RateLimited,
    #[error("Model error: {0}")]
    ModelError(String),
}
```

**Tests Required**:

- [ ] Timing consistency: variance <5ms across different content sizes
- [ ] Rate limiting: concurrent requests blocked
- [ ] Content normalization: output same length regardless of input

**Acceptance Criteria**:

- All embeddings take ≥100ms (constant time floor)
- Max 1 concurrent embedding operation
- Content normalized to fixed 2048 chars

---

### P0.3: Memory Protection

**Status**: `[x]` Complete
**Estimated Time**: 2-3 days
**Dependencies**: None
**Files**: `src/ixos_embed/memory_protection.rs`

**Why**: Sensitive file content in memory can be extracted by malware.

**Implementation**:

```rust
// src/ixos-embed/memory_protection.rs
use zeroize::Zeroize;
use memsec::{mlock, munlock};

/// Secure buffer that locks memory and zeroizes on drop
pub struct SecureBuffer {
    data: Vec<u8>,
    locked: bool,
}

impl SecureBuffer {
    pub fn new(data: Vec<u8>) -> Self {
        let mut buffer = Self { data, locked: false };
        buffer.lock_memory();
        buffer
    }

    /// Lock memory to prevent swapping to disk
    fn lock_memory(&mut self) {
        unsafe {
            if mlock(self.data.as_ptr(), self.data.len()).is_ok() {
                self.locked = true;
            }
        }
    }

    pub fn as_slice(&self) -> &[u8] {
        &self.data
    }

    pub fn as_str(&self) -> Result<&str, std::str::Utf8Error> {
        std::str::from_utf8(&self.data)
    }
}

impl Drop for SecureBuffer {
    fn drop(&mut self) {
        // Zeroize memory before freeing
        self.data.zeroize();

        // Unlock memory
        if self.locked {
            unsafe {
                let _ = munlock(self.data.as_ptr(), self.data.len());
            }
        }
    }
}

/// Secure embedding buffer with automatic cleanup
pub struct SecureEmbeddingBuffer {
    embedding: Vec<f32>,
}

impl SecureEmbeddingBuffer {
    pub fn new(embedding: Vec<f32>) -> Self {
        Self { embedding }
    }

    pub fn as_slice(&self) -> &[f32] {
        &self.embedding
    }
}

impl Drop for SecureEmbeddingBuffer {
    fn drop(&mut self) {
        // Zeroize the embedding data
        for val in &mut self.embedding {
            *val = 0.0;
        }
    }
}

impl Zeroize for SecureEmbeddingBuffer {
    fn zeroize(&mut self) {
        for val in &mut self.embedding {
            *val = 0.0;
        }
    }
}
```

**Tests Required**:

- [ ] Memory zeroed after drop (check with debugger)
- [ ] mlock succeeds on supported systems
- [ ] No memory leaks (valgrind)

**Acceptance Criteria**:

- All file content uses SecureBuffer
- All embeddings use SecureEmbeddingBuffer
- Memory locked when possible (mlock)

---

### P0.4: Adaptive Hybrid Mode

**Status**: `[x]` Complete
**Estimated Time**: 4-5 days
**Dependencies**: P0.2
**Files**: `src/ixos_rank/hybrid_engine.rs`

**Why**: Pathological file patterns can defeat lexical funnel, causing DoS.

**Implementation**:

```rust
// src/ixos-rank/hybrid_engine.rs
use std::time::Instant;

/// Adaptive hybrid search with attack detection
pub struct AdaptiveHybridEngine {
    lexical_engine: LexicalEngine,
    semantic_engine: SemanticEngine,
    attack_threshold: f32,
}

#[derive(Debug)]
struct LexicalStats {
    result_count: usize,
    unique_terms: usize,
    avg_score: f32,
    degradation_score: f32,
}

impl AdaptiveHybridEngine {
    pub fn new(lexical: LexicalEngine, semantic: SemanticEngine) -> Self {
        Self {
            lexical_engine: lexical,
            semantic_engine: semantic,
            attack_threshold: 0.5,
        }
    }

    pub async fn search(&self, query: &str) -> Result<Vec<SearchResult>, SearchError> {
        let start = Instant::now();

        // Phase 1: Lexical search
        let lexical_results = self.lexical_engine.search(query)?;
        let stats = self.analyze_lexical_quality(query, &lexical_results);

        // Attack detection
        if self.detect_degradation_attack(&stats) {
            tracing::warn!("Degradation attack detected: {:?}", stats);
            return self.fallback_strategy(query, &stats).await;
        }

        // Normal hybrid cascade
        let candidates = self.limit_candidates(lexical_results, 500);
        let semantic_results = self.semantic_engine.rerank(query, candidates).await?;

        Ok(semantic_results)
    }

    fn analyze_lexical_quality(&self, query: &str, results: &[LexicalMatch]) -> LexicalStats {
        let query_terms: Vec<&str> = query.split_whitespace().collect();

        // Count how many results contain ALL query terms
        let exact_matches = results.iter()
            .filter(|r| query_terms.iter().all(|t| r.content.contains(t)))
            .count();

        let degradation_score = if results.is_empty() {
            0.0
        } else {
            1.0 - (exact_matches as f32 / results.len() as f32)
        };

        LexicalStats {
            result_count: results.len(),
            unique_terms: query_terms.len(),
            avg_score: results.iter().map(|r| r.score).sum::<f32>() / results.len().max(1) as f32,
            degradation_score,
        }
    }

    fn detect_degradation_attack(&self, stats: &LexicalStats) -> bool {
        // Attack pattern: Many results but poor quality
        stats.result_count > 1000 && stats.degradation_score > self.attack_threshold
    }

    async fn fallback_strategy(&self, query: &str, stats: &LexicalStats) -> Result<Vec<SearchResult>, SearchError> {
        match stats.degradation_score {
            d if d > 0.8 => {
                // Severe attack: Pure semantic with small sample
                tracing::warn!("Severe degradation, using pure semantic mode");
                self.semantic_engine.search_pure(query, 100).await
            }
            d if d > 0.5 => {
                // Moderate attack: Aggressive filter + semantic
                tracing::warn!("Moderate degradation, using aggressive filter");
                let filtered = self.aggressive_filter(query, 50).await?;
                self.semantic_engine.rerank(query, filtered).await
            }
            _ => {
                // Mild: Normal with reduced candidates
                let results = self.lexical_engine.search(query)?;
                let candidates = self.limit_candidates(results, 200);
                self.semantic_engine.rerank(query, candidates).await
            }
        }
    }

    fn limit_candidates(&self, mut results: Vec<LexicalMatch>, max: usize) -> Vec<LexicalMatch> {
        results.truncate(max);
        results
    }

    async fn aggressive_filter(&self, query: &str, max: usize) -> Result<Vec<LexicalMatch>, SearchError> {
        // Use exact phrase matching
        let exact_query = format!("\"{}\"", query);
        let mut results = self.lexical_engine.search(&exact_query)?;
        results.truncate(max);
        Ok(results)
    }
}
```

**Tests Required**:

- [ ] Normal search <2s with 10k files
- [ ] Attack simulation: 10k files with common words, still <3s
- [ ] Fallback triggers correctly on degradation

**Acceptance Criteria**:

- Attack detection triggers when result_count >1000 AND degradation >0.5
- Fallback strategies execute in <3s even under attack
- Normal performance unaffected (<2s)

---

### P0.5: File Watcher Resilience

**Status**: `[x]` Complete
**Estimated Time**: 3-4 days
**Dependencies**: None
**Files**: `src/ixos_watcher/resilience.rs`

**Why**: Rapid file events can exhaust resources (DoS).

**Implementation**:

```rust
// src/ixos-watcher/resilience.rs
use std::collections::{HashMap, HashSet};
use std::time::{Duration, Instant};
use tokio::sync::mpsc;

/// Resilient file watcher with rate limiting and attack detection
pub struct ResilientWatcher {
    event_limiter: EventLimiter,
    dedup_cache: DedupCache,
    symlink_tracker: SymlinkTracker,
    attack_detector: AttackDetector,
}

struct EventLimiter {
    events_per_second: HashMap<EventType, usize>,
    max_per_second: usize,
    window_start: Instant,
}

struct DedupCache {
    recent_events: HashSet<String>,
    window: Duration,
    last_cleanup: Instant,
}

struct SymlinkTracker {
    visited_inodes: HashSet<u64>,
    max_depth: usize,
}

struct AttackDetector {
    event_counts: Vec<(Instant, usize)>,
    threshold: usize,
    window: Duration,
}

impl ResilientWatcher {
    pub fn new() -> Self {
        Self {
            event_limiter: EventLimiter::new(100), // max 100 events/sec
            dedup_cache: DedupCache::new(Duration::from_millis(100)),
            symlink_tracker: SymlinkTracker::new(10), // max 10 levels
            attack_detector: AttackDetector::new(500, Duration::from_secs(1)),
        }
    }

    pub async fn process_event(&mut self, event: FileEvent) -> Option<ProcessedEvent> {
        // Rate limiting
        if !self.event_limiter.allow(&event.event_type) {
            tracing::debug!("Rate limited event: {:?}", event);
            return None;
        }

        // Deduplication
        let event_key = format!("{:?}:{}", event.event_type, event.path.display());
        if !self.dedup_cache.check_and_add(&event_key) {
            tracing::debug!("Duplicate event filtered: {}", event_key);
            return None;
        }

        // Symlink protection
        if event.is_symlink {
            if !self.symlink_tracker.check_depth(&event.path) {
                tracing::warn!("Symlink depth exceeded for: {:?}", event.path);
                return None;
            }
        }

        // Attack detection
        if self.attack_detector.check_attack() {
            tracing::warn!("File watcher attack detected, entering defensive mode");
            self.enter_defensive_mode();
            return None;
        }

        Some(ProcessedEvent::from(event))
    }

    fn enter_defensive_mode(&mut self) {
        // Reduce rate limits
        self.event_limiter.max_per_second = 10;
        // Increase dedup window
        self.dedup_cache.window = Duration::from_secs(1);
    }
}

impl EventLimiter {
    fn new(max_per_second: usize) -> Self {
        Self {
            events_per_second: HashMap::new(),
            max_per_second,
            window_start: Instant::now(),
        }
    }

    fn allow(&mut self, event_type: &EventType) -> bool {
        // Reset window if needed
        if self.window_start.elapsed() > Duration::from_secs(1) {
            self.events_per_second.clear();
            self.window_start = Instant::now();
        }

        let count = self.events_per_second.entry(event_type.clone()).or_insert(0);
        if *count >= self.max_per_second {
            return false;
        }

        *count += 1;
        true
    }
}

impl DedupCache {
    fn new(window: Duration) -> Self {
        Self {
            recent_events: HashSet::new(),
            window,
            last_cleanup: Instant::now(),
        }
    }

    fn check_and_add(&mut self, key: &str) -> bool {
        // Cleanup if window passed
        if self.last_cleanup.elapsed() > self.window {
            self.recent_events.clear();
            self.last_cleanup = Instant::now();
        }

        if self.recent_events.contains(key) {
            return false;
        }

        self.recent_events.insert(key.to_string());
        true
    }
}
```

**Tests Required**:

- [ ] Rate limiting: >100 events/sec blocked
- [ ] Dedup: same event within 100ms filtered
- [ ] Symlink: infinite loop detected and stopped
- [ ] Attack detection: 500+ events/sec triggers defensive mode

**Acceptance Criteria**:

- Max 100 events/sec per type
- 100ms dedup window
- Max 10 symlink levels
- Infinite symlink recursion handled gracefully

---

### Utility: Sandbox Mode

**Status**: `[x]` Complete
**Dependencies**: None
**Files**: `src/security/sandbox.rs`

**Why**: Users may want to restrict file operations to specific directories for testing or security.

**Features**:

- Path validation with canonicalization (prevents symlink/traversal escapes)
- Configurable allowed directories
- Read-only mode option (allow reads anywhere, restrict writes)
- `SandboxedOps` trait for easy integration
- CLI flag: `--sandbox <directory>`

**Implementation**:

```rust
// Create a sandbox for testing
let config = SandboxConfig::for_testing(Path::new("./dataset"));
let sandbox = Sandbox::new(config)?;

// Validate paths before operations
sandbox.validate_path(&file_path)?;
sandbox.validate_read(&file_path)?;
sandbox.validate_write(&file_path)?;
```

---

### P0.6: Secure Ranking

**Status**: `[x]` Complete
**Estimated Time**: 3-4 days
**Dependencies**: P0.1, P0.4
**Files**: `src/ixos_rank/secure_ranker.rs`

**Why**: Attackers can manipulate search rankings through timing and file operations.

**Implementation**:

```rust
// src/ixos-rank/secure_ranker.rs
use std::collections::HashMap;
use std::time::{Duration, Instant, SystemTime};

/// Tamper-resistant ranking with integrity verification
pub struct SecureRanker {
    integrity_cache: HashMap<PathBuf, FileIntegrity>,
    behavior_model: UserBehaviorModel,
}

struct FileIntegrity {
    content_hash: [u8; 32],
    last_verified: Instant,
}

impl SecureRanker {
    pub fn new() -> Self {
        Self {
            integrity_cache: HashMap::new(),
            behavior_model: UserBehaviorModel::new(),
        }
    }

    /// Rank files with integrity and behavioral scoring
    pub fn rank(&mut self, query: &str, candidates: Vec<Candidate>) -> Vec<RankedResult> {
        let mut results = Vec::new();

        for candidate in candidates {
            // Skip files that fail integrity check
            if !self.verify_integrity(&candidate.path) {
                tracing::warn!("Integrity check failed: {:?}", candidate.path);
                continue;
            }

            // Calculate composite score
            let semantic_score = candidate.similarity;
            let integrity_score = self.calculate_integrity_score(&candidate.path);
            let temporal_score = self.calculate_temporal_score(&candidate.path);
            let behavior_score = self.behavior_model.get_score(&candidate.path, query);

            // Weighted combination
            let final_score =
                semantic_score * 0.4 +
                integrity_score * 0.3 +
                temporal_score * 0.1 +
                behavior_score * 0.2;

            results.push(RankedResult {
                path: candidate.path,
                score: final_score,
                integrity_verified: true,
            });
        }

        // Sort by final score
        results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));

        results
    }

    fn verify_integrity(&mut self, path: &Path) -> bool {
        // Check cache (5 min TTL)
        if let Some(integrity) = self.integrity_cache.get(path) {
            if integrity.last_verified.elapsed() < Duration::from_secs(300) {
                return true;
            }
        }

        // Calculate fresh hash
        let content = match std::fs::read(path) {
            Ok(c) => c,
            Err(_) => return false,
        };

        let hash = ring::digest::digest(&ring::digest::SHA256, &content);

        self.integrity_cache.insert(path.to_path_buf(), FileIntegrity {
            content_hash: hash.as_ref().try_into().unwrap(),
            last_verified: Instant::now(),
        });

        true
    }

    fn calculate_integrity_score(&self, path: &Path) -> f32 {
        let metadata = match std::fs::metadata(path) {
            Ok(m) => m,
            Err(_) => return 0.0,
        };

        let now = SystemTime::now();
        let modified = metadata.modified().unwrap_or(now);
        let created = metadata.created().unwrap_or(now);

        // Files with suspicious timing patterns get lower scores
        let time_since_modified = now.duration_since(modified).unwrap_or_default();

        if time_since_modified < Duration::from_secs(300) {
            0.3 // Recently modified - potentially manipulated
        } else if created == modified {
            0.1 // Created and modified at same time - suspicious
        } else {
            1.0 // Normal
        }
    }

    fn calculate_temporal_score(&self, path: &Path) -> f32 {
        // Older, stable files score higher
        let metadata = match std::fs::metadata(path) {
            Ok(m) => m,
            Err(_) => return 0.0,
        };

        let age = SystemTime::now()
            .duration_since(metadata.created().unwrap_or(SystemTime::now()))
            .unwrap_or_default();

        // Max score at 30 days
        (age.as_secs() as f32 / (30 * 24 * 3600) as f32).min(1.0)
    }
}
```

**Tests Required**:

- [x] Integrity check catches tampering
- [x] Temporal scoring penalizes recently modified files
- [x] Composite scoring produces expected rankings

**Acceptance Criteria**:

- [x] Files failing integrity check are excluded
- [x] Recently modified files (<5 min) get reduced scores
- [x] Bot-like access patterns detected and penalized

---

## P1: Legal Compliance (Regulatory Blockers)

> **Note**: Implement after P0 is 100% complete. Required for enterprise sales.

### P1.1: EU AI Act Transparency Layer

**Status**: `[x]` Complete
**Estimated Time**: 2-3 days
**Dependencies**: P0 complete
**Files**: `src/compliance/transparency.rs`, `src/compliance/consent.rs`
**Deadline**: August 2026

**Implementation**:

```rust
// src/compliance/transparency.rs

/// EU AI Act transparency compliance
pub struct TransparencyLayer {
    disclosure_shown: bool,
    consent_given: bool,
    consent_timestamp: Option<DateTime<Utc>>,
}

impl TransparencyLayer {
    /// Must be called before first AI operation
    pub async fn ensure_compliance(&mut self, ui: &mut dyn UIHandle) -> Result<(), ComplianceError> {
        if !self.disclosure_shown {
            let disclosure = AIDisclosure {
                title: "AI-Powered Search",
                description: "Ixos uses artificial intelligence to understand the meaning of your files.",
                data_processing: vec![
                    "Generating semantic embeddings from file content",
                    "Calculating similarity scores for ranking",
                    "All processing happens locally on your device",
                ],
                data_storage: "No file content is sent to external servers",
            };

            ui.show_modal(disclosure).await?;
            self.disclosure_shown = true;
        }

        if !self.consent_given {
            let consent = ui.request_consent(
                "Do you consent to AI-powered search?",
                "You can withdraw consent anytime in Settings."
            ).await?;

            if !consent {
                return Err(ComplianceError::ConsentRequired);
            }

            self.consent_given = true;
            self.consent_timestamp = Some(Utc::now());
            self.persist_consent()?;
        }

        Ok(())
    }

    pub fn withdraw_consent(&mut self) -> Result<(), ComplianceError> {
        self.consent_given = false;
        self.consent_timestamp = None;
        self.persist_consent()?;
        Ok(())
    }
}
```

**Acceptance Criteria**:

- [x] AI disclosure shown on first search (CLI prompt)
- [x] User must actively type "y" before search proceeds
- [x] Consent can be withdrawn with `ixos compliance consent --withdraw`
- [x] Consent state persisted across sessions (HMAC-signed records)

---

### P1.2: GDPR Data Subject Rights

**Status**: `[x]` Complete
**Estimated Time**: 4-5 days
**Dependencies**: P0 complete
**Files**: `src/compliance/gdpr.rs`, `src/compliance/search_history.rs`

**Implementation**:

```rust
// src/compliance/gdpr.rs

/// GDPR Article 15-22 compliance
pub struct GDPRLayer {
    data_store: DataStore,
}

impl GDPRLayer {
    /// Article 15: Right of access
    pub async fn handle_access_request(&self, user_id: &str) -> Result<UserData, GDPRError> {
        let data = self.data_store.get_user_data(user_id)?;
        Ok(UserData {
            search_history: data.search_history,
            cached_embeddings: data.embedding_count, // Count only, not actual embeddings
            preferences: data.preferences,
            consent_records: data.consent_records,
            // No file content - we don't store that
        })
    }

    /// Article 17: Right to erasure
    pub async fn handle_deletion_request(&self, user_id: &str, scope: DeletionScope) -> Result<DeletionReport, GDPRError> {
        match scope {
            DeletionScope::SearchHistory => {
                self.data_store.delete_search_history(user_id)?;
            }
            DeletionScope::CachedEmbeddings => {
                self.clear_all_xattr_caches()?;
            }
            DeletionScope::All => {
                self.data_store.delete_all_user_data(user_id)?;
                self.clear_all_xattr_caches()?;
            }
        }

        Ok(DeletionReport {
            completed_at: Utc::now(),
            scope,
        })
    }

    /// Article 20: Right to data portability
    pub async fn handle_portability_request(&self, user_id: &str) -> Result<PathBuf, GDPRError> {
        let data = self.handle_access_request(user_id).await?;
        let json = serde_json::to_string_pretty(&data)?;

        let export_path = tempfile::Builder::new()
            .prefix("ixos_export_")
            .suffix(".json")
            .tempfile()?
            .path()
            .to_path_buf();

        std::fs::write(&export_path, json)?;
        Ok(export_path)
    }
}
```

**Acceptance Criteria**:

- [x] `ixos compliance gdpr access` returns all user data in JSON
- [x] `ixos compliance gdpr erase` removes specified data
- [x] `ixos compliance gdpr export` produces machine-readable JSON
- [x] All requests logged for audit (JSONL audit trail)

---

### P1.3: CCPA Consumer Rights

**Status**: `[x]` Complete
**Estimated Time**: 3-4 days
**Dependencies**: P0 complete
**Files**: `src/compliance/ccpa.rs`

**Implementation**: Similar to GDPR but with California-specific requirements (know, delete, opt-out, portability, plus "Do Not Sell" registry even though Ixos doesn't sell data).

**Acceptance Criteria**:

- [x] `ixos compliance ccpa know/delete/opt-out` commands implemented
- [x] "Do Not Sell" notice via `ixos compliance ccpa notice`
- [x] Identity verification (device-based for local app)
- [x] 45-day deadline tracking in DataSubjectRequest

---

### P1.4: Technical Documentation System

**Status**: `[x]` Complete
**Estimated Time**: 2-3 days
**Dependencies**: P0 complete
**Files**: `src/compliance/documentation.rs`

**Implementation**:

```rust
// src/compliance/documentation.rs

/// EU AI Act Article 11 compliance - technical documentation
#[derive(Debug, Serialize, Deserialize)]
pub struct TechnicalDocumentation {
    pub model_info: ModelInfo,
    pub capabilities: Vec<Capability>,
    pub limitations: Vec<Limitation>,
    pub performance_metrics: PerformanceMetrics,
    pub version: String,
    pub last_updated: DateTime<Utc>,
}

impl TechnicalDocumentation {
    pub fn generate() -> Self {
        Self {
            model_info: ModelInfo {
                name: "Model2Vec Potion Base 8M".into(),
                version: "1.0".into(),
                parameters: 8_000_000,
                embedding_dimensions: 64,
                quantization: "int8".into(),
                training_data: "Publicly available text corpora".into(),
                license: "Apache 2.0".into(),
            },
            capabilities: vec![
                Capability {
                    name: "Semantic file search".into(),
                    supported_types: vec!["txt", "md", "json"].into_iter().map(String::from).collect(),
                    max_file_size_mb: 10,
                    languages: vec!["English".into()],
                },
            ],
            limitations: vec![
                Limitation {
                    name: "Language support".into(),
                    description: "Currently English only".into(),
                    mitigation: "Multilingual model planned for v2".into(),
                },
                Limitation {
                    name: "Large files".into(),
                    description: "Files >10MB processed in chunks".into(),
                    mitigation: "Chunked processing with semantic aggregation".into(),
                },
            ],
            performance_metrics: PerformanceMetrics {
                p50_latency_ms: 1000,
                p95_latency_ms: 2000,
                accuracy_at_k: 0.85,
                memory_usage_mb: 150,
            },
            version: env!("CARGO_PKG_VERSION").into(),
            last_updated: Utc::now(),
        }
    }

    pub fn export(&self, path: &Path) -> Result<(), std::io::Error> {
        let json = serde_json::to_string_pretty(self)?;
        std::fs::write(path, json)
    }
}
```

**Acceptance Criteria**:

- [x] Auto-generated via `TechnicalDocumentation::generate()`
- [x] Exported via `ixos compliance docs --output <path>`
- [x] Version from CARGO_PKG_VERSION, auto-updates
- [x] Machine-readable (JSON) and human-readable (Markdown)

---

## P2: Core Product Features (MVP Requirements)

> **Note**: Implement after P0+P1 complete. This makes the product usable.

### P2.1: Progressive Search Engine

**Status**: `[ ]` Not started  
**Estimated Time**: 5-6 days  
**Dependencies**: P0.4  
**Files**: `src/ixos-rank/progressive.rs`, UI components

**Implementation**:

```rust
// Progressive search with immediate feedback
pub struct ProgressiveSearchEngine {
    lexical: LexicalEngine,
    semantic: SemanticEngine,
}

#[derive(Debug, Clone)]
pub enum SearchEvent {
    LexicalResults(Vec<LexicalMatch>),    // Sent at ~50ms
    Status(String),                        // "Understanding meaning..."
    SemanticResults(Vec<SemanticMatch>),  // Sent at ~1500ms
    Complete,
}

impl ProgressiveSearchEngine {
    pub async fn search(&self, query: String, tx: mpsc::Sender<SearchEvent>) -> Result<(), SearchError> {
        // Phase 1: Lexical (immediate)
        let lexical = self.lexical.search(&query)?;
        tx.send(SearchEvent::LexicalResults(lexical.clone())).await?;

        // Phase 2: Semantic (background)
        tx.send(SearchEvent::Status("Understanding meaning...".into())).await?;

        let semantic = self.semantic.rerank(&query, lexical).await?;
        tx.send(SearchEvent::SemanticResults(semantic)).await?;

        tx.send(SearchEvent::Complete).await?;
        Ok(())
    }
}
```

**UI Requirements**:

- Lexical results appear in <100ms
- "Understanding meaning..." indicator during semantic phase
- Results fade/reorder when semantic completes
- "Search complete" indicator

**Acceptance Criteria**:

- [ ] Lexical results visible in <100ms
- [ ] Semantic results in <2s total
- [ ] Smooth UI transitions
- [ ] Cancel button works mid-search

---

### P2.2: CLI Interface (Unix Philosophy)

**Status**: `[ ]` Not started  
**Estimated Time**: 4-5 days  
**Dependencies**: P0 complete  
**Files**: `src/main.rs`, `src/cli/mod.rs`

**Implementation**:

```rust
// src/main.rs
use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "ixos")]
#[command(about = "Privacy-first semantic file search")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Search files semantically
    Search {
        /// Search query
        query: String,

        /// Max results
        #[arg(short, long, default_value = "20")]
        limit: usize,

        /// Output format
        #[arg(short, long, default_value = "human")]
        format: OutputFormat,

        /// Search directory
        #[arg(short, long)]
        dir: Option<PathBuf>,

        /// JSON output (shorthand for --format json)
        #[arg(long)]
        json: bool,
    },

    /// Index directory for faster search
    Index {
        /// Directories to index
        dirs: Vec<PathBuf>,

        /// Use xattr caching
        #[arg(long)]
        use_xattr: bool,
    },

    /// Show/set configuration
    Config {
        #[arg(short, long)]
        get: Option<String>,

        #[arg(short, long)]
        set: Option<String>,
    },

    /// Run background daemon
    Daemon,

    /// Show version and diagnostics
    Version {
        #[arg(long)]
        verbose: bool,
    },
}

#[derive(Clone, Copy, Debug, Default, clap::ValueEnum)]
enum OutputFormat {
    #[default]
    Human,
    Json,
    Csv,
    Ripgrep,  // Compatible with rg output
}
```

**Usage Examples**:

```bash
# Basic search
ixos search "quarterly report"

# JSON output for scripting
ixos search "api docs" --json | jq '.results[0].path'

# Pipe to fzf
ixos search "" | fzf --preview 'head -20 {}'

# Index with caching
ixos index ~/Documents --use-xattr

# Vim integration
:!ixos search "%" --format vim
```

**Acceptance Criteria**:

- [ ] All commands work without GUI
- [ ] JSON output parseable
- [ ] fzf integration works (`ixos search "" | fzf`)
- [ ] Config file at ~/.config/ixos/config.toml

---

### P2.3: Performance Optimization

**Status**: `[x]` Complete  
**Estimated Time**: 3-4 days  
**Dependencies**: P0 complete  
**Files**: `src/optimization/mod.rs`

**Implementation**:

```rust
pub struct PerformanceOptimizer {
    system_specs: SystemSpecs,
    profile: PerformanceProfile,
}

impl PerformanceOptimizer {
    pub fn detect_and_configure() -> Self {
        let specs = SystemSpecs::detect();
        let profile = match specs.available_ram_gb {
            r if r < 4 => PerformanceProfile::LowSpec,
            r if r < 8 => PerformanceProfile::MidSpec,
            _ => PerformanceProfile::HighSpec,
        };

        Self { system_specs: specs, profile }
    }

    pub fn apply(&self, config: &mut IxosConfig) {
        match self.profile {
            PerformanceProfile::LowSpec => {
                config.model = "model2vec_tiny_2M";
                config.batch_size = 10;
                config.use_xattr = false;
                config.max_concurrent_embeds = 1;
            }
            PerformanceProfile::MidSpec => {
                config.model = "model2vec_base_8M";
                config.batch_size = 50;
                config.use_xattr = true;
                config.max_concurrent_embeds = 2;
            }
            PerformanceProfile::HighSpec => {
                config.model = "model2vec_base_8M";
                config.batch_size = 100;
                config.use_xattr = true;
                config.max_concurrent_embeds = 4;
                config.cache_warming = true;
            }
        }
    }
}
```

**Acceptance Criteria**:

- [ ] Auto-detects system specs on first run
- [ ] Low-spec mode works on 4GB RAM
- [ ] High-spec mode utilizes available resources
- [ ] P95 <3s even on Raspberry Pi 4 with 10k files

---

## P3: Advanced Features (V1 Differentiators)

> **Note**: Implement after MVP launch. These create competitive moats.

### P3.1: Cryptographic Attestation (Legal Timestamp)

**Status**: `[x]` Complete  
**Estimated Time**: 5-6 days  
**Dependencies**: P0 complete  
**Files**: `src/attestation/mod.rs`

**Implementation**: ✅ Complete and tested

```rust
pub struct AttestationService {
    signing_key: ed25519_dalek::SigningKey,
}

#[derive(Serialize)]
pub struct Attestation {
    pub file_hash: [u8; 32],
    pub embedding_hash: [u8; 32],
    pub model_fingerprint: [u8; 32],
    pub timestamp: i64,
    pub hardware_id: String,
    pub signature: [u8; 64],
}

impl AttestationService {
    pub fn create_attestation(&self, file_path: &Path, embedding: &[f32]) -> Result<Attestation, AttestationError> {
        let file_content = std::fs::read(file_path)?;
        let file_hash = ring::digest::digest(&ring::digest::SHA256, &file_content);

        let embedding_bytes: Vec<u8> = embedding.iter()
            .flat_map(|f| f.to_le_bytes())
            .collect();
        let embedding_hash = ring::digest::digest(&ring::digest::SHA256, &embedding_bytes);

        let timestamp = chrono::Utc::now().timestamp();
        let hardware_id = self.get_hardware_id()?;

        let mut attestation = Attestation {
            file_hash: file_hash.as_ref().try_into().unwrap(),
            embedding_hash: embedding_hash.as_ref().try_into().unwrap(),
            model_fingerprint: self.get_model_fingerprint(),
            timestamp,
            hardware_id,
            signature: [0u8; 64],
        };

        // Sign the attestation
        let payload = self.serialize_for_signing(&attestation);
        let signature = self.signing_key.sign(&payload);
        attestation.signature = signature.to_bytes();

        Ok(attestation)
    }

    pub fn export_ediscovery(&self, attestations: &[Attestation]) -> Result<PathBuf, AttestationError> {
        // Export in Relativity-compatible format
        // ...
    }
}
```

**Acceptance Criteria**:

- [x] Ed25519 signatures on file+embedding+timestamp
- [x] Hardware ID for forensic validation
- [x] eDiscovery export (Relativity, Concordance formats)
- [x] Verification tool included

---

### P3.2: Journalist Mode

**Status**: `[x]` Complete  
**Estimated Time**: 3-4 days  
**Dependencies**: P0.3  
**Files**: `src/journalist_mode.rs`

**Features**: ✅ All implemented and tested

- `--journalist-mode` CLI flag
- Memory-only caching (no disk)
- Auto-clear after each search
- Emergency clear hotkey (Ctrl+Shift+Delete)
- Secure wipe on exit

**Acceptance Criteria**:

- [x] No forensic artifacts after search
- [x] Emergency clear works instantly
- [x] Verified with memory forensics tools

---

### P3.3: Academic Integration

**Status**: `[x]` Complete  
**Estimated Time**: 2-3 days  
**Dependencies**: P2.2  
**Files**: `src/integrations/academic.rs`

**Features**: ✅ All implemented and tested

- Export to Zotero CSV
- Export to Mendeley XML
- DOI/author/title extraction from papers
- Citation-based similarity

**Acceptance Criteria**:

- [x] Zotero import works
- [x] Mendeley import works
- [x] Metadata extraction >90% accuracy on PDFs

---

### P3.4: Enterprise Deployment

**Status**: `[x]` Complete  
**Estimated Time**: 4-5 days  
**Dependencies**: P0+P1 complete  
**Files**: `scripts/deploy_enterprise.sh`, installers

**Deliverables**: ✅ All implemented and tested

- MSI installer (Windows)
- PKG installer (macOS)
- DEB/RPM packages (Linux)
- Silent installation support
- ADMX group policy templates
- MDM configuration profiles

**Acceptance Criteria**:

- [x] Silent install works (`ixos.msi /quiet`)
- [x] Group policy configurable
- [x] MDM deployable

---

P4: Desktop Application & Intelligent Search

    Strategic Goal: Transform Ixos from CLI tool to product while preserving the CLI foundation. Add cognitive search capabilities through local LLM integration.

P4.0: Cross-Platform Desktop UI (Tauri)
Status: [x] Complete
Estimated Time: 4-5 days
Dependencies: P0-P2 complete
Key Files: src-tauri/, ui/

**Implementation Notes**:
- Built with Tauri v2 + React 18 + TypeScript + Tailwind CSS
- Global hotkey: Ctrl+Space (via tauri-plugin-global-shortcut)
- Dark theme with purple/indigo security accent colors
- Progressive search with streaming events (SearchEvent -> window.emit)
- Full keyboard navigation (arrows, Enter, Esc, Ctrl+Enter for reveal)
- Journalist mode with emergency clear (Ctrl+Shift+Delete)
- Settings panel with Search, Privacy, Compliance tabs
- System tray with menu (Search, Settings, Quit)
Architecture Philosophy:

    Thin UI layer: React handles presentation only, all logic remains in Rust
    State management: Local JSON file for settings (no database required)
    Streaming results: Real-time lexical → semantic progression
    Native performance: <16ms overlay render, <150MB idle memory

Core Components:

    System tray daemon: Persistent background process with global hotkey
    Search overlay: Floating window, always-on-top, transparent
    Settings pane: JSON-based configuration (no external dependencies)
    Tauri bridge: Command routing and stream serialization

Critical Implementation Decisions:

    Hotkey registration: Platform-specific
        Windows: RegisterHotKey API
        macOS: CGEventTap (requires accessibility permissions)
        Linux: XGrabKey (X11) or portal API (Wayland)
    Window management: Must restore focus to previous application after search
    Result streaming: Use tokio::sync::mpsc with Tauri's window.emit()
    Accessibility: ARIA labels required for screen readers

Acceptance Criteria:

    Overlay appears in <16ms after hotkey press
    Lexical results stream to UI in <50ms
    Semantic results update without flicker
    Memory usage <150MB at idle
    Single binary distribution (<50MB total)
    Works on Windows 10+, macOS 12+, Ubuntu 20.04+

Platform-Specific Notes:

    Windows: Use windows-sys crate for ADS and hotkey integration
    macOS: Requires code signing for notarization ($99/year Apple Developer Account)
    Linux: Wayland may not support global hotkeys; fallback to manual key registration

P4.1: LLM Query Intelligence
Status: [ ] Not Started
Estimated Time: 5-6 days
Dependencies: P4.0 (optional LLM UI toggle)
Key Files: src/ixos_llm/, prompts/
Architecture: "Search Agent" Pattern

Natural Language Query → LLM Decomposer → Parallel Search Strategies → 
Result Fusion → LLM Reranking → Answer Extraction (optional)

Core Components:

    Query Decomposer: Converts natural language into structured search strategies
        Temporal parsing ("last quarter" → date ranges)
        Concept expansion ("money earned" → ["revenue", "profit"])
        Strategy selection (lexical vs semantic vs hybrid)
    Strategy Orchestrator: Executes multiple searches in parallel
        Distributes work across CPU cores via tokio::spawn
        Streams results back for progressive UI updates
        Merges with weighted scoring
    LLM Reranker: Re-scores top-K results based on query intent
        Runs on top 50 candidates only (performance constraint)
        Uses function calling for structured output
        Improves NDCG@10 by target 15%
    Answer Extractor: For direct questions, extracts specific values
        "How much?" → numeric extraction
        "When?" → date extraction
        "Who?" → entity extraction

Model Selection:

    Default: Phi-3-mini-4k-q4.gguf (2.3GB, 4GB RAM required)
    Fallback: SmolLM2-360M-q4.gguf (800MB, 2GB RAM required)
    Quantization: Q4_0 for speed, Q8_0 for accuracy (configurable)

Critical Prompt Engineering:

    System prompt must enforce 100% valid JSON output
    Temperature 0.1 for deterministic parsing
    Include 3-shot examples in prompt for consistency
    Escape user input to prevent prompt injection

Performance Targets:

    Query decomposition: <500ms on i5/8GB
    LLM reranking: <800ms for 50 candidates
    Total LLM overhead: <2s per search (parallelized)
    Memory with LLM loaded: <500MB total

Failure Modes:

    LLM not downloaded → graceful fallback to hybrid search
    LLM OOM → auto-unload and notify user
    Invalid JSON → retry once, then fallback

Acceptance Criteria:

    Query "How much money in Q4?" → finds "Q4-Financial-Summary.pdf"
    Extraction returns "€450K" from snippet
    No cloud API calls under any circumstances
    Model auto-downloads from Hugging Face (with consent prompt)
    Works offline after initial download

P4.2: Advanced File Type Parsing
Status: [ ] Not Started
Estimated Time: 3-4 days
Dependencies: None (parallel with P4.1)
Key Files: src/parsers/
Streaming-Only Philosophy: Never load entire file. Cap at 10KB text extracted.
File Type Strategy:
Type	Parser	Performance Target	Notes
PDF	pdfium-render	<50ms for 5 pages	Skip OCR, extract text only
DOCX	zip + XML parsing	<30ms	Extract word/document.xml only
XLSX	calamine crate	<40ms	Read first sheet only
Code	tree-sitter	<20ms	Extract functions/classes only
Key Decisions:

    PDF: Parse first 5 pages only (most content)
    DOCX: No style information extracted
    Code: AST parsing for semantic blocks, not full text
    All: Cap extracted text at 10KB (~2k tokens)

Parser Registry Pattern:

    Extensible registration system
    Fallback to binary file warning
    Graceful error handling (skip, log, notify)

Acceptance Criteria:

    PDF parsing adds <100ms to search time
    DOCX parsing adds <50ms to search time
    Code parsing identifies function boundaries >90% accuracy
    Binary files skipped with silent warning (journalist mode: no warning)
    No memory usage spikes on large files

P4.3: Multilingual Support
Status: [ ] Not Started
Estimated Time: 2-3 days
Dependencies: P4.2 (model switching)
Key Files: src/lang_detect.rs, src/ixos_embed/multilingual.rs
Implementation Approach:

    Language detection: Use lingua-rs crate (fast, accurate)
    Detection threshold: Minimum 50 characters for reliable detection
    Default language: English if detection uncertain
    Model: Switch to potion-base-8M-multilingual for non-English
        Same 8M parameters, slightly slower but universal
        Avoids model loading overhead per query

Performance Considerations:

    Detection latency: <1ms per file
    Model switch latency: <50ms (if needed)
    No regression on English queries

Testing Requirements:

    German: "Finanzbericht" finds "Q4-Financial-Summary.pdf"
    French: "revenu trimestriel" finds same
    Mixed-language documents: Use primary language

Acceptance Criteria:

    Detection accuracy >90% on 100-sample corpus
    Search quality comparable across EN/DE/FR
    No user-visible language selection (automatic)

P4.4: Network Drive Support (SMB)
Status: [ ] Not Started
Estimated Time: 1-2 days
Dependencies: P0.1 (xattr fallback)
Key Files: src/network/smb.rs
Design Philosophy: Conservative support only. Performance disclaimers required.
Implementation:

    Auto-detection: smb://, \\UNC\paths, //server/share
    Forced JIT mode: No xattr caching on network paths
    Performance warning: "Network drive: searches may be slower"
    Pro tier gating: CLI works, UI shows upgrade prompt

Rationale:

    SMB latency unpredictable (10ms-1000ms)
    Network filesystems often lack xattr support
    Enterprise users expect this, but it's not MVP-critical

Acceptance Criteria:

    Network path detection works on all platforms
    Search completes (even if slow)
    Clear user communication about performance expectations
    No crashes on network disconnection

P5: Protocol & Ecosystem
P5.0: Ixos Protocol IETF Submission
Status: [ ] Not Started
Estimated Time: 6-7 days
Dependencies: All P4 complete
Key Files: docs/rfc/ixos-protocol.md
Purpose: Formalize protocol for third-party implementations. Creates ecosystem moat.
Specification Structure:

    Overview: Zero-storage semantic search standard
    Storage Modes: JIT, xattr, hybrid (MUST/SHOULD/MAY)
    Embedding Format: Binary spec with HMAC signatures
    Query API: REST-like interface definition
    Security: Threat model and mitigation requirements
    Compliance: GDPR/CCPA/EU AI Act integration
    Portability: Platform-specific behaviors
    Extensibility: Parser plugin system
    Reference Implementation: Link to Rust crate

Key Requirements:

    MUST: Pure JIT mode support
    MUST: HMAC-SHA256 signing for xattr
    SHOULD: LLM-enhanced search (optional)
    MAY: Network drive support

Deliverables:

    Markdown spec in IETF format (xml2rfc compatible)
    JSON Schema for API validation
    Formal threat model document
    Versioning strategy (semantic versioning for protocol)

Acceptance Criteria:

    Specification passes IETF format validation
    At least one third-party contributor reviews
    Protocol version 1.0.0 finalized
    Reference implementation passes all spec tests

P5.1: IDE Extensions
Status: [ ] Not Started
Estimated Time: 6-7 days (3 per IDE)
Dependencies: P5.0 (API stability)
Key Files: extensions/vscode/, extensions/jetbrains/
Strategy: "One IDE deeply, not three shallowly" → Prioritize VSCode (70% market share)
VSCode Extension Features:

    Semantic code search: Find functions by description ("auth logic")
    Results panel: Tree view with file icons and snippets
    Jump-to-definition: Click opens file at correct line
    Context menu: "Search for similar functions"

Implementation Notes:

    Use VSCode's Language Server Protocol for AST integration
    Call local ixos binary via child_process
    Package size <5MB
    Activation time <100ms

JetBrains Plugin (Kotlin):

    Use FileSearchProvider API
    Integrate with "Find Usages" system
    Show results in dedicated tool window

Acceptance Criteria:

    Marketplace listings approved
    Extension activates in <100ms
    Search results display in <500ms
    Jump-to-definition works for code files

P5.2: Enterprise Deployment
Status: [ ] Not Started
Estimated Time: 4-5 days
Dependencies: P4.0 complete
Key Files: scripts/, policies/
Deliverables:

    MSI installer: Silent install support (/quiet)
    macOS PKG: Code-signed and notarized
    Linux: DEB and RPM packages
    Group Policy: ADMX templates for Windows
    MDM: Configuration profiles for macOS/iOS

Group Policy Features:

    Enforce JIT mode organization-wide
    Restrict search to allowed paths
    Disable LLM features (compliance)
    Configure audit logging server

Installation Flow:

    Silent install: msiexec /i ixos.msi /quiet INSTALLDIR="C:\Program Files\Ixos"
    GPO deployment: Automatic via Active Directory
    MDM: Push via Intune, Jamf, or Kandji

Acceptance Criteria:

    Silent install works without user interaction
    GPO settings cannot be overridden by users
    Uninstall removes all traces (no registry debris)
    macOS notarization passes Apple review
    Linux packages pass lintian/rpmlint

Development Command Reference

# P4.0: Tauri Setup
cargo create-tauri-app --rc ui --template react-ts
cd ui && npm install @tauri-apps/api lucide-react
npm install -D @tauri-apps/cli @shadcn/ui

# P4.1: LLM Setup
cargo add llama_cpp_rs --features cuda  # or metal on macOS
cd resources && wget https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4.gguf

# P4.2: PDF Parsing
cargo add pdfium-render --features static
cd resources && wget https://github.com/bblanchon/pdfium-binaries/releases/latest/download/pdfium-linux.tgz

# P4.3: Language Detection
cargo add lingua --no-default-features --features english,german,french,spanish

# Build Installers
cargo install cargo-wix cargo-bundle
cargo wix --output ixos-1.0.0.msi  # Windows
cargo bundle --release  # macOS PKG
cargo deb --release  # Ubuntu/Debian

Priority Ordering for Implementation
Recommended Sequence (Claude Code should follow this order):

    Week 1: P4.0 (Tauri foundation) + P4.2 (parsers, parallelizable)
    Week 2: P4.1 (LLM integration, depends on P4.0 UI toggle)
    Week 3: P4.3 (multilingual, small and isolated)
    Week 4: P4.4 (network drives, optional but quick)
    Week 5: Polish and integration testing
    Week 6-7: P5.0 (protocol spec, documentation)
    Week 8-9: P5.1 (VSCode extension, focus on one IDE)
    Week 10: P5.2 (enterprise installers)

Rationale: Get desktop UI into user hands fast, then layer intelligence. Protocol and ecosystem are long-lead items that don't block shipping.
Competitive Differentiation: The SemTools Gap
Feature	SemTools	Ixos P4+P5	How Ixos Wins
UI	❌ CLI only	✅ Native GUI + tray	99% of users won't touch CLI
LLM	❌ None	✅ Local query parsing	Cognitive search vs dumb vectors
Privacy	⚠️ Unspecified	✅ Journalist mode, HMAC, mlock	Legally defensible, not just claimed
PDF/DOCX	❌ Text only	✅ Streaming parsers	Real-world file coverage
Compliance	❌ None	✅ GDPR/CCPA export	Enterprise sales require this
Ecosystem	❌ Library only	✅ Protocol + IDE plugins	Network effects, switching costs
Core Moat: SemTools is a library. Ixos is a product with a protocol. Libraries don't have protocol moats.
Risk Matrix: What Could Go Wrong
Risk	Probability	Mitigation
Tauri global hotkey fails on Wayland	Medium	Document manual setup, fallback to app launcher
LLM query parsing JSON invalid	Low	Temperature 0.1, retry logic, fallback to hybrid
PDF parser OOM on large documents	Medium	Streaming only, 10KB cap per file
macOS notarization rejected	Low	Code sign with Developer ID, no entitlements needed
VSCode marketplace rejects extension	Low	Follow guidelines, use minimal permissions only

## Testing Requirements

### Latency Benchmarks

```bash
cargo bench --bench search_latency
```

**Targets**:
| Metric | Target | Hardware |
|--------|--------|----------|
| P50 | <1s | i5/8GB |
| P95 | <2s | i5/8GB |
| P99 | <3s | i5/8GB |

### Security Tests

```bash
cargo test --test security_vulnerabilities
cargo fuzz run xattr_parser
```

### Compliance Tests

```bash
cargo test --test compliance_tests
cargo run --bin compliance_report -- --format json
```

### Reliability Tests

- 1M file stress test (100k real + 900k synthetic)
- 10 concurrent searches
- 24h continuous operation (valgrind/miri)
- Sudden shutdown recovery

---

## Development Commands

```bash
# Run all tests
cargo test

# Run benchmarks
cargo bench --bench search_latency

# Check for memory issues
cargo +nightly miri test

# Security audit
cargo audit

# Build release
cargo build --release

# Profile search
cargo flamegraph --bin ixos -- search "test query"

# Generate compliance report
cargo run --bin compliance_report -- --format json

# Fuzz testing
cargo +nightly fuzz run xattr_parser
cargo +nightly fuzz run file_watcher
```

---

## Git Workflow

- `main`: Production-ready (P0+P1+P2 complete, tested)
- `develop`: Integration branch
- `feature/P0.1-xattr-signing`: Feature branches

**PR Requirements**:

1. Reference this roadmap item
2. All tests pass
3. Clippy clean
4. Security audit clean
5. Latency benchmarks met
6. Documentation updated

---

## When You Start a Task

1. Read the relevant section from this roadmap
2. Search project files for related code
3. Search internet for best practices
4. Come back with:
   - Clarifying questions
   - 3 implementation options with pros/cons
   - Recommended approach with reasoning

## When You're Stuck

Don't guess. Ask. Example questions:

- "Should we reject unsigned xattrs or warn and regenerate?"
- "Is 100ms min processing time acceptable or too slow for UX?"
- "Should CLI support piping from stdin or just file search?"
- "Do we need to support FAT32 filesystems (no xattrs)?"

## When You Complete a Task

1. Implementation complete
2. Tests passing (including latency benchmarks)
3. Documentation updated
4. This roadmap updated (mark as complete)
5. Show working demo or test results
6. Ready for review

---

_Last updated: January 2026_
