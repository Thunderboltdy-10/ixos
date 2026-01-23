//! Cryptographic utilities for Ixos
//!
//! Provides:
//! - Persistent HMAC key generation and storage
//! - SHA256 hashing utilities

use ring::digest::{digest, SHA256};
use ring::rand::{SecureRandom, SystemRandom};
use std::fs;
use std::path::{Path, PathBuf};

/// Key length for HMAC-SHA256
pub const KEY_LENGTH: usize = 32;

/// Load existing key or create a new one
///
/// Keys are stored in the user's config directory:
/// - Windows: %APPDATA%\ixos\cache_key
/// - Linux: ~/.config/ixos/cache_key
/// - macOS: ~/Library/Application Support/ixos/cache_key
pub fn load_or_create_key() -> [u8; KEY_LENGTH] {
    let key_path = get_key_path();

    // Try to load existing key
    if let Ok(key_bytes) = fs::read(&key_path) {
        if key_bytes.len() == KEY_LENGTH {
            let mut key = [0u8; KEY_LENGTH];
            key.copy_from_slice(&key_bytes);
            // Use trace level to avoid log spam - this is called once per file
            tracing::trace!("Loaded existing HMAC key from {:?}", key_path);
            return key;
        }
        tracing::warn!("Invalid key file at {:?}, regenerating", key_path);
    }

    // Generate new key
    let key = generate_key();

    // Store the key
    if let Some(parent) = key_path.parent() {
        if let Err(e) = fs::create_dir_all(parent) {
            tracing::warn!("Failed to create config directory: {}", e);
        }
    }

    if let Err(e) = fs::write(&key_path, key) {
        tracing::warn!("Failed to persist HMAC key: {}", e);
    } else {
        tracing::info!("Generated new HMAC key at {:?}", key_path);

        // Set restrictive permissions on Unix
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            if let Err(e) = fs::set_permissions(&key_path, fs::Permissions::from_mode(0o600)) {
                tracing::warn!("Failed to set key file permissions: {}", e);
            }
        }
    }

    key
}

/// Generate a new random HMAC key
pub fn generate_key() -> [u8; KEY_LENGTH] {
    let rng = SystemRandom::new();
    let mut key = [0u8; KEY_LENGTH];
    rng.fill(&mut key).expect("Failed to generate random key");
    key
}

/// Get the path to the HMAC key file
pub fn get_key_path() -> PathBuf {
    let config_dir = dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("ixos");
    config_dir.join("cache_key")
}

/// Compute SHA256 hash of data
pub fn sha256(data: &[u8]) -> [u8; 32] {
    let hash = digest(&SHA256, data);
    let mut result = [0u8; 32];
    result.copy_from_slice(hash.as_ref());
    result
}

/// Compute SHA256 hash of a file
pub fn sha256_file(path: &Path) -> std::io::Result<[u8; 32]> {
    let content = fs::read(path)?;
    Ok(sha256(&content))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_key_length() {
        let key = generate_key();
        assert_eq!(key.len(), KEY_LENGTH);
    }

    #[test]
    fn test_generate_key_uniqueness() {
        let key1 = generate_key();
        let key2 = generate_key();
        assert_ne!(key1, key2, "Keys should be unique");
    }

    #[test]
    fn test_sha256_known_value() {
        // SHA256 of empty string
        let hash = sha256(b"");
        let expected = [
            0xe3, 0xb0, 0xc4, 0x42, 0x98, 0xfc, 0x1c, 0x14, 0x9a, 0xfb, 0xf4, 0xc8, 0x99, 0x6f,
            0xb9, 0x24, 0x27, 0xae, 0x41, 0xe4, 0x64, 0x9b, 0x93, 0x4c, 0xa4, 0x95, 0x99, 0x1b,
            0x78, 0x52, 0xb8, 0x55,
        ];
        assert_eq!(hash, expected);
    }

    #[test]
    fn test_sha256_hello() {
        let hash = sha256(b"hello");
        // First few bytes of SHA256("hello")
        assert_eq!(hash[0], 0x2c);
        assert_eq!(hash[1], 0xf2);
    }
}
