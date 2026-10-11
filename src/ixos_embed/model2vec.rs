//! Model2Vec embedding model implementation
//!
//! Provides real semantic embeddings using the Model2Vec Potion Base 8M model.
//! This model downloads from Hugging Face on first use (~30 MB).

use super::model::{EmbeddingModel, ModelError};
use crate::security::crypto::{sha256, sha256_file};
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
    tokenizer_settings: serde_json::Value,
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
        if std::path::Path::new(model_id).exists() {
            return Self::from_path(std::path::Path::new(model_id));
        }
        let api =
            hf_hub::api::sync::Api::new().map_err(|e| ModelError::LoadError(e.to_string()))?;
        let repo = api.model(model_id.to_owned());
        let mut snapshot = None;
        for filename in ["tokenizer.json", "model.safetensors", "config.json"] {
            let file = repo
                .get(filename)
                .map_err(|e| ModelError::LoadError(e.to_string()))?;
            let parent = file
                .parent()
                .ok_or_else(|| ModelError::LoadError("Missing model snapshot directory".into()))?
                .to_path_buf();
            if snapshot
                .as_ref()
                .is_some_and(|previous| previous != &parent)
            {
                return Err(ModelError::LoadError(
                    "Model revision changed during download; retry loading a consistent snapshot"
                        .into(),
                ));
            }
            snapshot = Some(parent);
        }
        Self::from_path(&snapshot.expect("Three model files were resolved"))
    }

    /// Create from a local path
    ///
    /// # Arguments
    /// * `path` - Path to the model directory containing model files
    pub fn from_path(path: &std::path::Path) -> Result<Self, ModelError> {
        tracing::info!("Loading Model2Vec model from: {:?}", path);
        let fingerprint = artifact_fingerprint(path)?;
        let tokenizer: serde_json::Value = serde_json::from_slice(
            &std::fs::read(path.join("tokenizer.json"))
                .map_err(|e| ModelError::LoadError(e.to_string()))?,
        )
        .map_err(|e| ModelError::LoadError(e.to_string()))?;
        let tokenizer_settings = serde_json::json!({"truncation":tokenizer.get("truncation"),"padding":tokenizer.get("padding")});

        let model = StaticModel::from_pretrained(path.to_string_lossy().as_ref(), None, None, None)
            .map_err(|e| ModelError::LoadError(format!("Failed to load from {:?}: {}", path, e)))?;

        let test_embedding = model.encode_single("test");
        let dims = test_embedding.len();

        if artifact_fingerprint(path)? != fingerprint {
            return Err(ModelError::LoadError(
                "Model files changed while loading; retry with a stable model directory".into(),
            ));
        }

        Ok(Self {
            model,
            model_id: 1,
            fingerprint,
            dims,
            tokenizer_settings,
        })
    }

    /// Actual inherited input rules; disabling the API cap does not disable these.
    pub fn tokenizer_settings(&self) -> &serde_json::Value {
        &self.tokenizer_settings
    }

    /// Explicit input coverage for controlled experiments and passage callers.
    /// `None` removes the API token cap, but the tokenizer artifact can still
    /// carry its own truncation/padding settings. Full-source callers must use
    /// an explicitly validated tokenizer variant (truncation/padding disabled).
    /// The existing production trait keeps its 512-token API limit, additionally
    /// constrained by the tokenizer. Include coverage in any cache recipe.
    pub fn embed_batch_with_limit(
        &self,
        texts: &[String],
        max_tokens: Option<usize>,
    ) -> Result<Vec<Vec<f32>>, ModelError> {
        if max_tokens == Some(0) {
            return Err(ModelError::Inference("Token limit must be positive".into()));
        }
        if texts.is_empty() {
            return Ok(Vec::new());
        }
        let vectors = self.model.encode_with_args(texts, max_tokens, 64);
        if vectors.len() != texts.len() {
            return Err(ModelError::Inference(
                "Embedding batch size mismatch".into(),
            ));
        }
        vectors
            .into_iter()
            .map(|vector| {
                if vector.len() != self.dims || vector.iter().any(|x| !x.is_finite()) {
                    return Err(ModelError::Inference(
                        "Invalid embedding dimensions or values".into(),
                    ));
                }
                let norm = vector.iter().map(|x| x * x).sum::<f32>().sqrt();
                Ok(if norm > 0.0 {
                    vector.into_iter().map(|x| x / norm).collect()
                } else {
                    vector
                })
            })
            .collect()
    }
}

/// Identify the actual weights, tokenizer, configuration and inference behaviour.
/// The directory name is deliberately excluded so copied models share a cache identity.
pub(crate) fn artifact_fingerprint(path: &std::path::Path) -> Result<[u8; 32], ModelError> {
    let mut identity = b"ixos:model2vec-rs:0.1.4:unit-normalization-v1".to_vec();
    for filename in ["model.safetensors", "tokenizer.json", "config.json"] {
        let digest = sha256_file(&path.join(filename))
            .map_err(|e| ModelError::LoadError(format!("Cannot identify {filename}: {e}")))?;
        identity.extend_from_slice(filename.as_bytes());
        identity.extend_from_slice(&digest);
    }
    Ok(sha256(&identity))
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
    /// This batches tokenization and amortizes call overhead; measured speedups
    /// depend on the model and workload:
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

    #[test]
    fn artifact_identity_tracks_contents_and_survives_directory_moves() {
        let first = tempfile::tempdir().unwrap();
        let second = tempfile::tempdir().unwrap();
        for filename in ["model.safetensors", "tokenizer.json", "config.json"] {
            std::fs::write(first.path().join(filename), filename).unwrap();
            std::fs::write(second.path().join(filename), filename).unwrap();
        }
        let original = artifact_fingerprint(first.path()).unwrap();
        assert_eq!(original, artifact_fingerprint(second.path()).unwrap());
        for filename in ["model.safetensors", "tokenizer.json", "config.json"] {
            std::fs::write(second.path().join(filename), "changed").unwrap();
            assert_ne!(original, artifact_fingerprint(second.path()).unwrap());
            std::fs::write(second.path().join(filename), filename).unwrap();
        }
    }

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
