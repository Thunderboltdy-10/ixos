//! Security utilities for Ixos
//!
//! Provides:
//! - Cryptographic key management and secure random generation
//! - Sandbox mode for restricting file operations to specific directories

pub mod crypto;
pub mod sandbox;

pub use crypto::{load_or_create_key, sha256};
pub use sandbox::{Sandbox, SandboxConfig, SandboxError, SandboxedOps};
