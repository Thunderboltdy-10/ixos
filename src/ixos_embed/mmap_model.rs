//! Memory-mapped Model2Vec embedding model with lazy initialization
//!
//! Provides near-zero load time by deferring model initialization until first use.
//! The underlying model2vec-rs crate already uses memmap2 for efficient safetensors
//! loading, so this wrapper focuses on:
//!
//! 1. **Lazy initialization**: Model is loaded on first `embed()` call
//! 2. **HuggingFace cache detection**: Checks if model exists locally before loading
//! 3. **Seamless fallback**: Falls back to standard loading if mmap fails
//!
//! # Model Types (P1.3)
//!
//! Ixos supports multiple embedding models, selectable via CLI `--model` flag:
//!
//! - **Ixos Flash** (`ixos-flash-v2`): Current production flash model.
//! - **Ixos Pro** (`ixos-pro-v2`): Pro routing model.
//! - **potion-base-8m-int8**: Internal dependency used by Ixos Pro.
//! - **Qwen** (legacy/experimental): Distilled from Qwen3-Embedding-0.6B.
//!
//! # Performance
//! - Initial "load" time: <1ms (just creates wrapper)
//! - First embed: 2-3s if model needs download, <100ms if cached locally
//! - Subsequent embeds: <1ms (model already in memory)
//!
//! # Usage
//! ```ignore
//! use ixos_protocol::ixos_embed::{MmapModel2VecEmbedder, ModelType};
//!
//! // Use default model selection
//! let model = MmapModel2VecEmbedder::new()?;
//!
//! // Or specify a model type
//! let model = MmapModel2VecEmbedder::new_with_type(ModelType::Potion)?;
//!
//! // First embed triggers actual model loading
//! let embedding = model.embed("hello world")?;
//! ```

use std::path::PathBuf;
use std::str::FromStr;
use std::sync::atomic::{AtomicUsize, Ordering};

use parking_lot::{Mutex, RwLock};
use serde::{Deserialize, Serialize};

use super::model::{EmbeddingModel, ModelError};
use super::model2vec::Model2VecEmbedder;
use crate::security::crypto::sha256;

/// P1.3: Model type selector for embedding models
///
/// Ixos supports multiple embedding models optimized for different use cases:
///
/// - **Potion Core**: Simple int8 quantization of potion-base-8M. Reliable and fast.
/// - **Qwen**: Distilled from Qwen3-Embedding-0.6B. Experimental but potentially better.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ModelType {
    /// Quantized potion-base-8M (recommended, reliable)
    #[default]
    Potion,
    /// Distilled Qwen3-Embedding-0.6B (experimental, potentially better)
    Qwen,
    /// Ixos Flash v1 (distilled, fast)
    IxosFlashV1,
    /// Ixos Flash v2 (current default, distilled)
    IxosFlashV2,
    /// Ixos Flash v4 (512d, int8, quality-leaning)
    IxosFlashV4,
    /// Ixos Flash v4 Fast (192d, int8, speed-leaning)
    IxosFlashV4Fast,
    /// Ixos Pro v2 (user-facing pro model id)
    IxosProV2,
    /// Ixos Pro v1 (distilled, higher quality)
    IxosProV1,
}

impl ModelType {
    /// Get human-readable display name
    pub fn display_name(&self) -> &'static str {
        match self {
            ModelType::Potion => "potion-base-8m-int8 (internal)",
            ModelType::Qwen => "Ixos-Embedder-v1 (Qwen)",
            ModelType::IxosFlashV1 => "Ixos Flash v1 (legacy)",
            ModelType::IxosFlashV2 => "Ixos Flash",
            ModelType::IxosFlashV4 => "Ixos Flash v4 (512d)",
            ModelType::IxosFlashV4Fast => "Ixos Flash v4 Fast (192d)",
            ModelType::IxosProV2 => "Ixos Pro",
            ModelType::IxosProV1 => "Ixos Pro v1",
        }
    }

    /// Get description of the model
    pub fn description(&self) -> &'static str {
        match self {
            ModelType::Potion => "Internal base embedder used by Ixos Pro pipelines.",
            ModelType::Qwen => "Distilled from Qwen3. Experimental, potentially better quality.",
            ModelType::IxosFlashV1 => "Ixos Flash v1 distilled embedder (legacy).",
            ModelType::IxosFlashV2 => "Ixos Flash distilled embedder (default).",
            ModelType::IxosFlashV4 => {
                "Ixos Flash v4 distilled embedder (int8, 512d, near-v2 quality)."
            }
            ModelType::IxosFlashV4Fast => {
                "Ixos Flash v4 fast distilled embedder (int8, 192d, speed-first)."
            }
            ModelType::IxosProV2 => "Ixos Pro distilled embedder (production pro model).",
            ModelType::IxosProV1 => "Ixos Pro v1 distilled embedder (higher quality).",
        }
    }
}

