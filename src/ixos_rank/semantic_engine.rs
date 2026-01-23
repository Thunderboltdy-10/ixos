//! Semantic (embedding-based) search engine
//!
//! Provides semantic similarity search using embeddings with lazy loading.
//! Supports two cache modes:
//! - **JIT mode**: Embeddings computed on demand, stored in memory only (maximum privacy)
//! - **Cache mode**: Embeddings persisted to ADS/xattr (better performance)

use std::collections::HashMap;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::sync::Arc;

use async_trait::async_trait;
use tokio::sync::Mutex;

use crate::ixos_embed::augmented::{build_augmented_text, AugmentationConfig};
use crate::ixos_embed::secure_embedder::SecureEmbedder;
use crate::instrumentation::{content_extraction_span, embedding_batch_span, ranking_fusion_span};
use crate::security::crypto::sha256;
use crate::storage::{get_cache_for_path, EmbeddingCache};

use super::candidate_generator::{
    MAX_BYTES_READ_PER_FILE, MAX_CANDIDATES_FOR_EMBEDDING, MAX_TEXT_CHARS_PER_FILE,
};
use super::evidence::DirectoryCentroids;
use super::fstd::{FstdConfig, FstdState};
use super::types::{LexicalMatch, SearchError, SemanticMatch};

/// Cache mode for embedding storage
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum CacheMode {
    /// JIT mode: embeddings computed on demand, stored in memory only
    /// Maximum privacy - no persistent traces
    #[default]
    Jit,
    /// Cache mode: embeddings persisted to ADS/xattr
    /// Better performance on repeated searches
    Cache,
}

