//! Metadata signing and verification for cached embeddings
//!
//! Provides HMAC-SHA256 signing to prevent cache poisoning attacks.
//! All cached embeddings are signed with a per-installation key.

use half::f16;
use ring::hmac::{self, Key, HMAC_SHA256};

/// Binary format version for signed metadata
const VERSION_SIGNED: u8 = 2;

/// Number of embedding dimensions
const EMBEDDING_DIMS: usize = 64;

/// Total size of signed metadata:
/// version(1) + fingerprint(32) + file_hash(32) + embedding(128) + signature(32) = 225 bytes
pub const METADATA_SIZE: usize = 1 + 32 + 32 + (EMBEDDING_DIMS * 2) + 32;

/// Validates and signs embedding metadata
pub struct MetadataValidator {
    hmac_key: Key,
    model_fingerprint: [u8; 32],
}

impl MetadataValidator {
    /// Create a new validator with the given HMAC key and model fingerprint
    ///
    /// # Arguments
    /// * `key_bytes` - 32-byte HMAC key (should be persistent per installation)
    /// * `model_fingerprint` - SHA256 hash of the model weights (for version tracking)
    pub fn new(key_bytes: &[u8; 32], model_fingerprint: [u8; 32]) -> Self {
        Self {
            hmac_key: Key::new(HMAC_SHA256, key_bytes),
            model_fingerprint,
        }
    }

    /// Get the model fingerprint for this validator
    pub fn model_fingerprint(&self) -> &[u8; 32] {
        &self.model_fingerprint
    }

    /// Sign an embedding with file hash, creating a verifiable blob
    ///
    /// # Binary Format (225 bytes)
    /// ```text
    /// [version:u8][model_fingerprint:32b][file_hash:32b][embedding:128b][signature:32b]
    /// ```
    ///
    /// # Arguments
    /// * `embedding` - The embedding vector (64 f32 values)
    /// * `file_hash` - SHA256 hash of the source file content
    ///
    /// # Returns
    /// A signed binary blob that can be stored in file metadata
    pub fn sign(&self, embedding: &[f32], file_hash: &[u8; 32]) -> Vec<u8> {
        let mut payload = Vec::with_capacity(METADATA_SIZE);

        // Version byte
        payload.push(VERSION_SIGNED);

        // Model fingerprint (32 bytes)
        payload.extend_from_slice(&self.model_fingerprint);

        // File hash (32 bytes)
        payload.extend_from_slice(file_hash);

        // Embedding quantized to f16 (64 * 2 = 128 bytes)
        for val in embedding.iter().take(EMBEDDING_DIMS) {
            let f16_val = f16::from_f32(*val);
            payload.extend_from_slice(&f16_val.to_le_bytes());
        }

        // Pad with zeros if embedding is shorter than expected
        for _ in embedding.len()..EMBEDDING_DIMS {
            payload.extend_from_slice(&f16::ZERO.to_le_bytes());
        }

        // HMAC-SHA256 signature (32 bytes)
        let signature = hmac::sign(&self.hmac_key, &payload);
        payload.extend_from_slice(signature.as_ref());

        payload
    }

    /// Verify and decode a signed metadata blob
    ///
    /// # Arguments
    /// * `data` - The signed binary blob from `sign()`
    /// * `expected_file_hash` - SHA256 hash of the current file content
    ///
    /// # Returns
    /// The decoded embedding if verification succeeds
    ///
    /// # Errors
    /// - `InvalidFormat` - Data too short or malformed
    /// - `UnsupportedVersion` - Unknown format version
    /// - `ModelMismatch` - Model fingerprint doesn't match (model updated)
    /// - `FileHashMismatch` - File content changed since caching
    /// - `InvalidSignature` - HMAC verification failed (tampering detected)
    pub fn verify(
        &self,
        data: &[u8],
        expected_file_hash: &[u8; 32],
    ) -> Result<Vec<f32>, ValidatorError> {
        // Check minimum length
        if data.len() < METADATA_SIZE {
            return Err(ValidatorError::InvalidFormat);
        }

        // Check version
        if data[0] != VERSION_SIGNED {
            return Err(ValidatorError::UnsupportedVersion(data[0]));
        }

        // Check model fingerprint (bytes 1-33)
        let stored_fingerprint = &data[1..33];
        if stored_fingerprint != self.model_fingerprint {
            return Err(ValidatorError::ModelMismatch);
        }

        // Check file hash (bytes 33-65)
        let stored_file_hash = &data[33..65];
        if stored_file_hash != expected_file_hash {
            return Err(ValidatorError::FileHashMismatch);
        }

        // Verify HMAC signature
        let signature_start = data.len() - 32;
        let payload = &data[..signature_start];
        let signature = &data[signature_start..];

        hmac::verify(&self.hmac_key, payload, signature)
            .map_err(|_| ValidatorError::InvalidSignature)?;

        // Decode embedding from f16 (bytes 65 to signature_start)
        let embedding_bytes = &data[65..signature_start];
        let mut embedding = Vec::with_capacity(EMBEDDING_DIMS);

        for chunk in embedding_bytes.chunks(2) {
            if chunk.len() == 2 {
                let f16_val = f16::from_le_bytes([chunk[0], chunk[1]]);
                embedding.push(f16_val.to_f32());
            }
        }

        Ok(embedding)
    }
}

