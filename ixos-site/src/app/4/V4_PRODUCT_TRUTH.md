# V4 Product Truth

All features listed here are verified against source code. No invented claims. Each row cites its implementation source.

---

## Core Search Features

### Progressive Search
- **Claim**: Results stream progressively as stages complete — lexical candidates first, semantic rerank second, locked ranking last.
- **CLI flag**: `--progressive`
- **Source**: `cli/commands.rs` (progressive flag definition), `ixos_rank/hybrid_engine.rs` (stage pipeline)
- **Landing section**: ProgressiveScrollV4 (scroll-scrub stage morph)

### Lexical Candidate Surfacing
- **Claim**: Fast keyword pass surfaces initial file candidates via parallel BM25-style scoring.
- **Source**: `ixos_rank/lexical_engine.rs` — `LexicalEngine`, parallel file scoring with rayon
- **Performance**: Part of <800ms total search time (CLAUDE.md benchmarks)
- **Landing section**: Stage 1 of ProgressiveScrollV4, Stage 1 of V4Hero simulator

### Semantic Rerank
- **Claim**: Embedding-based similarity reranks lexical candidates; can surface files that lack keyword overlap but are semantically related.
- **Source**: `ixos_rank/semantic_engine.rs` — `SemanticEngine`, `ixos_rank/hybrid_engine.rs` — `HybridEngine` with adaptive mode switching
- **Landing section**: Stage 2/3 of V4Hero simulator, ProgressiveScrollV4 stage 2

### Hybrid Adaptive Mode
- **Claim**: Automatically detects degradation attacks and falls back to pure semantic mode.
- **Source**: `ixos_rank/hybrid_engine.rs` — attack detection logic
- **Landing section**: TriadLensV4 (compute tradeoff map)

### Secure Ranking
- **Claim**: Integrity-verified ranking with behavioral scoring.
- **Source**: `ixos_rank/secure_ranker.rs`

---

## Model Tiers (Flash / Auto / Pro)

Verified against `models/lab/CANONICAL_RESULTS.md`.

| Mode | MRR@10 | Latency/1k files | Size | Quantization |
|------|--------|-----------------|------|-------------|
| Flash v2 | 0.8340 | 339ms | 16.6MB | int8 |
| Pro v2 (fusion) | 0.9209 | 430ms | ~102MB | float32 |

- **Source**: `models/lab/CANONICAL_RESULTS.md`
- **Landing section**: V4BenchmarkSection, V4Hero mode chip cycling

### Quantization Policy
- int8: supported, <1% MRR loss — used in Flash mode
- float16: supported natively by Model2Vec
- 4-bit: NOT recommended (5-15% quality loss for minimal size gain)
- **Source**: `docs/models/QUANTIZATION_RESEARCH.md`, MEMORY.md

---

## Storage / Caching Architecture

### NTFS Alternate Data Streams (Windows)
- **Claim**: On Windows NTFS, embeddings are stored in ADS attached to each file — zero separate cache database.
- **Source**: `storage/ads_windows.rs` — `AdsCache` struct
- **Platform**: Windows NTFS only (not FAT32, not cloud drives)

### Extended Attributes (Unix)
- **Claim**: On Linux/macOS, embeddings are stored in xattr metadata on each file.
- **Source**: `storage/xattr_unix.rs` — `XattrCache` struct
- **Platform**: Linux / macOS

### NullCache Fallback
- **Claim**: On unsupported filesystems (FAT32, cloud-mounted drives), falls back gracefully to ephemeral-only mode.
- **Source**: `storage/null.rs` — `NullCache` struct
- **Detection**: `storage/mod.rs` — `get_cache_for_path()` auto-selects backend

### Cache Binary Format
- **Spec**: 225 bytes for 64-dim embedding: `[version:u8][model_fingerprint:32b][file_hash:32b][embedding:128b][signature:32b]`
- **Source**: `storage/mod.rs` (format docs), `storage/validator.rs` (signing logic)

### HMAC-SHA256 Signing
- **Claim**: Every cache entry is signed with HMAC-SHA256; tampered entries are rejected.
- **Source**: `storage/validator.rs` — uses `ring` crate for HMAC
- **Landing section**: V4TechBentoSection (security bento cell)

