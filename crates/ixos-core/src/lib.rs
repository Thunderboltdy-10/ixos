//! Local hybrid search over code and documents, running on CPU.
pub mod cache;
pub mod cloud;
pub mod config;
pub mod digest;
pub mod discover;
pub mod doctor;
pub mod engine;
pub mod extract;
#[cfg(windows)]
mod metadata_windows;
pub mod model;
pub mod record;
pub mod snippet;
mod source;
pub mod tools;
pub mod typo;
