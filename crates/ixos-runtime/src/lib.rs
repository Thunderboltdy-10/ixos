//! Versioned contracts shared by the runtime and its clients. No embedding engine is linked here.
#[cfg(feature = "client")]
pub mod client;
pub mod config;
pub mod protocol;
#[cfg(feature = "client")]
pub mod releases;
/// Breaking wire changes increment this major independently of product versions.
pub const PROTOCOL_MAJOR: u32 = 1;
pub const MAX_FRAME_BYTES: u64 = 4 * 1024 * 1024;
