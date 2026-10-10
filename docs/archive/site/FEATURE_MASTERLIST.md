# Ixos Feature Masterlist

Phase 0 deliverable — every real desktop + CLI feature with source paths.
Used as the source-of-truth for all landing page claims.

## Search Features

| Feature | Description | Source Path |
|---------|-------------|-------------|
| Hybrid search | Lexical candidate scoring fused with semantic embedding similarity in one pass | `src/ixos_rank/hybrid_engine.rs` |
| Lexical engine | Keyword-based search with parallel rayon processing | `src/ixos_rank/lexical_engine.rs` |
| Semantic engine | Embedding similarity search via Model2Vec | `src/ixos_rank/semantic_engine.rs` |
| Adaptive hybrid | Attack detection + fallback to pure semantic | `src/ixos_rank/hybrid_engine.rs` |
| Progressive streaming | Results surface as pipeline processes (`--progressive`) | `src/cli/commands.rs` |
| Speed tiers (Flash/Auto/Pro) | Trade search depth for latency | `ui/src/components/search/QualitySwitcher.tsx` + `ui/src/components/search/ModelSwitcher.tsx` |
| Score breakdown | Per-result score display (`--show-scores`) | `src/cli/commands.rs` + `ui/src/components/search/ScoreBreakdown.tsx` |
| Context snippets | File content snippets around matches (`--context N`) | `src/cli/commands.rs` |
| JSON output | Machine-readable search output (`--json`) | `src/cli/commands.rs` + `src/cli/output.rs` |
| Preset queries | Pre-loaded query suggestions | `packages/ixos-ui/src/components/SearchSurface.tsx` |

## Pipeline & Transparency Features

| Feature | Description | Source Path |
|---------|-------------|-------------|
| 4-stage pipeline | Lexical → semantic → refining → locked stages | `packages/ixos-ui/src/components/SearchSurface.tsx` |
| Pipeline progress bar | Per-stage real-time progress | `packages/ixos-ui/src/components/SearchSurface.tsx` |
| Evidence panel | Per-result rationale explaining match signals | `ui/src/components/search/WhyMatched.tsx` + `ui/src/components/search/ExplainPanel.tsx` |
| Live scan trail | Every file path touched in sequence | `src/ixos_rank/hybrid_engine.rs` + `src/ixos_watcher/resilience.rs` |
| Pipeline KPIs | Files scanned, candidates, embedded, cache hits | `packages/ixos-ui/src/components/SearchSurface.tsx` |
| Command palette | Quick-access shortcut overlay | `ui/src/components/search/CommandPalette.tsx` |
| Related files panel | Files related to selected result | `ui/src/components/search/RelatedFilesPanel.tsx` |

## Privacy & Security Features

| Feature | Description | Source Path |
|---------|-------------|-------------|
| No cloud index | All processing fully offline, zero network calls | `src/storage/ads_windows.rs` + `src/storage/xattr_unix.rs` |
| Ephemeral mode | No disk writes, cache in memory only (`--cache-mode ephemeral`) | `src/cli/commands.rs` + `src/storage/null.rs` |
| Journalist mode | No cache, no history, no filesystem trace (`--journalist-mode`) | `src/journalist_mode.rs` + `src/cli/commands.rs` |
| HMAC-SHA256 signing | Tamper-evident embedding cache, verified on every read | `src/storage/validator.rs` |
| mlock memory protection | Embedding vectors protected from swap | `src/ixos_embed/memory_protection.rs` |
| Zeroize on drop | Secure memory clearing of embedding buffers | `src/ixos_embed/memory_protection.rs` |
| Timing attack protection | Opt-in 100ms floor, single-threaded mode (`--secure-timing`) | `src/ixos_embed/secure_embedder.rs` |
| Path sandbox | Directory access control, symlink protection | `src/security/sandbox.rs` |
| Cryptographic attestation | Ed25519-signed search result proofs | `src/attestation/mod.rs` |

## Storage Features

