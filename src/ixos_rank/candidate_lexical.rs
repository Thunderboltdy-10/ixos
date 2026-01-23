//! Candidate-based lexical engine using the P2 generator.

use std::path::PathBuf;
use std::time::Duration;

use async_trait::async_trait;
use tokio::sync::Mutex;

use super::candidate_generator::{CandidateGenerator, CandidateGeneratorConfig};
use super::lexical_engine::LexicalEngine;
use super::types::{LexicalMatch, SearchError};

/// Lexical engine backed by the P2 candidate generator
pub struct CandidateLexicalEngine {
    generator: Mutex<CandidateGenerator>,
}

impl CandidateLexicalEngine {
    /// Create a new candidate lexical engine with default settings
    pub fn new(root_dir: PathBuf) -> Self {
        let generator = CandidateGenerator::with_defaults(root_dir);
        Self {
            generator: Mutex::new(generator),
        }
    }

    /// Create with custom generator config
    pub fn with_config(root_dir: PathBuf, config: CandidateGeneratorConfig) -> Self {
        let generator = CandidateGenerator::new(root_dir, config);
        Self {
            generator: Mutex::new(generator),
        }
    }
}

#[async_trait]
impl LexicalEngine for CandidateLexicalEngine {
    async fn search(&self, query: &str, limit: usize) -> Result<Vec<LexicalMatch>, SearchError> {
        if query.trim().is_empty() {
            return Ok(Vec::new());
        }

        let mut generator = self.generator.lock().await;
        let candidate_set = generator.generate(query);
        let mut results = candidate_set.into_lexical_matches();
        results.truncate(limit);
        Ok(results)
    }

    async fn search_with_batches(
        &self,
        query: &str,
        limit: usize,
        batch_size: usize,
        batch_timeout: Duration,
        mut on_batch: Option<Box<dyn FnMut(Vec<LexicalMatch>, bool) + Send>>,
    ) -> Result<Vec<LexicalMatch>, SearchError> {
        if query.trim().is_empty() {
            return Ok(Vec::new());
        }

        let mut generator = self.generator.lock().await;
        let candidate_set = if let Some(ref mut handler) = on_batch {
            let batch_interval_ms = batch_timeout.as_millis().max(1) as u64;
            generator.generate_streaming(query, batch_size, batch_interval_ms, |batch, is_final| {
                let matches: Vec<LexicalMatch> = batch.iter().map(LexicalMatch::from).collect();
                handler(matches, is_final);
            })
        } else {
            generator.generate_streaming(
                query,
                batch_size,
                batch_timeout.as_millis().max(1) as u64,
                |_batch, _is_final| {},
            )
        };

        let mut results = candidate_set.into_lexical_matches();
        results.truncate(limit);

        // Ensure final batch if streaming handler didn't flush.
        if let Some(mut handler) = on_batch {
            if !results.is_empty() {
                let mut batch = Vec::new();
                let mut last_flush = std::time::Instant::now();
                for (index, result) in results.iter().enumerate() {
                    batch.push(result.clone());
                    let should_flush =
                        batch.len() >= batch_size || last_flush.elapsed() >= batch_timeout;
                    if should_flush || index + 1 == results.len() {
                        handler(batch.clone(), index + 1 == results.len());
                        batch.clear();
                        last_flush = std::time::Instant::now();
                    }
                }
            }
        }

        Ok(results)
    }
}
