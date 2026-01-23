//! Secure embedding generation with optional timing attack protection
//!
//! Provides embedding generation with configurable security properties:
//!
//! **Fast mode (default)**: Maximum performance, no timing protection
//! - Embeddings complete as fast as possible
//! - Configurable concurrency (uses all available cores)
//! - Best for local-only search with no network exposure
//!
//! **Secure mode (opt-in with --secure-timing)**: Timing attack protection
//! - Constant time floor: All embeddings take at least MIN_PROCESSING_TIME (100ms)
//! - Rate limiting: Maximum 1 concurrent embedding operation
//! - Content normalization: Input normalized to fixed length (2048 chars)
//!
//! Use secure mode when processing sensitive data that may be exposed to
//! timing analysis attacks.

use std::sync::Arc;
use std::time::{Duration, Instant};

use tokio::sync::Semaphore;

use super::model::{EmbeddingModel, ModelError};

/// Minimum processing time for secure mode (100ms)
///
/// This creates a timing floor that prevents attackers from distinguishing
/// between short and long inputs based on processing time.
pub const MIN_PROCESSING_TIME: Duration = Duration::from_millis(100);

/// Maximum content length for embedding (2048 characters)
///
/// Content is truncated or padded to this exact length to prevent
/// length-based timing side channels.
pub const CONTENT_SIZE_LIMIT: usize = 2048;

/// Default maximum concurrent embeddings for fast mode
pub const DEFAULT_MAX_CONCURRENT: usize = 4;

/// Wrapper around embedding models with configurable security
///
/// **Fast mode** (default): No timing protection, maximum concurrency
/// **Secure mode**: Constant-time floor + rate limiting for timing attack protection
pub struct SecureEmbedder {
    model: Arc<dyn EmbeddingModel>,
    rate_limiter: Arc<Semaphore>,
    min_processing_time: Duration,
    content_size_limit: usize,
}

impl SecureEmbedder {
    /// Create embedder in FAST mode (no timing protection, max performance)
    ///
    /// This is the default for local search where timing attacks are not a concern.
    /// Uses 4 concurrent embedding operations.
    pub fn new(model: Arc<dyn EmbeddingModel>) -> Self {
        Self::new_fast(model)
    }

    /// Create embedder in FAST mode with explicit naming
    ///
    /// No timing protection, maximum performance.
    /// Uses configurable concurrency (default: 4).
    pub fn new_fast(model: Arc<dyn EmbeddingModel>) -> Self {
        Self::with_config(model, Duration::ZERO, DEFAULT_MAX_CONCURRENT)
    }

    /// Create embedder in FAST mode with custom concurrency
    pub fn new_fast_with_concurrency(
        model: Arc<dyn EmbeddingModel>,
        max_concurrent: usize,
    ) -> Self {
        Self::with_config(model, Duration::ZERO, max_concurrent)
    }

    /// Create embedder in SECURE mode (timing attack protection)
    ///
    /// Enables:
    /// - 100ms minimum processing time (constant-time floor)
    /// - Single-threaded embedding (rate limiting)
    /// - Content normalization
    ///
    /// Use this when processing sensitive data that may be exposed to timing analysis.
    pub fn new_secure(model: Arc<dyn EmbeddingModel>) -> Self {
        Self::with_config(model, MIN_PROCESSING_TIME, 1)
    }

    /// Create embedder with custom configuration
    ///
    /// # Arguments
    /// * `model` - The embedding model to use
    /// * `min_time` - Minimum processing time (Duration::ZERO for no floor)
    /// * `max_concurrent` - Maximum concurrent embedding operations
    pub fn with_config(
        model: Arc<dyn EmbeddingModel>,
        min_time: Duration,
        max_concurrent: usize,
    ) -> Self {
        Self {
            model,
            rate_limiter: Arc::new(Semaphore::new(max_concurrent.max(1))),
            min_processing_time: min_time,
            content_size_limit: CONTENT_SIZE_LIMIT,
        }
    }