---

## Security Features

### Ed25519 Cryptographic Attestation
- **Claim**: Search sessions can be attested with Ed25519 signatures for auditability.
- **Source**: `attestation/mod.rs` — `AttestationService`
- **Dependency**: `ed25519-dalek`

### Journalist Mode
- **Claim**: Maximum-privacy search mode; no cache writes, ephemeral memory, maximum timing protection.
- **CLI flag**: `--journalist-mode`
- **Source**: `journalist_mode.rs`

### Secure Timing Protection (Opt-in)
- **Claim**: Optional 100ms timing floor prevents timing side-channel attacks when searching sensitive data.
- **CLI flag**: `--secure-timing`
- **Default behavior**: Fast mode (no floor, 4 concurrent embeddings)
- **Secure mode**: 100ms floor, single-threaded
- **Source**: `ixos_embed/secure_embedder.rs`

### Memory Protection
- **Claim**: `SecureBuffer` uses mlock to prevent embedding data from being swapped to disk; zeroize-on-drop clears it from RAM.
- **Source**: `ixos_embed/memory_protection.rs` — `SecureBuffer`
- **Dependencies**: `zeroize`, `libc` (for mlock on Unix)

### Path Sandbox
- **Claim**: Directory access is validated; symlink traversal and path escape are blocked.
- **Source**: `security/sandbox.rs`

---

## Performance Architecture

### No Background Daemon
- **Claim**: Ixos performs a JIT scan on every query. There is no persistent background service watching your filesystem.
- **Source**: CLI architecture — no daemon subcommand; `ixos_watcher/` is an optional watcher, not a required service
- **Implication**: 0% idle CPU usage

### Parallel File Loading
- **Claim**: File content is loaded in parallel using rayon thread pool.
- **Performance**: ~7ms for 1,000 files
- **Source**: `CLAUDE.md` Performance Benchmarks section, rayon usage throughout `ixos_rank/lexical_engine.rs`

### Total Search Time
- **Claim**: <800ms total search time with stub model across 1,000 files
- **Source**: `CLAUDE.md` Performance Benchmarks

### File Watcher Resilience
- **Claim**: When enabled, the file watcher applies rate limiting (100 events/sec), deduplication, and symlink protection.
- **Source**: `ixos_watcher/resilience.rs`

---

## Privacy Architecture

### Local-First / No Egress
- **Claim**: All computation happens on-device. No API calls are made. No file content, query text, or embeddings leave the machine.
- **Source**: Architecture review — no HTTP client dependencies in core search path; Model2Vec runs locally via `model2vec-rs`

### Cache Mode: Ephemeral
- **Claim**: In ephemeral mode, no embeddings are written to disk; everything lives in RAM for the duration of the search.
- **CLI flag**: `--cache-mode ephemeral`
- **Source**: `cli/config.rs`, `storage/null.rs`

### Cache Mode: NativeCache (Recommended)
- **Claim**: Embeddings are stored in filesystem metadata (ADS / xattr) so subsequent searches reuse them without an index database.
- **CLI flag**: `--cache-mode native-cache`
- **Source**: `cli/config.rs`, `storage/ads_windows.rs`, `storage/xattr_unix.rs`

---

## Compliance

- **EU AI Act**: `compliance/` module
- **GDPR**: `compliance/` module
- **CCPA**: `compliance/` module
- **Source**: `CLAUDE.md` Implementation Status — P1.1–P1.4

---

## Output / CLI Features

| Feature | Flag | Source |
|---------|------|--------|
| JSON output | `--json` | `cli/output.rs` |
| Score breakdown | `--show-scores` | `cli/output.rs` |
| Context snippets | `--context N` | `cli/output.rs` |
| Progressive results | `--progressive` | `cli/commands.rs` |
| Journalist mode | `--journalist-mode` | `journalist_mode.rs` |
| Secure timing | `--secure-timing` | `ixos_embed/secure_embedder.rs` |
| Ephemeral cache | `--cache-mode ephemeral` | `cli/config.rs` |
| Stub model (fast test) | `--stub-model` | `cli/commands.rs` |
