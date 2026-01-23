//! Evidence Types (P6)
//!
//! Core types for the evidence engine.

use serde::{Deserialize, Serialize};

/// Type of evidence that contributed to a match
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum EvidenceType {
    /// Lexical keyword match
    Lexical,
    /// Semantic similarity match
    Semantic,
    /// Path/filename match
    PathMatch,
    /// Directory context (hot folder, related files)
    DirectoryContext,
    /// Temporal recency boost
    Temporal,
    /// User behavior pattern
    Behavioral,
}

/// Evidence piece explaining why a result matched
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum Evidence {
    /// Lexical keyword match evidence
    Lexical {
        /// Matched terms
        terms: Vec<String>,
        /// Snippet showing the match
        snippet: String,
        /// Line numbers where matches occurred
        line_numbers: Vec<usize>,
        /// Term frequency score
        tf_score: f32,
    },

    /// Semantic similarity evidence
    Semantic {
        /// Cosine similarity score
        similarity: f32,
        /// Best matching chunk/passage
        best_chunk: String,
        /// Chunk position in file (byte offset)
        chunk_offset: usize,
        /// Semantic concepts identified
        concepts: Vec<String>,
    },

    /// Path/filename match evidence
    PathMatch {
        /// Matched tokens from path
        tokens: Vec<String>,
        /// Which parts matched (filename, parent, grandparent)
        matched_parts: Vec<PathPart>,
        /// BM25-ish score for path
        path_score: f32,
    },

    /// Directory context evidence
    DirectoryContext {
        /// Whether this directory is "hot" (frequently accessed)
        is_hot: bool,
        /// Similarity to directory centroid
        centroid_similarity: f32,
        /// Number of related files in same directory
        related_file_count: usize,
        /// Directory semantic theme (if detected)
        directory_theme: Option<String>,
    },

    /// Temporal recency evidence
    Temporal {
        /// Recency boost factor
        recency_boost: f32,
        /// Time since last modification
        age_seconds: u64,
        /// Whether recently created
        recently_created: bool,
    },

    /// Behavioral evidence (user patterns)
    Behavioral {
        /// Access frequency score
        access_score: f32,
        /// Whether part of recent search results
        in_recent_results: bool,
        /// Co-occurrence with other results
        co_occurrence_score: f32,
    },
}

/// Part of a file path that matched
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum PathPart {
    /// Filename without extension
    Filename,
    /// File extension
    Extension,
    /// Parent directory name
    Parent,
    /// Grandparent directory name
    Grandparent,
    /// Full path substring
    PathSubstring,
}

/// Tag for UI display of evidence
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvidenceTag {
    /// Tag type for styling
    pub tag_type: EvidenceType,
    /// Short label (e.g., "Keywords: X,Y")
    pub label: String,
    /// Detailed tooltip text
    pub tooltip: String,
    /// Confidence/strength (0-1)
    pub strength: f32,
    /// Color hint for UI (optional)
    pub color: Option<String>,
}

impl Evidence {
    /// Get the primary type of this evidence
    pub fn evidence_type(&self) -> EvidenceType {
        match self {
            Evidence::Lexical { .. } => EvidenceType::Lexical,
            Evidence::Semantic { .. } => EvidenceType::Semantic,
            Evidence::PathMatch { .. } => EvidenceType::PathMatch,
            Evidence::DirectoryContext { .. } => EvidenceType::DirectoryContext,
            Evidence::Temporal { .. } => EvidenceType::Temporal,
            Evidence::Behavioral { .. } => EvidenceType::Behavioral,
        }
    }

    /// Get the contribution score of this evidence
    pub fn contribution_score(&self) -> f32 {
        match self {
            Evidence::Lexical { tf_score, .. } => *tf_score,
            Evidence::Semantic { similarity, .. } => *similarity,
            Evidence::PathMatch { path_score, .. } => *path_score,
            Evidence::DirectoryContext {
                centroid_similarity,
                is_hot,
                ..
            } => {
                let hot_bonus = if *is_hot { 0.2 } else { 0.0 };
                *centroid_similarity + hot_bonus
            }
            Evidence::Temporal { recency_boost, .. } => *recency_boost,
            Evidence::Behavioral { access_score, .. } => *access_score,
        }
    }

