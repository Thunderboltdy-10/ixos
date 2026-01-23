//! P1: Instrumentation and performance measurement
//!
//! This module provides tracing spans, metrics collection, and performance reporting
//! for identifying and eliminating bottlenecks in the search pipeline.
//!
//! ## Spans
//!
//! Pre-defined spans for all pipeline stages:
//! - `search.total` - Overall search operation
//! - `candidate.path_scoring` - Path/filename index scoring
//! - `candidate.ripgrep_scan` - Ripgrep content scanning
//! - `candidate.merge_and_cap` - Deduplication and hard cap
//! - `semantic.embedding_batch` - Batch embedding generation
//! - `semantic.ranking_fusion` - Score combination
//!
//! ## Metrics
//!
//! Collected per search:
//! - TTFR (Time to First Result)
//! - TTSI (Time to Semantic Interaction)
//! - P50/P95/P99 latencies
//! - Resource usage (CPU, RAM, I/O)

pub mod metrics;
pub mod profile;
pub mod reporter;
pub mod sampler;
pub mod spans;

pub use metrics::*;
pub use profile::*;
pub use reporter::*;
pub use sampler::*;
pub use spans::*;
