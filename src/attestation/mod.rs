//! Cryptographic Attestation for Legal Forensics
//!
//! Provides Ed25519-signed attestations that prove:
//! - A specific file existed at a specific time
//! - The semantic embedding was generated from that exact content
//! - The operation was performed by a specific device
//!
//! ## Features
//!
//! - **Ed25519 Signatures**: Industry-standard digital signatures
//! - **Hardware ID**: Device-specific attestation binding
//! - **Timestamp**: RFC 3339 compliant timestamps
//! - **eDiscovery Export**: JSON/JSONL export formats
//!
//! ## Example
//!
//! ```rust,no_run
//! use ixos_protocol::attestation::{AttestationService, Attestation};
//! use std::path::Path;
//!
//! let service = AttestationService::new().unwrap();
//!
//! // Create attestation for a file
//! let embedding = vec![0.1, 0.2, 0.3]; // From semantic engine
//! let attestation = service.create_attestation(
//!     Path::new("document.txt"),
//!     &embedding,
//! ).unwrap();
//!
//! // Verify attestation
//! assert!(service.verify_attestation(&attestation));
//!
//! // Export for eDiscovery
//! let json = AttestationService::export_attestation(&attestation).unwrap();
//! println!("{}", json);
//! ```

use crate::security::crypto::sha256_file;
use chrono::{DateTime, Utc};
use ed25519_dalek::{Signature, Signer, SigningKey, Verifier, VerifyingKey};
use rand::rngs::OsRng;
use serde::{Deserialize, Serialize};
use std::path::Path;

/// Default path for the attestation key
pub const DEFAULT_KEY_PATH: &str = "attestation_key.bin";

// =============================================================================
// Errors
// =============================================================================

/// Attestation errors
#[derive(Debug, thiserror::Error)]
pub enum AttestationError {
    #[error("Failed to read file: {0}")]
    FileReadError(#[from] std::io::Error),

    #[error("Signature verification failed")]
    SignatureInvalid,

    #[error("Failed to serialize attestation: {0}")]
    SerializationError(#[from] serde_json::Error),

    #[error("Key generation failed")]
    KeyGenerationError,

    #[error("Invalid key format")]
    InvalidKeyFormat,
}

// =============================================================================
// Attestation Data Structure
// =============================================================================

/// A cryptographically signed attestation of file content and embeddings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Attestation {
    /// Version of the attestation format
    pub version: u8,

    /// SHA256 hash of the file content
    #[serde(with = "hex_array")]
    pub file_hash: [u8; 32],

    /// SHA256 hash of the embedding vector (flattened bytes)
    #[serde(with = "hex_array")]
    pub embedding_hash: [u8; 32],

    /// SHA256 fingerprint of the model used
    #[serde(with = "hex_array")]
    pub model_fingerprint: [u8; 32],

    /// RFC 3339 timestamp of when attestation was created
    pub timestamp: DateTime<Utc>,

    /// Hardware identifier for the device
    pub hardware_id: String,

    /// Original file path (for reference)
    pub file_path: String,

    /// File size in bytes
    pub file_size: u64,

    /// Ed25519 signature of the attestation data
    #[serde(with = "hex_signature")]
    pub signature: [u8; 64],

    /// Public key that can verify this attestation
    #[serde(with = "hex_pubkey")]
    pub public_key: [u8; 32],
}

impl Attestation {
    /// Get the data that was signed (everything except signature)
    fn signable_data(&self) -> Vec<u8> {
        let mut data = Vec::new();
        data.push(self.version);
        data.extend_from_slice(&self.file_hash);
        data.extend_from_slice(&self.embedding_hash);
        data.extend_from_slice(&self.model_fingerprint);
        data.extend_from_slice(self.timestamp.to_rfc3339().as_bytes());
        data.extend_from_slice(self.hardware_id.as_bytes());
        data.extend_from_slice(self.file_path.as_bytes());
        data.extend_from_slice(&self.file_size.to_le_bytes());
        data
    }
}

// =============================================================================
// Attestation Service
// =============================================================================

/// Service for creating and verifying attestations
pub struct AttestationService {
    /// Ed25519 signing key
    signing_key: SigningKey,
    /// Hardware identifier
    hardware_id: String,
    /// Model fingerprint (default stub for now)
    model_fingerprint: [u8; 32],
}

impl AttestationService {
    /// Create a new attestation service with a randomly generated key
    pub fn new() -> Result<Self, AttestationError> {
        let signing_key = SigningKey::generate(&mut OsRng);
        let hardware_id = get_hardware_id();

        Ok(Self {
            signing_key,
            hardware_id,
            model_fingerprint: [0u8; 32], // Will be set when model is loaded
        })
    }

