use super::AnchorTerm;

#[derive(Debug, Clone)]
pub struct DescriptionExtractor;

#[derive(Debug, Clone)]
pub struct TinyDescription {
    pub sentence: String,
    pub score: f32,
    pub position_in_passage: usize,
}

impl DescriptionExtractor {
    pub fn new() -> Self {
        Self
    }

    pub fn extract_best_sentence(
        &self,
        passage: &str,
        anchors: &[String],
    ) -> Option<TinyDescription> {
        let sentences = split_sentences(passage);
        if sentences.is_empty() {
            return None;
        }

        let anchor_terms: Vec<AnchorTerm> = anchors
            .iter()
            .map(|term| AnchorTerm {
                term: term.to_lowercase(),
                idf_score: 0.0,
                is_phrase: term.contains(' '),
            })
            .collect();

        let mut best: Option<TinyDescription> = None;

        for (idx, sentence) in sentences.iter().enumerate() {
            let trimmed = sentence.trim();
            if trimmed.is_empty() {
                continue;
            }

            let lower = trimmed.to_lowercase();
            let anchor_hits = anchor_terms
                .iter()
                .filter(|anchor| lower.contains(&anchor.term))
                .count();

            let length = trimmed.chars().count();
            let length_score = if (30..=200).contains(&length) {
                1.0
            } else if length < 30 {
                0.3
            } else {
                0.4
            };

            let position_score = 1.0 / (1.0 + idx as f32);
            let punctuation_bonus =
                if trimmed.ends_with('.') || trimmed.ends_with('!') || trimmed.ends_with('?') {
                    0.2
                } else {
                    0.0
                };

            let score =
                anchor_hits as f32 * 2.0 + position_score + length_score + punctuation_bonus;

            let candidate = TinyDescription {
                sentence: trimmed.to_string(),
                score,
                position_in_passage: idx,
            };

            if let Some(current) = &best {
                if candidate.score > current.score {
                    best = Some(candidate);
                }
            } else {
                best = Some(candidate);
            }
        }

        best
    }
}

fn split_sentences(text: &str) -> Vec<String> {
    let mut sentences = Vec::new();
    let mut start = 0;
    for (idx, ch) in text.char_indices() {
        if matches!(ch, '.' | '!' | '?') {
            let end = idx + ch.len_utf8();
            let sentence = text[start..end].trim().to_string();
            if !sentence.is_empty() {
                sentences.push(sentence);
            }
            start = end;
        }
    }

    if start < text.len() {
        let tail = text[start..].trim();
        if !tail.is_empty() {
            sentences.push(tail.to_string());
        }
    }

    sentences
}