impl FromStr for ModelType {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "potion" | "potion-core" | "potion-8m" | "potion-base-8m" => Ok(ModelType::Potion),
            "qwen" | "ixos" | "ixos-embedder" => Ok(ModelType::Qwen),
            "ixos-flash-v2" | "flash" | "flash-v2" | "ixos-flash" => Ok(ModelType::IxosFlashV2),
            "ixos-flash-v1" | "flash-v1" => Ok(ModelType::IxosFlashV1),
            "ixos-flash-v4"
            | "flash-v4"
            | "ixos-flash-v4-512"
            | "ixos-flash-v4-int8-512" => Ok(ModelType::IxosFlashV4),
            "ixos-flash-v4-fast"
            | "flash-fast"
            | "flash-v4-fast"
            | "ixos-flash-v4-192"
            | "ixos-flash-v4-int8-192" => Ok(ModelType::IxosFlashV4Fast),
            "ixos-pro-v2" | "pro-v2" | "pro" => Ok(ModelType::IxosProV2),
            "ixos-pro-v1" | "ixos-pro" => Ok(ModelType::IxosProV1),
            _ => Err(format!(
                "Unknown model type: {}. Use: ixos-flash-v2, ixos-pro-v2, potion, qwen, ixos-flash-v1, ixos-flash-v4, ixos-flash-v4-fast, or ixos-pro-v1",
                s
            )),
        }
    }
}

impl std::fmt::Display for ModelType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ModelType::Potion => write!(f, "potion"),
            ModelType::Qwen => write!(f, "qwen"),
            ModelType::IxosFlashV1 => write!(f, "ixos-flash-v1"),
            ModelType::IxosFlashV2 => write!(f, "ixos-flash-v2"),
            ModelType::IxosFlashV4 => write!(f, "ixos-flash-v4-int8-512"),
            ModelType::IxosFlashV4Fast => write!(f, "ixos-flash-v4-int8-192"),
            ModelType::IxosProV2 => write!(f, "ixos-pro-v2"),
            ModelType::IxosProV1 => write!(f, "ixos-pro-v1"),
        }
    }
}

/// Memory-mapped Model2Vec embedder with lazy initialization
///
/// This embedder provides near-zero initial load time by deferring the actual
/// model loading until the first embedding request. The underlying model2vec-rs
/// library already uses memory mapping (memmap2) for efficient safetensors loading.
///
/// # Thread Safety
/// Uses `RwLock` for thread-safe lazy initialization. Multiple threads calling
/// `embed()` simultaneously will wait for a single initialization to complete.
pub struct MmapModel2VecEmbedder {
    /// The model, lazily initialized on first use
    model: RwLock<Option<Model2VecEmbedder>>,
    /// Initialization lock to prevent double-init
    init_lock: Mutex<()>,
    /// Model ID for HuggingFace Hub (e.g., "minishlab/potion-base-8M")
    model_id: String,
    /// Local path override (if loading from disk instead of HuggingFace)
    local_path: Option<PathBuf>,
    /// Pre-computed fingerprint (consistent whether mmap or standard loading)
    fingerprint: [u8; 32],
    /// Cached dimensions (set after first load, or default 256 for potion-base-8M)
    dims: AtomicUsize,
}

impl MmapModel2VecEmbedder {
    /// Default model ID for HuggingFace Hub
    pub const DEFAULT_MODEL: &'static str = Model2VecEmbedder::DEFAULT_MODEL;

    /// P1.3: Potion-base-8M quantized to int8 (local path)
    const POTION_MODEL_SUBDIR: &'static str = "models/potion-base-8M-int8";

    /// P1.3: Qwen-distilled embedder path (distilled from Qwen3-Embedding-0.6B, int8)
    const QWEN_MODEL_SUBDIR: &'static str = "models/ixos-embedder-v1";
    /// Ixos Flash v1 distilled embedder path
    const IXOS_FLASH_V1_SUBDIR: &str = "models/ixos-flash-v1";
    /// Ixos Flash v2 distilled embedder path
    const IXOS_FLASH_V2_SUBDIR: &str = "models/ixos-flash-v2";
    /// Ixos Flash v4 (quality) distilled embedder path
    const IXOS_FLASH_V4_SUBDIR: &'static str = "models/ixos-flash-v4-int8-512";
    /// Ixos Flash v4 fast distilled embedder path
    const IXOS_FLASH_V4_FAST_SUBDIR: &'static str = "models/ixos-flash-v4-int8-192";
    /// Ixos Pro v2 distilled embedder path
    const IXOS_PRO_V2_SUBDIR: &'static str = "models/ixos-pro-v2";
    /// Ixos Pro v1 distilled embedder path
    const IXOS_PRO_V1_SUBDIR: &'static str = "models/ixos-pro-v1";