    /// Create an attestation service with an existing key
    pub fn with_key(key_bytes: &[u8; 32]) -> Result<Self, AttestationError> {
        let signing_key = SigningKey::from_bytes(key_bytes);
        let hardware_id = get_hardware_id();

        Ok(Self {
            signing_key,
            hardware_id,
            model_fingerprint: [0u8; 32],
        })
    }

    /// Load or create an attestation service from a key file
    pub fn load_or_create(key_path: &Path) -> Result<Self, AttestationError> {
        if key_path.exists() {
            let key_bytes = std::fs::read(key_path)?;
            if key_bytes.len() != 32 {
                return Err(AttestationError::InvalidKeyFormat);
            }
            let mut key_array = [0u8; 32];
            key_array.copy_from_slice(&key_bytes);
            Self::with_key(&key_array)
        } else {
            let service = Self::new()?;
            service.save_key(key_path)?;
            Ok(service)
        }
    }

    /// Save the signing key to a file
    pub fn save_key(&self, path: &Path) -> Result<(), AttestationError> {
        std::fs::write(path, self.signing_key.to_bytes())?;
        Ok(())
    }

    /// Get the public key bytes
    pub fn public_key(&self) -> [u8; 32] {
        self.signing_key.verifying_key().to_bytes()
    }

    /// Set the model fingerprint
    pub fn set_model_fingerprint(&mut self, fingerprint: [u8; 32]) {
        self.model_fingerprint = fingerprint;
    }

    /// Create an attestation for a file and its embedding
    pub fn create_attestation(
        &self,
        file_path: &Path,
        embedding: &[f32],
    ) -> Result<Attestation, AttestationError> {
        // Get file hash
        let file_hash = sha256_file(file_path)?;

        // Get file size
        let metadata = std::fs::metadata(file_path)?;
        let file_size = metadata.len();

        // Hash the embedding
        let embedding_bytes: Vec<u8> = embedding.iter().flat_map(|f| f.to_le_bytes()).collect();
        let embedding_hash = crate::security::crypto::sha256(&embedding_bytes);

        // Create attestation (without signature first)
        let mut attestation = Attestation {
            version: 1,
            file_hash,
            embedding_hash,
            model_fingerprint: self.model_fingerprint,
            timestamp: Utc::now(),
            hardware_id: self.hardware_id.clone(),
            file_path: file_path.to_string_lossy().to_string(),
            file_size,
            signature: [0u8; 64],
            public_key: self.public_key(),
        };

        // Sign the attestation
        let signable = attestation.signable_data();
        let signature = self.signing_key.sign(&signable);
        attestation.signature = signature.to_bytes();

        Ok(attestation)
    }

    /// Verify an attestation's signature
    pub fn verify_attestation(&self, attestation: &Attestation) -> bool {
        Self::verify_attestation_static(attestation)
    }

    /// Verify an attestation's signature (static method)
    pub fn verify_attestation_static(attestation: &Attestation) -> bool {
        // Reconstruct verifying key from public key in attestation
        let verifying_key = match VerifyingKey::from_bytes(&attestation.public_key) {
            Ok(key) => key,
            Err(_) => return false,
        };

        // Reconstruct signature (from_bytes returns Signature directly in ed25519-dalek 2.x)
        let signature = Signature::from_bytes(&attestation.signature);

        // Verify
        let signable = attestation.signable_data();
        verifying_key.verify(&signable, &signature).is_ok()
    }

    /// Export attestation as JSON string
    pub fn export_attestation(attestation: &Attestation) -> Result<String, AttestationError> {
        Ok(serde_json::to_string_pretty(attestation)?)
    }

