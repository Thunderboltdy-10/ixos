//! Compliance record storage with HMAC signing.
//!
//! This module provides tamper-evident storage for compliance records
//! using HMAC-SHA256 signatures, following the same pattern as the
//! embedding cache validator.

use ring::hmac::{self, Key, HMAC_SHA256};
use serde::{de::DeserializeOwned, Serialize};
use std::path::{Path, PathBuf};

use super::types::ComplianceError;

/// Get the compliance storage directory
///
/// Returns platform-specific path:
/// - Windows: `%APPDATA%\ixos\compliance\`
/// - Linux: `~/.config/ixos/compliance/`
/// - macOS: `~/Library/Application Support/ixos/compliance/`
pub fn compliance_dir() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("ixos")
        .join("compliance")
}

/// Validator for signing and verifying compliance records.
///
/// Uses HMAC-SHA256 to ensure record integrity and detect tampering.
/// Follows the same pattern as `storage::validator::MetadataValidator`.
pub struct ComplianceValidator {
    hmac_key: Key,
}

impl ComplianceValidator {
    /// Create a new validator with the given key
    pub fn new(key_bytes: &[u8; 32]) -> Self {
        Self {
            hmac_key: Key::new(HMAC_SHA256, key_bytes),
        }
    }

    /// Sign a serializable record
    ///
    /// Format: `[json_len:u32][json_bytes][signature:32]`
    pub fn sign<T: Serialize>(&self, record: &T) -> Result<Vec<u8>, ComplianceError> {
        let json = serde_json::to_vec(record)?;
        let signature = hmac::sign(&self.hmac_key, &json);

        let mut payload = Vec::with_capacity(4 + json.len() + 32);
        payload.extend_from_slice(&(json.len() as u32).to_le_bytes());
        payload.extend_from_slice(&json);
        payload.extend_from_slice(signature.as_ref());

        Ok(payload)
    }

    /// Verify and deserialize a signed record
    pub fn verify<T: DeserializeOwned>(&self, data: &[u8]) -> Result<T, ComplianceError> {
        // Minimum size: 4 (length) + 1 (min json) + 32 (signature)
        if data.len() < 37 {
            return Err(ComplianceError::InvalidFormat);
        }

        let json_len = u32::from_le_bytes([data[0], data[1], data[2], data[3]]) as usize;

        if data.len() < 4 + json_len + 32 {
            return Err(ComplianceError::InvalidFormat);
        }

        let json = &data[4..4 + json_len];
        let signature = &data[4 + json_len..4 + json_len + 32];

        hmac::verify(&self.hmac_key, json, signature)
            .map_err(|_| ComplianceError::InvalidSignature)?;

        let record: T = serde_json::from_slice(json)?;
        Ok(record)
    }
}

/// File-based compliance storage with HMAC signing
pub struct ComplianceStorage {
    base_dir: PathBuf,
    validator: ComplianceValidator,
}

impl ComplianceStorage {
    /// Create a new storage instance
    ///
    /// Uses the provided HMAC key for signing records.
    /// Creates necessary subdirectories if they don't exist.
    pub fn new(key: &[u8; 32]) -> Result<Self, ComplianceError> {
        let base_dir = compliance_dir();
        std::fs::create_dir_all(&base_dir)?;

        // Create subdirectories
        for subdir in &["consent", "requests", "audit", "exports", "history"] {
            std::fs::create_dir_all(base_dir.join(subdir))?;
        }

        Ok(Self {
            base_dir,
            validator: ComplianceValidator::new(key),
        })
    }

    /// Create storage using the existing HMAC key from security::crypto
    pub fn new_with_default_key() -> Result<Self, ComplianceError> {
        let key = crate::security::crypto::load_or_create_key();
        Self::new(&key)
    }

    /// Get the base directory for compliance storage
    pub fn base_dir(&self) -> &Path {
        &self.base_dir
    }

    /// Get path to a specific subdirectory
    pub fn subdir(&self, name: &str) -> PathBuf {
        self.base_dir.join(name)
    }

    /// Store a signed record to a file
    pub fn store<T: Serialize>(
        &self,
        subdir: &str,
        filename: &str,
        record: &T,
    ) -> Result<PathBuf, ComplianceError> {
        let path = self.base_dir.join(subdir).join(filename);
        let signed = self.validator.sign(record)?;
        std::fs::write(&path, signed)?;
        Ok(path)
    }

    /// Load and verify a record from a file
    pub fn load<T: DeserializeOwned>(
        &self,
        subdir: &str,
        filename: &str,
    ) -> Result<T, ComplianceError> {
        let path = self.base_dir.join(subdir).join(filename);
        let data = std::fs::read(&path)?;
        self.validator.verify(&data)
    }

    /// Load a record from an absolute path
    pub fn load_path<T: DeserializeOwned>(&self, path: &Path) -> Result<T, ComplianceError> {
        let data = std::fs::read(path)?;
        self.validator.verify(&data)
    }

    /// Check if a record exists
    pub fn exists(&self, subdir: &str, filename: &str) -> bool {
        self.base_dir.join(subdir).join(filename).exists()
    }

    /// Delete a record
    pub fn delete(&self, subdir: &str, filename: &str) -> Result<(), ComplianceError> {
        let path = self.base_dir.join(subdir).join(filename);
        if path.exists() {
            std::fs::remove_file(path)?;
        }
        Ok(())
    }