    /// Get a short summary of this evidence
    pub fn summary(&self) -> String {
        match self {
            Evidence::Lexical { terms, .. } => {
                if terms.len() <= 3 {
                    format!("Keywords: {}", terms.join(", "))
                } else {
                    format!(
                        "Keywords: {}, +{} more",
                        terms[..3].join(", "),
                        terms.len() - 3
                    )
                }
            }
            Evidence::Semantic { similarity, .. } => {
                format!("Semantic: {:.0}%", similarity * 100.0)
            }
            Evidence::PathMatch { tokens, .. } => {
                format!("Path: {}", tokens.join("/"))
            }
            Evidence::DirectoryContext { is_hot, .. } => {
                if *is_hot {
                    "Hot folder".into()
                } else {
                    "Related context".into()
                }
            }
            Evidence::Temporal {
                recently_created, ..
            } => {
                if *recently_created {
                    "Recently created".into()
                } else {
                    "Recently modified".into()
                }
            }
            Evidence::Behavioral {
                in_recent_results, ..
            } => {
                if *in_recent_results {
                    "Previously viewed".into()
                } else {
                    "Frequently accessed".into()
                }
            }
        }
    }
}

impl EvidenceTag {
    /// Create a lexical evidence tag
    pub fn lexical(terms: &[String], strength: f32) -> Self {
        let label = if terms.len() <= 2 {
            format!("Keywords: {}", terms.join(", "))
        } else {
            format!("{} keywords", terms.len())
        };
        Self {
            tag_type: EvidenceType::Lexical,
            label,
            tooltip: format!("Matched terms: {}", terms.join(", ")),
            strength,
            color: Some("#2dd4bf".into()), // teal
        }
    }

    /// Create a semantic evidence tag
    pub fn semantic(similarity: f32) -> Self {
        Self {
            tag_type: EvidenceType::Semantic,
            label: format!("Semantic: {:.0}%", similarity * 100.0),
            tooltip: format!("Content meaning similarity: {:.1}%", similarity * 100.0),
            strength: similarity,
            color: Some("#38bdf8".into()), // cyan
        }
    }

    /// Create a path match tag
    pub fn path_match(parts: &[PathPart]) -> Self {
        let parts_str: Vec<&str> = parts
            .iter()
            .map(|p| match p {
                PathPart::Filename => "filename",
                PathPart::Extension => "extension",
                PathPart::Parent => "folder",
                PathPart::Grandparent => "parent folder",
                PathPart::PathSubstring => "path",
            })
            .collect();
        Self {
            tag_type: EvidenceType::PathMatch,
            label: format!("Path: {}", parts_str.join(", ")),
            tooltip: format!("Path components matched: {}", parts_str.join(", ")),
            strength: 0.5,
            color: Some("#a78bfa".into()), // purple
        }
    }

    /// Create a hot folder tag
    pub fn hot_folder() -> Self {
        Self {
            tag_type: EvidenceType::DirectoryContext,
            label: "Hot folder".into(),
            tooltip: "This folder contains frequently accessed files".into(),
            strength: 0.7,
            color: Some("#fb923c".into()), // orange
        }
    }

    /// Create a recency tag
    pub fn recent(age_seconds: u64) -> Self {
        let label = if age_seconds < 3600 {
            "Recently modified".into()
        } else if age_seconds < 86400 {
            "Modified today".into()
        } else {
            "Modified this week".into()
        };
        Self {
            tag_type: EvidenceType::Temporal,
            label,
            tooltip: format!("Last modified {} ago", humanize_duration(age_seconds)),
            strength: 0.3,
            color: Some("#4ade80".into()), // green
        }
    }
}

/// Convert seconds to human-readable duration
fn humanize_duration(seconds: u64) -> String {
    if seconds < 60 {
        format!("{} seconds", seconds)
    } else if seconds < 3600 {
        format!("{} minutes", seconds / 60)
    } else if seconds < 86400 {
        format!("{} hours", seconds / 3600)
    } else {
        format!("{} days", seconds / 86400)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_evidence_type() {
        let evidence = Evidence::Lexical {
            terms: vec!["test".into()],
            snippet: "test content".into(),
            line_numbers: vec![1],
            tf_score: 0.8,
        };
        assert_eq!(evidence.evidence_type(), EvidenceType::Lexical);
    }

    #[test]
    fn test_evidence_summary() {
        let evidence = Evidence::Semantic {
            similarity: 0.85,
            best_chunk: "test chunk".into(),
            chunk_offset: 0,
            concepts: vec![],
        };
        assert!(evidence.summary().contains("85%"));
    }

    #[test]
    fn test_evidence_tag_creation() {
        let tag = EvidenceTag::semantic(0.9);
        assert_eq!(tag.tag_type, EvidenceType::Semantic);
        assert!(tag.label.contains("90%"));
    }
}