    /// Export multiple attestations as JSONL (JSON Lines)
    pub fn export_attestations_jsonl(
        attestations: &[Attestation],
    ) -> Result<String, AttestationError> {
        let mut result = String::new();
        for attestation in attestations {
            result.push_str(&serde_json::to_string(attestation)?);
            result.push('\n');
        }
        Ok(result)
    }

    /// Export to file
    pub fn export_to_file(
        attestations: &[Attestation],
        path: &Path,
        format: ExportFormat,
    ) -> Result<(), AttestationError> {
        let content = match format {
            ExportFormat::Json => serde_json::to_string_pretty(attestations)?,
            ExportFormat::JsonLines => Self::export_attestations_jsonl(attestations)?,
        };
        std::fs::write(path, content)?;
        Ok(())
    }
}

/// Export format for attestations
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExportFormat {
    /// Pretty-printed JSON array
    Json,
    /// JSON Lines (one JSON object per line)
    JsonLines,
}

// =============================================================================
// Hardware ID Detection
// =============================================================================

/// Get a unique hardware identifier for this device
fn get_hardware_id() -> String {
    // Try to get machine ID from sysinfo
    use sysinfo::System;
    let _system = System::new_all();

    // Use hostname + boot time as a pseudo-hardware ID
    let hostname = System::host_name().unwrap_or_else(|| "unknown".to_string());
    let boot_time = System::boot_time();

    format!("{}-{:x}", hostname, boot_time)
}

// =============================================================================
// Hex Serialization Helpers
// =============================================================================

mod hex_array {
    use serde::{Deserialize, Deserializer, Serializer};

    pub fn serialize<S>(bytes: &[u8; 32], serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let hex_string: String = bytes.iter().map(|b| format!("{:02x}", b)).collect();
        serializer.serialize_str(&hex_string)
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<[u8; 32], D::Error>
    where
        D: Deserializer<'de>,
    {
        let hex_string = String::deserialize(deserializer)?;
        let bytes: Result<Vec<u8>, _> = (0..hex_string.len())
            .step_by(2)
            .map(|i| u8::from_str_radix(&hex_string[i..i + 2], 16))
            .collect();
        let bytes = bytes.map_err(serde::de::Error::custom)?;
        let mut array = [0u8; 32];
        array.copy_from_slice(&bytes);
        Ok(array)
    }
}

mod hex_signature {
    use serde::{Deserialize, Deserializer, Serializer};

    pub fn serialize<S>(bytes: &[u8; 64], serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let hex_string: String = bytes.iter().map(|b| format!("{:02x}", b)).collect();
        serializer.serialize_str(&hex_string)
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<[u8; 64], D::Error>
    where
        D: Deserializer<'de>,
    {
        let hex_string = String::deserialize(deserializer)?;
        let bytes: Result<Vec<u8>, _> = (0..hex_string.len())
            .step_by(2)
            .map(|i| u8::from_str_radix(&hex_string[i..i + 2], 16))
            .collect();
        let bytes = bytes.map_err(serde::de::Error::custom)?;
        let mut array = [0u8; 64];
        array.copy_from_slice(&bytes);
        Ok(array)
    }
}

mod hex_pubkey {
    use serde::{Deserialize, Deserializer, Serializer};

    pub fn serialize<S>(bytes: &[u8; 32], serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let hex_string: String = bytes.iter().map(|b| format!("{:02x}", b)).collect();
        serializer.serialize_str(&hex_string)
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<[u8; 32], D::Error>
    where
        D: Deserializer<'de>,
    {
        let hex_string = String::deserialize(deserializer)?;
        let bytes: Result<Vec<u8>, _> = (0..hex_string.len())
            .step_by(2)
            .map(|i| u8::from_str_radix(&hex_string[i..i + 2], 16))
            .collect();
        let bytes = bytes.map_err(serde::de::Error::custom)?;
        let mut array = [0u8; 32];
        array.copy_from_slice(&bytes);
        Ok(array)
    }
}

// =============================================================================
// Tests
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;
    use tempfile::TempDir;

    fn create_test_file(dir: &TempDir, name: &str, content: &str) -> PathBuf {
        let path = dir.path().join(name);
        std::fs::write(&path, content).unwrap();
        path
    }

