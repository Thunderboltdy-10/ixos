//! Passage Extractor (P6)
//!
//! Extracts the best matching passages from documents for evidence display.
//! Chunks content and finds the most semantically relevant sections.

use std::path::Path;

/// Configuration for passage extraction
#[derive(Debug, Clone)]
pub struct PassageConfig {
    /// Size of each chunk in characters
    pub chunk_size: usize,

    /// Overlap between chunks in characters
    pub chunk_overlap: usize,

    /// Maximum number of chunks to consider
    pub max_chunks: usize,

    /// Minimum chunk score to include
    pub min_score: f32,

    /// Maximum passage length for display
    pub max_display_length: usize,
}

impl Default for PassageConfig {
    fn default() -> Self {
        Self {
            chunk_size: 512,
            chunk_overlap: 64,
            max_chunks: 20,
            min_score: 0.3,
            max_display_length: 300,
        }
    }
}

/// A passage/chunk from a document
#[derive(Debug, Clone)]
pub struct Passage {
    /// The text content
    pub text: String,

    /// Byte offset in the original document
    pub offset: usize,

    /// Line number (1-indexed)
    pub line_number: usize,

    /// Similarity score (0-1)
    pub score: f32,
}

/// Passage extractor for finding best matching content sections
pub struct PassageExtractor {
    config: PassageConfig,
}

impl PassageExtractor {
    /// Create a new passage extractor
    pub fn new(config: PassageConfig) -> Self {
        Self { config }
    }

    /// Create with default configuration
    pub fn default_config() -> Self {
        Self::new(PassageConfig::default())
    }

    /// Extract and rank passages from text content
    ///
    /// # Arguments
    /// * `content` - The document content
    /// * `query_embedding` - The query embedding vector
    /// * `embed_fn` - Function to embed a text chunk
    ///
    /// # Returns
    /// Passages sorted by relevance score
    pub fn extract<F>(&self, content: &str, query_embedding: &[f32], embed_fn: F) -> Vec<Passage>
    where
        F: Fn(&str) -> Option<Vec<f32>>,
    {
        let chunks = self.chunk_content(content);

        let mut passages: Vec<Passage> = chunks
            .into_iter()
            .filter_map(|(text, offset, line)| {
                let embedding = embed_fn(&text)?;
                let score = cosine_similarity(&embedding, query_embedding);

                if score >= self.config.min_score {
                    Some(Passage {
                        text,
                        offset,
                        line_number: line,
                        score,
                    })
                } else {
                    None
                }
            })
            .collect();

        // Sort by score descending
        passages.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap());

        passages
    }

    /// Extract best passage without embedding (using keyword matching)
    pub fn extract_by_keywords(&self, content: &str, keywords: &[String]) -> Vec<Passage> {
        let chunks = self.chunk_content(content);
        let keywords_lower: Vec<String> = keywords.iter().map(|k| k.to_lowercase()).collect();

        let mut passages: Vec<Passage> = chunks
            .into_iter()
            .filter_map(|(text, offset, line)| {
                let text_lower = text.to_lowercase();
                let matches: usize = keywords_lower
                    .iter()
                    .filter(|k| text_lower.contains(k.as_str()))
                    .count();

                if matches > 0 {
                    let score = matches as f32 / keywords.len() as f32;
                    Some(Passage {
                        text,
                        offset,
                        line_number: line,
                        score,
                    })
                } else {
                    None
                }
            })
            .collect();

        passages.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap());
        passages
    }

    /// Get the single best passage
    pub fn best_passage<F>(
        &self,
        content: &str,
        query_embedding: &[f32],
        embed_fn: F,
    ) -> Option<Passage>
    where
        F: Fn(&str) -> Option<Vec<f32>>,
    {
        self.extract(content, query_embedding, embed_fn)
            .into_iter()
            .next()
    }

    /// Chunk content into overlapping passages
    fn chunk_content(&self, content: &str) -> Vec<(String, usize, usize)> {
        let mut chunks = Vec::new();
        let chars: Vec<char> = content.chars().collect();
        let content_len = chars.len();

        if content_len == 0 {
            return chunks;
        }

        let mut offset = 0;
        let mut line_number = 1;

        while offset < content_len && chunks.len() < self.config.max_chunks {
            let end = (offset + self.config.chunk_size).min(content_len);
            let chunk: String = chars[offset..end].iter().collect();

            // Try to end at a sentence or word boundary
            let adjusted_chunk = self.adjust_to_boundary(&chunk);

            if !adjusted_chunk.trim().is_empty() {
                chunks.push((adjusted_chunk, offset, line_number));
            }

            // Count newlines for line number tracking
            let chunk_newlines = chars[offset..end].iter().filter(|&&c| c == '\n').count();
            line_number += chunk_newlines;

            // Move offset with overlap
            offset += self.config.chunk_size - self.config.chunk_overlap;
        }

        chunks
    }

    /// Adjust chunk to end at a natural boundary
    fn adjust_to_boundary(&self, chunk: &str) -> String {
        let trimmed = chunk.trim();
        if trimmed.is_empty() {
            return String::new();
        }

        // Try to end at sentence boundary
        if let Some(pos) = trimmed.rfind(|c| c == '.' || c == '!' || c == '?') {
            if pos > trimmed.len() / 2 {
                return trimmed[..=pos].to_string();
            }
        }

        // Try to end at paragraph boundary
        if let Some(pos) = trimmed.rfind("\n\n") {
            if pos > trimmed.len() / 2 {
                return trimmed[..pos].to_string();
            }
        }

        // Try to end at newline
        if let Some(pos) = trimmed.rfind('\n') {
            if pos > trimmed.len() * 2 / 3 {
                return trimmed[..pos].to_string();
            }
        }

        // Try to end at word boundary
        if let Some(pos) = trimmed.rfind(char::is_whitespace) {
            if pos > trimmed.len() * 3 / 4 {
                return trimmed[..pos].to_string();
            }
        }

        trimmed.to_string()
    }

    /// Truncate passage for display
    pub fn truncate_for_display(&self, passage: &str) -> String {
        if passage.len() <= self.config.max_display_length {
            return passage.to_string();
        }

        let chars: Vec<char> = passage.chars().collect();
        let truncated: String = chars[..self.config.max_display_length].iter().collect();

        // Try to end at word boundary
        if let Some(pos) = truncated.rfind(char::is_whitespace) {
            return format!("{}...", truncated[..pos].trim());
        }

        format!("{}...", truncated.trim())
    }

    /// Highlight keywords in passage
    pub fn highlight_keywords(&self, passage: &str, keywords: &[String]) -> String {
        let mut result = passage.to_string();

        for keyword in keywords {
            // Case-insensitive replacement with highlighting
            let pattern = regex::escape(keyword);
            if let Ok(re) = regex::RegexBuilder::new(&pattern)
                .case_insensitive(true)
                .build()
            {
                result = re
                    .replace_all(&result, |caps: &regex::Captures| {
                        format!("**{}**", &caps[0])
                    })
                    .to_string();
            }
        }

        result
    }
}

