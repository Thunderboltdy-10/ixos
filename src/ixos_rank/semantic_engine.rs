//! Semantic (embedding-based) search engine
//!
//! Provides semantic similarity search using embeddings with lazy loading.
//! Supports two cache modes:
//! - **Ephemeral mode**: Embeddings computed on demand, stored in memory only (maximum privacy)
//! - **NativeCache mode**: Embeddings persisted to ADS/xattr (better performance)

use std::collections::HashMap;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::sync::OnceLock;

use async_trait::async_trait;
use rayon::prelude::*;
use tokio::sync::Mutex;

use crate::instrumentation::{content_extraction_span, embedding_batch_span, ranking_fusion_span};
use crate::ixos_embed::augmented::{build_augmented_text, AugmentationConfig};
use crate::ixos_embed::secure_embedder::SecureEmbedder;
use crate::journalist_mode::deep_search_overrides;
use crate::security::crypto::{sha256, sha256_file};
use crate::storage::{get_cache_for_path_with_fingerprint, EmbeddingCache};

use super::evidence::DirectoryCentroids;
use super::fstd::{FstdConfig, FstdState};
use super::types::{LexicalMatch, SearchError, SemanticMatch};

/// Cache mode for embedding storage
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum CacheMode {
    /// NativeCache mode: embeddings persisted to ADS/xattr
    /// Better performance on repeated searches
    #[default]
    NativeCache,
    /// Ephemeral mode: embeddings computed on demand, stored in memory only
    /// Maximum privacy - no persistent traces
    Ephemeral,
}

/// Trait for semantic search engines
#[async_trait]
pub trait SemanticEngine: Send + Sync {
    async fn metrics(&self) -> SemanticMetrics {
        SemanticMetrics::default()
    }
    async fn reset_metrics(&self) {}
    /// Rerank candidates using semantic similarity
    ///
    /// Takes lexical search results and reranks them based on
    /// semantic similarity to the query.
    async fn rerank(
        &self,
        query: &str,
        candidates: Vec<LexicalMatch>,
        limit: usize,
    ) -> Result<Vec<SemanticMatch>, SearchError>;

    /// Pure semantic search (expensive - may scan all files)
    ///
    /// Used as fallback when lexical search is degraded.
    async fn search_pure(
        &self,
        query: &str,
        limit: usize,
    ) -> Result<Vec<SemanticMatch>, SearchError>;

    /// Embed a query string (for evidence extraction).
    async fn embed_query(&self, query: &str) -> Result<Vec<f32>, SearchError>;

    /// Embed a passage chunk synchronously (for passage extraction).
    fn embed_passage_chunk(&self, text: &str) -> Option<Vec<f32>>;
}

/// Semantic engine with lazy embedding loading
///
/// Uses lazy loading to compute embeddings only when needed during search.
/// Supports both Ephemeral (memory-only) and NativeCache (persistent) modes.
pub struct StubSemanticEngine {
    embedder: SecureEmbedder,
    /// Files to search (paths only, not pre-computed embeddings)
    files_to_search: Vec<PathBuf>,
    /// In-memory embedding cache (for Ephemeral and as fallback)
    memory_cache: Mutex<HashMap<PathBuf, MemoryEmbedding>>,
    /// Cache mode (Ephemeral = memory only, NativeCache = use ADS/xattr)
    cache_mode: CacheMode,
    /// Persistent cache backend (for NativeCache mode)
    storage_cache: OnceLock<Box<dyn EmbeddingCache>>,
    /// Minimum similarity score threshold (0.0 to 1.0)
    min_score_threshold: f32,
    /// Metrics for performance reporting
    metrics: Mutex<SemanticMetrics>,
    /// Directory centroids for topology boost (P6.3)
    directory_centroids: Mutex<DirectoryCentroids>,
    /// Path-augmented embedding config (P6.2)
    augmentation_config: AugmentationConfig,
    /// Directory centroid boost weight
    centroid_boost_weight: f32,
    /// FSTD topology re-ranking state (P8)
    fstd_state: Mutex<FstdState>,
}

#[derive(Clone)]
struct MemoryEmbedding {
    embedding: Vec<f32>,
    // None is reserved for explicitly supplied virtual documents in add_file.
    source_hash: Option<[u8; 32]>,
}

impl MemoryEmbedding {
    fn matches_source(&self, path: &Path) -> (bool, u64) {
        match self.source_hash {
            None => (!path.exists(), 0),
            Some(expected) => {
                let bytes = std::fs::metadata(path).map(|m| m.len()).unwrap_or(0);
                let matches = sha256_file(path)
                    .map(|hash| source_identity(path, &hash) == expected)
                    .unwrap_or(false);
                (matches, bytes)
            }
        }
    }
}

// Until path augmentation is evaluated separately, a move must invalidate a
// vector whose input includes its old path. Bind both content and location.
fn source_identity(path: &Path, content_hash: &[u8; 32]) -> [u8; 32] {
    let canonical = std::fs::canonicalize(path).unwrap_or_else(|_| path.to_path_buf());
    let mut identity = content_hash.to_vec();
    identity.extend_from_slice(canonical.as_os_str().to_string_lossy().as_bytes());
    let caps = deep_search_overrides();
    identity.extend_from_slice(&(caps.max_bytes_per_file as u64).to_le_bytes());
    identity.extend_from_slice(&(caps.max_text_chars as u64).to_le_bytes());
    sha256(&identity)
}

