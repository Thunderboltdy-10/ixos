# Ixos Feature Inventory

Complete list of real desktop + CLI features. Each feature appears **once** across landing sections.
Source paths reference actual implementation files in the repository.

---

## Desktop App Features

### Search Core
| Feature | Description | Source Path |
|---------|-------------|-------------|
| Hybrid Search Engine | Adaptive blend of lexical + semantic retrieval | `src/ixos_rank/hybrid_engine.rs` |
| Lexical Engine | BM25-like keyword matching with parallel processing (rayon) | `src/ixos_rank/lexical_engine.rs` |
| Semantic Engine | Model2Vec embedding similarity | `src/ixos_rank/semantic_engine.rs` |
| Secure Ranker | Integrity-verified ranking with behavioral scoring | `src/ixos_rank/secure_ranker.rs` |
| Progressive Search | 3-stage pipeline: scanning → reranking → locked evidence | `src/ixos_rank/progressive.rs` |
| JIT File Scan | No daemon required; parallel JIT scan on query | `src/ixos_rank/lexical_engine.rs` |
| Attack Detection | Hybrid detects degradation attacks, falls back to pure semantic | `src/ixos_rank/hybrid_engine.rs` |

### Search Modes (Compute Budget)
| Feature | Description | Source Path |
|---------|-------------|-------------|
| Flash Mode | Speed-first: stub model, 339ms/1k files, 16.6MB | `src/ixos_rank/hybrid_engine.rs` |
| Auto Mode | Adaptive routing by query complexity | `src/ixos_rank/hybrid_engine.rs` |
| Pro Mode | Max recall: Model2Vec fusion, 430ms/1k, 102MB | `models/lab/CANONICAL_RESULTS.md` |

### Embedding + Models
| Feature | Description | Source Path |
|---------|-------------|-------------|
| Model2Vec Integration | HuggingFace Model2Vec for local embeddings | `src/ixos_embed/model2vec.rs` |
| Int8 Quantization | <1% MRR loss, compact storage | `docs/models/QUANTIZATION_RESEARCH.md` |
| Secure Embedder | Configurable timing protection (default: fast, opt-in: secure) | `src/ixos_embed/secure_embedder.rs` |
| Memory Protection | SecureBuffer with mlock + zeroize-on-drop | `src/ixos_embed/memory_protection.rs` |

### Storage + Cache
| Feature | Description | Source Path |
|---------|-------------|-------------|
| Cross-Platform Cache | Auto-detects ADS (NTFS), xattr (Unix), NullCache | `src/storage/mod.rs` |
| NTFS ADS Backend | Windows Alternate Data Streams — cache lives in file metadata | `src/storage/ads_windows.rs` |
| xattr Backend | Linux/macOS extended attributes backend | `src/storage/xattr_unix.rs` |
| HMAC-SHA256 Signing | Cache entries signed for integrity | `src/storage/validator.rs` |
| Cache Binary Format | 225 bytes: version + fingerprint + hash + embedding + signature | `src/storage/mod.rs` |
| NullCache Fallback | FAT32 / cloud drives: in-memory only, no disk writes | `src/storage/null.rs` |

### Privacy + Security
| Feature | Description | Source Path |
|---------|-------------|-------------|
| Local-First | All search runs on-device, zero data egress | `CLAUDE.md#architecture` |
| Ephemeral Mode | Maximum privacy: no cache writes | `src/cli/commands.rs` |
| Secure Timing | Opt-in 100ms floor, single-threaded to prevent timing attacks | `src/ixos_embed/secure_embedder.rs` |
| Ed25519 Attestation | Cryptographic proof of search result integrity | `src/attestation/mod.rs` |
| Path Validation | Sandbox with directory access control | `src/security/sandbox.rs` |
| GDPR/CCPA/EU AI Act | Legal compliance modules | `src/compliance/` |

### File Watcher
| Feature | Description | Source Path |
|---------|-------------|-------------|
| Cross-Platform Watcher | File system monitoring via `notify` crate | `src/ixos_watcher/events.rs` |
| DoS Resilience | Rate limiting (100 events/sec), dedup, symlink protection | `src/ixos_watcher/resilience.rs` |

### Performance
| Feature | Description | Source Path |
|---------|-------------|-------------|
| Parallel Processing | Rayon for file loading + search on >100 files | `src/ixos_rank/lexical_engine.rs` |
| 7ms File Load | 1,000 files loaded in ~7ms (parallel) | `CLAUDE.md#benchmarks` |
| <800ms Search | Full search under 800ms with stub model | `CLAUDE.md#benchmarks` |
| System Optimization | Auto-detect CPU/RAM, tune thread count + model | `src/optimization/mod.rs` |

### Pro Features
| Feature | Description | Source Path |
|---------|-------------|-------------|
| Today View | Activity ledger: resume context for interrupted work | `src/activity_ledger/mod.rs` |
| Workstreams | Auto-clustered sessions, persistent context | Desktop UI |
| Ask Mode | Intent detection + evidence-backed Q&A | `src/ixos_rank/ask_mode/intent_detector.rs` |

---

## CLI Features

| Flag / Subcommand | Description | Source Path |
|-------------------|-------------|-------------|
| `search <query>` | Main search command | `src/cli/commands.rs` |
| `--dir <path>` | Target directory to search | `src/cli/commands.rs` |
| `--stub-model` | Fast search, no model download | `src/cli/commands.rs` |
| `--cache-mode ephemeral` | Maximum privacy, no disk writes | `src/cli/commands.rs` |
| `--cache-mode native-cache` | Recommended: platform cache | `src/cli/commands.rs` |
| `--secure-timing` | Opt-in timing attack protection | `src/cli/commands.rs` |
| `--show-scores` | Show score breakdown per result | `src/cli/output.rs` |
| `--json` | JSON output for programmatic use | `src/cli/output.rs` |
| `--progressive` | Show streaming stages in terminal | `src/cli/commands.rs` |
| `--journalist-mode` | Maximum privacy: ephemeral + secure-timing | `src/journalist_mode.rs` |
| `--context <n>` | Show N lines of context around matches | `src/cli/output.rs` |
| `--min-score <f>` | Minimum similarity threshold | `src/cli/commands.rs` |
| `--csv` | CSV output format | `src/cli/output.rs` |
| `--ripgrep` | ripgrep-compatible output format | `src/cli/output.rs` |

---

## Section Assignment (no repetition)

| Section ID | Features Shown |
|------------|----------------|
| `hero` | Hybrid search, progressive stages, quality modes |
| `filescan` | JIT scan, parallel processing, rayon, no daemon |
| `stats` | 7ms load, <800ms search, 0 daemons |
| `progressive` | Progressive 3-stage pipeline, lock-in state |
| `pipeline` | 4-stage architecture: lexical → semantic → hybrid |
| `benchmarks` | Flash/Pro MRR scores, latency, model sizes |
| `compute` | Compute budget triangle: Flash vs Auto vs Pro |
| `comparison` | Desktop vs CLI capability matrix |
| `techbento` | Cache format, HMAC signing, Ed25519, ADS/xattr |
| `cli` | All CLI flags, terminal interface |
| `ask-mode` | Ask mode, intent detection, evidence citations |
| `local` | Local-first, zero egress, ephemeral mode, journalist mode |
| `pro-value` | Today, Workstreams, Ask (Pro workflow loop) |
| `pricing` | Free vs Pro plan differences |
| `cta` | Download, docs links |
