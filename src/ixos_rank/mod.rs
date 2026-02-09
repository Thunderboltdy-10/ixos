//! Ranking and search engines for Ixos
//!
//! This module provides hybrid search capabilities combining:
//!
//! - **Lexical search**: Fast keyword-based matching
//! - **Semantic search**: Embedding-based similarity
//! - **Adaptive hybrid**: Attack-resistant combination of both
//!
//! ## Architecture
//!
//! ```text
//! Query
//!   │
//!   ▼
//! ┌──────────────────────────┐
//! │   AdaptiveHybridEngine   │
//! └────────────┬─────────────┘
//!              │
//!   ┌──────────┴──────────┐
//!   │                     │
//!   ▼                     ▼
//! ┌──────────┐      ┌───────────┐
//! │ Lexical  │      │ Semantic  │
//! │ Engine   │ ──▶  │ Engine    │
//! └──────────┘      └───────────┘
//!   Phase 1           Phase 2
//!   (Fast)          (Accurate)
//! ```
//!
//! ## Attack Detection
//!
//! The hybrid engine monitors lexical search quality to detect degradation attacks:
//!
//! - **High result count**: Many files matching query terms
//! - **Low match quality**: Few exact matches, many partial matches
//!
//! When an attack is detected, the engine falls back to alternative strategies
//! that don't rely on lexical pre-filtering.
//!
//! ## Example
//!
//! ```rust,no_run
//! use ixos_protocol::ixos_rank::{
//!     AdaptiveHybridEngine, StubLexicalEngine, StubSemanticEngine,
//! };
//!
//! #[tokio::main]
//! async fn main() {
//!     let lexical = StubLexicalEngine::new();
//!     let semantic = StubSemanticEngine::with_stub_model();
//!     let engine = AdaptiveHybridEngine::new(lexical, semantic);
//!
//!     let results = engine.search("quarterly report", 20).await.unwrap();
//!     for result in results {
//!         println!("{}: {:.2}", result.path.display(), result.score);
//!     }
//! }
//! ```

pub mod ask_mode;
pub mod candidate_generator;
pub mod candidate_lexical;
pub mod evidence;
pub mod fstd;
pub mod history;
pub mod hybrid_engine;
pub mod lexical_engine;
pub mod personal_ranker;
pub mod progressive;
pub mod secure_ranker;
pub mod semantic_engine;
pub mod snippet;
pub mod types;

// Re-exports
pub use ask_mode::{
    AnchorConfig, AnchorExtractor, AnchorTerm, DescriptionExtractor, IntentDetector, QueryIntent,
    QueryMode, SnippetTrustConfig, TimeIntent, TinyDescription, TrustedSnippet,
    TrustedSnippetSelector,
};
pub use candidate_lexical::CandidateLexicalEngine;
pub use history::{HistoryEntry, SearchHistory};
pub use hybrid_engine::{AdaptiveHybridEngine, AttackDetectionConfig};
pub use lexical_engine::{LexicalEngine, RipgrepConfig, RipgrepLexicalEngine, StubLexicalEngine};
pub use personal_ranker::{
    normalize_open_score, now_unix_s as personal_now_unix_s, recency_factor, DECAY_TAU_SECONDS,
    OPEN_SCORE_NORMALIZER,
};
pub use progressive::{ProgressiveSearchConfig, ProgressiveSearchEngine, SearchEvent};
pub use secure_ranker::{
    Candidate, RankedResult, ScoreBreakdown, SecureRanker, SecureRankerConfig, UserBehaviorModel,
};
pub use semantic_engine::{CacheMode, SemanticEngine, SemanticMetrics, StubSemanticEngine};
pub use snippet::{extract_context, format_snippet, highlight_terms, ContextSnippet};
pub use types::{
    LexicalMatch, LexicalStats, SearchError, SearchResult, SearchSource, SemanticMatch,
};

// P2: Candidate Generation (the backbone of fast search)
pub use candidate_generator::{
    CandidateGenerator, CandidateGeneratorConfig, CandidateScoreBreakdown, CandidateSet,
    CandidateSource, CandidateStats, MatchContext, MetadataPriors, PathIndex, PathIndexConfig,
    PathMetadata, PriorScores, PriorWeights, ProcessedQuery, RipgrepFunnel, RipgrepFunnelConfig,
    RipgrepStats, ScoredCandidate, TerminationReason, MAX_BYTES_READ_PER_FILE,
    MAX_CANDIDATES_FOR_EMBEDDING, MAX_TEXT_CHARS_PER_FILE,
};

// P6: Evidence Engine
pub use evidence::{
    CentroidConfig, DirectoryCentroid, DirectoryCentroids, Evidence, EvidenceChain, EvidenceTag,
    EvidenceType, Passage, PassageConfig, PassageExtractor,
};

// P8: FSTD topology adapter
pub use fstd::{DirectoryTopology, FstdAdapter, FstdConfig, FstdState};
