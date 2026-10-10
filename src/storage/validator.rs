//! Metadata signing and verification for cached embeddings
//!
//! Provides HMAC-SHA256 signing to prevent cache poisoning attacks.
//! All cached embeddings are signed with a per-installation key.

use half::f16;
use ring::hmac::{self, Key, HMAC_SHA256};

/// Binary format version for signed metadata
const VERSION_SIGNED: u8 = 3;

/// Version, dimension count, model identity and source content hash.
pub const METADATA_HEADER_SIZE: usize = 1 + 4 + 32 + 32;
const SIGNATURE_SIZE: usize = 32;
const MAX_EMBEDDING_DIMS: usize = 16_384;

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
    /// # Binary Format (variable length, f16 values)
    /// ```text
    /// [version:u8][dimensions:u32-le][model_fingerprint:32b][file_hash:32b][embedding:f16-le...][signature:32b]
    /// ```
    ///
    /// # Arguments
    /// * `embedding` - The complete embedding vector; never truncate dimensions
    /// * `file_hash` - SHA256 hash of the source file content
    ///
    /// # Returns
    /// A signed binary blob that can be stored in file metadata
    pub fn sign(&self, embedding: &[f32], file_hash: &[u8; 32]) -> Vec<u8> {
        let mut payload =
            Vec::with_capacity(METADATA_HEADER_SIZE + embedding.len() * 2 + SIGNATURE_SIZE);

        // Version byte
        payload.push(VERSION_SIGNED);
        payload.extend_from_slice(&(embedding.len() as u32).to_le_bytes());

        // Model fingerprint (32 bytes)
        payload.extend_from_slice(&self.model_fingerprint);

        // File hash (32 bytes)
        payload.extend_from_slice(file_hash);

        // Preserve every dimension. Precision reduction is not dimension reduction.
        for val in embedding {
            let f16_val = f16::from_f32(*val);
            payload.extend_from_slice(&f16_val.to_le_bytes());
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
        if data.len() < METADATA_HEADER_SIZE + SIGNATURE_SIZE {
            return Err(ValidatorError::InvalidFormat);
        }

        // Check version
        if data[0] != VERSION_SIGNED {
            return Err(ValidatorError::UnsupportedVersion(data[0]));
        }

        let dimensions = u32::from_le_bytes(data[1..5].try_into().unwrap()) as usize;
        if dimensions == 0
            || dimensions > MAX_EMBEDDING_DIMS
            || data.len() != METADATA_HEADER_SIZE + dimensions * 2 + SIGNATURE_SIZE
        {
            return Err(ValidatorError::InvalidFormat);
        }

        // Check artifact/extraction identity.
        let stored_fingerprint = &data[5..37];
        if stored_fingerprint != self.model_fingerprint {
            return Err(ValidatorError::ModelMismatch);
        }

        let stored_file_hash = &data[37..69];
        if stored_file_hash != expected_file_hash {
            return Err(ValidatorError::FileHashMismatch);
        }

        // Verify HMAC signature
        let signature_start = data.len() - SIGNATURE_SIZE;
        let payload = &data[..signature_start];
        let signature = &data[signature_start..];

        hmac::verify(&self.hmac_key, payload, signature)
            .map_err(|_| ValidatorError::InvalidSignature)?;

        let embedding_bytes = &data[METADATA_HEADER_SIZE..signature_start];
        let mut embedding = Vec::with_capacity(dimensions);
        for chunk in embedding_bytes.chunks_exact(2) {
            let value = f16::from_le_bytes([chunk[0], chunk[1]]).to_f32();
            if !value.is_finite() {
                return Err(ValidatorError::InvalidFormat);
            }
            embedding.push(value);
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
        assert_eq!(
            signed.len(),
            METADATA_HEADER_SIZE + test_embedding().len() * 2 + SIGNATURE_SIZE
        );
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
    fn roundtrip_preserves_real_model_dimensions() {
        let validator = MetadataValidator::new(&test_key(), test_fingerprint());
        for dimensions in [64, 128, 256, 512, 768] {
            let original: Vec<f32> = (0..dimensions)
                .map(|i| (i % 100) as f32 / 100.0 - 0.5)
                .collect();
            let signed = validator.sign(&original, &test_file_hash());
            let decoded = validator.verify(&signed, &test_file_hash()).unwrap();
            assert_eq!(
                decoded.len(),
                dimensions,
                "lost dimensions for {dimensions}d model"
            );
            for (original, decoded) in original.iter().zip(&decoded) {
                assert!((original - decoded).abs() < 0.001);
            }
        }
    }

    #[test]
    fn rejects_incompatible_legacy_and_malformed_vectors() {
        let validator = MetadataValidator::new(&test_key(), test_fingerprint());
        let mut legacy = validator.sign(&test_embedding(), &test_file_hash());
        legacy[0] = 2;
        assert!(matches!(
            validator.verify(&legacy, &test_file_hash()),
            Err(ValidatorError::UnsupportedVersion(2))
        ));
        for embedding in [vec![], vec![f32::NAN], vec![f32::INFINITY]] {
            let blob = validator.sign(&embedding, &test_file_hash());
            assert!(matches!(
                validator.verify(&blob, &test_file_hash()),
                Err(ValidatorError::InvalidFormat)
            ));
        }
        let mut blob = validator.sign(&test_embedding(), &test_file_hash());
        blob.push(0);
        assert!(matches!(
            validator.verify(&blob, &test_file_hash()),
            Err(ValidatorError::InvalidFormat)
        ));
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
