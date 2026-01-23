//! Embedding generation with security protections
//!
//! Provides:
//! - EmbeddingModel trait for embedding generation
//! - SecureEmbedder for constant-time embedding with rate limiting
//! - StubModel for testing without actual ML model
//! - Model2VecEmbedder for real semantic embeddings (production)
//! - MmapModel2VecEmbedder for lazy-loading with near-zero startup time
//! - Memory protection (SecureBuffer, SecureEmbeddingBuffer)
//! - Text chunking for large files

pub mod augmented;
pub mod background_indexer;
pub mod chunker;
pub mod memory_protection;
pub mod mmap_model;
pub mod model;
pub mod model2vec;
pub mod prefetcher;
pub mod secure_embedder;

pub use augmented::{AugmentationConfig, AugmentedEmbedder};
pub use background_indexer::{BackgroundIndexer, IndexingProgress};
pub use chunker::{chunk_content, ChunkConfig};
pub use memory_protection::{
    MemoryProtectionConfig, MemoryProtectionError, SecureBuffer, SecureEmbeddingBuffer,
};
pub use mmap_model::{MmapModel2VecEmbedder, MmapModelStatus, ModelType};
pub use model::{EmbeddingModel, ModelError, StubModel, EMBEDDING_DIMS};
pub use model2vec::Model2VecEmbedder;
pub use prefetcher::FilePrefetcher;
pub use secure_embedder::SecureEmbedder;