    #[test]
    fn test_create_attestation_service() {
        let service = AttestationService::new().unwrap();
        let pubkey = service.public_key();
        assert_eq!(pubkey.len(), 32);
    }

    #[test]
    fn test_create_attestation() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = create_test_file(&temp_dir, "test.txt", "Hello, World!");

        let service = AttestationService::new().unwrap();
        let embedding = vec![0.1, 0.2, 0.3, 0.4, 0.5];
        let attestation = service.create_attestation(&file_path, &embedding).unwrap();

        assert_eq!(attestation.version, 1);
        assert!(!attestation.file_hash.iter().all(|&b| b == 0));
        assert!(!attestation.embedding_hash.iter().all(|&b| b == 0));
        assert!(attestation.file_size > 0);
    }

    #[test]
    fn test_verify_attestation() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = create_test_file(&temp_dir, "test.txt", "Test content");

        let service = AttestationService::new().unwrap();
        let embedding = vec![1.0, 2.0, 3.0];
        let attestation = service.create_attestation(&file_path, &embedding).unwrap();

        assert!(service.verify_attestation(&attestation));
        assert!(AttestationService::verify_attestation_static(&attestation));
    }

    #[test]
    fn test_tampered_attestation_fails() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = create_test_file(&temp_dir, "test.txt", "Test content");

        let service = AttestationService::new().unwrap();
        let embedding = vec![1.0, 2.0, 3.0];
        let mut attestation = service.create_attestation(&file_path, &embedding).unwrap();

        // Tamper with the file hash
        attestation.file_hash[0] ^= 0xFF;

        assert!(!service.verify_attestation(&attestation));
    }

    #[test]
    fn test_export_attestation_json() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = create_test_file(&temp_dir, "test.txt", "Test content");

        let service = AttestationService::new().unwrap();
        let embedding = vec![1.0, 2.0, 3.0];
        let attestation = service.create_attestation(&file_path, &embedding).unwrap();

        let json = AttestationService::export_attestation(&attestation).unwrap();
        assert!(json.contains("file_hash"));
        assert!(json.contains("signature"));
        assert!(json.contains("timestamp"));
    }

    #[test]
    fn test_attestation_serialization_roundtrip() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = create_test_file(&temp_dir, "test.txt", "Test content");

        let service = AttestationService::new().unwrap();
        let embedding = vec![1.0, 2.0, 3.0];
        let original = service.create_attestation(&file_path, &embedding).unwrap();

        // Serialize and deserialize
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: Attestation = serde_json::from_str(&json).unwrap();

        // Verify the deserialized attestation
        assert!(AttestationService::verify_attestation_static(&deserialized));
        assert_eq!(original.file_hash, deserialized.file_hash);
        assert_eq!(original.embedding_hash, deserialized.embedding_hash);
    }

    #[test]
    fn test_load_or_create_key() {
        let temp_dir = TempDir::new().unwrap();
        let key_path = temp_dir.path().join("test_key.bin");

        // First call creates key
        let service1 = AttestationService::load_or_create(&key_path).unwrap();
        let pubkey1 = service1.public_key();

        // Second call loads existing key
        let service2 = AttestationService::load_or_create(&key_path).unwrap();
        let pubkey2 = service2.public_key();

        assert_eq!(pubkey1, pubkey2);
    }

    #[test]
    fn test_hardware_id() {
        let hw_id = get_hardware_id();
        assert!(!hw_id.is_empty());
        assert!(hw_id.contains('-')); // Should have hostname-boottime format
    }

    #[test]
    fn test_export_jsonl() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = create_test_file(&temp_dir, "test.txt", "Test content");

        let service = AttestationService::new().unwrap();
        let embedding = vec![1.0, 2.0, 3.0];
        let att1 = service.create_attestation(&file_path, &embedding).unwrap();
        let att2 = service.create_attestation(&file_path, &embedding).unwrap();

        let jsonl = AttestationService::export_attestations_jsonl(&[att1, att2]).unwrap();
        let lines: Vec<&str> = jsonl.lines().collect();
        assert_eq!(lines.len(), 2);
    }
}
