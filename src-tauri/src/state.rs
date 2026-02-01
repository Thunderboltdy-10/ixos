//! Application state management
//!
//! Manages shared state across the Tauri application including:
//! - Search cancellation tokens
//! - Configuration cache
//! - Journalist mode state
//! - Cached directory for faster repeated searches

use crate::commands::entitlement_manager::EntitlementManager;
use crate::pro_loader::ProModule;
use ixos_protocol::capabilities::Capabilities;
use ixos_protocol::ixos_embed::{MmapModel2VecEmbedder, ModelType};
use parking_lot::Mutex;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tokio_util::sync::CancellationToken;

/// Cached directory structure for faster repeated searches
pub struct CachedDirectory {
    /// Directory path
    pub path: PathBuf,
    /// Cached file contents (path -> content)
    pub file_contents: HashMap<PathBuf, String>,
    /// When this cache was created
    pub cached_at: std::time::Instant,
    /// Time-to-live (5 minutes)
    pub ttl: std::time::Duration,
}

impl CachedDirectory {
    /// Create a new cached directory
    pub fn new(path: PathBuf) -> Self {
        Self {
            path,
            file_contents: HashMap::new(),
            cached_at: std::time::Instant::now(),
            ttl: std::time::Duration::from_secs(300), // 5 minutes
        }
    }

    /// Check if cache is still valid
    pub fn is_valid(&self) -> bool {
        self.cached_at.elapsed() < self.ttl
    }

    /// Check if this cache is for the given path
    pub fn is_for_path(&self, path: &PathBuf) -> bool {
        &self.path == path
    }
}

/// Global application state managed by Tauri
pub struct AppState {
    /// Current search cancellation token
    pub cancel_token: Arc<Mutex<Option<CancellationToken>>>,
    /// Journalist mode state
    pub journalist_mode: Arc<Mutex<ixos_protocol::journalist_mode::JournalistMode>>,
    /// Cached directory for faster repeated searches
    pub cached_directory: Arc<Mutex<Option<CachedDirectory>>>,
    /// Cached embedding models by type
    pub model_cache: Arc<Mutex<HashMap<String, Arc<MmapModel2VecEmbedder>>>>,
    /// Last loaded model type
    pub loaded_model: Arc<Mutex<Option<String>>>,
    /// Cached entitlement token for auth gating
    pub entitlement_token: Arc<Mutex<Option<String>>>,
    /// Cached capability set for feature gating
    pub capabilities: Arc<Mutex<Capabilities>>,
    /// Entitlement manager for offline grace + refresh
    pub entitlement_manager: Arc<Mutex<EntitlementManager>>,
    /// Loaded Pro module (if available)
    pub pro_module: Arc<Mutex<Option<ProModule>>>,
}

impl AppState {
    /// Create new application state
    pub fn new() -> Self {
        Self {
            cancel_token: Arc::new(Mutex::new(None)),
            journalist_mode: Arc::new(Mutex::new(
                ixos_protocol::journalist_mode::JournalistMode::new(),
            )),
            cached_directory: Arc::new(Mutex::new(None)),
            model_cache: Arc::new(Mutex::new(HashMap::new())),
            loaded_model: Arc::new(Mutex::new(None)),
            entitlement_token: Arc::new(Mutex::new(None)),
            capabilities: Arc::new(Mutex::new(Capabilities::default())),
            entitlement_manager: Arc::new(Mutex::new(EntitlementManager::new())),
            pro_module: Arc::new(Mutex::new(None)),
        }
    }

    /// Get cached directory if valid
    pub fn get_cached_directory(&self, path: &PathBuf) -> Option<CachedDirectory> {
        let cache = self.cached_directory.lock();
        if let Some(cached) = cache.as_ref() {
            if cached.is_for_path(path) && cached.is_valid() {
                return Some(CachedDirectory {
                    path: cached.path.clone(),
                    file_contents: cached.file_contents.clone(),
                    cached_at: cached.cached_at,
                    ttl: cached.ttl,
                });
            }
        }
        None
    }

    /// Set cached directory
    pub fn set_cached_directory(&self, cached: CachedDirectory) {
        *self.cached_directory.lock() = Some(cached);
    }

    /// Clear cached directory
    pub fn clear_cached_directory(&self) {
        *self.cached_directory.lock() = None;
    }

    /// Cancel any active search
    pub fn cancel_search(&self) {
        if let Some(token) = self.cancel_token.lock().take() {
            token.cancel();
        }
    }

    /// Create a new cancellation token for a search
    pub fn new_search_token(&self) -> CancellationToken {
        let token = CancellationToken::new();
        *self.cancel_token.lock() = Some(token.clone());
        token
    }

    /// Enable journalist mode
    pub fn enable_journalist_mode(&self) {
        self.journalist_mode.lock().enable();
    }

    /// Disable journalist mode
    pub fn disable_journalist_mode(&self) {
        self.journalist_mode.lock().disable();
    }

    /// Check if journalist mode is enabled
    pub fn is_journalist_mode(&self) -> bool {
        self.journalist_mode.lock().is_enabled()
    }

    /// Emergency clear all sensitive data
    pub fn emergency_clear(&self) {
        self.journalist_mode.lock().emergency_clear();
    }

    pub fn get_or_load_model(
        &self,
        model_type: ModelType,
    ) -> Result<Arc<MmapModel2VecEmbedder>, String> {
        let key = model_type.to_string();
        if let Some(model) = self.model_cache.lock().get(&key).cloned() {
            *self.loaded_model.lock() = Some(key);
            return Ok(model);
        }

        let model = MmapModel2VecEmbedder::new_with_type(model_type).map_err(|e| e.to_string())?;
        let model = Arc::new(model);
        self.model_cache.lock().insert(key.clone(), model.clone());
        *self.loaded_model.lock() = Some(key);
        Ok(model)
    }

    pub fn loaded_model(&self) -> Option<String> {
        self.loaded_model.lock().clone()
    }

    pub fn set_entitlement_token(&self, token: Option<String>) {
        *self.entitlement_token.lock() = token;
    }

    pub fn get_entitlement_token(&self) -> Option<String> {
        self.entitlement_token.lock().clone()
    }

    pub fn set_capabilities(&self, caps: Capabilities) {
        *self.capabilities.lock() = caps;
    }

    pub fn capabilities(&self) -> Capabilities {
        self.capabilities.lock().clone()
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}

