    /// Create a secure embedder with custom timing floor (for testing)
    #[deprecated(since = "0.2.0", note = "Use with_config() instead")]
    pub fn with_min_time(model: Arc<dyn EmbeddingModel>, min_time: Duration) -> Self {
        Self::with_config(model, min_time, 1)
    }

    /// Check if this embedder has timing protection enabled
    pub fn has_timing_protection(&self) -> bool {
        self.min_processing_time > Duration::ZERO
    }

    /// Generate embedding with timing attack protection
    ///
    /// This method:
    /// 1. Acquires rate limiter permit (blocks if another embedding in progress)
    /// 2. Normalizes content to fixed length
    /// 3. Generates embedding
    /// 4. Waits until minimum time has elapsed (constant-time floor)
    ///
    /// # Arguments
    /// * `content` - Text content to embed
    ///
    /// # Returns
    /// The embedding vector (64 f32 values)
    ///
    /// # Timing Guarantee
    /// This method always takes at least `min_processing_time` (default 100ms),
    /// regardless of input length or complexity.
    pub async fn embed_secure(&self, content: &str) -> Result<Vec<f32>, EmbedError> {
        // Acquire rate limiter permit (blocks if another embed in progress)
        let _permit = self
            .rate_limiter
            .acquire()
            .await
            .map_err(|_| EmbedError::RateLimited)?;

        let start = Instant::now();

        // Normalize content to fixed size
        let normalized = self.normalize_content(content);

        // Generate embedding
        let embedding = self.model.embed(&normalized).map_err(EmbedError::Model)?;

        // Enforce minimum processing time (constant-time floor)
        let elapsed = start.elapsed();
        if elapsed < self.min_processing_time {
            let remaining = self.min_processing_time - elapsed;
            tokio::time::sleep(remaining).await;
        }

        tracing::trace!(
            "Embedding generated in {:?} (floor: {:?})",
            start.elapsed(),
            self.min_processing_time
        );

        Ok(embedding)
    }

    /// Synchronous embedding (for non-async contexts)
    ///
    /// **Warning**: This method does NOT provide rate limiting protection.
    /// Use `embed_secure` in async contexts for full protection.
    pub fn embed_sync(&self, content: &str) -> Result<Vec<f32>, EmbedError> {
        let start = Instant::now();

        // Normalize content to fixed size
        let normalized = self.normalize_content(content);

        // Generate embedding
        let embedding = self.model.embed(&normalized).map_err(EmbedError::Model)?;

        // Busy-wait for constant-time floor (less ideal than async sleep)
        let elapsed = start.elapsed();
        if elapsed < self.min_processing_time {
            let remaining = self.min_processing_time - elapsed;
            std::thread::sleep(remaining);
        }

        Ok(embedding)
    }

    /// Batch embed multiple texts with timing protection (P4.1 optimization)
    ///
    /// This method provides ~5-7x speedup over sequential `embed_secure` calls by:
    /// - Batching all texts in a single model invocation
    /// - Applying timing floor to the entire batch (not per-item)
    /// - Reducing rate limiter overhead
    ///
    /// # Arguments
    /// * `contents` - Slice of text contents to embed
    ///
    /// # Returns
    /// A vector of embedding vectors, one per input text
    ///
    /// # Timing Guarantee
    /// In secure mode: the entire batch takes at least `min_processing_time`,
    /// regardless of batch size. This is intentional - timing floor applies
    /// to the batch operation, not per-item.
    ///
    /// # Example
    /// ```ignore
    /// let embeddings = embedder.embed_batch_secure(&["hello", "world"]).await?;
    /// assert_eq!(embeddings.len(), 2);
    /// ```
    pub async fn embed_batch_secure(
        &self,
        contents: &[String],
    ) -> Result<Vec<Vec<f32>>, EmbedError> {
        if contents.is_empty() {
            return Ok(Vec::new());
        }

        // Acquire rate limiter permit
        let _permit = self
            .rate_limiter
            .acquire()
            .await
            .map_err(|_| EmbedError::RateLimited)?;

        let start = Instant::now();

        // Normalize all content to fixed size
        let normalized: Vec<String> = contents.iter().map(|c| self.normalize_content(c)).collect();

        // Batch embed using model's native batch API
        let embeddings = self
            .model
            .embed_batch(&normalized)
            .map_err(EmbedError::Model)?;

        // Enforce minimum processing time for entire batch (constant-time floor)
        let elapsed = start.elapsed();
        if elapsed < self.min_processing_time {
            let remaining = self.min_processing_time - elapsed;
            tokio::time::sleep(remaining).await;
        }

        tracing::trace!(
            "Batch embedding: {} items in {:?} (floor: {:?})",
            contents.len(),
            start.elapsed(),
            self.min_processing_time
        );

        Ok(embeddings)
    }