/// Trait for semantic search engines
#[async_trait]
pub trait SemanticEngine: Send + Sync {
    /// Rerank candidates using semantic similarity
    ///
    /// Takes lexical search results and reranks them based on
    /// semantic similarity to the query.
    async fn rerank(
        &self,
        query: &str,
        candidates: Vec<LexicalMatch>,
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
/// Supports both JIT (memory-only) and Cache (persistent) modes.
pub struct StubSemanticEngine {
    embedder: SecureEmbedder,
    /// Files to search (paths only, not pre-computed embeddings)
    files_to_search: Vec<PathBuf>,
    /// In-memory embedding cache (for JIT and as fallback)
    memory_cache: Mutex<HashMap<PathBuf, Vec<f32>>>,
    /// Cache mode (JIT = memory only, Cache = use ADS/xattr)
    cache_mode: CacheMode,
    /// Persistent cache backend (for Cache mode)
    storage_cache: Option<Box<dyn EmbeddingCache + Send + Sync>>,
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

/// Metrics captured during semantic search
#[derive(Debug, Clone, Default)]
pub struct SemanticMetrics {
    pub embedding_ms: u64,
    pub cache_hits: usize,
    pub io_read_bytes: u64,
    pub candidates_embedded: usize,
}

impl StubSemanticEngine {
    /// Create a new stub engine with the given embedder (JIT mode by default)
    pub fn new(embedder: SecureEmbedder) -> Self {
        let mut fstd_state = FstdState::new(FstdConfig::default());
        fstd_state.load_default_adapter();
        Self {
            embedder,
            files_to_search: Vec::new(),
            memory_cache: Mutex::new(HashMap::new()),
            cache_mode: CacheMode::Jit,
            storage_cache: None,
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
            storage_cache: None,
            min_score_threshold: 0.0,
            metrics: Mutex::new(SemanticMetrics::default()),
            directory_centroids: Mutex::new(DirectoryCentroids::default_config()),
            augmentation_config: AugmentationConfig::default(),
            centroid_boost_weight: 0.1,
            fstd_state: Mutex::new(fstd_state),
        }
    }

    /// Create a new stub engine with the default stub model (JIT mode)
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
        fn collect_files(dir: &Path, files: &mut Vec<PathBuf>) -> Result<(), SearchError> {
            let entries = std::fs::read_dir(dir).map_err(SearchError::Io)?;

            for entry in entries {
                let entry = entry.map_err(SearchError::Io)?;
                let path = entry.path();

                if path.is_dir() {
                    collect_files(&path, files)?;
                } else if path.is_file() {
                    if crate::parsers::can_extract_text(&path) {
                        files.push(path);
                    }
                }
            }

            Ok(())
        }

        let mut files = Vec::new();
        collect_files(dir, &mut files)?;

        let count = files.len();
        self.files_to_search = files;

        // Initialize storage cache for Cache mode
        if self.cache_mode == CacheMode::Cache && !self.files_to_search.is_empty() {
            self.storage_cache = Some(get_cache_for_path(dir));
        }

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
        let embedding = self.embedder.embed_secure(&augmented).await
            .map_err(|e| SearchError::EmbeddingFailed(e.to_string()))?;

        self.files_to_search.push(path.clone());

        // Store in memory cache
        let mut cache = self.memory_cache.lock().await;
        cache.insert(path, embedding);

        Ok(())
    }

    /// Get the number of indexed files
    pub fn index_size(&self) -> usize {
        self.files_to_search.len()
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

    /// Get embedding for a file with lazy loading
    ///
    /// Checks caches in order:
    /// 1. Memory cache (fastest)
    /// 2. Persistent storage (ADS/xattr) - only in Cache mode
    /// 3. Compute embedding (slowest, stores in appropriate cache(s))
    async fn get_embedding(&self, path: &Path) -> Result<Vec<f32>, SearchError> {
        // 1. Check memory cache first
        {
            let cache = self.memory_cache.lock().await;
            if let Some(embedding) = cache.get(path) {
                let mut metrics = self.metrics.lock().await;
                metrics.cache_hits += 1;
                return Ok(embedding.clone());
            }
        }

        // 2. Read limited file content (hot path cap)
        let (content, bytes_read, file_hash) = read_text_for_embedding(path)?;
        {
            let mut metrics = self.metrics.lock().await;
            metrics.io_read_bytes += bytes_read as u64;
        }

        // 3. If Cache mode, check persistent storage (ADS/xattr)
        if self.cache_mode == CacheMode::Cache {
            if let Some(ref storage) = self.storage_cache {
                if let Ok(Some(embedding)) = storage.get(path, &file_hash) {
                    let mut metrics = self.metrics.lock().await;
                    metrics.cache_hits += 1;
                    // Store in memory cache for faster subsequent access
                    let mut cache = self.memory_cache.lock().await;
                    cache.insert(path.to_path_buf(), embedding.clone());
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
            cache.insert(path.to_path_buf(), embedding.clone());
        }

        // Store in persistent storage if in Cache mode
        if self.cache_mode == CacheMode::Cache {
            if let Some(ref storage) = self.storage_cache {
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
}

/// Read file contents with hard caps for hot path safety.
fn read_file_limited_bytes(path: &Path) -> Result<(Vec<u8>, usize), SearchError> {
    let file = std::fs::File::open(path).map_err(SearchError::Io)?;
    let mut buffer = Vec::with_capacity(MAX_BYTES_READ_PER_FILE.min(8192));
    let mut limited = file.take(MAX_BYTES_READ_PER_FILE as u64);
    let bytes_read = limited.read_to_end(&mut buffer).map_err(SearchError::Io)?;
    Ok((buffer, bytes_read))
}

fn read_text_for_embedding(path: &Path) -> Result<(String, usize, [u8; 32]), SearchError> {
    let (bytes, bytes_read) = read_file_limited_bytes(path)?;
    let file_hash = sha256(&bytes);

    let content = if is_heavy_format(path) {
        crate::parsers::extract_text(path, MAX_BYTES_READ_PER_FILE, MAX_TEXT_CHARS_PER_FILE)
            .unwrap_or_else(|| bytes_to_capped_string(&bytes))
    } else {
        bytes_to_capped_string(&bytes)
    };

    Ok((content, bytes_read, file_hash))
}

/// Convert bytes to a capped UTF-8 string for embedding.
fn bytes_to_capped_string(bytes: &[u8]) -> String {
    String::from_utf8_lossy(bytes)
        .chars()
        .take(MAX_TEXT_CHARS_PER_FILE)
        .collect()
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
    /// Rerank candidates using semantic similarity (P4.1 batch optimized)
    ///
    /// This method uses batch embedding for ~5-7x speedup over sequential processing.
    async fn rerank(
        &self,
        query: &str,
        candidates: Vec<LexicalMatch>,
    ) -> Result<Vec<SemanticMatch>, SearchError> {
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

        // Phase 1: Partition candidates into cached vs uncached
        let mut cached_results: Vec<(PathBuf, Vec<f32>)> = Vec::new();
        let mut uncached_candidates: Vec<(usize, PathBuf)> = Vec::new(); // (original index, path)
        let mut uncached_contents: Vec<(usize, PathBuf, String, [u8; 32])> = Vec::new(); // (idx, path, content, hash)

        {
            let cache = self.memory_cache.lock().await;
            for (idx, candidate) in candidates.iter().enumerate() {
                if let Some(embedding) = cache.get(&candidate.path) {
                    cached_results.push((candidate.path.clone(), embedding.clone()));
                } else {
                    uncached_candidates.push((idx, candidate.path.clone()));
                }
            }
        }

        // Update metrics for memory cache hits
        {
            let mut metrics = self.metrics.lock().await;
            metrics.cache_hits += cached_results.len();
        }

        // Phase 2: For uncached candidates, read file content and check persistent cache
        for (idx, path) in uncached_candidates {
            // Read file content
            let _span = content_extraction_span(&path);
            let _enter = _span.enter();
            let (content, bytes_read, file_hash) = match read_text_for_embedding(&path) {
                Ok(result) => result,
                Err(_) => continue, // Skip unreadable files
            };

            {
                let mut metrics = self.metrics.lock().await;
                metrics.io_read_bytes += bytes_read as u64;
            }

            // Check persistent cache (ADS/xattr) if in Cache mode
            if self.cache_mode == CacheMode::Cache {
                if let Some(ref storage) = self.storage_cache {
                    if let Ok(Some(embedding)) = storage.get(&path, &file_hash) {
                        // Found in persistent cache
                        let mut metrics = self.metrics.lock().await;
                        metrics.cache_hits += 1;
                        // Store in memory cache
                        let mut cache = self.memory_cache.lock().await;
                        cache.insert(path.clone(), embedding.clone());
                        cached_results.push((path, embedding));
                        continue;
                    }
                }
            }

            // Need to compute embedding - add to batch
            uncached_contents.push((idx, path, content, file_hash));
        }

        // Phase 3: Batch embed all uncached content at once (P4.1 optimization)
        let batch_embeddings = if !uncached_contents.is_empty() {
            let embed_start = std::time::Instant::now();

            // Extract just the content strings for batch embedding
            let texts: Vec<String> = uncached_contents
                .iter()
                .map(|(_, path, c, _)| build_augmented_text(path, c, &self.augmentation_config))
                .collect();

            let _span = embedding_batch_span(texts.len(), 0);
            let _enter = _span.enter();
            let embeddings = self
                .embedder
                .embed_batch_secure(&texts)
                .await
                .map_err(|e| SearchError::EmbeddingFailed(e.to_string()))?;

            let embed_elapsed = embed_start.elapsed().as_millis() as u64;
            {
                let mut metrics = self.metrics.lock().await;
                metrics.embedding_ms += embed_elapsed;
                metrics.candidates_embedded += embeddings.len();
            }

            tracing::debug!(
                "P4.1 batch embedded {} candidates in {}ms",
                embeddings.len(),
                embed_elapsed
            );

            embeddings
        } else {
            Vec::new()
        };

        // Phase 4: Store new embeddings in cache and collect results
        {
            let mut cache = self.memory_cache.lock().await;
            for (embedding, (_, path, _, file_hash)) in
                batch_embeddings.iter().zip(uncached_contents.iter())
            {
                cache.insert(path.clone(), embedding.clone());

                // Store in persistent cache if in Cache mode
                if self.cache_mode == CacheMode::Cache {
                    if let Some(ref storage) = self.storage_cache {
                        let _ = storage.set(path, file_hash, embedding);
                    }
                }

                cached_results.push((path.clone(), embedding.clone()));
            }
        }

        // Phase 5: Update directory centroids for observed embeddings
        {
            let mut centroids = self.directory_centroids.lock().await;
            for (path, embedding) in &cached_results {
                if let Some(parent) = path.parent() {
                    centroids.update(parent, embedding);
                    centroids.record_access(parent);
                }
            }
        }

        // Phase 6: Calculate similarities for all candidates
        let mut results: Vec<SemanticMatch> = Vec::new();
        let _rank_span = ranking_fusion_span(cached_results.len());
        let _rank_enter = _rank_span.enter();
        let centroids = self.directory_centroids.lock().await;
        for (path, embedding) in cached_results {
            let mut similarity = Self::cosine_similarity(&query_embedding, &embedding);

            if let Some(parent) = path.parent() {
                let centroid_boost = centroids
                    .similarity(parent, &query_embedding)
                    .unwrap_or(0.0);
                similarity += centroid_boost * self.centroid_boost_weight;
            }

            if let (Some(ref query_coord), Some((_, topo, weight))) =
                (fstd_query_coord.as_ref(), fstd_context.as_ref())
            {
                if let Some(dir_coord) = topo.coordinate_for_path(&path) {
                    let dist = l2_distance(query_coord, dir_coord);
                    let norm = (query_coord.len() as f32).sqrt().max(1.0);
                    let score = (1.0 - dist / norm).clamp(0.0, 1.0);
                    similarity += score * *weight;
                }
            }

            similarity = similarity.clamp(0.0, 1.0);

            if similarity >= self.min_score_threshold {
                results.push(SemanticMatch::new(path, similarity));
            }
        }

        // Sort by similarity descending
        results.sort_by(|a, b| {
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
        if self.files_to_search.is_empty() {
            return Ok(Vec::new());
        }

        // P2 FIX: HARD CAP to prevent scanning entire corpus
        // If there are too many files, truncate to prevent 40s+ searches
        let files_to_process: &[std::path::PathBuf] = if self.files_to_search.len()
            > MAX_CANDIDATES_FOR_EMBEDDING
        {
            tracing::warn!(
                total_files = self.files_to_search.len(),
                cap = MAX_CANDIDATES_FOR_EMBEDDING,
                "search_pure capped to prevent full-corpus scan. Use CandidateGenerator for better results."
            );
            &self.files_to_search[..MAX_CANDIDATES_FOR_EMBEDDING]
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
        let results = engine.rerank("test", Vec::new()).await.unwrap();
        assert!(results.is_empty());
    }
}
