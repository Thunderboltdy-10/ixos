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
    last_stats: Mutex<super::candidate_generator::CandidateStats>,
    /// One search's prepared candidates; consumed once by its pipeline. This is
    /// not a manifest cache across searches and does not hide newly created files.
    prepared: Mutex<Option<(String, Vec<LexicalMatch>)>>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn preflight_preserves_all_candidates_and_is_consumed_once() {
        let folder = tempfile::tempdir().unwrap();
        for name in ["a.txt", "b.txt", "c.txt"] {
            std::fs::write(folder.path().join(name), "witness_term\n").unwrap();
        }
        let engine = CandidateLexicalEngine::new(folder.path().to_path_buf());
        assert!(!engine.preflight("witness_term").await.unwrap());
        let mut batches = Vec::new();
        let results = engine.search("witness_term", 10).await.unwrap();
        assert_eq!(results.len(), 3);
        std::fs::write(folder.path().join("new.txt"), "witness_term\n").unwrap();
        let next = engine.search("witness_term", 10).await.unwrap();
        assert_eq!(
            next.len(),
            4,
            "A consumed preflight must not hide new files"
        );
        for result in next {
            batches.push(result.path);
        }
        assert!(batches.contains(&folder.path().join("new.txt")));
    }
}

impl CandidateLexicalEngine {
    /// Create a new candidate lexical engine with default settings
    pub fn new(root_dir: PathBuf) -> Self {
        let generator = CandidateGenerator::with_defaults(root_dir);
        Self {
            generator: Mutex::new(generator),
            last_stats: Mutex::new(Default::default()),
            prepared: Mutex::new(None),
        }
    }

    /// Create with custom generator config
    pub fn with_config(root_dir: PathBuf, config: CandidateGeneratorConfig) -> Self {
        let generator = CandidateGenerator::new(root_dir, config);
        Self {
            generator: Mutex::new(generator),
            last_stats: Mutex::new(Default::default()),
            prepared: Mutex::new(None),
        }
    }

    /// Probe lexical availability while preserving the complete candidate batch
    /// for this request. Running a full funnel and throwing it away doubled CLI
    /// work on dense corpora before the actual search pipeline even started.
    pub async fn preflight(&self, query: &str) -> Result<bool, SearchError> {
        let mut generator = self.generator.lock().await;
        let set = generator.generate(query);
        *self.last_stats.lock().await = set.stats.clone();
        let matches: Vec<_> = set
            .into_lexical_matches()
            .into_iter()
            .map(|m| m.with_query_coverage(query))
            .collect();
        let empty = matches.is_empty();
        *self.prepared.lock().await = Some((query.to_owned(), matches));
        Ok(empty)
    }

    async fn take_prepared(&self, query: &str) -> Option<Vec<LexicalMatch>> {
        self.prepared
            .lock()
            .await
            .take()
            .and_then(|(previous, matches)| {
                if previous == query {
                    Some(matches)
                } else {
                    None
                }
            })
    }
}

#[async_trait]
impl LexicalEngine for CandidateLexicalEngine {
    async fn candidate_stats(&self) -> super::candidate_generator::CandidateStats {
        self.last_stats.lock().await.clone()
    }
    async fn search(&self, query: &str, limit: usize) -> Result<Vec<LexicalMatch>, SearchError> {
        if query.trim().is_empty() {
            return Ok(Vec::new());
        }

        if let Some(mut results) = self.take_prepared(query).await {
            results.truncate(limit);
            return Ok(results);
        }

        let mut generator = self.generator.lock().await;
        let candidate_set = generator.generate(query);
        *self.last_stats.lock().await = candidate_set.stats.clone();
        let mut results: Vec<_> = candidate_set
            .into_lexical_matches()
            .into_iter()
            .map(|m| m.with_query_coverage(query))
            .collect();
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

        if let Some(mut results) = self.take_prepared(query).await {
            results.truncate(limit);
            if let Some(ref mut handler) = on_batch {
                let count = results.len();
                for (index, chunk) in results.chunks(batch_size.max(1)).enumerate() {
                    handler(chunk.to_vec(), (index + 1) * batch_size.max(1) >= count);
                }
            }
            return Ok(results);
        }

        let mut generator = self.generator.lock().await;
        let candidate_set = if let Some(ref mut handler) = on_batch {
            let batch_interval_ms = batch_timeout.as_millis().max(1) as u64;
            generator.generate_streaming(query, batch_size, batch_interval_ms, |batch, is_final| {
                let matches: Vec<LexicalMatch> = batch
                    .iter()
                    .map(|c| LexicalMatch::from(c).with_query_coverage(query))
                    .take(limit)
                    .collect();
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

        *self.last_stats.lock().await = candidate_set.stats.clone();
        let mut results: Vec<_> = candidate_set
            .into_lexical_matches()
            .into_iter()
            .map(|m| m.with_query_coverage(query))
            .collect();
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