/// Errors that can occur during metadata validation
#[derive(Debug, thiserror::Error)]
pub enum ValidatorError {
    #[error("Invalid metadata format - data too short or malformed")]
    InvalidFormat,

    #[error("Unsupported metadata version: {0}")]
    UnsupportedVersion(u8),

    #[error("Model fingerprint mismatch - cache needs regeneration")]
    ModelMismatch,

    #[error("File hash mismatch - file was modified since caching")]
    FileHashMismatch,

    #[error("Invalid signature - possible tampering detected")]
    InvalidSignature,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_key() -> [u8; 32] {
        [0x42u8; 32]
    }

    fn test_fingerprint() -> [u8; 32] {
        [0xABu8; 32]
    }

    fn test_file_hash() -> [u8; 32] {
        [0xCDu8; 32]
    }

    fn test_embedding() -> Vec<f32> {
        (0..64).map(|i| i as f32 * 0.01).collect()
    }

    #[test]
    fn test_sign_produces_correct_length() {
        let validator = MetadataValidator::new(&test_key(), test_fingerprint());
        let signed = validator.sign(&test_embedding(), &test_file_hash());
        assert_eq!(signed.len(), METADATA_SIZE);
    }

    #[test]
    fn test_sign_verify_roundtrip() {
        let validator = MetadataValidator::new(&test_key(), test_fingerprint());
        let original = test_embedding();
        let file_hash = test_file_hash();

        let signed = validator.sign(&original, &file_hash);
        let decoded = validator.verify(&signed, &file_hash).unwrap();

        // Check that embedding values are close (f16 precision loss is acceptable)
        assert_eq!(decoded.len(), original.len());
        for (orig, dec) in original.iter().zip(decoded.iter()) {
            assert!(
                (orig - dec).abs() < 0.01,
                "Values differ: {} vs {}",
                orig,
                dec
            );
        }
    }

    #[test]
    fn test_reject_tampered_payload() {
        let validator = MetadataValidator::new(&test_key(), test_fingerprint());
        let mut signed = validator.sign(&test_embedding(), &test_file_hash());

        // Tamper with the embedding bytes
        signed[70] ^= 0xFF;

        let result = validator.verify(&signed, &test_file_hash());
        assert!(matches!(result, Err(ValidatorError::InvalidSignature)));
    }

    #[test]
    fn test_reject_tampered_signature() {
        let validator = MetadataValidator::new(&test_key(), test_fingerprint());
        let mut signed = validator.sign(&test_embedding(), &test_file_hash());

        // Tamper with the signature
        let last_idx = signed.len() - 1;
        signed[last_idx] ^= 0xFF;

        let result = validator.verify(&signed, &test_file_hash());
        assert!(matches!(result, Err(ValidatorError::InvalidSignature)));
    }

    #[test]
    fn test_reject_wrong_file_hash() {
        let validator = MetadataValidator::new(&test_key(), test_fingerprint());
        let signed = validator.sign(&test_embedding(), &test_file_hash());

        let wrong_hash = [0xEEu8; 32];
        let result = validator.verify(&signed, &wrong_hash);
        assert!(matches!(result, Err(ValidatorError::FileHashMismatch)));
    }

    #[test]
    fn test_reject_model_mismatch() {
        let validator1 = MetadataValidator::new(&test_key(), test_fingerprint());
        let different_fingerprint = [0x99u8; 32];
        let validator2 = MetadataValidator::new(&test_key(), different_fingerprint);

        let signed = validator1.sign(&test_embedding(), &test_file_hash());
        let result = validator2.verify(&signed, &test_file_hash());
        assert!(matches!(result, Err(ValidatorError::ModelMismatch)));
    }

    #[test]
    fn test_reject_unsupported_version() {
        let validator = MetadataValidator::new(&test_key(), test_fingerprint());
        let mut signed = validator.sign(&test_embedding(), &test_file_hash());

        // Change version to unsupported value
        signed[0] = 99;

        let result = validator.verify(&signed, &test_file_hash());
        assert!(matches!(
            result,
            Err(ValidatorError::UnsupportedVersion(99))
        ));
    }

    #[test]
    fn test_reject_truncated_data() {
        let validator = MetadataValidator::new(&test_key(), test_fingerprint());
        let signed = validator.sign(&test_embedding(), &test_file_hash());

        // Truncate the data
        let truncated = &signed[..100];
        let result = validator.verify(truncated, &test_file_hash());
        assert!(matches!(result, Err(ValidatorError::InvalidFormat)));
    }
}
