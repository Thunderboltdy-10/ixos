//! Path-Augmented Embeddings (P6)
//!
//! Combines path tokens, filename, and content into a single embedding
//! for improved directory-aware relevance.

use std::path::Path;
use std::sync::Arc;

use crate::ixos_embed::model::{EmbeddingModel, ModelError};

/// Configuration for path augmentation
#[derive(Debug, Clone)]
pub struct AugmentationConfig {
    /// Weight for path tokens in the final embedding
    pub path_weight: f32,

    /// Weight for filename in the final embedding
    pub filename_weight: f32,

    /// Weight for content in the final embedding
    pub content_weight: f32,

    /// Maximum tokens to extract from path
    pub max_path_tokens: usize,

    /// Include file extension in embedding
    pub include_extension: bool,

    /// Separator between path parts in combined text
    pub separator: String,
}

impl Default for AugmentationConfig {
    fn default() -> Self {
        Self {
            path_weight: 0.15,
            filename_weight: 0.25,
            content_weight: 0.60,
            max_path_tokens: 5,
            include_extension: true,
            separator: " ".to_string(),
        }
    }
}

impl AugmentationConfig {
    /// Create config with custom weights
    pub fn with_weights(path: f32, filename: f32, content: f32) -> Self {
        let total = path + filename + content;
        Self {
            path_weight: path / total,
            filename_weight: filename / total,
            content_weight: content / total,
            ..Default::default()
        }
    }

    /// Validate weights sum to 1.0
    pub fn validate(&self) -> Result<(), String> {
        let sum = self.path_weight + self.filename_weight + self.content_weight;
        if (sum - 1.0).abs() > 0.01 {
            return Err(format!("Weights must sum to 1.0, got {}", sum));
        }
        Ok(())
    }
}

/// Path-augmented embedder that combines path context with content
pub struct AugmentedEmbedder<M: EmbeddingModel> {
    model: Arc<M>,
    config: AugmentationConfig,
}

impl<M: EmbeddingModel> AugmentedEmbedder<M> {
    /// Create a new augmented embedder
    pub fn new(model: Arc<M>, config: AugmentationConfig) -> Self {
        Self { model, config }
    }

    /// Create with default configuration
    pub fn with_defaults(model: Arc<M>) -> Self {
        Self::new(model, AugmentationConfig::default())
    }

    /// Extract tokens from a file path
    pub fn extract_path_tokens(&self, path: &Path) -> Vec<String> {
        let mut tokens = Vec::new();

        // Get parent directories (up to max_path_tokens)
        for ancestor in path.ancestors().skip(1).take(self.config.max_path_tokens) {
            if let Some(name) = ancestor.file_name() {
                let name_str = name.to_string_lossy().to_string();
                // Tokenize directory name (split on common separators)
                for token in tokenize_name(&name_str) {
                    if !tokens.contains(&token) {
                        tokens.push(token);
                    }
                }
            }
        }

        tokens
    }

    /// Extract filename tokens
    pub fn extract_filename_tokens(&self, path: &Path) -> Vec<String> {
        let mut tokens = Vec::new();

        if let Some(stem) = path.file_stem() {
            for token in tokenize_name(&stem.to_string_lossy()) {
                tokens.push(token);
            }
        }

        if self.config.include_extension {
            if let Some(ext) = path.extension() {
                tokens.push(ext.to_string_lossy().to_lowercase());
            }
        }

        tokens
    }

    /// Create augmented text combining path, filename, and content
    pub fn create_augmented_text(&self, path: &Path, content: &str) -> String {
        build_augmented_text(path, content, &self.config)
    }

    /// Generate augmented embedding for a file
    pub fn embed_file(&self, path: &Path, content: &str) -> Result<Vec<f32>, ModelError> {
        // Strategy 1: Simple concatenation approach
        let augmented_text = self.create_augmented_text(path, content);
        self.model.embed(&augmented_text)
    }

    /// Generate weighted embedding (separate embeddings for each component)
    pub fn embed_weighted(&self, path: &Path, content: &str) -> Result<Vec<f32>, ModelError> {
        let path_tokens = self.extract_path_tokens(path);
        let filename_tokens = self.extract_filename_tokens(path);

        // Embed each component separately
        let path_text = path_tokens.join(" ");
        let filename_text = filename_tokens.join(" ");

        // Get embeddings (fall back to zero vector if empty)
        let dim = self.model.dimensions();

        let path_emb = if !path_text.is_empty() {
            self.model.embed(&path_text)?
        } else {
            vec![0.0; dim]
        };

        let filename_emb = if !filename_text.is_empty() {
            self.model.embed(&filename_text)?
        } else {
            vec![0.0; dim]
        };

        let content_emb = if !content.is_empty() {
            // Take snippet for content
            let snippet = if content.len() > 1000 {
                &content[..1000]
            } else {
                content
            };
            self.model.embed(snippet)?
        } else {
            vec![0.0; dim]
        };

        // Weighted combination
        let mut combined = vec![0.0; dim];
        for i in 0..dim {
            combined[i] = self.config.path_weight * path_emb[i]
                + self.config.filename_weight * filename_emb[i]
                + self.config.content_weight * content_emb[i];
        }

        // Normalize
        let norm: f32 = combined.iter().map(|x| x * x).sum::<f32>().sqrt();
        if norm > 0.0 {
            for v in &mut combined {
                *v /= norm;
            }
        }

        Ok(combined)
    }