pub fn cached_source_identity(path: &Path) -> Result<[u8; 32], std::io::Error> {
    sha256_file(path).map(|hash| source_identity(path, &hash))
}

pub fn embedding_cache_fingerprint(embedder: &SecureEmbedder) -> [u8; 32] {
    let mut identity = embedder.model_fingerprint().to_vec();
    identity.extend_from_slice(b"ixos-extraction-path-prefix-v3");
    sha256(&identity)
}

/// Metrics captured during semantic search
#[derive(Debug, Clone, Default, serde::Serialize)]
pub struct SemanticMetrics {
    pub embedding_ms: u64,
    pub cache_hits: usize,
    pub io_read_bytes: u64,
    pub candidates_embedded: usize,
}

impl StubSemanticEngine {
    /// Create a new stub engine with the given embedder (NativeCache mode by default)
    pub fn new(embedder: SecureEmbedder) -> Self {
        let mut fstd_state = FstdState::new(FstdConfig::default());
        fstd_state.load_default_adapter();
        Self {
            embedder,
            files_to_search: Vec::new(),
            memory_cache: Mutex::new(HashMap::new()),
            cache_mode: CacheMode::NativeCache,
            storage_cache: OnceLock::new(),
            min_score_threshold: 0.0,
            metrics: Mutex::new(SemanticMetrics::default()),
            directory_centroids: Mutex::new(DirectoryCentroids::default_config()),
            augmentation_config: AugmentationConfig::default(),
            centroid_boost_weight: 0.1,
            fstd_state: Mutex::new(fstd_state),
        }
    }

    /// Set the minimum score threshold
    pub fn set_min_score_threshold(&mut self, threshold: f32) {
        self.min_score_threshold = threshold.clamp(0.0, 1.0);
    }

    /// Set directory centroid boost weight
    pub fn set_centroid_boost_weight(&mut self, weight: f32) {
        self.centroid_boost_weight = weight.clamp(0.0, 1.0);
    }

    /// Create a new stub engine with the given embedder and cache mode
    pub fn with_cache_mode(embedder: SecureEmbedder, mode: CacheMode) -> Self {
        let mut fstd_state = FstdState::new(FstdConfig::default());
        fstd_state.load_default_adapter();
        Self {
            embedder,
            files_to_search: Vec::new(),
            memory_cache: Mutex::new(HashMap::new()),
            cache_mode: mode,
            storage_cache: OnceLock::new(),
            min_score_threshold: 0.0,
            metrics: Mutex::new(SemanticMetrics::default()),
            directory_centroids: Mutex::new(DirectoryCentroids::default_config()),
            augmentation_config: AugmentationConfig::default(),
            centroid_boost_weight: 0.1,
            fstd_state: Mutex::new(fstd_state),
        }
    }

    /// Create a new stub engine with the default stub model (Ephemeral mode)
    pub fn with_stub_model() -> Self {
        use crate::ixos_embed::model::StubModel;
        let model = Arc::new(StubModel::new());
        // Use fast mode with minimal timing for stub model
        let embedder = SecureEmbedder::with_config(model, std::time::Duration::from_millis(1), 4);
        Self::new(embedder)
    }

    /// Create a new stub engine with the default stub model and specified cache mode
    pub fn with_stub_model_and_mode(mode: CacheMode) -> Self {
        use crate::ixos_embed::model::StubModel;
        let model = Arc::new(StubModel::new());
        // Use fast mode with minimal timing for stub model
        let embedder = SecureEmbedder::with_config(model, std::time::Duration::from_millis(1), 4);
        Self::with_cache_mode(embedder, mode)
    }

    /// Index files from a directory (lazy - only collects paths, no embedding computation)
    pub async fn index_directory(&mut self, dir: &Path) -> Result<usize, SearchError> {
        if !dir.is_dir() {
            return Err(SearchError::Io(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                "Search directory does not exist",
            )));
        }
        let files: Vec<_> = super::candidate_generator::path_engine::search_walk(
            dir,
            true,
            true,
            false,
            Some(100 * 1024 * 1024),
        )
        .build()
        .filter_map(Result::ok)
        .filter(|entry| {
            entry.file_type().is_some_and(|kind| kind.is_file())
                && crate::parsers::can_extract_text(entry.path())
        })
        .map(|entry| entry.into_path())
        .collect();

        let count = files.len();
        self.files_to_search = files;

        // Initialize storage cache for NativeCache mode
        // The backend is initialized on first use, including candidate-only searches.

        {
            let mut fstd_state = self.fstd_state.lock().await;
            fstd_state.update_topology(dir, &self.files_to_search);
            if let Some(topo) = fstd_state.topology.as_ref() {
                tracing::debug!(
                    quality_score = topo.quality_score(),
                    enabled = fstd_state.enabled,
                    anchors = topo.anchor_count(),
                    "FSTD topology state"
                );
            }
        }

        tracing::debug!("Collected {} files from {:?} (lazy indexing)", count, dir);

