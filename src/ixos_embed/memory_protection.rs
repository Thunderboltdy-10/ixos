//! Memory protection for sensitive file content and embeddings
//!
//! This module provides secure memory handling to protect sensitive data from:
//! - Memory scraping by malware
//! - Swap file exposure
//! - Core dump leakage
//!
//! ## Features
//!
//! - **SecureBuffer**: Locks memory to prevent swapping, zeroizes on drop
//! - **SecureEmbeddingBuffer**: Zeroizes embedding vectors on drop
//!
//! ## Platform Support
//!
//! - **Windows**: Uses `VirtualLock`/`VirtualUnlock` (may require elevated privileges)
//! - **Unix**: Uses `mlock`/`munlock` (may require `ulimit -l` adjustment)
//! - **Fallback**: Zeroize-only mode when locking is unavailable (graceful degradation)
//!
//! ## Security Notes
//!
//! Memory locking prevents the OS from swapping sensitive data to disk, but:
//! - Requires sufficient locked memory quota
//! - May fail silently and fall back to zeroize-only mode
//! - Zeroization is always performed regardless of lock status

use zeroize::Zeroize;

/// Configuration for memory protection behavior
#[derive(Debug, Clone)]
pub struct MemoryProtectionConfig {
    /// Whether to attempt memory locking (mlock/VirtualLock)
    pub enable_mlock: bool,
    /// Maximum bytes to attempt locking (to avoid exhausting quota)
    pub max_lockable_bytes: usize,
}

impl Default for MemoryProtectionConfig {
    fn default() -> Self {
        Self {
            enable_mlock: true,
            max_lockable_bytes: 16 * 1024 * 1024, // 16MB default
        }
    }
}

/// Errors from memory protection operations
#[derive(Debug, thiserror::Error)]
pub enum MemoryProtectionError {
    #[error("Memory locking failed: {0}")]
    LockFailed(String),
    #[error("Insufficient permissions for memory locking")]
    InsufficientPermissions,
    #[error("Memory quota exceeded")]
    QuotaExceeded,
}

// Platform-specific memory locking implementations
#[cfg(windows)]
mod platform {
    use super::MemoryProtectionError;

    pub fn mlock(ptr: *const u8, len: usize) -> Result<(), MemoryProtectionError> {
        use windows_sys::Win32::System::Memory::VirtualLock;

        if len == 0 {
            return Ok(());
        }

        unsafe {
            if VirtualLock(ptr as *mut _, len) == 0 {
                let error = std::io::Error::last_os_error();
                Err(MemoryProtectionError::LockFailed(error.to_string()))
            } else {
                Ok(())
            }
        }
    }

    pub fn munlock(ptr: *const u8, len: usize) -> Result<(), MemoryProtectionError> {
        use windows_sys::Win32::System::Memory::VirtualUnlock;

        if len == 0 {
            return Ok(());
        }

        unsafe {
            // Best effort - don't fail on unlock errors
            VirtualUnlock(ptr as *mut _, len);
            Ok(())
        }
    }
}

#[cfg(unix)]
mod platform {
    use super::MemoryProtectionError;

    pub fn mlock(ptr: *const u8, len: usize) -> Result<(), MemoryProtectionError> {
        if len == 0 {
            return Ok(());
        }

        unsafe {
            if libc::mlock(ptr as *const libc::c_void, len) != 0 {
                let error = std::io::Error::last_os_error();
                Err(MemoryProtectionError::LockFailed(error.to_string()))
            } else {
                Ok(())
            }
        }
    }

    pub fn munlock(ptr: *const u8, len: usize) -> Result<(), MemoryProtectionError> {
        if len == 0 {
            return Ok(());
        }

        unsafe {
            // Best effort - don't fail on unlock errors
            libc::munlock(ptr as *const libc::c_void, len);
            Ok(())
        }
    }
}

#[cfg(not(any(windows, unix)))]
mod platform {
    use super::MemoryProtectionError;

    pub fn mlock(_ptr: *const u8, _len: usize) -> Result<(), MemoryProtectionError> {
        // No-op on unsupported platforms
        Err(MemoryProtectionError::LockFailed(
            "Platform does not support memory locking".to_string(),
        ))
    }

    pub fn munlock(_ptr: *const u8, _len: usize) -> Result<(), MemoryProtectionError> {
        Ok(())
    }
}

