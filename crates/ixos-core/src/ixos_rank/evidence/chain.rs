//! Evidence Chain (P6)
//!
//! Combines multiple pieces of evidence into a coherent explanation.

use super::explanation;
use super::types::{Evidence, EvidenceTag, EvidenceType};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// Complete evidence chain for a search result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvidenceChain {
    /// Path to the matched file
    pub path: PathBuf,

    /// Overall relevance score
    pub score: f32,

    /// All evidence pieces
    pub evidence: Vec<Evidence>,

    /// Human-readable explanation
    pub explanation: String,

    /// UI tags for display
    pub tags: Vec<EvidenceTag>,

    /// Primary evidence type (strongest contributor)
    pub primary_type: EvidenceType,

    /// Confidence in the evidence chain (0-1)
    pub confidence: f32,
}

impl EvidenceChain {
    /// Create a new empty evidence chain
    pub fn new(path: PathBuf) -> Self {
        Self {
            path,
            score: 0.0,
            evidence: Vec::new(),
            explanation: String::new(),
            tags: Vec::new(),
            primary_type: EvidenceType::Lexical,
            confidence: 0.0,
        }
    }

    /// Build an evidence chain from collected evidence
    pub fn build(path: PathBuf, score: f32, evidence: Vec<Evidence>) -> Self {
        // Determine primary type (strongest contributor)
        let primary_type = evidence
            .iter()
            .max_by(|a, b| {
                a.contribution_score()
                    .partial_cmp(&b.contribution_score())
                    .unwrap()
            })
            .map(|e| e.evidence_type())
            .unwrap_or(EvidenceType::Lexical);

        // Generate explanation
        let explanation = explanation::explain_evidence(&evidence, score);

        // Generate tags
        let tags = explanation::generate_tags_from_evidence(&evidence);

        // Calculate confidence based on evidence diversity and strength
        let confidence = Self::calculate_confidence(&evidence);

        Self {
            path,
            score,
            evidence,
            explanation,
            tags,
            primary_type,
            confidence,
        }
    }

    /// Add lexical evidence
    pub fn add_lexical(
        &mut self,
        terms: Vec<String>,
        snippet: String,
        line_numbers: Vec<usize>,
        tf_score: f32,
    ) {
        self.evidence.push(Evidence::Lexical {
            terms,
            snippet,
            line_numbers,
            tf_score,
        });
    }

    /// Add semantic evidence
    pub fn add_semantic(
        &mut self,
        similarity: f32,
        best_chunk: String,
        chunk_offset: usize,
        concepts: Vec<String>,
    ) {
        self.evidence.push(Evidence::Semantic {
            similarity,
            best_chunk,
            chunk_offset,
            concepts,
        });
    }

    /// Add Ask Mode trusted snippet evidence
    pub fn add_ask_mode_trust(
        &mut self,
        anchor_coverage: f32,
        matched_anchors: Vec<String>,
        why_matched: String,
    ) {
        self.evidence.push(Evidence::AskModeTrust {
            anchor_coverage,
            matched_anchors,
            why_matched,
        });
    }

    /// Add path match evidence
    pub fn add_path_match(
        &mut self,
        tokens: Vec<String>,
        matched_parts: Vec<super::types::PathPart>,
        path_score: f32,
    ) {
        self.evidence.push(Evidence::PathMatch {
            tokens,
            matched_parts,
            path_score,
        });
    }

    /// Add directory context evidence
    pub fn add_directory_context(
        &mut self,
        is_hot: bool,
        centroid_similarity: f32,
        related_file_count: usize,
        directory_theme: Option<String>,
    ) {
        self.evidence.push(Evidence::DirectoryContext {
            is_hot,
            centroid_similarity,
            related_file_count,
            directory_theme,
        });
    }

    /// Add temporal evidence
    pub fn add_temporal(&mut self, recency_boost: f32, age_seconds: u64, recently_created: bool) {
        self.evidence.push(Evidence::Temporal {
            recency_boost,
            age_seconds,
            recently_created,
        });
    }

    /// Finalize the chain (regenerate explanation and tags)
    pub fn finalize(&mut self) {
        // Recalculate primary type
        self.primary_type = self
            .evidence
            .iter()
            .max_by(|a, b| {
                a.contribution_score()
                    .partial_cmp(&b.contribution_score())
                    .unwrap()
            })
            .map(|e| e.evidence_type())
            .unwrap_or(EvidenceType::Lexical);

        // Regenerate explanation and tags
        self.explanation = explanation::explain_evidence(&self.evidence, self.score);
        self.tags = explanation::generate_tags_from_evidence(&self.evidence);
        self.confidence = Self::calculate_confidence(&self.evidence);
    }

    /// Calculate confidence based on evidence quality
    fn calculate_confidence(evidence: &[Evidence]) -> f32 {
        if evidence.is_empty() {
            return 0.0;
        }

        // Factors for confidence:
        // 1. Number of evidence types (diversity)
        // 2. Average contribution score
        // 3. Presence of strong signals

        let types: std::collections::HashSet<_> =
            evidence.iter().map(|e| std::mem::discriminant(e)).collect();
        let diversity_score = (types.len() as f32 / 4.0).min(1.0);

        let avg_contribution =
            evidence.iter().map(|e| e.contribution_score()).sum::<f32>() / evidence.len() as f32;

        // Check for strong semantic or lexical signals
        let has_strong_signal = evidence.iter().any(|e| match e {
            Evidence::Semantic { similarity, .. } => *similarity > 0.7,
            Evidence::Lexical { tf_score, .. } => *tf_score > 0.6,
            _ => false,
        });
        let signal_bonus = if has_strong_signal { 0.2 } else { 0.0 };

        ((diversity_score * 0.3 + avg_contribution * 0.5 + signal_bonus) as f32).min(1.0)
    }