        Ok(count)
    }

    /// Add a file to the index (lazy - only adds path)
    pub async fn add_file(&mut self, path: PathBuf, content: &str) -> Result<(), SearchError> {
        // For backwards compatibility with tests, we compute and cache the embedding immediately
        let augmented = build_augmented_text(&path, content, &self.augmentation_config);
        let embedding = self
            .embedder
            .embed_secure(&augmented)
            .await
            .map_err(|e| SearchError::EmbeddingFailed(e.to_string()))?;

        self.files_to_search.push(path.clone());

        // Store in memory cache
        let mut cache = self.memory_cache.lock().await;
        let source_hash = sha256_file(&path)
            .ok()
            .map(|hash| source_identity(&path, &hash));
        cache.insert(
            path,
            MemoryEmbedding {
                embedding,
                source_hash,
            },
        );

        Ok(())
    }

    /// Get the number of indexed files
    pub fn index_size(&self) -> usize {
        self.files_to_search.len()
    }

    /// Precompute embeddings for all indexed files.
    ///
    /// Useful for cache warmup/rebuild operations.
    pub async fn precompute_embeddings(&self) -> usize {
        let mut warmed = 0usize;
        for path in &self.files_to_search {
            if self.get_embedding(path).await.is_ok() {
                warmed += 1;
            }
        }
        warmed
    }

    /// Drain semantic metrics for reporting
    pub async fn take_metrics(&self) -> SemanticMetrics {
        let mut metrics = self.metrics.lock().await;
        std::mem::take(&mut *metrics)
    }

    /// Clear in-memory embeddings (useful for cache-mode benchmarks)
    pub async fn clear_memory_cache(&self) {
        self.memory_cache.lock().await.clear();
    }

    fn persistent_cache(&self, path: &Path) -> &dyn EmbeddingCache {
        self.storage_cache
            .get_or_init(|| {
                get_cache_for_path_with_fingerprint(
                    path,
                    embedding_cache_fingerprint(&self.embedder),
                )
            })
            .as_ref()
    }

    /// Get embedding for a file with lazy loading
    ///
    /// Checks caches in order:
    /// 1. Memory cache (fastest)
    /// 2. Persistent storage (ADS/xattr) - only in NativeCache mode
    /// 3. Compute embedding (slowest, stores in appropriate cache(s))
    async fn get_embedding(&self, path: &Path) -> Result<Vec<f32>, SearchError> {
        // 1. Check memory cache first
        let cached = self.memory_cache.lock().await.get(path).cloned();
        if let Some(entry) = cached {
            let (fresh, bytes) = entry.matches_source(path);
            self.metrics.lock().await.io_read_bytes += bytes;
            if fresh {
                let mut metrics = self.metrics.lock().await;
                metrics.cache_hits += 1;
                return Ok(entry.embedding);
            }
            self.memory_cache.lock().await.remove(path);
        }

        // 2. Read limited file content (hot path cap)
        let (content, bytes_read, file_hash) =
            read_text_for_embedding(path, self.cache_mode == CacheMode::NativeCache)?;
        {
            let mut metrics = self.metrics.lock().await;
            metrics.io_read_bytes += bytes_read as u64;
        }

        // 3. If NativeCache mode, check persistent storage (ADS/xattr)
        if self.cache_mode == CacheMode::NativeCache {
            let storage = self.persistent_cache(path);
            {
                if let Some(embedding) = storage
                    .get(path, &file_hash)
                    .ok()
                    .flatten()
                    .filter(|embedding| embedding.len() == self.embedder.dimensions())
                {
                    let mut metrics = self.metrics.lock().await;
                    metrics.cache_hits += 1;
                    // Store in memory cache for faster subsequent access
                    let mut cache = self.memory_cache.lock().await;
                    cache.insert(
                        path.to_path_buf(),
                        MemoryEmbedding {
                            embedding: embedding.clone(),
                            source_hash: Some(file_hash),
                        },
                    );
                    return Ok(embedding);
                }
            }
        }

        // 4. Compute embedding
        let augmented = build_augmented_text(path, &content, &self.augmentation_config);

        let embed_start = std::time::Instant::now();
        let embedding = self
            .embedder
            .embed_secure(&augmented)
            .await
            .map_err(|e| SearchError::EmbeddingFailed(e.to_string()))?;
        let embed_elapsed = embed_start.elapsed().as_millis() as u64;
        {
            let mut metrics = self.metrics.lock().await;
            metrics.embedding_ms += embed_elapsed;
            metrics.candidates_embedded += 1;
        }

        // Store in memory cache
        {
            let mut cache = self.memory_cache.lock().await;
            cache.insert(
                path.to_path_buf(),
                MemoryEmbedding {
                    embedding: embedding.clone(),
                    source_hash: Some(file_hash),
                },
            );
        }

        // Store in persistent storage if in NativeCache mode
        if self.cache_mode == CacheMode::NativeCache {
            let storage = self.persistent_cache(path);
            {
                // Best effort - don't fail if storage fails
                let _ = storage.set(path, &file_hash, &embedding);
            }
        }

        Ok(embedding)
    }

    /// Calculate cosine similarity between two vectors using SIMD acceleration
    fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
        if a.len() != b.len() {
            return 0.0;
        }

        // Use SIMD-accelerated cosine similarity
        // simsimd returns Option<distance> where:
        // - distance = 1 - cosine_similarity
        // - distance range: 0.0 (identical) to 2.0 (opposite)
        // Convert to similarity: 1.0 - distance (gives range -1.0 to 1.0)
        use simsimd::SpatialSimilarity;
        if let Some(distance) = f32::cosine(a, b) {
            // Convert cosine distance to cosine similarity
            (1.0 - distance as f32).clamp(-1.0, 1.0)
        } else {
            // Fallback to scalar implementation if SIMD fails
            let dot: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
            let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
            let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();

            if norm_a == 0.0 || norm_b == 0.0 {
                0.0
            } else {
                (dot / (norm_a * norm_b)).clamp(-1.0, 1.0)
            }
        }
    }

    /// Batch cosine similarity calculation for multiple candidates
    ///
    /// Calculates similarity between query and each candidate embedding.
    /// Uses SIMD-accelerated operations when possible.
    #[inline]
    #[allow(dead_code)] // Reserved for future vectorized batching optimization
    fn batch_cosine_similarities(query: &[f32], embeddings: &[Vec<f32>]) -> Vec<f32> {
        use simsimd::SpatialSimilarity;

        embeddings
            .iter()
            .map(|emb| {
                if emb.len() != query.len() {
                    return 0.0;
                }
                if let Some(distance) = f32::cosine(query, emb) {
                    (1.0 - distance as f32).clamp(-1.0, 1.0)
                } else {
                    // Fallback
                    let dot: f32 = query.iter().zip(emb.iter()).map(|(x, y)| x * y).sum();
                    let norm_q: f32 = query.iter().map(|x| x * x).sum::<f32>().sqrt();
                    let norm_e: f32 = emb.iter().map(|x| x * x).sum::<f32>().sqrt();
                    if norm_q == 0.0 || norm_e == 0.0 {
                        0.0
                    } else {
                        (dot / (norm_q * norm_e)).clamp(-1.0, 1.0)
                    }
                }
            })
            .collect()
    }
}