    /// Default dimensions for potion-base-8M model
    const DEFAULT_DIMS: usize = 256;

    /// Create a new lazy-loading embedder with default model selection
    ///
    /// This returns immediately (<1ms). The actual model loading is deferred
    /// until the first call to `embed()`.
    ///
    /// Use `new_with_type()` to explicitly select a model.
    pub fn new() -> Result<Self, ModelError> {
        Self::new_with_type(ModelType::Potion)
    }

    /// P1.3: Create embedder with explicit model type selection
    ///
    /// # Model Types
    /// - `Potion`: Quantized potion-base-8M-int8. Simple, reliable, ~7.5MB.
    /// - `Qwen`: Distilled from Qwen3-Embedding-0.6B. Experimental, potentially better.
    /// Returns immediately (<1ms). Model is loaded on first `embed()` call.
    pub fn new_with_type(model_type: ModelType) -> Result<Self, ModelError> {
        match model_type {
            ModelType::Potion => {
                if let Some(path) = Self::find_potion_model() {
                    tracing::info!("Using Potion-8M-int8 model from {:?}", path);
                    return Self::from_path(&path);
                }
                Err(ModelError::LoadError(
                    "Potion model not found. Run: python scripts/distill_model.py --potion".into(),
                ))
            }
            ModelType::Qwen => {
                if let Some(path) = Self::find_qwen_model() {
                    tracing::info!("Using Qwen-distilled model from {:?}", path);
                    return Self::from_path(&path);
                }
                Err(ModelError::LoadError(
                    "Qwen model not found. Run: python scripts/distill_model.py --qwen".into(),
                ))
            }
            ModelType::IxosFlashV1 => {
                if let Some(path) = Self::find_ixos_flash_v1_model() {
                    tracing::info!("Using Ixos-Flash-v1 model from {:?}", path);
                    return Self::from_path(&path);
                }
                Err(ModelError::LoadError(
                    "Ixos-Flash-v1 model not found. Run: python scripts/distill_model2vec_lab.py --mode flash".into(),
                ))
            }
            ModelType::IxosFlashV2 => {
                if let Some(path) = Self::find_ixos_flash_v2_model() {
                    tracing::info!("Using Ixos-Flash-v2 model from {:?}", path);
                    return Self::from_path(&path);
                }
                Err(ModelError::LoadError(
                    "Ixos-Flash-v2 model not found. Run: python scripts/distill_model2vec_lab.py --mode flash --flash-id ixos-flash-v2".into(),
                ))
            }
            ModelType::IxosFlashV4 => {
                if let Some(path) = Self::find_ixos_flash_v4_model() {
                    tracing::info!("Using Ixos-Flash-v4 model from {:?}", path);
                    return Self::from_path(&path);
                }
                Err(ModelError::LoadError(
                    "Ixos-Flash-v4 model not found. Run: python scripts/distill_model2vec_lab.py --mode flash --flash-id ixos-flash-v4-int8-512".into(),
                ))
            }
            ModelType::IxosFlashV4Fast => {
                if let Some(path) = Self::find_ixos_flash_v4_fast_model() {
                    tracing::info!("Using Ixos-Flash-v4 fast model from {:?}", path);
                    return Self::from_path(&path);
                }
                Err(ModelError::LoadError(
                    "Ixos-Flash-v4 fast model not found. Run: python scripts/distill_model2vec_lab.py --mode flash --flash-id ixos-flash-v4-int8-192".into(),
                ))
            }
            ModelType::IxosProV2 => {
                if let Some(path) = Self::find_ixos_pro_v2_model().or_else(Self::find_potion_model)
                {
                    tracing::info!("Using Ixos-Pro-v2 model from {:?}", path);
                    return Self::from_path(&path);
                }
                Err(ModelError::LoadError(
                    "Ixos-Pro-v2 model not found. Run: python scripts/distill_model2vec_lab.py --mode pro --pro-id ixos-pro-v2".into(),
                ))
            }
            ModelType::IxosProV1 => {
                if let Some(path) = Self::find_ixos_pro_v1_model() {
                    tracing::info!("Using Ixos-Pro-v1 model from {:?}", path);
                    return Self::from_path(&path);
                }
                Err(ModelError::LoadError(
                    "Ixos-Pro-v1 model not found. Run: python scripts/distill_model2vec_lab.py --mode pro".into(),
                ))
            }
        }
    }

    /// P1.3: Create a new lazy-loading embedder with the int8 quantized model
    /// (Legacy method - prefer `new_with_type(ModelType::Potion)`)
    pub fn new_int8() -> Result<Self, ModelError> {
        Self::new_with_type(ModelType::Potion)
    }

    /// P1.3: Load the optimized Ixos embedder (bundled with installer)
    /// (Legacy method - prefer `new_with_type(ModelType::Qwen)`)
    pub fn new_ixos() -> Result<Self, ModelError> {
        Self::new_with_type(ModelType::Qwen)
    }

