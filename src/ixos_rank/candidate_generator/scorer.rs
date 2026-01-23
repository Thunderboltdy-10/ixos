//! Candidate scoring data structures
//!
//! Defines the core types used throughout the candidate generation pipeline.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// A scored candidate ready for semantic processing
#[derive(Debug, Clone)]
pub struct ScoredCandidate {
    /// Path to the file
    pub path: PathBuf,
    /// Combined score from all factors [0.0, 1.0+]
    pub combined_score: f32,
    /// Individual score components
    pub breakdown: CandidateScoreBreakdown,
    /// Source that generated this candidate
    pub source: CandidateSource,
    /// Cached content preview (up to MAX_BYTES_READ_PER_FILE)
    pub content_preview: Option<String>,
    /// Lexical match context (line numbers, snippets)
    pub match_context: Option<MatchContext>,
}

impl ScoredCandidate {
    /// Create a new candidate from path scoring
    pub fn from_path_match(path: PathBuf, path_score: f32) -> Self {
        Self {
            path,
            combined_score: path_score,
            breakdown: CandidateScoreBreakdown {
                path_score,
                ..Default::default()
            },
            source: CandidateSource::PathMatch,
            content_preview: None,
            match_context: None,
        }
    }

    /// Create a new candidate from ripgrep hit
    pub fn from_ripgrep_hit(
        path: PathBuf,
        lexical_score: f32,
        context: Option<MatchContext>,
    ) -> Self {
        Self {
            path,
            combined_score: lexical_score,
            breakdown: CandidateScoreBreakdown {
                lexical_score,
                ..Default::default()
            },
            source: CandidateSource::RipgrepHit,
            content_preview: None,
            match_context: context,
        }
    }

    /// Merge scores from another candidate (same path)
    pub fn merge_with(&mut self, other: &ScoredCandidate) {
        // Combine scores - boost files that appear in multiple sources
        self.breakdown.path_score = self.breakdown.path_score.max(other.breakdown.path_score);
        self.breakdown.lexical_score = self
            .breakdown
            .lexical_score
            .max(other.breakdown.lexical_score);

        // Recalculate combined score
        self.recalculate_combined_score();
        self.source = CandidateSource::Merged;

        // Take the match context if we don't have one
        if self.match_context.is_none() {
            self.match_context = other.match_context.clone();
        }
    }

    /// Recalculate combined score from breakdown
    pub fn recalculate_combined_score(&mut self) {
        self.combined_score = self.breakdown.weighted_sum();
    }

    /// Apply metadata priors
    pub fn apply_priors(&mut self, recency: f32, folder: f32, type_prior: f32) {
        self.breakdown.recency_score = recency;
        self.breakdown.folder_score = folder;
        self.breakdown.type_prior = type_prior;
        self.recalculate_combined_score();
    }
}

/// Individual score components for debugging and transparency
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CandidateScoreBreakdown {
    /// Path/filename token match score (0.0-1.0)
    pub path_score: f32,
    /// Ripgrep content hit score (0.0-1.0)
    pub lexical_score: f32,
    /// Recency boost based on mtime (0.0-1.0)
    pub recency_score: f32,
    /// Hot folder boost (0.0-1.0)
    pub folder_score: f32,
    /// File type prior (0.0-1.0)
    pub type_prior: f32,
}

impl CandidateScoreBreakdown {
    /// Default weights for score combination
    pub const PATH_WEIGHT: f32 = 0.3;
    pub const LEXICAL_WEIGHT: f32 = 0.4;
    pub const RECENCY_WEIGHT: f32 = 0.15;
    pub const FOLDER_WEIGHT: f32 = 0.05;
    pub const TYPE_WEIGHT: f32 = 0.1;

    /// Calculate weighted sum of all scores
    pub fn weighted_sum(&self) -> f32 {
        self.path_score * Self::PATH_WEIGHT
            + self.lexical_score * Self::LEXICAL_WEIGHT
            + self.recency_score * Self::RECENCY_WEIGHT
            + self.folder_score * Self::FOLDER_WEIGHT
            + self.type_prior * Self::TYPE_WEIGHT
    }

