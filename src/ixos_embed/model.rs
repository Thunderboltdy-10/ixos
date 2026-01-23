//! Embedding model trait and implementations
//!
//! Provides:
//! - `EmbeddingModel` trait for generating semantic embeddings
//! - `StubModel` for testing without actual ML model
//! - `Model2VecEmbedder` for production semantic embeddings
//! - `MmapModel2VecEmbedder` for lazy-loaded embeddings with near-zero startup
//!
//! ## P1.3 Int8 Quantization (Future Work)
//!
//! Int8 quantization would provide 2x inference speedup by:
//! - Reducing model size from 30MB to 7.5MB
//! - Enabling SIMD int8 operations (AVX2/NEON)
//! - Reducing memory bandwidth requirements
//!
//! This requires model2vec-rs to expose int8 quantization APIs or
//! custom safetensors loading with int8 weight conversion.

use crate::security::crypto::sha256;

/// Number of dimensions for embeddings
pub const EMBEDDING_DIMS: usize = 64;

/// Trait for embedding models
///
/// Implementations generate semantic embeddings from text content.
/// Embeddings are fixed-length vectors that capture the "meaning" of text.
pub trait EmbeddingModel: Send + Sync {
    /// Generate an embedding vector from text
    ///
    /// # Arguments
    /// * `text` - Input text to embed
    ///
    /// # Returns
    /// A vector of f32 values (typically 64 dimensions)
    fn embed(&self, text: &str) -> Result<Vec<f32>, ModelError>;

    /// Generate embeddings for multiple texts in a single batch (P4.1 optimization)
    ///
    /// This method provides significant performance improvements by batching
    /// multiple texts together, reducing per-call overhead and enabling
    /// more efficient use of the model.
    ///
    /// # Arguments
    /// * `texts` - Slice of texts to embed
    ///
    /// # Returns
    /// A vector of embedding vectors, one per input text
    ///
    /// # Default Implementation
    /// Falls back to calling `embed()` for each text sequentially.
    /// Implementations should override for better performance.
    fn embed_batch(&self, texts: &[String]) -> Result<Vec<Vec<f32>>, ModelError> {
        texts.iter().map(|t| self.embed(t)).collect()
    }

    /// Get the number of dimensions in the embedding
    fn dimensions(&self) -> usize;

    /// Get the model identifier (for versioning)
    fn model_id(&self) -> u8;

    /// Get the model fingerprint (SHA256 of weights, for cache invalidation)
    fn fingerprint(&self) -> [u8; 32];
}

/// Errors from embedding model operations
#[derive(Debug, thiserror::Error)]
pub enum ModelError {
    #[error("Model not loaded")]
    NotLoaded,

    #[error("Failed to load model: {0}")]
    LoadError(String),

    #[error("Input too long: {0} chars (max {1})")]
    InputTooLong(usize, usize),

    #[error("Inference error: {0}")]
    Inference(String),
}

/// Stub embedding model for testing
///
/// Generates deterministic embeddings based on input hash.
/// This allows testing P0.1 and P0.2 without loading a real ML model.
pub struct StubModel {
    dims: usize,
    model_id: u8,
    fingerprint: [u8; 32],
}

impl StubModel {
    /// Create a new stub model with default settings
    pub fn new() -> Self {
        Self {
            dims: EMBEDDING_DIMS,
            model_id: 0, // 0 = stub model
            fingerprint: sha256(b"stub_model_v1"),
        }
    }

    /// Create a stub model with custom dimensions
    pub fn with_dims(dims: usize) -> Self {
        Self {
            dims,
            model_id: 0,
            fingerprint: sha256(b"stub_model_v1"),
        }
    }

    /// Create a stub model with custom fingerprint (for testing cache invalidation)
    pub fn with_fingerprint(fingerprint: [u8; 32]) -> Self {
        Self {
            dims: EMBEDDING_DIMS,
            model_id: 0,
            fingerprint,
        }
    }
}

impl Default for StubModel {
    fn default() -> Self {
        Self::new()
    }
}

impl EmbeddingModel for StubModel {
    fn embed(&self, text: &str) -> Result<Vec<f32>, ModelError> {
        // Generate deterministic embedding based on text hash
        // This allows reproducible testing
        let hash = sha256(text.as_bytes());

        let mut embedding = Vec::with_capacity(self.dims);

        // Use hash bytes to generate embedding values
        // Each pair of bytes becomes one f32 value in range [-1, 1]
        for i in 0..self.dims {
            let byte_idx = i % 32;
            let value = ((hash[byte_idx] as f32 / 255.0) * 2.0) - 1.0;
            embedding.push(value);
        }

        // Normalize to unit length (important for cosine similarity)
        let magnitude: f32 = embedding.iter().map(|x| x * x).sum::<f32>().sqrt();
        if magnitude > 0.0 {
            for val in &mut embedding {
                *val /= magnitude;
            }
        }

        Ok(embedding)
    }

    fn dimensions(&self) -> usize {
        self.dims
    }

    fn model_id(&self) -> u8 {
        self.model_id
    }

    fn fingerprint(&self) -> [u8; 32] {
        self.fingerprint
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_stub_model_dimensions() {
        let model = StubModel::new();
        assert_eq!(model.dimensions(), EMBEDDING_DIMS);
    }

    #[test]
    fn test_stub_model_embed_length() {
        let model = StubModel::new();
        let embedding = model.embed("test input").unwrap();
        assert_eq!(embedding.len(), EMBEDDING_DIMS);
    }

    #[test]
    fn test_stub_model_deterministic() {
        let model = StubModel::new();
        let emb1 = model.embed("hello world").unwrap();
        let emb2 = model.embed("hello world").unwrap();
        assert_eq!(emb1, emb2);
    }

    #[test]
    fn test_stub_model_different_inputs() {
        let model = StubModel::new();
        let emb1 = model.embed("hello").unwrap();
        let emb2 = model.embed("world").unwrap();
        assert_ne!(emb1, emb2);
    }

    #[test]
    fn test_stub_model_normalized() {
        let model = StubModel::new();
        let embedding = model.embed("test").unwrap();

        // Check unit length
        let magnitude: f32 = embedding.iter().map(|x| x * x).sum::<f32>().sqrt();
        assert!(
            (magnitude - 1.0).abs() < 0.001,
            "Embedding not normalized: magnitude = {}",
            magnitude
        );
    }

    #[test]
    fn test_stub_model_custom_dims() {
        let model = StubModel::with_dims(128);
        assert_eq!(model.dimensions(), 128);

        let embedding = model.embed("test").unwrap();
        assert_eq!(embedding.len(), 128);
    }

    #[test]
    fn test_stub_model_fingerprint() {
        let model = StubModel::new();
        let fp = model.fingerprint();
        assert_eq!(fp.len(), 32);
        // Fingerprint should be consistent
        assert_eq!(fp, sha256(b"stub_model_v1"));
    }

    #[test]
    fn test_stub_model_embed_batch() {
        let model = StubModel::new();
        let texts = vec![
            "hello world".to_string(),
            "goodbye world".to_string(),
            "test input".to_string(),
        ];

        let embeddings = model.embed_batch(&texts).unwrap();
        assert_eq!(embeddings.len(), 3);

        // Each embedding should match single embed result
        for (text, batch_emb) in texts.iter().zip(embeddings.iter()) {
            let single_emb = model.embed(text).unwrap();
            assert_eq!(batch_emb, &single_emb);
        }
    }

    #[test]
    fn test_stub_model_embed_batch_empty() {
        let model = StubModel::new();
        let embeddings = model.embed_batch(&[]).unwrap();
        assert!(embeddings.is_empty());
    }
}
