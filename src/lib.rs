//! Ixos Protocol - Privacy-first semantic file search
//!
//! This library provides cross-platform embedding caching with HMAC-SHA256 signing
//! and constant-time embedding generation for timing attack protection.
//!
//! ## Features
//!
//! - **Cross-platform caching**: Windows ADS, Unix xattr, or pure JIT mode
//! - **HMAC-SHA256 signing**: Prevents cache poisoning attacks
//! - **Constant-time embedding**: Prevents timing analysis attacks
//! - **Rate limiting**: Prevents parallel timing attacks
//!
//! ## Quick Start
//!
//! ```rust,no_run
//! use std::sync::Arc;
//! use ixos_protocol::{SecureEmbedder, StubModel, get_cache_for_path};
//!
//! // Create a secure embedder
//! let model = Arc::new(StubModel::new());
//! let embedder = SecureEmbedder::new(model);
//!
//! // Get appropriate cache for the filesystem
//! let path = std::path::Path::new("document.txt");
//! let cache = get_cache_for_path(path);
//! ```

pub mod activity_ledger;
pub mod attestation;
pub mod capabilities;
pub mod cli;
pub mod compliance;
pub mod daemon;
pub mod diagnostics;
pub mod entitlements;
pub mod instrumentation;
pub mod integrations;
pub mod ixos_embed;
pub mod ixos_rank;
pub mod ixos_watcher;
pub mod journalist_mode;
pub mod optimization;
pub mod parsers;
pub mod pro;
pub mod security;
pub mod storage;
pub mod telemetry;
pub mod workstreams;

// Re-exports for convenience
pub use entitlements::{Entitlement, ProStatus};
pub use ixos_embed::memory_protection::{
    MemoryProtectionConfig, MemoryProtectionError, SecureBuffer, SecureEmbeddingBuffer,
};
pub use ixos_embed::mmap_model::{MmapModel2VecEmbedder, MmapModelStatus};
pub use ixos_embed::model::{EmbeddingModel, ModelError, StubModel, EMBEDDING_DIMS};
pub use ixos_embed::model2vec::Model2VecEmbedder;
pub use ixos_embed::secure_embedder::{
    EmbedError, SecureEmbedder, CONTENT_SIZE_LIMIT, MIN_PROCESSING_TIME,
};
pub use ixos_rank::{
    AdaptiveHybridEngine,
    AttackDetectionConfig,
    CacheMode,
    Candidate,
    // P2: Candidate Generation (the backbone of fast search)
    CandidateGenerator,
    CandidateGeneratorConfig,
    CandidateScoreBreakdown,
    CandidateSet,
    CandidateSource,
    CandidateStats,
    DirectoryTopology,
    FstdAdapter,
    FstdConfig,
    FstdState,
    LexicalEngine,
    LexicalMatch,
    LexicalStats,
    MetadataPriors,
    PathIndex,
    PathIndexConfig,
    ProgressiveSearchConfig,
    // Progressive Search (P2.1)
    ProgressiveSearchEngine,
    RankedResult,
    RipgrepConfig,
    // Ripgrep Lexical Engine (P1.2)
    RipgrepLexicalEngine,
    ScoreBreakdown,
    ScoredCandidate,
    SearchError,
    SearchEvent,
    SearchResult,
    SearchSource,
    // Secure Ranking (P0.6)
    SecureRanker,
    SecureRankerConfig,
    SemanticEngine,
    SemanticMatch,
    StubLexicalEngine,
    StubSemanticEngine,
    UserBehaviorModel,
    MAX_BYTES_READ_PER_FILE,
    MAX_CANDIDATES_FOR_EMBEDDING,
    MAX_TEXT_CHARS_PER_FILE,
};
pub use ixos_watcher::{
    EventType, FileEvent, ProcessedEvent, ResilienceConfig, ResilientWatcher, WatcherStats,
};
pub use pro::{ask_mode_plus, extract_answer_card, AnswerCard, AskModePlusResult, ProEntity};
pub use security::sandbox::{Sandbox, SandboxConfig, SandboxError, SandboxedOps};
pub use storage::validator::{MetadataValidator, ValidatorError};
pub use storage::{get_cache_for_path, CacheError, EmbeddingCache};

// P2 Perceived Performance
// P2.1 Ramp 1: Instant Echo Search History
pub use ixos_rank::history::{
    HistoryEntry as InstantHistoryEntry, SearchHistory as InstantSearchHistory,
};
// P2.3: Speculative Work-Ahead
pub use ixos_embed::{BackgroundIndexer, FilePrefetcher, IndexingProgress};

// Compliance (P1)
pub use compliance::{
    AIDisclosure,
    AuditEntry,
    AuditEventType,
    // Audit
    AuditLogger,
    CCPAKnowResponse,
    // CCPA (P1.3)
    CCPALayer,
    CCPANotice,
    ComplianceError,
    ComplianceManager,
    ComplianceStorage,
    // Consent
    ConsentManager,
    ConsentRecord,
    ConsentScope,
    ConsentStatus,
    ConsentType,
    DeletionReport,
    DeletionScope,
    // GDPR (P1.2)
    GDPRLayer,
    RiskLevel,
    // Search History
    SearchHistory,
    SearchHistoryEntry,
    SearchMode,
    // Documentation (P1.4)
    TechnicalDocumentation,
    // Transparency (P1.1)
    TransparencyLayer,
    UserDataExport,
    DISCLOSURE_VERSION,
};

// Performance Optimization (P2.3)
pub use optimization::{OptimizedSettings, PerformanceOptimizer, PerformanceProfile, SystemSpecs};

// Cryptographic Attestation (P3.1)
pub use attestation::{Attestation, AttestationError, AttestationService, ExportFormat};

// P1: Instrumentation & Measurement
pub use instrumentation::{
    CorpusStats, LatencyPercentiles, MetricsCollector, PerformanceBaseline, ProfileBundle,
    ProfileRunConfig, ProfileSummary, ResourceMetrics, SearchMetrics, StageMetrics, SummaryMetrics,
};

// P5: Daemon Service
pub use daemon::{DaemonConfig, DaemonService, IpcMessage, IpcResponse, IpcServer};
pub use diagnostics::{run_doctor, DoctorCheck, DoctorOptions, DoctorReport, DoctorStatus};

// P6: Evidence Engine
pub use ixos_rank::evidence::{
    CentroidConfig, DirectoryCentroid, DirectoryCentroids, Evidence, EvidenceChain, EvidenceTag,
    EvidenceType, Passage, PassageConfig, PassageExtractor,
};

// P6: Path-Augmented Embeddings
pub use ixos_embed::augmented::{AugmentationConfig, AugmentedEmbedder};

// Phase 2: Second Brain - Activity Ledger
pub use activity_ledger::{
    create_event, hash_file_path, hash_query, ActivityAction, ActivityEvent, ActivityLedger,
    CoOccurrence, CoOccurrenceAnalyzer, MoveRecommendation, RecentFile, TimeRange,
    MAX_STORAGE_BYTES,
};

// Phase 2: Second Brain - Workstreams
pub use workstreams::{
    auto_cluster_sessions, Workstream, WorkstreamManager, WorkstreamStorageData,
};