/// Secure buffer for sensitive file content
///
/// This buffer:
/// 1. Optionally locks memory to prevent swapping (mlock/VirtualLock)
/// 2. Zeroizes all data on drop to prevent memory scraping
///
/// ## Example
///
/// ```rust
/// use ixos_protocol::ixos_embed::memory_protection::SecureBuffer;
///
/// // Create a secure buffer from a string
/// let content = b"sensitive data here".to_vec();
/// let secure = SecureBuffer::new(content);
///
/// // Use the content
/// let text = secure.as_str().unwrap();
/// println!("Content length: {}", text.len());
///
/// // When `secure` goes out of scope, memory is:
/// // 1. Zeroized (all bytes set to 0)
/// // 2. Unlocked (if it was locked)
/// ```
pub struct SecureBuffer {
    data: Vec<u8>,
    locked: bool,
    config: MemoryProtectionConfig,
}

impl SecureBuffer {
    /// Create a new secure buffer with default configuration
    ///
    /// Attempts to lock memory if the data size is within limits.
    pub fn new(data: Vec<u8>) -> Self {
        Self::with_config(data, MemoryProtectionConfig::default())
    }

    /// Create a secure buffer with custom configuration
    pub fn with_config(data: Vec<u8>, config: MemoryProtectionConfig) -> Self {
        let mut buffer = Self {
            data,
            locked: false,
            config,
        };

        buffer.try_lock();
        buffer
    }

    /// Create a secure buffer without attempting to lock memory
    ///
    /// Use this when you know locking will fail or is not needed.
    pub fn new_unlocked(data: Vec<u8>) -> Self {
        Self {
            data,
            locked: false,
            config: MemoryProtectionConfig {
                enable_mlock: false,
                ..Default::default()
            },
        }
    }

    /// Attempt to lock memory to prevent swapping
    fn try_lock(&mut self) {
        if !self.config.enable_mlock {
            return;
        }

        if self.data.len() > self.config.max_lockable_bytes {
            tracing::debug!(
                "Data size {} exceeds max lockable {} bytes, skipping mlock",
                self.data.len(),
                self.config.max_lockable_bytes
            );
            return;
        }

        if self.data.is_empty() {
            return;
        }

        match platform::mlock(self.data.as_ptr(), self.data.len()) {
            Ok(()) => {
                self.locked = true;
                tracing::trace!("Memory locked: {} bytes", self.data.len());
            }
            Err(e) => {
                // Graceful degradation - continue without locking
                tracing::debug!(
                    "Memory lock unavailable (falling back to zeroize-only): {}",
                    e
                );
            }
        }
    }

    /// Get the buffer contents as a byte slice
    pub fn as_slice(&self) -> &[u8] {
        &self.data
    }

    /// Get the buffer contents as a mutable byte slice
    pub fn as_mut_slice(&mut self) -> &mut [u8] {
        &mut self.data
    }

    /// Try to interpret the buffer as a UTF-8 string
    pub fn as_str(&self) -> Result<&str, std::str::Utf8Error> {
        std::str::from_utf8(&self.data)
    }

    /// Get the length of the buffer
    pub fn len(&self) -> usize {
        self.data.len()
    }

    /// Check if the buffer is empty
    pub fn is_empty(&self) -> bool {
        self.data.is_empty()
    }

    /// Check if memory is currently locked
    pub fn is_locked(&self) -> bool {
        self.locked
    }

    /// Consume the buffer and return the inner data
    ///
    /// **Warning**: This transfers ownership without zeroizing.
    /// The caller is responsible for secure handling.
    pub fn into_inner(mut self) -> Vec<u8> {
        // Unlock if locked
        if self.locked {
            let _ = platform::munlock(self.data.as_ptr(), self.data.len());
            self.locked = false;
        }

        // Take the data without triggering Drop's zeroization
        std::mem::take(&mut self.data)
    }
}

impl Drop for SecureBuffer {
    fn drop(&mut self) {
        // Always zeroize - this is the critical security operation
        self.data.zeroize();

        // Unlock if we locked
        if self.locked {
            if let Err(e) = platform::munlock(self.data.as_ptr(), self.data.len()) {
                tracing::trace!("Memory unlock failed (non-critical): {}", e);
            }
        }
    }
}

