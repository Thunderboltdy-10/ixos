//! Ask Mode pipeline modules.

pub mod anchor_extractor;
pub mod description_extractor;
pub mod intent_detector;
pub mod snippet_trust;

pub use anchor_extractor::{AnchorConfig, AnchorExtractor};
pub use description_extractor::{DescriptionExtractor, TinyDescription};
pub use intent_detector::{IntentDetector, QueryIntent, TimeIntent};
pub use snippet_trust::{SnippetTrustConfig, TrustedSnippet, TrustedSnippetSelector};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum QueryMode {
    Keyword,
    Ask,
}

#[derive(Debug, Clone)]
pub struct AnchorTerm {
    pub term: String,
    pub idf_score: f32,
    pub is_phrase: bool,
}
