//! Local hybrid search over code and documents, running on CPU.
pub mod cloud;
pub mod config;
pub mod digest;
pub mod discover;
pub mod extract;
#[cfg(windows)]
mod metadata_windows;
pub mod model;
pub mod retrieval;
mod security;
