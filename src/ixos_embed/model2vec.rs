//! Model2Vec embedding model implementation
//!
//! Provides real semantic embeddings using the Model2Vec Potion Base 8M model.
//! This model downloads from Hugging Face on first use (~30 MB).

use super::model::{EmbeddingModel, ModelError};
use crate::security::crypto::sha256;
use model2vec_rs::model::StaticModel;

/// Real embedding model using Model2Vec Potion Base 8M
///
/// This model provides actual semantic understanding, unlike StubModel
/// which only produces deterministic hashes.
///
/// # Performance
/// - Model size: ~30 MB (downloads on first use)
/// - Memory footprint: ~110 MB runtime
/// - Embedding time: <1ms per text (before constant-time floor)
/// - Dimensions: varies by model (256 for potion-base-8M)
pub struct Model2VecEmbedder {
    model: StaticModel,
    model_id: u8,
    fingerprint: [u8; 32],
    dims: usize,
}

impl Model2VecEmbedder {
    /// Default model ID for Hugging Face Hub
    pub const DEFAULT_MODEL: &'static str = "minishlab/potion-base-8M";

    /// Create with the default model (potion-base-8M)
    ///
    /// Downloads the model from Hugging Face Hub on first use.
    /// Model is cached in `~/.cache/huggingface/hub/` for subsequent runs.
    ///
    /// # Errors
    /// Returns `ModelError::LoadError` if the model cannot be downloaded or loaded.
    pub fn new() -> Result<Self, ModelError> {
        Self::from_pretrained(Self::DEFAULT_MODEL)
    }

    /// Create from a specific Hugging Face model
    ///
    /// # Arguments
    /// * `model_id` - Hugging Face model ID (e.g., "minishlab/potion-base-8M")
    pub fn from_pretrained(model_id: &str) -> Result<Self, ModelError> {
        tracing::info!("Loading Model2Vec model: {}", model_id);

        // StaticModel::from_pretrained takes (repo_or_path, token, normalize, subfolder)
        let model = StaticModel::from_pretrained(
            model_id, None, // token
            None, // normalize (use config.json default)
            None, // subfolder
        )
        .map_err(|e| ModelError::LoadError(format!("Failed to load {}: {}", model_id, e)))?;

        // Get dimensions by encoding a test string
        let test_embedding = model.encode_single("test");
        let dims = test_embedding.len();

        // Create fingerprint from model ID + version
        let fingerprint_input = format!("model2vec_{}_{}", model_id, env!("CARGO_PKG_VERSION"));
        let fingerprint = sha256(fingerprint_input.as_bytes());

        tracing::info!("Model2Vec loaded successfully. Dimensions: {}", dims);

        Ok(Self {
            model,
            model_id: 1, // 1 = Model2Vec, 0 = Stub
            fingerprint,
            dims,
        })
    }

    /// Create from a local path
    ///
    /// # Arguments
    /// * `path` - Path to the model directory containing model files
    pub fn from_path(path: &std::path::Path) -> Result<Self, ModelError> {
        tracing::info!("Loading Model2Vec model from: {:?}", path);

        let model = StaticModel::from_pretrained(path.to_string_lossy().as_ref(), None, None, None)
            .map_err(|e| ModelError::LoadError(format!("Failed to load from {:?}: {}", path, e)))?;

        let test_embedding = model.encode_single("test");
        let dims = test_embedding.len();

        let fingerprint_input = format!("model2vec_local_{:?}", path);
        let fingerprint = sha256(fingerprint_input.as_bytes());

        Ok(Self {
            model,
            model_id: 1,
            fingerprint,
            dims,
        })
    }
}