    /// Find the Potion-8M-int8 model in standard locations
    fn find_potion_model() -> Option<PathBuf> {
        Self::find_model_in_locations(Self::POTION_MODEL_SUBDIR, "potion-base-8M-int8")
    }

    /// Find the Qwen-distilled model in standard locations
    fn find_qwen_model() -> Option<PathBuf> {
        Self::find_model_in_locations(Self::QWEN_MODEL_SUBDIR, "ixos-embedder-v1")
    }

    /// Find the Ixos-Flash-v1 model in standard locations
    fn find_ixos_flash_v1_model() -> Option<PathBuf> {
        Self::find_model_in_locations(Self::IXOS_FLASH_V1_SUBDIR, "ixos-flash-v1")
    }

    /// Find the Ixos-Flash-v2 model in standard locations
    fn find_ixos_flash_v2_model() -> Option<PathBuf> {
        Self::find_model_in_locations(Self::IXOS_FLASH_V2_SUBDIR, "ixos-flash-v2")
    }

    /// Find the Ixos-Flash-v4 model in standard locations
    fn find_ixos_flash_v4_model() -> Option<PathBuf> {
        Self::find_model_in_locations(Self::IXOS_FLASH_V4_SUBDIR, "ixos-flash-v4-int8-512")
    }

    /// Find the Ixos-Flash-v4 fast model in standard locations
    fn find_ixos_flash_v4_fast_model() -> Option<PathBuf> {
        Self::find_model_in_locations(Self::IXOS_FLASH_V4_FAST_SUBDIR, "ixos-flash-v4-int8-192")
    }

    /// Find the Ixos-Pro-v2 model in standard locations
    fn find_ixos_pro_v2_model() -> Option<PathBuf> {
        Self::find_model_in_locations(Self::IXOS_PRO_V2_SUBDIR, "ixos-pro-v2")
    }

    /// Find the Ixos-Pro-v1 model in standard locations
    fn find_ixos_pro_v1_model() -> Option<PathBuf> {
        Self::find_model_in_locations(Self::IXOS_PRO_V1_SUBDIR, "ixos-pro-v1")
    }

    /// Find a model in standard locations
    ///
    /// Search order:
    /// 1. Relative to executable (installed location)
    /// 2. Relative to executable parent directories (Tauri dev builds)
    /// 3. App data directory (Windows: %APPDATA%/Ixos, Unix: ~/.local/share/ixos)
    /// 4. Development: relative to cwd
    /// 5. Compile-time workspace root (for dev builds)
    fn find_model_in_locations(subdir: &str, model_name: &str) -> Option<PathBuf> {
        // 1. Check relative to executable (installed location)
        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(exe_dir) = exe_path.parent() {
                let model_path = exe_dir.join(subdir);
                if Self::has_model_files(&model_path) {
                    return Some(model_path);
                }

                // 1.5 Check "resources" directory (Tauri bundled resources)
                // Tauri bundles often end up in 'resources/models/...' relative to exe
                let resources_path = exe_dir.join("resources").join(subdir);
                if Self::has_model_files(&resources_path) {
                    return Some(resources_path);
                }

                // Also check flattened resources if using sidecar-style bundling
                // (less likely for directories but possible)

                // 2. Check parent directories of executable (handles target/debug structure)
                // This is common for Tauri dev builds where exe is in target/debug/
                let mut parent = exe_dir.to_path_buf();
                for _ in 0..4 {
                    if let Some(p) = parent.parent() {
                        parent = p.to_path_buf();
                        let model_path = parent.join(subdir);
                        if Self::has_model_files(&model_path) {
                            return Some(model_path);
                        }
                    }
                }
            }
        }

        // 3. Check app data directory
        if let Some(app_data) = dirs::data_dir() {
            let model_path = app_data.join("Ixos").join("models").join(model_name);
            if Self::has_model_files(&model_path) {
                return Some(model_path);
            }
        }

        // 4. Development: check relative to cwd
        let local = PathBuf::from(subdir);
        if Self::has_model_files(&local) {
            return Some(local);
        }

        // 5. Check compile-time manifest directory (works for `cargo run` in dev)
        let manifest_dir = env!("CARGO_MANIFEST_DIR");
        let workspace_root = PathBuf::from(manifest_dir)
            .parent()
            .map(|p| p.to_path_buf());
        if let Some(root) = workspace_root {
            let model_path = root.join(subdir);
            if Self::has_model_files(&model_path) {
                return Some(model_path);
            }
        }

