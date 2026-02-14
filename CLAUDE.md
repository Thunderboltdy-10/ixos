# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ixos Protocol is a privacy-first semantic file search library written in Rust. It provides cross-platform embedding caching with cryptographic signing, configurable timing attack protection, and file watching with DoS resilience.

## Build Commands

```cmd
# Build the project
cargo build

# Build release version
cargo build --release

# Run all tests
cargo test

# Run a single test
cargo test <test_name>

# Run the CLI (Windows)
.\target\release\ixos.exe <subcommand>

# Security audit
cargo audit

# Check with clippy
cargo clippy
```

## CLI Usage (Windows)

```cmd
# Search with stub model (fast, no download)
.\target\release\ixos.exe search "query" --dir .\dataset --stub-model

# Search with real Model2Vec
.\target\release\ixos.exe search "query" --dir .\dataset

# Ephemeral mode (maximum privacy)
.\target\release\ixos.exe search "query" --cache-mode ephemeral

# NativeCache mode (recommended)
.\target\release\ixos.exe search "query" --cache-mode native-cache

# Secure timing mode (for sensitive data)
.\target\release\ixos.exe search "query" --secure-timing

# Show score breakdown
.\target\release\ixos.exe search "query" --show-scores

# JSON output
.\target\release\ixos.exe search "query" --json

# Progressive search
.\target\release\ixos.exe search "query" --progressive

# Journalist mode (maximum privacy)
.\target\release\ixos.exe search "query" --journalist-mode

# Context display (snippets)
.\target\release\ixos.exe search "query" --context 3
```

## Architecture

### Module Structure

- **`storage/`** - Cross-platform embedding cache with HMAC-SHA256 signing
  - `mod.rs` - `EmbeddingCache` trait and `get_cache_for_path()` auto-detection
  - `validator.rs` - HMAC signing/verification for cache entries
  - `ads_windows.rs` - Windows NTFS Alternate Data Streams backend
  - `xattr_unix.rs` - Linux/macOS extended attributes backend
  - `null.rs` - Fallback for unsupported filesystems (FAT32, cloud)

- **`ixos_embed/`** - Secure embedding generation
  - `model.rs` - `EmbeddingModel` trait
  - `model2vec.rs` - Model2Vec integration (HuggingFace)
  - `secure_embedder.rs` - Configurable timing protection (default: fast, opt-in: secure)
  - `memory_protection.rs` - `SecureBuffer` with mlock and zeroize-on-drop

- **`ixos_rank/`** - Search ranking engines
  - `lexical_engine.rs` - Keyword-based search with parallel processing (rayon)
  - `semantic_engine.rs` - Embedding similarity search
  - `hybrid_engine.rs` - Adaptive hybrid with attack detection
  - `secure_ranker.rs` - Integrity-verified ranking with behavioral scoring

- **`ixos_watcher/`** - File system monitoring with resilience
  - `events.rs` - `FileEvent`, `ProcessedEvent` types
  - `resilience.rs` - Rate limiting (100 events/sec), dedup, symlink protection

- **`optimization/`** - Performance profiling
  - `mod.rs` - SystemSpecs detection, PerformanceProfile, OptimizedSettings

- **`security/`** - Security primitives
  - `crypto.rs` - Cryptographic operations
  - `sandbox.rs` - Path validation and directory access control

- **`compliance/`** - EU AI Act, GDPR, CCPA compliance

- **`cli/`** - Command-line interface
  - `commands.rs` - CLI command definitions
  - `config.rs` - Configuration management
  - `output.rs` - Output formatters (human, json, csv, ripgrep)

- **`journalist_mode.rs`** - Maximum privacy search mode

- **`attestation/`** - P3.1 Cryptographic Attestation
  - `mod.rs` - AttestationService with Ed25519 signing

### Key Design Patterns

1. **Cache Binary Format** (225 bytes for 64-dim embedding):
   ```
   [version:u8][model_fingerprint:32b][file_hash:32b][embedding:128b][signature:32b]
   ```

2. **Platform Detection**: `get_cache_for_path()` automatically selects ADS (Windows NTFS), xattr (Unix), or NullCache.

3. **Timing Protection** (opt-in with `--secure-timing`):
   - Default: Fast mode - no timing floor, 4 concurrent embeddings
   - Secure: 100ms floor, single-threaded

4. **Attack Detection**: Hybrid search detects degradation attacks and falls back to pure semantic mode.

5. **Parallel Processing**: Rayon for file loading and search (>100 files).

## Platform-Specific Code

Windows-specific code uses `#[cfg(windows)]` and depends on `windows-sys` for ADS access.
Unix-specific code uses `#[cfg(unix)]` and depends on `xattr` and `libc` for extended attributes and mlock.

## Key Dependencies

- `tokio` - Async runtime
- `ring` - HMAC-SHA256 signing
- `ed25519-dalek` - Digital signatures (attestation)
- `zeroize` - Secure memory clearing
- `half` - f16 for compact embedding storage
- `notify` - Cross-platform file watching
- `clap` - CLI parsing
- `sysinfo` - System detection (RAM, CPU)
- `rayon` - Parallel processing
- `model2vec-rs` - Model2Vec embeddings

## Implementation Status

See `IMPLEMENTATION_ROADMAP.md` for detailed progress.

### Complete:
- P0.1: Cross-platform metadata storage
- P0.2: Timing protection (now opt-in via `--secure-timing`)
- P0.3: Memory protection
- P0.4: Adaptive hybrid mode
- P0.5: File watcher resilience
- P0.6: Secure ranking
- P1.1-P1.4: Legal compliance (GDPR, CCPA, EU AI Act)
- P2.1: Progressive search
- P2.2: CLI interface
- P2.3: Performance optimization
- P3.1: Cryptographic Attestation
- P3.2: Journalist Mode

### Performance Benchmarks (1000 files):
- File loading: ~7ms (parallel)
- Total search: <800ms (stub model)
- All tests: 250 passed, 3 ignored
