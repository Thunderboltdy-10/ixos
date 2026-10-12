//! Static embeddings with owned encoded rows and content-based model identity.
//! Tokenization and pooling follow model2vec-rs (Minish Lab, MIT).
mod encoded;
pub mod install;
use crate::digest::{sha256, sha256_file};
use encoded::EncodedModel;
use std::path::Path;

#[derive(Debug, thiserror::Error)]
pub enum ModelError {
    #[error("Cannot load model: {0}")]
    LoadError(String),
    #[error("Cannot encode text: {0}")]
    Inference(String),
}

pub struct Model {
    model: EncodedModel,
    fingerprint: [u8; 32],
    dims: usize,
    tokenizer_settings: serde_json::Value,
}

impl Model {
    pub fn load(path: &Path) -> Result<Self, ModelError> {
        let fingerprint = artifact_fingerprint(path)?;
        let (model, tokenizer_settings) =
            EncodedModel::load(path).map_err(|e| ModelError::LoadError(e.to_string()))?;
        let dims = model.encode(&["test".to_owned()], Some(512), 1024)?[0].len();
        if artifact_fingerprint(path)? != fingerprint {
            return Err(ModelError::LoadError(
                "Model files changed while loading".into(),
            ));
        }
        Ok(Self {
            model,
            fingerprint,
            dims,
            tokenizer_settings,
        })
    }
    pub fn dimensions(&self) -> usize {
        self.dims
    }
    pub fn fingerprint(&self) -> [u8; 32] {
        self.fingerprint
    }
    pub fn tokenizer_settings(&self) -> &serde_json::Value {
        &self.tokenizer_settings
    }

    pub fn embed_batch_with_limit(
        &self,
        texts: &[String],
        limit: Option<usize>,
    ) -> Result<Vec<Vec<f32>>, ModelError> {
        if limit == Some(0) {
            return Err(ModelError::Inference("Token limit must be positive".into()));
        }
        let vectors = self.model.encode(texts, limit, 64)?;
        if vectors.len() != texts.len()
            || vectors
                .iter()
                .any(|row| row.len() != self.dims || row.iter().any(|v| !v.is_finite()))
        {
            return Err(ModelError::Inference(
                "Invalid embedding shape or values".into(),
            ));
        }
        Ok(normalize(vectors))
    }
    pub fn embed_batch(&self, texts: &[String]) -> Result<Vec<Vec<f32>>, ModelError> {
        self.embed_batch_with_limit(texts, Some(512))
    }
    pub fn embed(&self, text: &str) -> Result<Vec<f32>, ModelError> {
        Ok(self.embed_batch(&[text.to_owned()])?.remove(0))
    }
}

fn normalize(vectors: Vec<Vec<f32>>) -> Vec<Vec<f32>> {
    vectors
        .into_iter()
        .map(|vector| {
            let norm = vector.iter().map(|v| v * v).sum::<f32>().sqrt();
            if norm > 0.0 {
                vector.into_iter().map(|v| v / norm).collect()
            } else {
                vector
            }
        })
        .collect()
}

fn artifact_fingerprint(path: &Path) -> Result<[u8; 32], ModelError> {
    let mut identity = b"ixos:static-model:unit-normalization".to_vec();
    identity.push(1);
    for name in ["model.safetensors", "tokenizer.json", "config.json"] {
        identity.extend_from_slice(name.as_bytes());
        identity.extend_from_slice(
            &sha256_file(&path.join(name)).map_err(|e| ModelError::LoadError(e.to_string()))?,
        );
    }
    Ok(sha256(&identity))
}

#[cfg(test)]
struct ReferenceModel(model2vec_rs::model::StaticModel);
#[cfg(test)]
impl ReferenceModel {
    fn load(path: &Path) -> anyhow::Result<Self> {
        Ok(Self(model2vec_rs::model::StaticModel::from_pretrained(
            path.to_str().unwrap(),
            None,
            None,
            None,
        )?))
    }
    fn embed_batch_with_limit(
        &self,
        texts: &[String],
        limit: Option<usize>,
    ) -> Result<Vec<Vec<f32>>, ModelError> {
        Ok(normalize(self.0.encode_with_args(texts, limit, 64)))
    }
    fn embed_batch(&self, texts: &[String]) -> Result<Vec<Vec<f32>>, ModelError> {
        self.embed_batch_with_limit(texts, Some(512))
    }
    fn embed(&self, text: &str) -> Result<Vec<f32>, ModelError> {
        Ok(self.embed_batch(&[text.to_owned()])?.remove(0))
    }
}

#[cfg(test)]
pub(crate) fn test_model() -> tempfile::TempDir {
    encoded::tests::fixture(
        safetensors::tensor::Dtype::F16,
        None,
        false,
        true,
        false,
        false,
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn fingerprint_tracks_every_artifact_and_survives_moves() {
        let first = test_model();
        let second = tempfile::tempdir().unwrap();
        for name in install::FILES {
            std::fs::copy(first.path().join(name), second.path().join(name)).unwrap();
        }
        let fingerprint = artifact_fingerprint(first.path()).unwrap();
        assert_eq!(fingerprint, artifact_fingerprint(second.path()).unwrap());
        for name in install::FILES {
            let path = second.path().join(name);
            let original = std::fs::read(&path).unwrap();
            std::fs::write(&path, b"changed").unwrap();
            assert_ne!(fingerprint, artifact_fingerprint(second.path()).unwrap());
            std::fs::write(path, original).unwrap();
        }
    }
}
