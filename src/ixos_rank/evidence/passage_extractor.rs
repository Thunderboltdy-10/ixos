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

                if score.is_finite() && score >= self.config.min_score {
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
        passages.sort_by(|a, b| b.score.total_cmp(&a.score));

        passages
    }

    /// Extract best passage without embedding (using keyword matching)
    pub fn extract_by_keywords(&self, content: &str, keywords: &[String]) -> Vec<Passage> {
        // Lexical witnesses may occur after the semantic prefix budget. Scan all
        // supplied text, then bound the number of returned passages.
        let chunks = self.chunk_content_with_limit(content, usize::MAX);
        let keywords_lower: Vec<String> = keywords
            .iter()
            .filter(|k| !k.trim().is_empty())
            .map(|k| k.to_lowercase())
            .collect();
        if keywords_lower.is_empty() {
            return Vec::new();
        }

        let mut passages: Vec<Passage> = chunks
            .into_iter()
            .filter_map(|(text, offset, line)| {
                let text_lower = text.to_lowercase();
                let matches: usize = keywords_lower
                    .iter()
                    .filter(|k| text_lower.contains(k.as_str()))
                    .count();

                if matches > 0 {
                    let score = matches as f32 / keywords_lower.len() as f32;
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

        passages.sort_by(|a, b| b.score.total_cmp(&a.score));
        passages.truncate(self.config.max_chunks);
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
        self.chunk_content_with_limit(content, self.config.max_chunks)
    }

    fn chunk_content_with_limit(&self, content: &str, limit: usize) -> Vec<(String, usize, usize)> {
        let mut chunks = Vec::new();
        if content.is_empty() || self.config.chunk_size == 0 || limit == 0 {
            return chunks;
        }
        let boundaries: Vec<usize> = content
            .char_indices()
            .map(|(i, _)| i)
            .chain(std::iter::once(content.len()))
            .collect();
        let newlines: Vec<usize> = content.match_indices('\n').map(|(i, _)| i).collect();
        let content_len = boundaries.len() - 1;
        let step = self
            .config
            .chunk_size
            .saturating_sub(self.config.chunk_overlap)
            .max(1);
        let mut offset = 0;
        while offset < content_len && chunks.len() < limit {
            let end = offset
                .saturating_add(self.config.chunk_size)
                .min(content_len);
            let chunk = &content[boundaries[offset]..boundaries[end]];
            let adjusted_chunk = if end == content_len {
                chunk.trim().to_string()
            } else {
                self.adjust_to_boundary(chunk)
            };
            let consumed = chunk.chars().count() - chunk.trim_start().chars().count()
                + adjusted_chunk.chars().count();
            if !adjusted_chunk.trim().is_empty() {
                let byte_offset = boundaries[offset] + chunk.len() - chunk.trim_start().len();
                let line_number = 1 + newlines.partition_point(|&i| i < byte_offset);
                chunks.push((adjusted_chunk, byte_offset, line_number));
            }
            if end == content_len {
                break;
            }
            // Boundary trimming must not leave gaps between successive windows.
            offset = offset.saturating_add(
                step.min(consumed.saturating_sub(self.config.chunk_overlap).max(1)),
            );
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
        if passage.chars().count() <= self.config.max_display_length {
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
    fn unicode_display_and_source_locations_are_valid() {
        let extractor = PassageExtractor::new(PassageConfig {
            chunk_size: 12,
            chunk_overlap: 4,
            max_display_length: 5,
            ..Default::default()
        });
        assert_eq!(extractor.truncate_for_display("ééééé"), "ééééé");
        assert_eq!(extractor.truncate_for_display("éééééé"), "ééééé...");
        let content = "  ééé first\n  résumé\n  日本語 tail\n more text";
        for (chunk, offset, line) in extractor.chunk_content(content) {
            assert!(content[offset..].starts_with(&chunk));
            assert_eq!(line, 1 + content[..offset].matches('\n').count());
        }
    }

    #[test]
    fn keyword_witness_beyond_semantic_chunk_budget_is_found() {
        let extractor = PassageExtractor::new(PassageConfig {
            max_chunks: 1,
            ..Default::default()
        });
        let content = format!("{}\nneedle_marker at the end", "ordinary text ".repeat(500));
        let passages = extractor.extract_by_keywords(&content, &["needle_marker".into()]);
        assert_eq!(passages.len(), 1);
        assert!(passages[0].text.contains("needle_marker"));
    }

    #[test]
    fn invalid_overlap_and_empty_keywords_do_not_panic_or_loop() {
        let extractor = PassageExtractor::new(PassageConfig {
            chunk_size: 3,
            chunk_overlap: 30,
            ..Default::default()
        });
        assert!(!extractor.chunk_content("some text").is_empty());
        assert!(extractor
            .extract_by_keywords("some text", &[String::new()])
            .is_empty());
        let empty = PassageExtractor::new(PassageConfig {
            chunk_size: 0,
            ..Default::default()
        });
        assert!(empty.chunk_content("some text").is_empty());
    }

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
