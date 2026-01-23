//! Text chunking for large files
//!
//! Provides recursive character text splitting with configurable overlap.
//! Prevents memory issues and improves search quality for large documents.

use serde::{Deserialize, Serialize};

/// Configuration for text chunking
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChunkConfig {
    /// Target chunk size in characters (default: 2048)
    pub target_size: usize,
    /// Overlap ratio between chunks (0.0-1.0, default: 0.15)
    pub overlap_ratio: f32,
    /// Maximum file size to process in bytes (default: 10MB)
    pub max_file_size: usize,
}

impl Default for ChunkConfig {
    fn default() -> Self {
        Self {
            target_size: 2048,
            overlap_ratio: 0.15,
            max_file_size: 10 * 1024 * 1024, // 10MB
        }
    }
}

impl ChunkConfig {
    /// Create a new chunk configuration
    pub fn new(target_size: usize, overlap_ratio: f32, max_file_size: usize) -> Self {
        Self {
            target_size,
            overlap_ratio: overlap_ratio.clamp(0.0, 1.0),
            max_file_size,
        }
    }

    /// Calculate overlap size in characters
    pub fn overlap_size(&self) -> usize {
        (self.target_size as f32 * self.overlap_ratio) as usize
    }
}

/// Split content into chunks with overlap
pub fn chunk_content(content: &str, config: &ChunkConfig) -> Vec<String> {
    // Empty or whitespace-only content returns empty vector
    if content.trim().is_empty() {
        return Vec::new();
    }

    // Check if content is too large
    if content.len() > config.max_file_size {
        tracing::warn!(
            "Content exceeds max file size ({} > {}), truncating",
            content.len(),
            config.max_file_size
        );
        let truncated = &content[..config.max_file_size];
        return chunk_content(truncated, config);
    }

    // If content is small enough, return as single chunk
    if content.len() <= config.target_size {
        return vec![content.to_string()];
    }

    // Split recursively using multiple separators
    let separators = ["\n\n", "\n", ". ", " "];
    recursive_split(content, &separators, config)
}

/// Recursively split text using different separators
fn recursive_split(content: &str, separators: &[&str], config: &ChunkConfig) -> Vec<String> {
    if content.len() <= config.target_size {
        return vec![content.to_string()];
    }

    if separators.is_empty() {
        // No more separators, split by character
        return character_split(content, config);
    }

    let separator = separators[0];
    let remaining_separators = &separators[1..];

    let mut chunks = Vec::new();
    let mut current_chunk = String::new();
    let overlap_size = config.overlap_size();

    for segment in content.split(separator) {
        let segment_with_sep = if current_chunk.is_empty() {
            segment.to_string()
        } else {
            format!("{}{}", separator, segment)
        };

        // If adding this segment would exceed target size
        if !current_chunk.is_empty()
            && current_chunk.len() + segment_with_sep.len() > config.target_size
        {
            // Save current chunk
            if !current_chunk.is_empty() {
                chunks.push(current_chunk.clone());
            }

            // Start new chunk with overlap from previous chunk
            if overlap_size > 0 && current_chunk.len() >= overlap_size {
                let start_idx = current_chunk.len() - overlap_size;
                current_chunk = current_chunk[start_idx..].to_string();
            } else {
                current_chunk = String::new();
            }
        }

        // If segment itself is too large, split it recursively
        if segment_with_sep.len() > config.target_size {
            if !current_chunk.is_empty() {
                chunks.push(current_chunk.clone());
                current_chunk = String::new();
            }
            chunks.extend(recursive_split(
                &segment_with_sep,
                remaining_separators,
                config,
            ));
        } else {
            current_chunk.push_str(&segment_with_sep);
        }
    }

    // Add remaining chunk
    if !current_chunk.is_empty() {
        chunks.push(current_chunk);
    }

    // Remove empty chunks
    chunks
        .into_iter()
        .filter(|c| !c.trim().is_empty())
        .collect()
}

/// Split text by characters when no separators work
fn character_split(content: &str, config: &ChunkConfig) -> Vec<String> {
    let mut chunks = Vec::new();
    let mut start = 0;
    let overlap_size = config.overlap_size();

    while start < content.len() {
        let end = (start + config.target_size).min(content.len());

        // Ensure we don't split in the middle of a UTF-8 character
        let chunk_end = if end < content.len() {
            // Find the last valid char boundary
            let mut boundary = end;
            while boundary > start && !content.is_char_boundary(boundary) {
                boundary -= 1;
            }
            boundary
        } else {
            end
        };

        chunks.push(content[start..chunk_end].to_string());

        // Move start with overlap; ensure forward progress at the end.
        start = if chunk_end >= content.len() {
            content.len()
        } else if chunk_end >= overlap_size {
            chunk_end - overlap_size
        } else {
            chunk_end
        };
    }

    chunks
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_small_content_no_chunking() {
        let config = ChunkConfig::default();
        let content = "Small content";
        let chunks = chunk_content(content, &config);
        assert_eq!(chunks.len(), 1);
        assert_eq!(chunks[0], content);
    }

    #[test]
    fn test_large_content_chunking() {
        let config = ChunkConfig {
            target_size: 100,
            overlap_ratio: 0.2,
            max_file_size: 10000,
        };
        let content = "a".repeat(500);
        let chunks = chunk_content(&content, &config);
        assert!(chunks.len() > 1);
        // Each chunk should be around target size
        for chunk in &chunks {
            assert!(chunk.len() <= config.target_size * 2);
        }
    }

    #[test]
    fn test_paragraph_splitting() {
        let config = ChunkConfig {
            target_size: 50,
            overlap_ratio: 0.1,
            max_file_size: 10000,
        };
        let content = "Paragraph 1.\n\nParagraph 2.\n\nParagraph 3.\n\nParagraph 4.";
        let chunks = chunk_content(content, &config);
        assert!(chunks.len() >= 2);
    }

    #[test]
    fn test_unicode_character_splitting() {
        let config = ChunkConfig {
            target_size: 10,
            overlap_ratio: 0.0,
            max_file_size: 10000,
        };
        let content = "Hello, 世界! 你好世界!";
        let chunks = chunk_content(content, &config);
        // Should not panic on multi-byte characters
        for chunk in &chunks {
            assert!(chunk.chars().count() > 0);
        }
    }

    #[test]
    fn test_overlap_calculation() {
        let config = ChunkConfig {
            target_size: 100,
            overlap_ratio: 0.2,
            max_file_size: 10000,
        };
        assert_eq!(config.overlap_size(), 20);
    }

    #[test]
    fn test_max_file_size_truncation() {
        let config = ChunkConfig {
            target_size: 100,
            overlap_ratio: 0.1,
            max_file_size: 200,
        };
        let content = "a".repeat(500);
        let chunks = chunk_content(&content, &config);
        // Total content should not exceed max_file_size
        let total_size: usize = chunks.iter().map(|c| c.len()).sum();
        assert!(total_size <= config.max_file_size * 2); // Allow some overhead
    }

    #[test]
    fn test_empty_content() {
        let config = ChunkConfig::default();
        let content = "";
        let chunks = chunk_content(content, &config);
        assert_eq!(chunks.len(), 0);
    }

    #[test]
    fn test_whitespace_only_content() {
        let config = ChunkConfig::default();
        let content = "   \n\n   ";
        let chunks = chunk_content(content, &config);
        assert_eq!(chunks.len(), 0); // Empty after trimming
    }
}