| Feature | Description | Source Path |
|---------|-------------|-------------|
| NTFS ADS backend | Windows NTFS Alternate Data Streams embedding cache | `src/storage/ads_windows.rs` |
| xattr backend | Linux/macOS extended attributes embedding cache | `src/storage/xattr_unix.rs` |
| NullCache fallback | Graceful degradation for FAT32/cloud drives | `src/storage/null.rs` |
| Auto-detection | `get_cache_for_path()` selects backend per filesystem | `src/storage/mod.rs` |
| Cache binary format | 225-byte compact format per embedding | `src/storage/validator.rs` |
| Model fingerprinting | Cache keyed to model version | `src/storage/validator.rs` |

## Context & Productivity Features

| Feature | Description | Source Path |
|---------|-------------|-------------|
| Today dashboard | Resume streams, recent files, next-file predictions | `ui/src/components/today/` |
| Pinned section | Pinned files accessible from Today | `ui/src/components/today/PinnedSection.tsx` |
| Resume section | Resume active search streams | `ui/src/components/today/ResumeSection.tsx` |
| Recently touched | Files opened/revealed today | `ui/src/components/today/RecentlyTouched.tsx` |
| Suggested next | Local prediction of next file to open | `ui/src/components/today/SuggestedNext.tsx` |
| Connection map | Relationship visualization between today files | `ui/src/components/today/ConnectionMap.tsx` |
| Workstreams | Auto-clustered task threads from local activity | `ui/src/components/workstreams/` |
| Workstream inspector | Stream health, files, actions, last-active | `packages/ixos-ui/src/components/WorkstreamsSurface.tsx` |
| Search history | Per-session search history tracking | `ui/src/lib/searchHistory.ts` + `ui/src/stores/historyStore.ts` |

## Performance Features

| Feature | Description | Source Path |
|---------|-------------|-------------|
| Parallel file loading | Rayon-parallel file scan (~7ms for 1000 files) | `src/ixos_rank/lexical_engine.rs` |
| Model2Vec integration | Fast static embedding model from HuggingFace | `src/ixos_embed/model2vec.rs` |
| int8 quantization | 16.6MB model size, <1% MRR loss | `models/lab/CANONICAL_RESULTS.md` |
| System profiling | RAM/CPU detection for optimal settings | `src/optimization/mod.rs` |
| Cache hit reuse | Embeddings reused from prior searches | `src/storage/mod.rs` |

## File Watcher Features

| Feature | Description | Source Path |
|---------|-------------|-------------|
| Cross-platform watching | File system monitoring via `notify` crate | `src/ixos_watcher/events.rs` |
| Rate limiting | 100 events/sec cap for DoS resilience | `src/ixos_watcher/resilience.rs` |
| Event deduplication | Dedup rapid file events | `src/ixos_watcher/resilience.rs` |
| Symlink protection | Guards against symlink attacks | `src/ixos_watcher/resilience.rs` |

## Compliance Features

| Feature | Description | Source Path |
|---------|-------------|-------------|
| GDPR compliance | EU data protection by design | `src/compliance/` |
| CCPA compliance | California privacy compliance | `src/compliance/` |
| EU AI Act compliance | AI regulation compliance layer | `src/compliance/` |

## CLI Features

| Feature | Flag | Source Path |
|---------|------|-------------|
| Search | `ixos search "query"` | `src/cli/commands.rs` |
| Directory scope | `--dir <path>` | `src/cli/commands.rs` |
| Stub model | `--stub-model` | `src/cli/commands.rs` |
| Cache mode | `--cache-mode ephemeral\|native-cache` | `src/cli/commands.rs` |
| Secure timing | `--secure-timing` | `src/cli/commands.rs` |
| Score breakdown | `--show-scores` | `src/cli/commands.rs` |
| JSON output | `--json` | `src/cli/output.rs` |
| Progressive | `--progressive` | `src/cli/commands.rs` |
| Journalist mode | `--journalist-mode` | `src/journalist_mode.rs` |
| Context snippets | `--context N` | `src/cli/commands.rs` |

---

_All features verified against source files. No invented features._