        None
    }

    /// Check if a directory contains ALL required model files
    /// Supports both embeddings.safetensors (original) and model.safetensors (distilled)
    /// Validates: config.json, model.safetensors/embeddings.safetensors, tokenizer.json, vocab.txt
    fn has_model_files(path: &std::path::Path) -> bool {
        // Check for safetensors file
        let has_safetensors =
            path.join("embeddings.safetensors").exists() || path.join("model.safetensors").exists();

        // Check for all required supporting files
        let has_config = path.join("config.json").exists();
        // tokenizer.json is essential for our tokenizers
        let has_tokenizer = path.join("tokenizer.json").exists();
        // vocab.txt is optional/deprecated for our distilled models (using tokenizer.json)
        // let has_vocab = path.join("vocab.txt").exists();

        // All files must exist AND have non-zero size
        has_safetensors
            && has_config
            && Self::file_has_content(&path.join("config.json"))
            && has_tokenizer
            && Self::file_has_content(&path.join("tokenizer.json"))
    }

    /// Check if a file exists and has non-zero size
    fn file_has_content(path: &std::path::Path) -> bool {
        std::fs::metadata(path)
            .map(|m| m.len() > 0)
            .unwrap_or(false)
    }

    /// Get available models and their status
    pub fn available_models() -> Vec<(ModelType, bool, Option<PathBuf>)> {
        vec![
            (
                ModelType::Potion,
                Self::find_potion_model().is_some(),
                Self::find_potion_model(),
            ),
            (
                ModelType::Qwen,
                Self::find_qwen_model().is_some(),
                Self::find_qwen_model(),
            ),
            (
                ModelType::IxosFlashV1,
                Self::find_ixos_flash_v1_model().is_some(),
                Self::find_ixos_flash_v1_model(),
            ),
            (
                ModelType::IxosFlashV2,
                Self::find_ixos_flash_v2_model().is_some(),
                Self::find_ixos_flash_v2_model(),
            ),
            (
                ModelType::IxosFlashV4,
                Self::find_ixos_flash_v4_model().is_some(),
                Self::find_ixos_flash_v4_model(),
            ),
            (
                ModelType::IxosFlashV4Fast,
                Self::find_ixos_flash_v4_fast_model().is_some(),
                Self::find_ixos_flash_v4_fast_model(),
            ),
            (
                ModelType::IxosProV2,
                Self::find_ixos_pro_v2_model().is_some() || Self::find_potion_model().is_some(),
                Self::find_ixos_pro_v2_model().or_else(Self::find_potion_model),
            ),
            (
                ModelType::IxosProV1,
                Self::find_ixos_pro_v1_model().is_some(),
                Self::find_ixos_pro_v1_model(),
            ),
        ]
    }

    /// Create a lazy-loading embedder for a specific HuggingFace model
    ///
    /// # Arguments
    /// * `model_id` - HuggingFace model ID (e.g., "minishlab/potion-base-8M")
    ///
    /// # Returns
    /// A new embedder that will load the model on first use.
    /// Returns immediately without downloading or loading the model.
    pub fn from_pretrained(model_id: &str) -> Result<Self, ModelError> {
        // Compute fingerprint now for consistency
        let fingerprint_input = format!("model2vec_{}_{}", model_id, env!("CARGO_PKG_VERSION"));
        let fingerprint = sha256(fingerprint_input.as_bytes());

        tracing::debug!(
            "Creating lazy MmapModel2VecEmbedder for model: {} (cache status: {})",
            model_id,
            if Self::is_model_cached(model_id) {
                "cached"
            } else {
                "not cached"
            }
        );

        Ok(Self {
            model: RwLock::new(None),
            init_lock: Mutex::new(()),
            model_id: model_id.to_string(),
            local_path: None,
            fingerprint,
            dims: AtomicUsize::new(Self::DEFAULT_DIMS),
        })
    }

    /// Create a lazy-loading embedder from a local path
    ///
    /// # Arguments
    /// * `path` - Path to the model directory containing model files
    ///
    /// # Returns
    /// A new embedder that will load the model on first use.
    pub fn from_path(path: &std::path::Path) -> Result<Self, ModelError> {
        if !path.exists() {
            return Err(ModelError::LoadError(format!(
                "Model path does not exist: {:?}",
                path
            )));
        }

        let fingerprint_input = format!("model2vec_local_{:?}", path);
        let fingerprint = sha256(fingerprint_input.as_bytes());

        Ok(Self {
            model: RwLock::new(None),
            init_lock: Mutex::new(()),
            model_id: path.to_string_lossy().to_string(),
            local_path: Some(path.to_path_buf()),
            fingerprint,
            dims: AtomicUsize::new(Self::DEFAULT_DIMS),
        })
    }

    /// Check if a model is already cached locally
    ///
    /// This checks the HuggingFace cache directory for the model files.
    /// Returns true if the model appears to be cached and ready for fast loading.
    pub fn is_model_cached(model_id: &str) -> bool {
        if let Some(cache_path) = Self::get_huggingface_cache_path(model_id) {
            // Check for the embeddings.safetensors file which is the main model weights
            let safetensors_path = cache_path.join("embeddings.safetensors");
            if safetensors_path.exists() {
                return true;
            }

            // Also check for model.safetensors (alternative name)
            let model_path = cache_path.join("model.safetensors");
            if model_path.exists() {
                return true;
            }

            // Check for any .safetensors file in snapshots
            if let Some(snapshot_path) = Self::find_latest_snapshot(&cache_path) {
                let snapshot_safetensors = snapshot_path.join("embeddings.safetensors");
                if snapshot_safetensors.exists() {
                    return true;
                }
            }
        }
        false
    }

    /// Get the HuggingFace cache path for a model
    ///
    /// Returns the expected cache directory for the model, or None if
    /// the cache directory cannot be determined.
    fn get_huggingface_cache_path(model_id: &str) -> Option<PathBuf> {
        // HuggingFace cache structure:
        // ~/.cache/huggingface/hub/models--{org}--{model}/snapshots/{revision}/
        let cache_dir = Self::get_huggingface_cache_dir()?;

        // Convert "org/model" to "models--org--model"
        let model_dir_name = format!("models--{}", model_id.replace('/', "--"));
        let model_path = cache_dir.join(model_dir_name);

        Some(model_path)
    }

    /// Get the base HuggingFace cache directory
    fn get_huggingface_cache_dir() -> Option<PathBuf> {
        // Check HF_HOME environment variable first
        if let Ok(hf_home) = std::env::var("HF_HOME") {
            let path = PathBuf::from(hf_home).join("hub");
            if path.exists() {
                return Some(path);
            }
        }

        // Check HUGGINGFACE_HUB_CACHE environment variable
        if let Ok(hub_cache) = std::env::var("HUGGINGFACE_HUB_CACHE") {
            let path = PathBuf::from(hub_cache);
            if path.exists() {
                return Some(path);
            }
        }

        // Default: ~/.cache/huggingface/hub/
        #[cfg(windows)]
        {
            if let Ok(user_profile) = std::env::var("USERPROFILE") {
                let path = PathBuf::from(user_profile)
                    .join(".cache")
                    .join("huggingface")
                    .join("hub");
                if path.exists() {
                    return Some(path);
                }
            }
        }

        #[cfg(not(windows))]
        {
            if let Some(home) = dirs::home_dir() {
                let path = home.join(".cache").join("huggingface").join("hub");
                if path.exists() {
                    return Some(path);
                }
            }
        }

        None
    }

    /// Find the latest snapshot directory for a cached model
    fn find_latest_snapshot(model_cache_path: &std::path::Path) -> Option<PathBuf> {
        let snapshots_dir = model_cache_path.join("snapshots");
        if !snapshots_dir.exists() {
            return None;
        }

        // Get the most recent snapshot (by modification time)
        let mut latest: Option<(PathBuf, std::time::SystemTime)> = None;

        if let Ok(entries) = std::fs::read_dir(&snapshots_dir) {
            for entry in entries.flatten() {
                if entry.path().is_dir() {
                    if let Ok(metadata) = entry.metadata() {
                        if let Ok(modified) = metadata.modified() {
                            if latest.is_none() || modified > latest.as_ref().unwrap().1 {
                                latest = Some((entry.path(), modified));
                            }
                        }
                    }
                }
            }
        }

        latest.map(|(path, _)| path)
    }

    /// Initialize the model (called on first embed)
    ///
    /// This method is called automatically on the first `embed()` call.
    /// It handles both local path loading and HuggingFace download.
    ///
    /// Uses double-checked locking for thread-safe lazy initialization.
    fn ensure_loaded(&self) -> Result<(), ModelError> {
        // Fast path: model already loaded
        if self.model.read().is_some() {
            return Ok(());
        }

        // Slow path: acquire init lock to prevent double initialization
        let _guard = self.init_lock.lock();

        // Double-check after acquiring lock
        if self.model.read().is_some() {
            return Ok(());
        }

        tracing::info!("Lazy-loading Model2Vec model: {}", self.model_id);
        let start = std::time::Instant::now();

        let loaded_model = if let Some(ref path) = self.local_path {
            Model2VecEmbedder::from_path(path)?
        } else {
            Model2VecEmbedder::from_pretrained(&self.model_id)?
        };

        // Cache the dimensions
        self.dims
            .store(loaded_model.dimensions(), Ordering::Relaxed);

        tracing::info!(
            "Model loaded in {:?} (dims: {})",
            start.elapsed(),
            loaded_model.dimensions()
        );

        // Store the model
        *self.model.write() = Some(loaded_model);

        Ok(())
    }

    /// Check if the model has been loaded
    pub fn is_loaded(&self) -> bool {
        self.model.read().is_some()
    }

    /// Get model cache status information
    ///
    /// Returns a struct with information about the model's cache status,
    /// useful for diagnostics and UI display.
    pub fn cache_status(&self) -> MmapModelStatus {
        let is_cached = if self.local_path.is_some() {
            self.local_path.as_ref().unwrap().exists()
        } else {
            Self::is_model_cached(&self.model_id)
        };

        MmapModelStatus {
            model_id: self.model_id.clone(),
            is_loaded: self.is_loaded(),
            is_cached,
            local_path: self.local_path.clone(),
            cache_path: Self::get_huggingface_cache_path(&self.model_id),
        }
    }
}