impl EmbeddingModel for Model2VecEmbedder {
    fn embed(&self, text: &str) -> Result<Vec<f32>, ModelError> {
        // Use encode_single for a single text input
        let embedding = self.model.encode_single(text);

        if embedding.is_empty() {
            return Err(ModelError::Inference("No embeddings returned".to_string()));
        }

        // Normalize to unit length for cosine similarity
        let magnitude: f32 = embedding.iter().map(|x| x * x).sum::<f32>().sqrt();
        let normalized: Vec<f32> = if magnitude > 0.0 {
            embedding.iter().map(|x| x / magnitude).collect()
        } else {
            embedding
        };

        Ok(normalized)
    }

    /// Batch embed multiple texts using native model2vec batch API (P4.1 optimization)
    ///
    /// This provides ~5-7x speedup over sequential embedding by:
    /// - Batching tokenization
    /// - Amortizing model overhead
    /// - Better cache locality
    fn embed_batch(&self, texts: &[String]) -> Result<Vec<Vec<f32>>, ModelError> {
        if texts.is_empty() {
            return Ok(Vec::new());
        }

        // Use native batch encode API from model2vec-rs
        // StaticModel::encode takes &[impl AsRef<str>] and returns Vec<Vec<f32>>
        let embeddings = self.model.encode(texts);

        if embeddings.len() != texts.len() {
            return Err(ModelError::Inference(format!(
                "Batch size mismatch: {} inputs, {} outputs",
                texts.len(),
                embeddings.len()
            )));
        }

        // Normalize all embeddings to unit length
        let normalized: Vec<Vec<f32>> = embeddings
            .into_iter()
            .map(|emb| {
                let magnitude: f32 = emb.iter().map(|x| x * x).sum::<f32>().sqrt();
                if magnitude > 0.0 {
                    emb.into_iter().map(|x| x / magnitude).collect()
                } else {
                    emb
                }
            })
            .collect();

        Ok(normalized)
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

    // Note: These tests require network access and will download the model
    // They are marked #[ignore] by default to avoid slowing down CI

    #[test]
    #[ignore = "requires network access to download model"]
    fn test_model2vec_creation() {
        let result = Model2VecEmbedder::new();
        assert!(
            result.is_ok(),
            "Failed to create Model2Vec: {:?}",
            result.err()
        );
    }

    #[test]
    #[ignore = "requires network access to download model"]
    fn test_model2vec_embed() {
        let model = Model2VecEmbedder::new().expect("Failed to load model");
        let embedding = model.embed("hello world").expect("Failed to embed");

        // Check dimensions
        assert!(embedding.len() > 0, "Embedding should not be empty");

        // Check normalization (unit length)
        let magnitude: f32 = embedding.iter().map(|x| x * x).sum::<f32>().sqrt();
        assert!(
            (magnitude - 1.0).abs() < 0.01,
            "Embedding not normalized: magnitude = {}",
            magnitude
        );
    }

    #[test]
    #[ignore = "requires network access to download model"]
    fn test_model2vec_similarity() {
        let model = Model2VecEmbedder::new().expect("Failed to load model");

        let emb_hello = model.embed("hello world").expect("Failed to embed");
        let emb_greetings = model.embed("greetings planet").expect("Failed to embed");
        let emb_unrelated = model
            .embed("quantum physics equations")
            .expect("Failed to embed");

        // Calculate cosine similarities
        fn cosine_sim(a: &[f32], b: &[f32]) -> f32 {
            a.iter().zip(b.iter()).map(|(x, y)| x * y).sum()
        }

        let sim_similar = cosine_sim(&emb_hello, &emb_greetings);
        let sim_unrelated = cosine_sim(&emb_hello, &emb_unrelated);

        // Similar phrases should have higher similarity than unrelated ones
        assert!(
            sim_similar > sim_unrelated,
            "Expected similar phrases to have higher similarity: {} vs {}",
            sim_similar,
            sim_unrelated
        );
    }

    #[test]
    fn test_model_id() {
        // This test doesn't require network - just checks the struct
        let _fingerprint = sha256(b"test");
        // We can't easily test without loading, so just verify constants
        assert_eq!(Model2VecEmbedder::DEFAULT_MODEL, "minishlab/potion-base-8M");
    }
}