/// Read file contents with hard caps for hot path safety.
fn read_file_limited_bytes(path: &Path) -> Result<(Vec<u8>, usize, [u8; 32]), SearchError> {
    // SECURITY: Check if this is a cloud-only file to prevent auto-download
    use crate::storage::cloud_detection::{get_cloud_storage_status, CloudStorageStatus};
    match get_cloud_storage_status(path) {
        CloudStorageStatus::CloudOnly => {
            tracing::debug!(
                "Skipping cloud-only file to prevent download: {}",
                path.display()
            );
            return Err(SearchError::Io(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                "Cloud-only file skipped",
            )));
        }
        _ => {}
    }

    let caps = deep_search_overrides();
    let mut file = std::fs::File::open(path).map_err(SearchError::Io)?;
    let before = file.metadata().map_err(SearchError::Io)?;
    let capture_limit = if is_heavy_format(path) {
        32 * 1024 * 1024
    } else {
        caps.max_bytes_per_file
    };
    if is_heavy_format(path) && before.len() > capture_limit as u64 {
        return Err(SearchError::Io(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            "Document exceeds the 32 MiB parser input budget",
        )));
    }
    let mut buffer = Vec::with_capacity(capture_limit.min(8192));
    let mut digest = ring::digest::Context::new(&ring::digest::SHA256);
    let mut block = [0u8; 16 * 1024];
    let mut bytes_read = 0;
    loop {
        let count = file.read(&mut block).map_err(SearchError::Io)?;
        if count == 0 {
            break;
        }
        digest.update(&block[..count]);
        bytes_read += count;
        let keep = count.min(capture_limit.saturating_sub(buffer.len()));
        buffer.extend_from_slice(&block[..keep]);
    }
    let after = file.metadata().map_err(SearchError::Io)?;
    if before.len() != after.len() || before.modified().ok() != after.modified().ok() {
        return Err(SearchError::Io(std::io::Error::new(
            std::io::ErrorKind::Interrupted,
            "File changed during extraction; retry search",
        )));
    }
    let content_hash: [u8; 32] = digest.finish().as_ref().try_into().unwrap();
    Ok((buffer, bytes_read, source_identity(path, &content_hash)))
}

fn read_text_for_embedding(
    path: &Path,
    _require_full_file_hash: bool,
) -> Result<(String, usize, [u8; 32]), SearchError> {
    let caps = deep_search_overrides();
    let (bytes, bytes_read, file_hash) = read_file_limited_bytes(path)?;

    let content = crate::parsers::extract_text_from_bytes(path, &bytes, caps.max_text_chars)
        .ok_or_else(|| {
            SearchError::Io(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                "No extractable text; unsupported, empty or binary document",
            ))
        })?;

    Ok((content, bytes_read, file_hash))
}

fn is_heavy_format(path: &Path) -> bool {
    let ext = path
        .extension()
        .map(|e| e.to_string_lossy().to_lowercase())
        .unwrap_or_default();
    matches!(
        ext.as_str(),
        "pdf" | "docx" | "xlsx" | "xls" | "pptx" | "ppt"
    )
}

