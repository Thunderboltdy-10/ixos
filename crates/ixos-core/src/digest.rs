//! SHA-256 fingerprints for source and model contents.
use sha2::{Digest, Sha256};
use std::path::Path;
pub fn sha256(bytes: &[u8]) -> [u8; 32] {
    Sha256::digest(bytes).into()
}
pub fn sha256_file(path: &Path) -> std::io::Result<[u8; 32]> {
    Ok(sha256(&std::fs::read(path)?))
}