impl From<Vec<u8>> for SecureBuffer {
    fn from(data: Vec<u8>) -> Self {
        Self::new(data)
    }
}

impl From<String> for SecureBuffer {
    fn from(s: String) -> Self {
        Self::new(s.into_bytes())
    }
}

impl From<&str> for SecureBuffer {
    fn from(s: &str) -> Self {
        Self::new(s.as_bytes().to_vec())
    }
}

/// Secure buffer for embedding vectors
///
/// This buffer zeroizes all float values on drop to prevent
/// embedding data from being recovered from memory.
///
/// ## Example
///
/// ```rust
/// use ixos_protocol::ixos_embed::memory_protection::SecureEmbeddingBuffer;
///
/// let embedding = vec![0.1, 0.2, 0.3, 0.4];
/// let secure = SecureEmbeddingBuffer::new(embedding);
///
/// // Use the embedding
/// let similarity = secure.as_slice().iter().sum::<f32>();
///
/// // When `secure` goes out of scope, all values are set to 0.0
/// ```
pub struct SecureEmbeddingBuffer {
    embedding: Vec<f32>,
}

impl SecureEmbeddingBuffer {
    /// Create a new secure embedding buffer
    pub fn new(embedding: Vec<f32>) -> Self {
        Self { embedding }
    }

    /// Get the embedding as a slice
    pub fn as_slice(&self) -> &[f32] {
        &self.embedding
    }

    /// Get the embedding as a mutable slice
    pub fn as_mut_slice(&mut self) -> &mut [f32] {
        &mut self.embedding
    }

    /// Get the embedding dimensions
    pub fn len(&self) -> usize {
        self.embedding.len()
    }

    /// Check if the embedding is empty
    pub fn is_empty(&self) -> bool {
        self.embedding.is_empty()
    }

    /// Consume the buffer and return the inner embedding
    ///
    /// **Warning**: This transfers ownership without zeroizing.
    /// The caller is responsible for secure handling.
    pub fn into_inner(mut self) -> Vec<f32> {
        std::mem::take(&mut self.embedding)
    }

    /// Clone the embedding data
    ///
    /// Returns a regular Vec<f32> that is NOT automatically zeroized.
    pub fn to_vec(&self) -> Vec<f32> {
        self.embedding.clone()
    }
}

impl Drop for SecureEmbeddingBuffer {
    fn drop(&mut self) {
        // Zeroize all float values
        for val in &mut self.embedding {
            *val = 0.0;
        }
        // Also zeroize the underlying bytes for extra safety
        // This handles potential non-zero bit patterns for 0.0
        let ptr = self.embedding.as_mut_ptr() as *mut u8;
        let len = self.embedding.len() * std::mem::size_of::<f32>();
        unsafe {
            std::ptr::write_bytes(ptr, 0, len);
        }
    }
}

impl From<Vec<f32>> for SecureEmbeddingBuffer {
    fn from(embedding: Vec<f32>) -> Self {
        Self::new(embedding)
    }
}

