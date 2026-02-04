use std::collections::HashMap;

use crate::ixos_rank::evidence::Passage;

use super::AnchorTerm;

#[derive(Debug, Clone)]
pub struct SnippetTrustConfig {
    pub min_anchor_hits: usize,
    pub weight_anchor: f32,
    pub weight_semantic: f32,
}

impl Default for SnippetTrustConfig {
    fn default() -> Self {
        Self {
            min_anchor_hits: 1,
            weight_anchor: 0.6,
            weight_semantic: 0.4,
        }
    }
}

#[derive(Debug, Clone)]
pub struct TrustedSnippetSelector {
    pub config: SnippetTrustConfig,
}

#[derive(Debug, Clone)]
pub struct TrustedSnippet {
    pub passage: Passage,
    pub anchor_coverage: f32,
    pub matched_anchors: Vec<String>,
    pub trust_score: f32,
    pub why_matched: String,
}

impl TrustedSnippetSelector {
    pub fn new(config: SnippetTrustConfig) -> Self {
        Self { config }
    }

    pub fn select_trusted_passage(
        &self,
        passages: &[Passage],
        anchors: &[AnchorTerm],
        semantic_scores: &[(usize, f32)],
    ) -> Option<TrustedSnippet> {
        if passages.is_empty() || anchors.is_empty() {
            return None;
        }

        let semantic_map: HashMap<usize, f32> = semantic_scores.iter().cloned().collect();
        let mut best: Option<TrustedSnippet> = None;

        for (idx, passage) in passages.iter().enumerate() {
            let lower = passage.text.to_lowercase();
            let mut matched = Vec::new();
            for anchor in anchors {
                if lower.contains(&anchor.term) {
                    matched.push(anchor.term.clone());
                }
            }

            if matched.len() < self.config.min_anchor_hits {
                continue;
            }

            let coverage = matched.len() as f32 / anchors.len().max(1) as f32;
            let semantic = semantic_map.get(&idx).copied().unwrap_or(passage.score);
            let trust_score =
                coverage * self.config.weight_anchor + semantic * self.config.weight_semantic;
            let why = format!(
                "Anchors: {} (coverage {:.2}), semantic {:.2}",
                matched.join(", "),
                coverage,
                semantic
            );

            let candidate = TrustedSnippet {
                passage: passage.clone(),
                anchor_coverage: coverage,
                matched_anchors: matched,
                trust_score,
                why_matched: why,
            };

            if let Some(current) = &best {
                if candidate.trust_score > current.trust_score {
                    best = Some(candidate);
                }
            } else {
                best = Some(candidate);
            }
        }

        best
    }
}