#[async_trait]
impl SemanticEngine for StubSemanticEngine {
    async fn metrics(&self) -> SemanticMetrics {
        self.metrics.lock().await.clone()
    }
    async fn reset_metrics(&self) {
        self.take_metrics().await;
    }
    /// Rerank candidates using semantic similarity (P4.1 batch optimized)
    ///
    /// This method batches candidate embeddings; speedups must be measured per workload.
    /// Optimizations (P5 perf):
    /// - Reduced mutex lock acquisitions (8 -> 4)
    /// - Batch similarity calculations
    /// - Reduced cloning via indices
    async fn rerank(
        &self,
        query: &str,
        candidates: Vec<LexicalMatch>,
        limit: usize,
    ) -> Result<Vec<SemanticMatch>, SearchError> {
        if self.cache_mode == CacheMode::Ephemeral {
            self.memory_cache.lock().await.clear();
        }
        if candidates.is_empty() {
            return Ok(Vec::new());
        }

        // Generate query embedding
        let query_embedding = self.embed_query(query).await?;
        let fstd_context = {
            let fstd_state = self.fstd_state.lock().await;
            if fstd_state.enabled {
                if let (Some(adapter), Some(topo)) =
                    (fstd_state.adapter.clone(), fstd_state.topology.clone())
                {
                    Some((adapter, topo, fstd_state.config.weight))
                } else {
                    None
                }
            } else {
                None
            }
        };
        let fstd_query_coord = fstd_context.as_ref().and_then(|(adapter, topo, _)| {
            if adapter.output_dim != topo.anchor_count() {
                return None;
            }
            adapter.predict(&query_embedding)
        });

        // P5 OPT: Use indices to reduce cloning, collect paths once
        let candidate_paths: Vec<PathBuf> = candidates.iter().map(|c| c.path.clone()).collect();

        // Snapshot under the lock, then validate source versions without holding it.
        let snapshots: Vec<_> = {
            let cache = self.memory_cache.lock().await;
            candidate_paths
                .iter()
                .map(|path| cache.get(path).cloned())
                .collect()
        };
        let validated: Vec<_> = snapshots
            .par_iter()
            .enumerate()
            .map(|(idx, entry)| {
                entry
                    .as_ref()
                    .map(|entry| entry.matches_source(&candidate_paths[idx]))
                    .unwrap_or((false, 0))
            })
            .collect();
        let cached_indices: Vec<_> = validated
            .iter()
            .enumerate()
            .filter_map(|(idx, (fresh, _))| fresh.then_some(idx))
            .collect();
        let uncached_indices: Vec<_> = validated
            .iter()
            .enumerate()
            .filter_map(|(idx, (fresh, _))| (!fresh).then_some(idx))
            .collect();
        let initial_cache_hits = cached_indices.len();
        self.metrics.lock().await.io_read_bytes +=
            validated.iter().map(|(_, bytes)| bytes).sum::<u64>();

        // Phase 2: Read file content in PARALLEL using rayon (P5 optimization)
        // This provides significant speedup on cold starts with many uncached files
        struct FileReadResult {
            idx: usize,
            #[allow(dead_code)]
            content: String, // Kept for potential future use
            bytes_read: usize,
            file_hash: [u8; 32],
            augmented: String,
        }

        let augmentation_config = &self.augmentation_config;
        let use_persistent_hash = self.cache_mode == CacheMode::NativeCache;
        let file_results: Vec<FileReadResult> = if uncached_indices.len() > 8 {
            // Use parallel I/O for larger batches
            uncached_indices
                .par_iter()
                .filter_map(|&idx| {
                    let path = &candidate_paths[idx];
                    let _span = content_extraction_span(path);
                    let _enter = _span.enter();
                    match read_text_for_embedding(path, use_persistent_hash) {
                        Ok((content, bytes_read, file_hash)) => {
                            let augmented =
                                build_augmented_text(path, &content, augmentation_config);
                            Some(FileReadResult {
                                idx,
                                content,
                                bytes_read,
                                file_hash,
                                augmented,
                            })
                        }
                        Err(_) => None, // Skip unreadable files
                    }
                })
                .collect()
        } else {
            // Sequential for small batches (avoid rayon overhead)
            uncached_indices
                .iter()
                .filter_map(|&idx| {
                    let path = &candidate_paths[idx];
                    let _span = content_extraction_span(path);
                    let _enter = _span.enter();
                    match read_text_for_embedding(path, use_persistent_hash) {
                        Ok((content, bytes_read, file_hash)) => {
                            let augmented =
                                build_augmented_text(path, &content, augmentation_config);
                            Some(FileReadResult {
                                idx,
                                content,
                                bytes_read,
                                file_hash,
                                augmented,
                            })
                        }
                        Err(_) => None, // Skip unreadable files
                    }
                })
                .collect()
        };

        // Partition file results into storage hits vs to-embed
        let total_bytes_read: u64 = file_results.iter().map(|r| r.bytes_read as u64).sum();
        let mut storage_hits: Vec<(usize, Vec<f32>, [u8; 32])> = Vec::new();
        let mut to_embed: Vec<(usize, String, [u8; 32])> = Vec::new();

        for result in file_results {
            // Check persistent cache (ADS/xattr) if in NativeCache mode
            if self.cache_mode == CacheMode::NativeCache {
                let path = &candidate_paths[result.idx];
                let storage = self.persistent_cache(path);
                {
                    if let Ok(Some(embedding)) = storage.get(path, &result.file_hash) {
                        if embedding.len() != query_embedding.len() {
                            to_embed.push((result.idx, result.augmented, result.file_hash));
                            continue;
                        }
                        storage_hits.push((result.idx, embedding, result.file_hash));
                        continue;
                    }
                }
            }

            // Need to compute embedding - add to batch
            to_embed.push((result.idx, result.augmented, result.file_hash));
        }

        // Phase 3: Batch embed all uncached content at once (P4.1 optimization)
        let batch_embeddings = if !to_embed.is_empty() {
            let embed_start = std::time::Instant::now();

            let texts: Vec<String> = to_embed.iter().map(|(_, text, _)| text.clone()).collect();

            let _span = embedding_batch_span(texts.len(), 0);
            let _enter = _span.enter();
            let embeddings = self
                .embedder
                .embed_batch_secure(&texts)
                .await
                .map_err(|e| SearchError::EmbeddingFailed(e.to_string()))?;

            let embed_elapsed = embed_start.elapsed().as_millis() as u64;

            // P5 OPT: Single metrics update after batch embedding
            {
                let mut metrics = self.metrics.lock().await;
                metrics.embedding_ms += embed_elapsed;
                metrics.candidates_embedded += embeddings.len();
                metrics.io_read_bytes += total_bytes_read;
                metrics.cache_hits += initial_cache_hits + storage_hits.len();
            }

            tracing::debug!(
                "P4.1 batch embedded {} candidates in {}ms",
                embeddings.len(),
                embed_elapsed
            );

            embeddings
        } else {
            // Still need to update metrics for cache-only case
            {
                let mut metrics = self.metrics.lock().await;
                metrics.io_read_bytes += total_bytes_read;
                metrics.cache_hits += initial_cache_hits + storage_hits.len();
            }
            Vec::new()
        };

        // Phase 4: Store new embeddings in cache and collect all embeddings
        // P5 OPT: Single lock acquisition for both storage hit updates and new embeddings
        let all_embeddings: Vec<(usize, Vec<f32>)> = {
            let mut cache = self.memory_cache.lock().await;

            let mut embeddings: Vec<(usize, Vec<f32>)> = Vec::with_capacity(
                cached_indices.len() + storage_hits.len() + batch_embeddings.len(),
            );

            // Add memory cache hits
            for &idx in &cached_indices {
                if let Some(entry) = &snapshots[idx] {
                    embeddings.push((idx, entry.embedding.clone()));
                }
            }

            // Add storage cache hits (and update memory cache)
            for (idx, emb, source_hash) in storage_hits {
                // Storage hit source identity is the same one validated during reading.
                cache.insert(
                    candidate_paths[idx].clone(),
                    MemoryEmbedding {
                        embedding: emb.clone(),
                        source_hash: Some(source_hash),
                    },
                );
                embeddings.push((idx, emb));
            }

            // Add batch embeddings (and update caches)
            for (embedding, (idx, _, file_hash)) in batch_embeddings.iter().zip(to_embed.iter()) {
                let path = &candidate_paths[*idx];
                cache.insert(
                    path.clone(),
                    MemoryEmbedding {
                        embedding: embedding.clone(),
                        source_hash: Some(*file_hash),
                    },
                );

                // Store in persistent cache if in NativeCache mode
                if self.cache_mode == CacheMode::NativeCache {
                    let storage = self.persistent_cache(path);
                    {
                        let _ = storage.set(path, file_hash, embedding);
                    }
                }

                embeddings.push((*idx, embedding.clone()));
            }

            embeddings
        };

        // Phase 5: Update directory centroids (single lock)
        {
            let mut centroids = self.directory_centroids.lock().await;
            for (idx, embedding) in &all_embeddings {
                if let Some(parent) = candidate_paths[*idx].parent() {
                    centroids.update(parent, embedding);
                    centroids.record_access(parent);
                }
            }
        }

        // Phase 6: Calculate similarities for all candidates
        // P5 OPT: Batch similarity calculation + single centroids lock
        let _rank_span = ranking_fusion_span(all_embeddings.len());
        let _rank_enter = _rank_span.enter();

        let mut results: Vec<SemanticMatch> = Vec::with_capacity(all_embeddings.len());
        {
            let centroids = self.directory_centroids.lock().await;

            // Extract embeddings for batch similarity calculation
            for (idx, embedding) in &all_embeddings {
                let path = &candidate_paths[*idx];

                // SIMD cosine similarity
                let mut similarity = Self::cosine_similarity(&query_embedding, embedding);

                // Centroid boost
                if let Some(parent) = path.parent() {
                    let centroid_boost = centroids
                        .similarity(parent, &query_embedding)
                        .unwrap_or(0.0);
                    similarity += centroid_boost * self.centroid_boost_weight;
                }

                // FSTD topology boost
                if let (Some(ref query_coord), Some((_, topo, weight))) =
                    (fstd_query_coord.as_ref(), fstd_context.as_ref())
                {
                    if let Some(dir_coord) = topo.coordinate_for_path(path) {
                        let dist = l2_distance(query_coord, dir_coord);
                        let norm = (query_coord.len() as f32).sqrt().max(1.0);
                        let score = (1.0 - dist / norm).clamp(0.0, 1.0);
                        similarity += score * *weight;
                    }
                }

                similarity = similarity.clamp(0.0, 1.0);

                if similarity >= self.min_score_threshold {
                    results.push(SemanticMatch::new(path.clone(), similarity));
                }
            }
        }

        let cap = if limit == 0 {
            results.len()
        } else {
            limit.min(results.len())
        };
        if cap < results.len() {
            let nth = cap.saturating_sub(1);
            if cap > 0 {
                results.select_nth_unstable_by(nth, |a, b| {
                    b.similarity
                        .partial_cmp(&a.similarity)
                        .unwrap_or(std::cmp::Ordering::Equal)
                });
                results.truncate(cap);
            } else {
                results.clear();
            }
        }

        // Sort by similarity descending (top-k only)
        results.sort_unstable_by(|a, b| {
            b.similarity
                .partial_cmp(&a.similarity)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        Ok(results)
    }

    async fn search_pure(
        &self,
        query: &str,
        limit: usize,
    ) -> Result<Vec<SemanticMatch>, SearchError> {
        if self.cache_mode == CacheMode::Ephemeral {
            self.memory_cache.lock().await.clear();
        }
        if self.files_to_search.is_empty() {
            return Ok(Vec::new());
        }

        // P2 FIX: HARD CAP to prevent scanning entire corpus
        // If there are too many files, truncate to prevent 40s+ searches
        let caps = deep_search_overrides();
        let files_to_process: &[std::path::PathBuf] = if self.files_to_search.len()
            > caps.max_candidates
        {
            tracing::warn!(
                total_files = self.files_to_search.len(),
                cap = caps.max_candidates,
                "search_pure capped to prevent full-corpus scan. Use CandidateGenerator for better results."
            );
            &self.files_to_search[..caps.max_candidates]
        } else {
            &self.files_to_search
        };

        // Generate query embedding
        let query_embedding = self.embed_query(query).await?;
        let fstd_context = {
            let fstd_state = self.fstd_state.lock().await;
            if fstd_state.enabled {
                if let (Some(adapter), Some(topo)) =
                    (fstd_state.adapter.clone(), fstd_state.topology.clone())
                {
                    Some((adapter, topo, fstd_state.config.weight))
                } else {
                    None
                }
            } else {
                None
            }
        };
        let fstd_query_coord = fstd_context.as_ref().and_then(|(adapter, topo, _)| {
            if adapter.output_dim != topo.anchor_count() {
                return None;
            }
            adapter.predict(&query_embedding)
        });

        // Calculate similarity for capped set of files using lazy loading
        let mut results: Vec<SemanticMatch> = Vec::new();

        for path in files_to_process {
            let embedding = match self.get_embedding(path).await {
                Ok(emb) => emb,
                Err(_) => continue, // Skip files that can't be read
            };

            let mut similarity = Self::cosine_similarity(&query_embedding, &embedding);
            if let Some(parent) = path.parent() {
                let centroid_boost = {
                    let centroids = self.directory_centroids.lock().await;
                    centroids
                        .similarity(parent, &query_embedding)
                        .unwrap_or(0.0)
                };
                similarity += centroid_boost * self.centroid_boost_weight;
            }
            if let (Some(ref query_coord), Some((_, topo, weight))) =
                (fstd_query_coord.as_ref(), fstd_context.as_ref())
            {
                if let Some(dir_coord) = topo.coordinate_for_path(path) {
                    let dist = l2_distance(query_coord, dir_coord);
                    let norm = (query_coord.len() as f32).sqrt().max(1.0);
                    let score = (1.0 - dist / norm).clamp(0.0, 1.0);
                    similarity += score * *weight;
                }
            }
            similarity = similarity.clamp(0.0, 1.0);

            if similarity >= self.min_score_threshold {
                results.push(SemanticMatch::new(path.clone(), similarity));
            }
        }

        // Sort by similarity descending
        results.sort_by(|a, b| {
            b.similarity
                .partial_cmp(&a.similarity)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        results.truncate(limit);

        Ok(results)
    }

    async fn embed_query(&self, query: &str) -> Result<Vec<f32>, SearchError> {
        self.embedder
            .embed_secure(query)
            .await
            .map_err(|e| SearchError::EmbeddingFailed(e.to_string()))
    }

    fn embed_passage_chunk(&self, text: &str) -> Option<Vec<f32>> {
        self.embedder.embed_sync(text).ok()
    }
}

fn l2_distance(a: &[f32], b: &[f32]) -> f32 {
    let mut sum = 0.0;
    for (x, y) in a.iter().zip(b.iter()) {
        let delta = x - y;
        sum += delta * delta;
    }
    sum.sqrt()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn cache_validates_edits_and_deleted_files() {
        let temp = tempfile::tempdir().unwrap();
        let path = temp.path().join("source.rs");
        std::fs::write(&path, "alpha original concept").unwrap();
        let engine = StubSemanticEngine::with_stub_model_and_mode(CacheMode::NativeCache);
        let original = engine.get_embedding(&path).await.unwrap();
        engine.take_metrics().await;
        let warmed = engine.get_embedding(&path).await.unwrap();
        assert_eq!(original, warmed);
        assert_eq!(engine.take_metrics().await.cache_hits, 1);
        std::fs::write(&path, "entirely different beta concept").unwrap();
        assert_ne!(original, engine.get_embedding(&path).await.unwrap());
        let metrics = engine.take_metrics().await;
        assert_eq!(metrics.cache_hits, 0);
        std::fs::remove_file(&path).unwrap();
        assert!(engine.get_embedding(&path).await.is_err());
    }

    #[tokio::test]
    async fn candidate_only_search_initializes_native_cache_and_preserves_source() {
        let temp = tempfile::tempdir().unwrap();
        let path = temp.path().join("notes.txt");
        let text = "retrieval engine supporting source evidence";
        std::fs::write(&path, text).unwrap();
        let candidates = || vec![LexicalMatch::new(path.clone(), 1.0, text.into(), 1, 1)];
        let first = StubSemanticEngine::with_stub_model_and_mode(CacheMode::NativeCache);
        first.rerank("retrieval", candidates(), 1).await.unwrap();
        assert_eq!(first.take_metrics().await.candidates_embedded, 1);
        drop(first);
        let second = StubSemanticEngine::with_stub_model_and_mode(CacheMode::NativeCache);
        second.rerank("retrieval", candidates(), 1).await.unwrap();
        let metrics = second.take_metrics().await;
        assert_eq!(metrics.cache_hits, 1);
        assert_eq!(metrics.candidates_embedded, 0);
        assert_eq!(std::fs::read_to_string(&path).unwrap(), text);
        assert_eq!(std::fs::read_dir(temp.path()).unwrap().count(), 1);
    }

    #[tokio::test]
    async fn semantic_discovery_respects_ignores_and_dependency_pruning() {
        let temp = tempfile::tempdir().unwrap();
        std::fs::write(temp.path().join(".gitignore"), "ignored/**\n").unwrap();
        for folder in ["ignored", "node_modules", ".hidden", "source"] {
            std::fs::create_dir(temp.path().join(folder)).unwrap();
            std::fs::write(temp.path().join(folder).join("code.tsx"), "retrieval").unwrap();
        }
        let mut engine = StubSemanticEngine::with_stub_model();
        assert_eq!(engine.index_directory(temp.path()).await.unwrap(), 1);
        assert!(engine.files_to_search[0].ends_with("source/code.tsx"));
    }

    #[test]
    fn document_above_embedding_prefix_budget_is_parsed_instead_of_raw_bytes() {
        let temp = tempfile::tempdir().unwrap();
        let path = temp.path().join("large.pdf");
        let mut pdf = std::fs::read("tests/fixtures/sample.pdf").unwrap();
        pdf.extend(std::iter::repeat_n(b' ', 100_000));
        std::fs::write(&path, &pdf).unwrap();
        let (text, bytes_read, _) = read_text_for_embedding(&path, true).unwrap();
        assert!(text.contains("Ixos PDF Fixture"));
        assert!(!text.starts_with("%PDF"));
        assert_eq!(bytes_read, pdf.len());
    }

    #[test]
    fn test_cosine_similarity_identical() {
        let a = vec![1.0, 0.0, 0.0];
        let b = vec![1.0, 0.0, 0.0];
        let sim = StubSemanticEngine::cosine_similarity(&a, &b);
        assert!((sim - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_cosine_similarity_orthogonal() {
        let a = vec![1.0, 0.0, 0.0];
        let b = vec![0.0, 1.0, 0.0];
        let sim = StubSemanticEngine::cosine_similarity(&a, &b);
        println!("Orthogonal similarity: {}", sim);
        assert!(sim.abs() < 0.001);
    }

    #[test]
    fn test_cosine_similarity_opposite() {
        let a = vec![1.0, 0.0, 0.0];
        let b = vec![-1.0, 0.0, 0.0];
        let sim = StubSemanticEngine::cosine_similarity(&a, &b);
        println!("Opposite similarity: {}", sim);
        assert!((sim - (-1.0)).abs() < 0.001);
    }

    #[test]
    fn test_cosine_similarity_different_lengths() {
        let a = vec![1.0, 0.0];
        let b = vec![1.0, 0.0, 0.0];
        let sim = StubSemanticEngine::cosine_similarity(&a, &b);
        assert_eq!(sim, 0.0);
    }

    #[tokio::test]
    async fn test_stub_engine_creation() {
        let engine = StubSemanticEngine::with_stub_model();
        assert_eq!(engine.index_size(), 0);
    }

    #[tokio::test]
    async fn test_stub_engine_add_file() {
        let mut engine = StubSemanticEngine::with_stub_model();
        engine
            .add_file(PathBuf::from("/test.txt"), "hello world")
            .await
            .unwrap();
        assert_eq!(engine.index_size(), 1);
    }

    #[tokio::test]
    async fn test_search_pure_empty_index() {
        let engine = StubSemanticEngine::with_stub_model();
        let results = engine.search_pure("test query", 10).await.unwrap();
        assert!(results.is_empty());
    }

    #[tokio::test]
    async fn test_search_pure_with_files() {
        let mut engine = StubSemanticEngine::with_stub_model();
        engine
            .add_file(PathBuf::from("/a.txt"), "hello world")
            .await
            .unwrap();
        engine
            .add_file(PathBuf::from("/b.txt"), "hello universe")
            .await
            .unwrap();

        let results = engine.search_pure("hello world", 10).await.unwrap();
        // At minimum, files with "hello" should be indexed
        assert!(results.len() >= 1);
    }

    #[tokio::test]
    async fn test_rerank_empty_candidates() {
        let engine = StubSemanticEngine::with_stub_model();
        let results = engine.rerank("test", Vec::new(), 10).await.unwrap();
        assert!(results.is_empty());
    }
}