    /// Get evidence by type
    pub fn get_by_type(&self, evidence_type: EvidenceType) -> Vec<&Evidence> {
        self.evidence
            .iter()
            .filter(|e| e.evidence_type() == evidence_type)
            .collect()
    }

    /// Check if chain has semantic evidence
    pub fn has_semantic(&self) -> bool {
        self.evidence
            .iter()
            .any(|e| matches!(e, Evidence::Semantic { .. }))
    }

    /// Check if chain has lexical evidence
    pub fn has_lexical(&self) -> bool {
        self.evidence
            .iter()
            .any(|e| matches!(e, Evidence::Lexical { .. }))
    }

    /// Get the best snippet from all evidence
    pub fn best_snippet(&self) -> Option<String> {
        // Prefer semantic best_chunk, then lexical snippet
        for e in &self.evidence {
            if let Evidence::Semantic { best_chunk, .. } = e {
                if !best_chunk.is_empty() {
                    return Some(best_chunk.clone());
                }
            }
        }
        for e in &self.evidence {
            if let Evidence::Lexical { snippet, .. } = e {
                if !snippet.is_empty() {
                    return Some(snippet.clone());
                }
            }
        }
        None
    }
}

/// Builder for creating evidence chains incrementally
pub struct EvidenceChainBuilder {
    path: PathBuf,
    score: f32,
    evidence: Vec<Evidence>,
}

impl EvidenceChainBuilder {
    /// Create a new builder
    pub fn new(path: PathBuf) -> Self {
        Self {
            path,
            score: 0.0,
            evidence: Vec::new(),
        }
    }

    /// Set the score
    pub fn score(mut self, score: f32) -> Self {
        self.score = score;
        self
    }

    /// Add lexical evidence
    pub fn lexical(mut self, terms: Vec<String>, snippet: String, tf_score: f32) -> Self {
        self.evidence.push(Evidence::Lexical {
            terms,
            snippet,
            line_numbers: vec![],
            tf_score,
        });
        self
    }

    /// Add semantic evidence
    pub fn semantic(mut self, similarity: f32, best_chunk: String) -> Self {
        self.evidence.push(Evidence::Semantic {
            similarity,
            best_chunk,
            chunk_offset: 0,
            concepts: vec![],
        });
        self
    }

    /// Add Ask Mode trusted snippet evidence
    pub fn ask_mode_trust(
        mut self,
        anchor_coverage: f32,
        matched_anchors: Vec<String>,
        why_matched: String,
    ) -> Self {
        self.evidence.push(Evidence::AskModeTrust {
            anchor_coverage,
            matched_anchors,
            why_matched,
        });
        self
    }

    /// Add path match evidence
    pub fn path_match(mut self, tokens: Vec<String>, score: f32) -> Self {
        self.evidence.push(Evidence::PathMatch {
            tokens,
            matched_parts: vec![super::types::PathPart::Filename],
            path_score: score,
        });
        self
    }

    /// Add hot folder evidence
    pub fn hot_folder(mut self, centroid_similarity: f32) -> Self {
        self.evidence.push(Evidence::DirectoryContext {
            is_hot: true,
            centroid_similarity,
            related_file_count: 0,
            directory_theme: None,
        });
        self
    }

    /// Add recency evidence
    pub fn recent(mut self, age_seconds: u64, boost: f32) -> Self {
        self.evidence.push(Evidence::Temporal {
            recency_boost: boost,
            age_seconds,
            recently_created: age_seconds < 3600,
        });
        self
    }

    /// Build the evidence chain
    pub fn build(self) -> EvidenceChain {
        EvidenceChain::build(self.path, self.score, self.evidence)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_empty_chain() {
        let chain = EvidenceChain::new(PathBuf::from("/test/file.txt"));
        assert!(chain.evidence.is_empty());
        assert_eq!(chain.confidence, 0.0);
    }

    #[test]
    fn test_chain_builder() {
        let chain = EvidenceChainBuilder::new(PathBuf::from("/test/file.txt"))
            .score(0.85)
            .lexical(vec!["test".into()], "test content".into(), 0.7)
            .semantic(0.8, "semantic chunk".into())
            .build();

        assert_eq!(chain.evidence.len(), 2);
        assert!(chain.has_lexical());
        assert!(chain.has_semantic());
        assert!(chain.confidence > 0.0);
    }

    #[test]
    fn test_best_snippet() {
        let chain = EvidenceChainBuilder::new(PathBuf::from("/test/file.txt"))
            .lexical(vec!["test".into()], "lexical snippet".into(), 0.7)
            .semantic(0.8, "semantic chunk".into())
            .build();

        // Should prefer semantic chunk
        assert_eq!(chain.best_snippet(), Some("semantic chunk".into()));
    }

    #[test]
    fn test_get_by_type() {
        let chain = EvidenceChainBuilder::new(PathBuf::from("/test/file.txt"))
            .lexical(vec!["a".into()], "".into(), 0.5)
            .lexical(vec!["b".into()], "".into(), 0.6)
            .semantic(0.8, "".into())
            .build();

        let lexical = chain.get_by_type(EvidenceType::Lexical);
        assert_eq!(lexical.len(), 2);
    }
}
