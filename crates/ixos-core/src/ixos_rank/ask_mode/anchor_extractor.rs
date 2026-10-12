use std::collections::{HashMap, HashSet};

use super::AnchorTerm;

#[derive(Debug, Clone)]
pub struct AnchorConfig {
    pub idf_threshold: f32,
    pub max_anchors: usize,
    pub min_term_len: usize,
    pub default_idf: f32,
}

impl Default for AnchorConfig {
    fn default() -> Self {
        Self {
            idf_threshold: 2.0,
            max_anchors: 5,
            min_term_len: 3,
            default_idf: 3.0,
        }
    }
}

#[derive(Debug, Clone)]
pub struct AnchorExtractor {
    pub config: AnchorConfig,
    pub document_frequencies: HashMap<String, usize>,
    pub total_documents: usize,
}

impl AnchorExtractor {
    pub fn new(
        config: AnchorConfig,
        document_frequencies: HashMap<String, usize>,
        total_documents: usize,
    ) -> Self {
        Self {
            config,
            document_frequencies,
            total_documents: total_documents.max(1),
        }
    }

    pub fn with_corpus_defaults() -> Self {
        let total_documents = 1_000_000;
        let document_frequencies = default_document_frequencies(total_documents);
        Self::new(
            AnchorConfig::default(),
            document_frequencies,
            total_documents,
        )
    }

    pub fn extract(&self, terms: &[String]) -> Vec<AnchorTerm> {
        let mut anchors = Vec::new();
        let mut seen = HashSet::new();

        for term in terms {
            let trimmed = term.trim();
            if trimmed.len() < self.config.min_term_len {
                continue;
            }
            let lower = trimmed.to_lowercase();
            if !seen.insert(lower.clone()) {
                continue;
            }

            let idf = self.idf_for_term(&lower);
            if idf > self.config.idf_threshold {
                anchors.push(AnchorTerm {
                    term: lower.clone(),
                    idf_score: idf,
                    is_phrase: lower.contains(' '),
                });
            }
        }

        anchors.sort_by(|a, b| {
            b.idf_score
                .partial_cmp(&a.idf_score)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        anchors.truncate(self.config.max_anchors);
        anchors
    }

    pub fn has_anchor_match(&self, content: &str, anchors: &[AnchorTerm]) -> bool {
        if anchors.is_empty() {
            return false;
        }
        let lower = content.to_lowercase();
        anchors.iter().any(|anchor| lower.contains(&anchor.term))
    }

    fn idf_for_term(&self, term: &str) -> f32 {
        if let Some(df) = self.document_frequencies.get(term) {
            let df = (*df).max(1) as f32;
            let total = self.total_documents as f32;
            (total / df).ln().max(0.0)
        } else {
            self.config.default_idf
        }
    }
}

fn default_document_frequencies(total_documents: usize) -> HashMap<String, usize> {
    let mut map = HashMap::new();
    let common_terms = [
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
        "from", "as", "is", "was", "are", "were", "be", "been", "being", "have", "has", "had",
        "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "can",
        "who", "what", "when", "where", "why", "how", "this", "that", "these", "those", "my",
        "your", "our", "their", "me", "you",
    ];

    for term in common_terms {
        map.insert(term.to_string(), total_documents);
    }

    map
}