    /// Get the underlying model
    pub fn model(&self) -> &M {
        &self.model
    }

    /// Get configuration
    pub fn config(&self) -> &AugmentationConfig {
        &self.config
    }
}

/// Build augmented text without requiring a model (for SecureEmbedder integration).
pub fn build_augmented_text(path: &Path, content: &str, config: &AugmentationConfig) -> String {
    let path_tokens = extract_path_tokens_with_config(path, config);
    let filename_tokens = extract_filename_tokens_with_config(path, config);

    let mut parts = Vec::new();

    if !path_tokens.is_empty() {
        parts.push(path_tokens.join(&config.separator));
    }

    if !filename_tokens.is_empty() {
        parts.push(filename_tokens.join(&config.separator));
    }

    let content_snippet = if content.len() > 500 {
        // Find a valid UTF-8 boundary at or before byte 500
        let mut end = 500;
        while end > 0 && !content.is_char_boundary(end) {
            end -= 1;
        }
        &content[..end]
    } else {
        content
    };
    parts.push(content_snippet.to_string());

    parts.join(&format!("{}{}", config.separator, config.separator))
}

fn extract_path_tokens_with_config(path: &Path, config: &AugmentationConfig) -> Vec<String> {
    let mut tokens = Vec::new();
    for ancestor in path.ancestors().skip(1).take(config.max_path_tokens) {
        if let Some(name) = ancestor.file_name() {
            let name_str = name.to_string_lossy().to_string();
            for token in tokenize_name(&name_str) {
                if !tokens.contains(&token) {
                    tokens.push(token);
                }
            }
        }
    }
    tokens
}

fn extract_filename_tokens_with_config(path: &Path, config: &AugmentationConfig) -> Vec<String> {
    let mut tokens = Vec::new();

    if let Some(stem) = path.file_stem() {
        for token in tokenize_name(&stem.to_string_lossy()) {
            tokens.push(token);
        }
    }

    if config.include_extension {
        if let Some(ext) = path.extension() {
            tokens.push(ext.to_string_lossy().to_lowercase());
        }
    }

    tokens
}

/// Tokenize a filename or directory name
fn tokenize_name(name: &str) -> Vec<String> {
    let mut tokens = Vec::new();

    // Split on common separators
    for part in name.split(|c: char| c == '_' || c == '-' || c == '.' || c == ' ') {
        let part = part.trim();
        if part.is_empty() || part.len() < 2 {
            continue;
        }

        // Split camelCase before lowercasing
        let camel_tokens = split_camel_case(part);
        for token in camel_tokens {
            let token = token.to_lowercase();
            if token.len() >= 2 && !is_stop_word(&token) {
                tokens.push(token);
            }
        }
    }

    tokens
}

/// Split camelCase into separate tokens
fn split_camel_case(s: &str) -> Vec<String> {
    let mut tokens = Vec::new();
    let mut current = String::new();

    for c in s.chars() {
        if c.is_uppercase() && !current.is_empty() {
            tokens.push(current.to_lowercase());
            current = String::new();
        }
        current.push(c);
    }

    if !current.is_empty() {
        tokens.push(current.to_lowercase());
    }

    tokens
}

/// Check if a word is a stop word (common words to skip)
fn is_stop_word(word: &str) -> bool {
    const STOP_WORDS: &[&str] = &[
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
        "from", "as", "is", "was", "are", "were", "be", "been", "being", "have", "has", "had",
        "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "can",
        "src", "lib", "bin", "test", "tests", "spec", "specs",
    ];
    STOP_WORDS.contains(&word)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tokenize_name() {
        let tokens = tokenize_name("myFileName_test-case");
        assert!(tokens.contains(&"my".to_string()) || tokens.contains(&"file".to_string()));
        assert!(tokens.contains(&"case".to_string()));
    }

    #[test]
    fn test_split_camel_case() {
        let tokens = split_camel_case("myFileName");
        assert_eq!(tokens, vec!["my", "file", "name"]);
    }

    #[test]
    fn test_extract_path_tokens() {
        use crate::ixos_embed::model::StubModel;

        let model = Arc::new(StubModel::new());
        let embedder = AugmentedEmbedder::with_defaults(model);

        let path = Path::new("/project/src/utils/helper.rs");
        let tokens = embedder.extract_path_tokens(path);

        // Should contain directory names
        assert!(tokens.iter().any(|t| t == "utils" || t == "project"));
    }

    #[test]
    fn test_extract_filename_tokens() {
        use crate::ixos_embed::model::StubModel;

        let model = Arc::new(StubModel::new());
        let embedder = AugmentedEmbedder::with_defaults(model);

        let path = Path::new("/test/myHelperUtils.rs");
        let tokens = embedder.extract_filename_tokens(path);

        assert!(tokens
            .iter()
            .any(|t| t == "helper" || t == "utils" || t == "my"));
        assert!(tokens.contains(&"rs".to_string())); // extension
    }

    #[test]
    fn test_augmentation_config() {
        let config = AugmentationConfig::with_weights(1.0, 2.0, 7.0);
        assert!((config.path_weight - 0.1).abs() < 0.01);
        assert!((config.filename_weight - 0.2).abs() < 0.01);
        assert!((config.content_weight - 0.7).abs() < 0.01);
    }

    #[test]
    fn test_config_validation() {
        let mut config = AugmentationConfig::default();
        assert!(config.validate().is_ok());

        config.content_weight = 0.5; // Now sums to 0.9
        assert!(config.validate().is_err());
    }
}
