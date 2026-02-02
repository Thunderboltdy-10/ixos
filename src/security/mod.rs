//! Security utilities for Ixos
//!
//! Provides:
//! - Cryptographic key management and secure random generation
//! - Sandbox mode for restricting file operations to specific directories

pub mod crypto;
pub mod device_identity;
pub mod secure_store;
pub mod sandbox;

pub use crypto::{load_or_create_key, sha256};
pub use sandbox::{Sandbox, SandboxConfig, SandboxError, SandboxedOps};
pub use device_identity::{DeviceIdentity, DeviceIdentityError};
pub use secure_store::{SecureStore, SecureStoreError};