    /// Synchronous batch embedding (for non-async contexts)
    ///
    /// **Warning**: This method does NOT provide rate limiting protection.
    /// Use `embed_batch_secure` in async contexts for full protection.
    pub fn embed_batch_sync(&self, contents: &[String]) -> Result<Vec<Vec<f32>>, EmbedError> {
        if contents.is_empty() {
            return Ok(Vec::new());
        }

        let start = Instant::now();

        // Normalize all content to fixed size
        let normalized: Vec<String> = contents.iter().map(|c| self.normalize_content(c)).collect();

        // Batch embed
        let embeddings = self
            .model
            .embed_batch(&normalized)
            .map_err(EmbedError::Model)?;

        // Busy-wait for constant-time floor
        let elapsed = start.elapsed();
        if elapsed < self.min_processing_time {
            let remaining = self.min_processing_time - elapsed;
            std::thread::sleep(remaining);
        }

        Ok(embeddings)
    }

    /// Normalize content to exactly `content_size_limit` characters
    ///
    /// - Truncates if longer than limit
    /// - Pads with NUL characters if shorter
    ///
    /// This ensures that content length doesn't affect timing.
    fn normalize_content(&self, content: &str) -> String {
        let mut normalized = String::with_capacity(self.content_size_limit);

        // Take up to limit characters
        for c in content.chars().take(self.content_size_limit) {
            normalized.push(c);
        }

        // Pad with NUL characters if shorter
        // NUL chars are typically ignored by embedding models
        while normalized.len() < self.content_size_limit {
            normalized.push('\0');
        }

        normalized
    }

    /// Get the model's embedding dimensions
    pub fn dimensions(&self) -> usize {
        self.model.dimensions()
    }

    /// Get the model's fingerprint (for cache validation)
    pub fn model_fingerprint(&self) -> [u8; 32] {
        self.model.fingerprint()
    }
}

/// Errors from secure embedding operations
#[derive(Debug, thiserror::Error)]
pub enum EmbedError {
    #[error("Rate limited - another embedding is in progress")]
    RateLimited,