impl Zeroize for SecureEmbeddingBuffer {
    fn zeroize(&mut self) {
        for val in &mut self.embedding {
            *val = 0.0;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_secure_buffer_creation() {
        let data = b"sensitive data".to_vec();
        let buffer = SecureBuffer::new(data);
        assert_eq!(buffer.as_slice(), b"sensitive data");
        assert_eq!(buffer.len(), 14);
        assert!(!buffer.is_empty());
    }

    #[test]
    fn test_secure_buffer_as_str() {
        let buffer = SecureBuffer::from("hello world");
        assert_eq!(buffer.as_str().unwrap(), "hello world");
    }

    #[test]
    fn test_secure_buffer_from_string() {
        let buffer = SecureBuffer::from(String::from("test"));
        assert_eq!(buffer.as_str().unwrap(), "test");
    }

    #[test]
    fn test_secure_buffer_empty() {
        let buffer = SecureBuffer::new(Vec::new());
        assert!(buffer.is_empty());
        assert_eq!(buffer.len(), 0);
    }

    #[test]
    fn test_secure_buffer_unlocked() {
        let buffer = SecureBuffer::new_unlocked(b"data".to_vec());
        assert!(!buffer.is_locked());
        assert_eq!(buffer.as_slice(), b"data");
    }

    #[test]
    fn test_secure_buffer_into_inner() {
        let buffer = SecureBuffer::new(b"test".to_vec());
        let data = buffer.into_inner();
        assert_eq!(data, b"test");
    }

    #[test]
    fn test_secure_buffer_zeroizes_on_drop() {
        // This test verifies the behavior conceptually
        // Actual memory inspection would be UB
        let data = b"secret".to_vec();
        let _ptr = data.as_ptr();
        let _len = data.len();

        {
            let _buffer = SecureBuffer::new(data);
            // buffer is dropped here
        }

        // Note: Reading deallocated memory is UB, but in practice
        // the zeroize should have cleared the bytes before deallocation.
        // We can't safely test this without special tooling.
    }

    #[test]
    fn test_secure_embedding_buffer_creation() {
        let embedding = vec![0.1, 0.2, 0.3, 0.4];
        let buffer = SecureEmbeddingBuffer::new(embedding);
        assert_eq!(buffer.len(), 4);
        assert!(!buffer.is_empty());
    }

    #[test]
    fn test_secure_embedding_buffer_as_slice() {
        let embedding = vec![1.0, 2.0, 3.0];
        let buffer = SecureEmbeddingBuffer::new(embedding);
        assert_eq!(buffer.as_slice(), &[1.0, 2.0, 3.0]);
    }

    #[test]
    fn test_secure_embedding_buffer_to_vec() {
        let embedding = vec![0.5, 0.5];
        let buffer = SecureEmbeddingBuffer::new(embedding);
        let cloned = buffer.to_vec();
        assert_eq!(cloned, vec![0.5, 0.5]);
    }

    #[test]
    fn test_secure_embedding_buffer_into_inner() {
        let embedding = vec![1.0, 2.0];
        let buffer = SecureEmbeddingBuffer::new(embedding);
        let inner = buffer.into_inner();
        assert_eq!(inner, vec![1.0, 2.0]);
    }

    #[test]
    fn test_secure_embedding_buffer_from_vec() {
        let buffer: SecureEmbeddingBuffer = vec![0.1, 0.2].into();
        assert_eq!(buffer.len(), 2);
    }

    #[test]
    fn test_secure_embedding_buffer_zeroize_trait() {
        let mut buffer = SecureEmbeddingBuffer::new(vec![1.0, 2.0, 3.0]);
        buffer.zeroize();
        assert!(buffer.as_slice().iter().all(|&v| v == 0.0));
    }

    #[test]
    fn test_memory_protection_config_default() {
        let config = MemoryProtectionConfig::default();
        assert!(config.enable_mlock);
        assert_eq!(config.max_lockable_bytes, 16 * 1024 * 1024);
    }

    #[test]
    fn test_secure_buffer_with_custom_config() {
        let config = MemoryProtectionConfig {
            enable_mlock: false,
            max_lockable_bytes: 1024,
        };
        let buffer = SecureBuffer::with_config(b"data".to_vec(), config);
        assert!(!buffer.is_locked()); // mlock disabled
    }

    #[test]
    fn test_secure_buffer_large_data_skips_lock() {
        let config = MemoryProtectionConfig {
            enable_mlock: true,
            max_lockable_bytes: 10, // Very small limit
        };
        let data = vec![0u8; 100]; // Larger than limit
        let buffer = SecureBuffer::with_config(data, config);
        // Should not attempt to lock
        assert!(!buffer.is_locked());
    }

    #[test]
    fn test_mlock_graceful_degradation() {
        // Even if mlock fails (common without elevated privileges),
        // SecureBuffer should still work
        let buffer = SecureBuffer::new(b"test data".to_vec());
        assert_eq!(buffer.as_slice(), b"test data");
        // The buffer works regardless of lock status
    }

    #[test]
    fn test_secure_buffer_mutable_access() {
        let mut buffer = SecureBuffer::new(b"hello".to_vec());
        buffer.as_mut_slice()[0] = b'H';
        assert_eq!(buffer.as_str().unwrap(), "Hello");
    }

    #[test]
    fn test_secure_embedding_buffer_mutable_access() {
        let mut buffer = SecureEmbeddingBuffer::new(vec![1.0, 2.0, 3.0]);
        buffer.as_mut_slice()[0] = 10.0;
        assert_eq!(buffer.as_slice()[0], 10.0);
    }
}
