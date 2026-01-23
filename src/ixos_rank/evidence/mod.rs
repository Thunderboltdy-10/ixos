//! Evidence Engine Module (P6)
//!
//! Provides evidence chains that explain why each result matched.
//! Answers "why did this match?" for every search result.

pub mod chain;
pub mod directory_centroids;
pub mod explanation;
pub mod passage_extractor;
pub mod types;

pub use chain::EvidenceChain;
pub use directory_centroids::{CentroidConfig, DirectoryCentroid, DirectoryCentroids};
pub use explanation::{explain, generate_tags};
pub use passage_extractor::{Passage, PassageConfig, PassageExtractor};
pub use types::{Evidence, EvidenceTag, EvidenceType};