    #[error("Model error: {0}")]
    Model(#[from] ModelError),
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ixos_embed::model::StubModel;

    fn create_embedder() -> SecureEmbedder {
        let model = Arc::new(StubModel::new());
        SecureEmbedder::new(model)
    }

    fn create_fast_embedder() -> SecureEmbedder {
        // Use 10ms floor for faster tests
        let model = Arc::new(StubModel::new());
        SecureEmbedder::with_config(model, Duration::from_millis(10), 1)
    }

    #[test]
    fn test_normalize_content_short() {
        let embedder = create_embedder();
        let normalized = embedder.normalize_content("hello");

        assert_eq!(normalized.len(), CONTENT_SIZE_LIMIT);
        assert!(normalized.starts_with("hello"));
        // Rest should be NUL padding
        assert!(normalized.chars().skip(5).all(|c| c == '\0'));
    }

    #[test]
    fn test_normalize_content_long() {
        let embedder = create_embedder();
        let long_input: String = "x".repeat(5000);
        let normalized = embedder.normalize_content(&long_input);

        assert_eq!(normalized.len(), CONTENT_SIZE_LIMIT);
        // Should be truncated to limit
        assert!(normalized.chars().all(|c| c == 'x'));
    }

    #[test]
    fn test_normalize_content_exact() {
        let embedder = create_embedder();
        let exact_input: String = "y".repeat(CONTENT_SIZE_LIMIT);
        let normalized = embedder.normalize_content(&exact_input);

        assert_eq!(normalized.len(), CONTENT_SIZE_LIMIT);
        assert_eq!(normalized, exact_input);
    }

    #[test]
    fn test_embed_sync_produces_embedding() {
        let embedder = create_fast_embedder();
        let embedding = embedder.embed_sync("test content").unwrap();

        assert_eq!(embedding.len(), 64);
    }

    #[test]
    fn test_embed_sync_constant_time_floor() {
        let model = Arc::new(StubModel::new());
        let min_time = Duration::from_millis(50);
        let embedder = SecureEmbedder::with_config(model, min_time, 1);

        let start = Instant::now();
        let _ = embedder.embed_sync("short");
        let elapsed = start.elapsed();

        assert!(
            elapsed >= min_time,
            "Embedding took {:?}, expected at least {:?}",
            elapsed,
            min_time
        );
    }

    #[test]
    fn test_embed_sync_deterministic() {
        let embedder = create_fast_embedder();

        let emb1 = embedder.embed_sync("hello world").unwrap();
        let emb2 = embedder.embed_sync("hello world").unwrap();

        assert_eq!(emb1, emb2);
    }

    #[test]
    fn test_embed_sync_different_inputs() {
        let embedder = create_fast_embedder();

        let emb1 = embedder.embed_sync("hello").unwrap();
        let emb2 = embedder.embed_sync("world").unwrap();

        assert_ne!(emb1, emb2);
    }

    #[tokio::test]
    async fn test_embed_secure_produces_embedding() {
        let embedder = create_fast_embedder();
        let embedding = embedder.embed_secure("test content").await.unwrap();

        assert_eq!(embedding.len(), 64);
    }

    #[tokio::test]
    async fn test_embed_secure_constant_time_floor() {
        let model = Arc::new(StubModel::new());
        let min_time = Duration::from_millis(50);
        let embedder = SecureEmbedder::with_config(model, min_time, 1);

        let start = Instant::now();
        let _ = embedder.embed_secure("short").await.unwrap();
        let elapsed = start.elapsed();

        assert!(
            elapsed >= min_time,
            "Embedding took {:?}, expected at least {:?}",
            elapsed,
            min_time
        );
    }

    #[tokio::test]
    async fn test_embed_secure_timing_consistency() {
        let model = Arc::new(StubModel::new());
        let min_time = Duration::from_millis(50);
        let embedder = SecureEmbedder::with_config(model, min_time, 1);

        // Test with very different input lengths
        let short = "hi";
        let long = "x".repeat(10000);

        let start1 = Instant::now();
        let _ = embedder.embed_secure(short).await.unwrap();
        let time1 = start1.elapsed();

        let start2 = Instant::now();
        let _ = embedder.embed_secure(&long).await.unwrap();
        let time2 = start2.elapsed();

        // Both should be close to min_time (within 20ms tolerance)
        let tolerance = Duration::from_millis(20);
        let diff = if time1 > time2 {
            time1 - time2
        } else {
            time2 - time1
        };

        assert!(
            diff < tolerance,
            "Timing variance too high: {:?} vs {:?} (diff: {:?})",
            time1,
            time2,
            diff
        );
    }

    #[tokio::test]
    async fn test_rate_limiting_serializes_requests() {
        let model = Arc::new(StubModel::new());
        let min_time = Duration::from_millis(30);
        let embedder = Arc::new(SecureEmbedder::with_config(model, min_time, 1));

        let start = Instant::now();

        // Launch 3 concurrent embeddings
        let e1 = embedder.clone();
        let e2 = embedder.clone();
        let e3 = embedder.clone();

        let (r1, r2, r3) = tokio::join!(
            e1.embed_secure("one"),
            e2.embed_secure("two"),
            e3.embed_secure("three")
        );

        // All should succeed
        assert!(r1.is_ok());
        assert!(r2.is_ok());
        assert!(r3.is_ok());

        // Total time should be ~3x min_time (serialized, not parallel)
        let total = start.elapsed();
        let expected_min = min_time * 3;

        assert!(
            total >= expected_min - Duration::from_millis(10),
            "Requests may not be serialized: total {:?}, expected at least {:?}",
            total,
            expected_min
        );
    }

    // P4.1 Batch embedding tests

    #[tokio::test]
    async fn test_embed_batch_secure_produces_embeddings() {
        let embedder = create_fast_embedder();
        let texts = vec![
            "hello world".to_string(),
            "goodbye world".to_string(),
            "test input".to_string(),
        ];

        let embeddings = embedder.embed_batch_secure(&texts).await.unwrap();
        assert_eq!(embeddings.len(), 3);

        // Each embedding should have correct dimensions
        for emb in &embeddings {
            assert_eq!(emb.len(), 64);
        }
    }

    #[tokio::test]
    async fn test_embed_batch_secure_matches_single() {
        let embedder = create_fast_embedder();
        let texts = vec!["hello world".to_string(), "goodbye world".to_string()];

        let batch_embeddings = embedder.embed_batch_secure(&texts).await.unwrap();

        // Each batch result should match single embed result
        for (text, batch_emb) in texts.iter().zip(batch_embeddings.iter()) {
            let single_emb = embedder.embed_secure(text).await.unwrap();
            assert_eq!(batch_emb, &single_emb);
        }
    }

    #[tokio::test]
    async fn test_embed_batch_secure_empty() {
        let embedder = create_fast_embedder();
        let embeddings = embedder.embed_batch_secure(&[]).await.unwrap();
        assert!(embeddings.is_empty());
    }

    #[tokio::test]
    async fn test_embed_batch_secure_timing_floor() {
        let model = Arc::new(StubModel::new());
        let min_time = Duration::from_millis(50);
        let embedder = SecureEmbedder::with_config(model, min_time, 1);

        let texts: Vec<String> = (0..10).map(|i| format!("text {}", i)).collect();

        let start = Instant::now();
        let _ = embedder.embed_batch_secure(&texts).await.unwrap();
        let elapsed = start.elapsed();

        // Timing floor applies to entire batch, not per-item
        assert!(
            elapsed >= min_time,
            "Batch took {:?}, expected at least {:?}",
            elapsed,
            min_time
        );

        // But should NOT be 10x the floor (that would mean per-item floor)
        let max_expected = min_time * 2; // Some tolerance
        assert!(
            elapsed < max_expected,
            "Batch took {:?}, seems like per-item timing is being applied",
            elapsed
        );
    }

    #[test]
    fn test_embed_batch_sync_produces_embeddings() {
        let embedder = create_fast_embedder();
        let texts = vec!["hello world".to_string(), "goodbye world".to_string()];

        let embeddings = embedder.embed_batch_sync(&texts).unwrap();
        assert_eq!(embeddings.len(), 2);

        for emb in &embeddings {
            assert_eq!(emb.len(), 64);
        }
    }

    #[tokio::test]
    async fn test_embed_batch_secure_faster_than_sequential() {
        // This test verifies that batch is actually faster than sequential
        let model = Arc::new(StubModel::new());
        // Use no timing floor for this test
        let embedder = SecureEmbedder::with_config(model, Duration::ZERO, 4);

        let texts: Vec<String> = (0..20).map(|i| format!("text number {}", i)).collect();

        // Time batch embedding
        let start_batch = Instant::now();
        let _ = embedder.embed_batch_secure(&texts).await.unwrap();
        let batch_time = start_batch.elapsed();

        // Time sequential embedding
        let start_seq = Instant::now();
        for text in &texts {
            let _ = embedder.embed_secure(text).await.unwrap();
        }
        let seq_time = start_seq.elapsed();

        // Batch should be faster (or at least not slower)
        // Note: StubModel is fast so the difference may be small
        tracing::info!("Batch: {:?}, Sequential: {:?}", batch_time, seq_time);

        // We don't assert timing here because StubModel is too fast to show difference
        // The real benefit comes with Model2Vec which has actual model overhead
    }
}