    /// Calculate weighted sum with custom weights
    pub fn weighted_sum_custom(&self, weights: &ScoreWeights) -> f32 {
        self.path_score * weights.path
            + self.lexical_score * weights.lexical
            + self.recency_score * weights.recency
            + self.folder_score * weights.folder
            + self.type_prior * weights.type_prior
    }
}

/// Custom weights for score combination
#[derive(Debug, Clone)]
pub struct ScoreWeights {
    pub path: f32,
    pub lexical: f32,
    pub recency: f32,
    pub folder: f32,
    pub type_prior: f32,
}

impl Default for ScoreWeights {
    fn default() -> Self {
        Self {
            path: CandidateScoreBreakdown::PATH_WEIGHT,
            lexical: CandidateScoreBreakdown::LEXICAL_WEIGHT,
            recency: CandidateScoreBreakdown::RECENCY_WEIGHT,
            folder: CandidateScoreBreakdown::FOLDER_WEIGHT,
            type_prior: CandidateScoreBreakdown::TYPE_WEIGHT,
        }
    }
}

/// Source of the candidate
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CandidateSource {
    /// From path/filename matching (instant, no disk read)
    PathMatch,
    /// From ripgrep content scan
    RipgrepHit,
    /// From metadata priors only
    MetadataPrior,
    /// Merged from multiple sources
    Merged,
}

/// Context about where the match occurred
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatchContext {
    /// Line numbers where matches occurred
    pub line_numbers: Vec<usize>,
    /// Number of matches in the file
    pub match_count: usize,
    /// Preview snippet with match highlighted
    pub snippet: Option<String>,
}

/// Statistics about candidate generation
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CandidateStats {
    /// Time for directory walk / index build in ms
    pub directory_walk_ms: u64,
    /// Number of paths scanned
    pub paths_scanned: usize,
    /// Candidates from path scoring
    pub path_candidates: usize,
    /// Candidates from ripgrep
    pub ripgrep_candidates: usize,
    /// Candidates after merge (before cap)
    pub merged_candidates: usize,
    /// Final candidates (after cap)
    pub final_candidates: usize,
    /// Time for path scoring in ms
    pub path_scoring_ms: u64,
    /// Time for ripgrep in ms
    pub ripgrep_ms: u64,
    /// Time for merge/cap in ms
    pub merge_ms: u64,
    /// Whether ripgrep hit max hits
    pub ripgrep_capped: bool,
}

/// Result of candidate generation
#[derive(Debug)]
pub struct CandidateSet {
    /// The scored candidates
    pub candidates: Vec<ScoredCandidate>,
    /// Generation statistics
    pub stats: CandidateStats,
}

impl CandidateSet {
    /// Create a new empty candidate set
    pub fn empty() -> Self {
        Self {
            candidates: Vec::new(),
            stats: CandidateStats::default(),
        }
    }

    /// Number of candidates
    pub fn len(&self) -> usize {
        self.candidates.len()
    }

    /// Check if empty
    pub fn is_empty(&self) -> bool {
        self.candidates.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_scored_candidate_from_path() {
        let candidate = ScoredCandidate::from_path_match(PathBuf::from("/test/file.txt"), 0.8);
        assert_eq!(candidate.source, CandidateSource::PathMatch);
        assert_eq!(candidate.breakdown.path_score, 0.8);
    }

    #[test]
    fn test_candidate_merge() {
        let mut c1 = ScoredCandidate::from_path_match(PathBuf::from("/test/file.txt"), 0.6);
        let c2 = ScoredCandidate::from_ripgrep_hit(PathBuf::from("/test/file.txt"), 0.8, None);

        c1.merge_with(&c2);

        assert_eq!(c1.source, CandidateSource::Merged);
        assert_eq!(c1.breakdown.path_score, 0.6);
        assert_eq!(c1.breakdown.lexical_score, 0.8);
    }

    #[test]
    fn test_weighted_sum() {
        let breakdown = CandidateScoreBreakdown {
            path_score: 1.0,
            lexical_score: 1.0,
            recency_score: 1.0,
            folder_score: 1.0,
            type_prior: 1.0,
        };
        // Sum of all weights should be 1.0
        let sum = breakdown.weighted_sum();
        assert!((sum - 1.0).abs() < 0.001);
    }
}