    /// List all files in a subdirectory with a given extension
    pub fn list_files(
        &self,
        subdir: &str,
        extension: &str,
    ) -> Result<Vec<PathBuf>, ComplianceError> {
        let dir = self.base_dir.join(subdir);
        if !dir.exists() {
            return Ok(Vec::new());
        }

        let mut files = Vec::new();
        for entry in std::fs::read_dir(&dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_file() {
                if let Some(ext) = path.extension() {
                    if ext == extension {
                        files.push(path);
                    }
                }
            }
        }

        // Sort by modification time (newest first)
        files.sort_by(|a, b| {
            let a_time = std::fs::metadata(a).and_then(|m| m.modified()).ok();
            let b_time = std::fs::metadata(b).and_then(|m| m.modified()).ok();
            b_time.cmp(&a_time)
        });

        Ok(files)
    }

    /// Load all records of a type from a subdirectory
    pub fn load_all<T: DeserializeOwned>(
        &self,
        subdir: &str,
        extension: &str,
    ) -> Result<Vec<T>, ComplianceError> {
        let files = self.list_files(subdir, extension)?;
        let mut records = Vec::new();

        for path in files {
            match self.load_path(&path) {
                Ok(record) => records.push(record),
                Err(e) => {
                    tracing::warn!("Failed to load compliance record {:?}: {}", path, e);
                    // Continue loading other records
                }
            }
        }

        Ok(records)
    }

    /// Store an unsigned record (for non-critical data like exports)
    pub fn store_unsigned<T: Serialize>(
        &self,
        subdir: &str,
        filename: &str,
        record: &T,
    ) -> Result<PathBuf, ComplianceError> {
        let path = self.base_dir.join(subdir).join(filename);
        let json = serde_json::to_string_pretty(record)?;
        std::fs::write(&path, json)?;
        Ok(path)
    }

    /// Load an unsigned record
    pub fn load_unsigned<T: DeserializeOwned>(
        &self,
        subdir: &str,
        filename: &str,
    ) -> Result<T, ComplianceError> {
        let path = self.base_dir.join(subdir).join(filename);
        let json = std::fs::read_to_string(&path)?;
        let record: T = serde_json::from_str(&json)?;
        Ok(record)
    }

    /// Append a line to a JSONL file (for audit logs)
    pub fn append_jsonl<T: Serialize>(
        &self,
        subdir: &str,
        filename: &str,
        record: &T,
    ) -> Result<(), ComplianceError> {
        let path = self.base_dir.join(subdir).join(filename);
        let json_line = serde_json::to_string(record)?;

        use std::io::Write;
        let mut file = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(path)?;

        writeln!(file, "{}", json_line)?;
        Ok(())
    }

    /// Read all lines from a JSONL file
    pub fn read_jsonl<T: DeserializeOwned>(
        &self,
        subdir: &str,
        filename: &str,
    ) -> Result<Vec<T>, ComplianceError> {
        let path = self.base_dir.join(subdir).join(filename);
        if !path.exists() {
            return Ok(Vec::new());
        }

        let content = std::fs::read_to_string(&path)?;
        let mut records = Vec::new();

        for line in content.lines() {
            if !line.trim().is_empty() {
                match serde_json::from_str(line) {
                    Ok(record) => records.push(record),
                    Err(e) => {
                        tracing::warn!("Failed to parse JSONL line: {}", e);
                    }
                }
            }
        }

        Ok(records)
    }

    /// Clear all files in a subdirectory
    pub fn clear_subdir(&self, subdir: &str) -> Result<usize, ComplianceError> {
        let dir = self.base_dir.join(subdir);
        if !dir.exists() {
            return Ok(0);
        }

        let mut count = 0;
        for entry in std::fs::read_dir(&dir)? {
            let entry = entry?;
            if entry.path().is_file() {
                std::fs::remove_file(entry.path())?;
                count += 1;
            }
        }

        Ok(count)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::{Deserialize, Serialize};

    #[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
    struct TestRecord {
        id: String,
        value: i32,
    }

    #[test]
    fn test_validator_sign_verify_roundtrip() {
        let key = [0u8; 32];
        let validator = ComplianceValidator::new(&key);

        let record = TestRecord {
            id: "test-123".to_string(),
            value: 42,
        };

        let signed = validator.sign(&record).unwrap();
        let verified: TestRecord = validator.verify(&signed).unwrap();

        assert_eq!(record, verified);
    }

    #[test]
    fn test_validator_detects_tampering() {
        let key = [0u8; 32];
        let validator = ComplianceValidator::new(&key);

        let record = TestRecord {
            id: "test-123".to_string(),
            value: 42,
        };

        let mut signed = validator.sign(&record).unwrap();

        // Tamper with the data
        if let Some(byte) = signed.get_mut(10) {
            *byte ^= 0xFF;
        }

        let result: Result<TestRecord, _> = validator.verify(&signed);
        assert!(matches!(result, Err(ComplianceError::InvalidSignature)));
    }

    #[test]
    fn test_validator_rejects_short_data() {
        let key = [0u8; 32];
        let validator = ComplianceValidator::new(&key);

        let short_data = vec![0u8; 10];
        let result: Result<TestRecord, _> = validator.verify(&short_data);
        assert!(matches!(result, Err(ComplianceError::InvalidFormat)));
    }
}