impl EmbeddingModel for MmapModel2VecEmbedder {
    fn embed(&self, text: &str) -> Result<Vec<f32>, ModelError> {
        // Ensure model is loaded (lazy init)
        self.ensure_loaded()?;

        // Model is now guaranteed to be loaded
        let guard = self.model.read();
        let model = guard
            .as_ref()
            .expect("Model should be loaded after ensure_loaded");
        model.embed(text)
    }

    fn dimensions(&self) -> usize {
        // Return cached dimensions
        self.dims.load(Ordering::Relaxed)
    }

    fn model_id(&self) -> u8 {
        // 2 = MmapModel2Vec (distinguishes from regular Model2Vec = 1)
        2
    }

    fn fingerprint(&self) -> [u8; 32] {
        // Fingerprint is pre-computed and consistent across load methods
        self.fingerprint
    }
}

/// Status information for a memory-mapped model
#[derive(Debug, Clone)]
pub struct MmapModelStatus {
    /// The model ID (HuggingFace ID or local path)
    pub model_id: String,
    /// Whether the model has been loaded into memory
    pub is_loaded: bool,
    /// Whether the model is cached locally
    pub is_cached: bool,
    /// Local path if loading from disk
    pub local_path: Option<PathBuf>,
    /// Path to HuggingFace cache directory for this model
    pub cache_path: Option<PathBuf>,
}