/// Calculate cosine similarity between two vectors
fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() {
        return 0.0;
    }

    let dot: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();

    if norm_a == 0.0 || norm_b == 0.0 {
        return 0.0;
    }

    dot / (norm_a * norm_b)
}

/// Read file content for passage extraction
pub fn read_file_content(path: &Path, max_bytes: usize) -> Option<String> {
    // SECURITY: Check if this is a cloud-only file to prevent auto-download
    use crate::storage::cloud_detection::should_skip_cloud_file;
    if should_skip_cloud_file(path) {
        return None;
    }

    let max_chars = crate::ixos_rank::candidate_generator::MAX_TEXT_CHARS_PER_FILE;
    crate::parsers::extract_text(path, max_bytes, max_chars)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_passage_extraction_by_keywords() {
        let extractor = PassageExtractor::default_config();

        let content = "This is the first paragraph about machine learning.\n\n\
                       The second paragraph discusses neural networks.\n\n\
                       The third paragraph covers deep learning techniques.";

        let keywords = vec!["neural".into(), "networks".into()];
        let passages = extractor.extract_by_keywords(content, &keywords);

        assert!(!passages.is_empty());
        assert!(passages[0].text.contains("neural"));
    }

    #[test]
    fn test_chunk_content() {
        let extractor = PassageExtractor::new(PassageConfig {
            chunk_size: 50,
            chunk_overlap: 10,
            max_chunks: 10,
            ..Default::default()
        });

        let content = "This is a test. ".repeat(10);
        let chunks = extractor.chunk_content(&content);

        assert!(chunks.len() > 1);
    }

    #[test]
    fn test_truncate_for_display() {
        let extractor = PassageExtractor::new(PassageConfig {
            max_display_length: 20,
            ..Default::default()
        });

        let passage = "This is a long passage that should be truncated";
        let truncated = extractor.truncate_for_display(passage);

        assert!(truncated.ends_with("..."));
        assert!(truncated.len() <= 25); // 20 + "..."
    }

    #[test]
    fn test_highlight_keywords() {
        let extractor = PassageExtractor::default_config();

        let passage = "The quick brown fox jumps over the lazy dog";
        let keywords = vec!["quick".into(), "fox".into()];

        let highlighted = extractor.highlight_keywords(passage, &keywords);

        assert!(highlighted.contains("**quick**"));
        assert!(highlighted.contains("**fox**"));
    }

    #[test]
    fn test_cosine_similarity() {
        // Same vector
        assert!((cosine_similarity(&[1.0, 0.0], &[1.0, 0.0]) - 1.0).abs() < 0.001);

        // Orthogonal
        assert!(cosine_similarity(&[1.0, 0.0], &[0.0, 1.0]).abs() < 0.001);

        // Opposite
        assert!((cosine_similarity(&[1.0, 0.0], &[-1.0, 0.0]) + 1.0).abs() < 0.001);
    }
}