impl std::fmt::Display for MmapModelStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "Model '{}': loaded={}, cached={}",
            self.model_id, self.is_loaded, self.is_cached
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mmap_embedder_creation() {
        // Should be instant - no actual loading
        let start = std::time::Instant::now();
        let result = MmapModel2VecEmbedder::new_with_type(ModelType::Potion);
        let elapsed = start.elapsed();

        if result.is_err() {
            println!("Skipping test - Potion model not found");
            return;
        }
        assert!(
            elapsed.as_millis() < 100,
            "Creation took too long: {:?}",
            elapsed
        );
    }

    #[test]
    fn test_mmap_embedder_not_loaded_initially() {
        let model = match MmapModel2VecEmbedder::new_with_type(ModelType::Potion) {
            Ok(model) => model,
            Err(_) => {
                println!("Skipping test - Potion model not found");
                return;
            }
        };
        assert!(!model.is_loaded(), "Model should not be loaded initially");
    }

    #[test]
    fn test_mmap_embedder_fingerprint_consistent() {
        let model1 = match MmapModel2VecEmbedder::new_with_type(ModelType::Potion) {
            Ok(model) => model,
            Err(_) => {
                println!("Skipping test - Potion model not found");
                return;
            }
        };
        let model2 = match MmapModel2VecEmbedder::new_with_type(ModelType::Potion) {
            Ok(model) => model,
            Err(_) => {
                println!("Skipping test - Potion model not found");
                return;
            }
        };

        assert_eq!(
            model1.fingerprint(),
            model2.fingerprint(),
            "Fingerprints should be consistent"
        );
    }

    #[test]
    fn test_mmap_embedder_dimensions_default() {
        let model = match MmapModel2VecEmbedder::new_with_type(ModelType::Potion) {
            Ok(model) => model,
            Err(_) => {
                println!("Skipping test - Potion model not found");
                return;
            }
        };
        // Before loading, should return default dimensions
        assert_eq!(model.dimensions(), 256);
    }

    #[test]
    fn test_mmap_embedder_model_id() {
        let model = match MmapModel2VecEmbedder::new_with_type(ModelType::Potion) {
            Ok(model) => model,
            Err(_) => {
                println!("Skipping test - Potion model not found");
                return;
            }
        };
        // MmapModel2Vec uses model_id = 2
        assert_eq!(model.model_id(), 2);
    }

    #[test]
    fn test_cache_status() {
        let model = match MmapModel2VecEmbedder::new_with_type(ModelType::Potion) {
            Ok(model) => model,
            Err(_) => {
                println!("Skipping test - Potion model not found");
                return;
            }
        };
        let status = model.cache_status();

        assert!(status.model_id.contains("potion") || status.model_id.contains("models"));
        assert!(!status.is_loaded);
        // is_cached depends on whether the model has been downloaded before
    }

    #[test]
    fn test_from_pretrained_custom_model() {
        let model = MmapModel2VecEmbedder::from_pretrained("minishlab/potion-base-8M");
        assert!(model.is_ok());
    }

    #[test]
    fn test_new_ixos_handles_missing_model() {
        // This test verifies that new_ixos() fails gracefully when model doesn't exist
        // In production, the model should be bundled, but during development it may not exist
        let result = MmapModel2VecEmbedder::new_ixos();

        // If model exists, should succeed
        // If model doesn't exist, should return appropriate error
        match result {
            Ok(_) => {
                // Model was found - verify it's actually usable
                println!("Ixos model found during test");
            }
            Err(ModelError::LoadError(msg)) => {
                // Expected if model not yet distilled
                assert!(
                    msg.contains("Ixos embedder not found") || msg.contains("does not exist"),
                    "Error message should indicate missing model: {}",
                    msg
                );
            }
            Err(e) => {
                panic!("Unexpected error type: {:?}", e);
            }
        }
    }

    #[test]
    fn test_available_models() {
        // Test the model discovery logic for both model types
        let models = MmapModel2VecEmbedder::available_models();

        // Should return info for all known model types
        assert_eq!(models.len(), 8);

        // Order should match the advertised list
        assert_eq!(models[0].0, ModelType::Potion);
        assert_eq!(models[1].0, ModelType::Qwen);
        assert_eq!(models[2].0, ModelType::IxosFlashV1);
        assert_eq!(models[3].0, ModelType::IxosFlashV2);
        assert_eq!(models[4].0, ModelType::IxosFlashV4);
        assert_eq!(models[5].0, ModelType::IxosFlashV4Fast);
        assert_eq!(models[6].0, ModelType::IxosProV2);
        assert_eq!(models[7].0, ModelType::IxosProV1);

        // If any model exists locally, verify path is valid
        for (model_type, available, path) in models {
            if available {
                let model_path = path.expect("Path should be Some when available");
                assert!(
                    model_path.join("embeddings.safetensors").exists()
                        || model_path.join("model.safetensors").exists(),
                    "{:?} model path should contain embeddings.safetensors or model.safetensors: {:?}",
                    model_type,
                    model_path
                );
            } else {
                // Model not found - this is OK during development before distillation
                println!(
                    "{:?} model not found (run: python scripts/distill_model.py)",
                    model_type
                );
            }
        }
    }

    #[test]
    fn test_from_path_nonexistent() {
        let result = MmapModel2VecEmbedder::from_path(std::path::Path::new("/nonexistent/path"));
        assert!(result.is_err());

        if let Err(ModelError::LoadError(msg)) = result {
            assert!(msg.contains("does not exist"));
        } else {
            panic!("Expected LoadError for nonexistent path");
        }
    }

    #[test]
    fn test_huggingface_cache_detection() {
        // This tests the cache path generation logic
        let cache_path =
            MmapModel2VecEmbedder::get_huggingface_cache_path("minishlab/potion-base-8M");

        if let Some(path) = cache_path {
            // Path should contain the model directory name format
            let path_str = path.to_string_lossy();
            assert!(
                path_str.contains("models--minishlab--potion-base-8M"),
                "Path should contain model directory format: {}",
                path_str
            );
        }
        // If cache_path is None, HuggingFace cache doesn't exist yet - that's OK
    }

    // Integration tests that require network access
    #[test]
    #[ignore = "requires network access to download model"]
    fn test_mmap_embedder_lazy_load() {
        let model = MmapModel2VecEmbedder::new().unwrap();
        assert!(!model.is_loaded());

        // First embed triggers loading
        let result = model.embed("hello world");
        assert!(result.is_ok());
        assert!(model.is_loaded());

        // Check actual dimensions after loading
        assert!(model.dimensions() > 0);
    }

    #[test]
    #[ignore = "requires network access to download model"]
    fn test_mmap_embedder_embed_quality() {
        let model = MmapModel2VecEmbedder::new().unwrap();
        let embedding = model.embed("hello world").unwrap();

        // Check normalization
        let magnitude: f32 = embedding.iter().map(|x| x * x).sum::<f32>().sqrt();
        assert!(
            (magnitude - 1.0).abs() < 0.01,
            "Embedding not normalized: {}",
            magnitude
        );
    }

    #[test]
    #[ignore = "requires network access to download model"]
    fn test_mmap_embedder_thread_safety() {
        use std::sync::Arc;
        use std::thread;

        let model = Arc::new(MmapModel2VecEmbedder::new().unwrap());
        let mut handles = vec![];

        // Spawn multiple threads that try to embed simultaneously
        for i in 0..4 {
            let model = Arc::clone(&model);
            handles.push(thread::spawn(move || {
                let text = format!("thread {} text", i);
                model.embed(&text)
            }));
        }

        // All threads should succeed
        for handle in handles {
            let result = handle.join().expect("Thread panicked");
            assert!(result.is_ok(), "Embed failed: {:?}", result.err());
        }
    }
}
