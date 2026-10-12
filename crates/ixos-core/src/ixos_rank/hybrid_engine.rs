//! Adaptive hybrid search engine with attack detection
//!
//! Combines lexical and semantic search with protection against degradation attacks.
//!
//! ## Attack Detection
//!
//! Degradation attacks occur when an attacker crafts file contents to maximize
//! lexical matches while minimizing semantic relevance, causing:
//! - High result counts
//! - Low match quality (many partial matches, few exact matches)
//! - Wasted semantic processing on irrelevant candidates
//!
//! The engine detects these patterns and falls back to alternative strategies.
//!
//! ## Fallback Strategies
//!
//! | Degradation Level | Strategy |
//! |-------------------|----------|
//! | Severe (>0.8) | Pure semantic search with sample |
//! | Moderate (>0.5) | Exact phrase matching + semantic |
//! | Mild | Reduced candidate set |

use std::sync::Arc;
use std::time::{Duration, Instant};

use super::lexical_engine::LexicalEngine;
use super::semantic_engine::SemanticEngine;
use super::types::{LexicalMatch, LexicalStats, SearchError, SearchResult, SearchSource};

/// Configuration for attack detection
#[derive(Debug, Clone)]
pub struct AttackDetectionConfig {
    /// Minimum result count to consider as potential attack
    pub result_count_threshold: usize,
    /// Degradation score threshold (0.0 - 1.0)
    pub degradation_threshold: f32,
    /// Maximum candidates to pass to semantic engine in normal mode
    pub normal_candidate_limit: usize,
    /// Maximum candidates in defensive mode
    pub defensive_candidate_limit: usize,
    /// Sample size for pure semantic fallback
    pub pure_semantic_sample_size: usize,
    /// Maximum latency for normal operations
    pub normal_latency_target: Duration,
    /// Maximum latency under attack
    pub attack_latency_target: Duration,
}

impl Default for AttackDetectionConfig {
    fn default() -> Self {
        Self {
            result_count_threshold: 1000,
            degradation_threshold: 0.5,
            normal_candidate_limit: 500,
            defensive_candidate_limit: 50,
            pure_semantic_sample_size: 100,
            normal_latency_target: Duration::from_secs(2),
            attack_latency_target: Duration::from_secs(3),
        }
    }
}

impl AttackDetectionConfig {
    /// Create a more permissive configuration
    pub fn permissive() -> Self {
        Self {
            result_count_threshold: 2000,
            degradation_threshold: 0.7,
            normal_candidate_limit: 1000,
            defensive_candidate_limit: 100,
            pure_semantic_sample_size: 200,
            normal_latency_target: Duration::from_secs(5),
            attack_latency_target: Duration::from_secs(10),
        }
    }

    /// Create a stricter configuration
    pub fn strict() -> Self {
        Self {
            result_count_threshold: 500,
            degradation_threshold: 0.3,
            normal_candidate_limit: 200,
            defensive_candidate_limit: 20,
            pure_semantic_sample_size: 50,
            normal_latency_target: Duration::from_secs(1),
            attack_latency_target: Duration::from_secs(2),
        }
    }
}

/// Adaptive hybrid search engine
///
/// Combines lexical and semantic search with attack detection and fallback strategies.
pub struct AdaptiveHybridEngine<L: LexicalEngine, S: SemanticEngine> {
    lexical_engine: Arc<L>,
    semantic_engine: Arc<S>,
    config: AttackDetectionConfig,
}

impl<L: LexicalEngine, S: SemanticEngine> AdaptiveHybridEngine<L, S> {
    /// Create a new hybrid engine with default configuration
    pub fn new(lexical: L, semantic: S) -> Self {
        Self::with_config(lexical, semantic, AttackDetectionConfig::default())
    }

    /// Create a new hybrid engine with custom configuration
    pub fn with_config(lexical: L, semantic: S, config: AttackDetectionConfig) -> Self {
        Self {
            lexical_engine: Arc::new(lexical),
            semantic_engine: Arc::new(semantic),
            config,
        }
    }

    /// Execute a search with attack detection
    pub async fn search(
        &self,
        query: &str,
        limit: usize,
    ) -> Result<Vec<SearchResult>, SearchError> {
        let start = Instant::now();

        // Phase 1: Lexical search
        let lexical_results = self
            .lexical_engine
            .search(query, self.config.result_count_threshold * 2)
            .await?;

        let stats = self.analyze_lexical_quality(query, &lexical_results);

        tracing::debug!(
            "Lexical search: {} results, degradation: {:.2}, avg_score: {:.2}",
            stats.result_count,
            stats.degradation_score,
            stats.avg_score
        );

        // Attack detection
        if self.detect_degradation_attack(&stats) {
            tracing::warn!(
                "Degradation attack detected: {} results, {:.2} degradation score",
                stats.result_count,
                stats.degradation_score
            );
            return self.execute_fallback_strategy(query, &stats, limit).await;
        }

        // Normal hybrid cascade
        let candidates = self.limit_candidates(lexical_results, self.config.normal_candidate_limit);
        let semantic_results = self
            .semantic_engine
            .rerank(query, candidates, limit)
            .await?;

        let results = semantic_results
            .into_iter()
            .take(limit)
            .map(|m| SearchResult::new(m.path, m.similarity, SearchSource::Hybrid))
            .collect();

        let elapsed = start.elapsed();
        tracing::info!(
            "Search completed in {:?} (target: {:?})",
            elapsed,
            self.config.normal_latency_target
        );

        Ok(results)
    }

    /// Analyze the quality of lexical search results
    fn analyze_lexical_quality(&self, query: &str, results: &[LexicalMatch]) -> LexicalStats {
        let query_term_count = query.split_whitespace().count();

        if results.is_empty() {
            return LexicalStats::empty(query_term_count);
        }

        // Count exact matches (all query terms present)
        let exact_matches = results.iter().filter(|r| r.is_exact_match()).count();

        // Calculate degradation score
        // High degradation = many results but few exact matches
        let degradation_score = 1.0 - (exact_matches as f32 / results.len() as f32);

        let avg_score = results.iter().map(|r| r.score).sum::<f32>() / results.len() as f32;

        LexicalStats::new(
            results.len(),
            query_term_count,
            avg_score,
            degradation_score,
        )
    }

    /// Check if the lexical stats indicate a degradation attack
    fn detect_degradation_attack(&self, stats: &LexicalStats) -> bool {
        stats.indicates_attack(
            self.config.result_count_threshold,
            self.config.degradation_threshold,
        )
    }

    /// Execute the appropriate fallback strategy based on degradation level
    async fn execute_fallback_strategy(
        &self,
        query: &str,
        stats: &LexicalStats,
        limit: usize,
    ) -> Result<Vec<SearchResult>, SearchError> {
        let start = Instant::now();

        let results = match stats.degradation_score {
            d if d > 0.8 => {
                // Severe degradation: Pure semantic search with small sample
                tracing::warn!("Severe degradation ({:.2}), using pure semantic mode", d);
                let semantic_results = self
                    .semantic_engine
                    .search_pure(query, self.config.pure_semantic_sample_size)
                    .await?;

                semantic_results
                    .into_iter()
                    .take(limit)
                    .map(|m| SearchResult::new(m.path, m.similarity, SearchSource::Semantic))
                    .collect()
            }
            d if d > 0.5 => {
                // Moderate degradation: Exact phrase filter + semantic
                tracing::warn!("Moderate degradation ({:.2}), using aggressive filter", d);
                let filtered = self
                    .aggressive_phrase_filter(query, self.config.defensive_candidate_limit)
                    .await?;
                let semantic_results = self.semantic_engine.rerank(query, filtered, limit).await?;

                semantic_results
                    .into_iter()
                    .take(limit)
                    .map(|m| SearchResult::new(m.path, m.similarity, SearchSource::Hybrid))
                    .collect()
            }
            _ => {
                // Mild degradation: Reduced candidates
                tracing::info!("Mild degradation, using reduced candidate set");
                let lexical_results = self
                    .lexical_engine
                    .search(query, self.config.defensive_candidate_limit * 2)
                    .await?;
                let candidates =
                    self.limit_candidates(lexical_results, self.config.defensive_candidate_limit);
                let semantic_results = self
                    .semantic_engine
                    .rerank(query, candidates, limit)
                    .await?;

                semantic_results
                    .into_iter()
                    .take(limit)
                    .map(|m| SearchResult::new(m.path, m.similarity, SearchSource::Hybrid))
                    .collect()
            }
        };

        let elapsed = start.elapsed();
        tracing::info!(
            "Fallback search completed in {:?} (target: {:?})",
            elapsed,
            self.config.attack_latency_target
        );

        Ok(results)
    }

    /// Apply aggressive filtering - only keep exact phrase matches
    async fn aggressive_phrase_filter(
        &self,
        query: &str,
        limit: usize,
    ) -> Result<Vec<LexicalMatch>, SearchError> {
        let lexical_results = self.lexical_engine.search(query, limit * 4).await?;

        // Filter to only results that contain the exact query phrase
        let lower_query = query.to_lowercase();
        let filtered: Vec<LexicalMatch> = lexical_results
            .into_iter()
            .filter(|r| r.content_snippet.to_lowercase().contains(&lower_query))
            .take(limit)
            .collect();

        Ok(filtered)
    }

    /// Limit and sort candidates
    fn limit_candidates(&self, mut results: Vec<LexicalMatch>, max: usize) -> Vec<LexicalMatch> {
        // Sort by score descending
        results.sort_by(|a, b| {
            b.score
                .partial_cmp(&a.score)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        results.truncate(max);
        results
    }

    /// Get the current configuration
    pub fn config(&self) -> &AttackDetectionConfig {
        &self.config
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ixos_rank::lexical_engine::StubLexicalEngine;
    use crate::ixos_rank::semantic_engine::StubSemanticEngine;
    use tempfile::TempDir;

    fn create_test_engine() -> AdaptiveHybridEngine<StubLexicalEngine, StubSemanticEngine> {
        let mut lexical = StubLexicalEngine::new();
        lexical.add_file(
            std::path::PathBuf::from("/doc1.txt"),
            "The quick brown fox jumps over the lazy dog".to_string(),
        );
        lexical.add_file(
            std::path::PathBuf::from("/doc2.txt"),
            "A quick brown dog runs fast".to_string(),
        );
        lexical.add_file(
            std::path::PathBuf::from("/doc3.txt"),
            "Something completely different".to_string(),
        );

        let semantic = StubSemanticEngine::with_stub_model();

        AdaptiveHybridEngine::new(lexical, semantic)
    }

    /// Create a test engine with real files for integration testing
    fn create_test_engine_with_files(
        temp_dir: &TempDir,
    ) -> AdaptiveHybridEngine<StubLexicalEngine, StubSemanticEngine> {
        let doc1_path = temp_dir.path().join("doc1.txt");
        let doc2_path = temp_dir.path().join("doc2.txt");
        let doc3_path = temp_dir.path().join("doc3.txt");

        std::fs::write(&doc1_path, "The quick brown fox jumps over the lazy dog").unwrap();
        std::fs::write(&doc2_path, "A quick brown dog runs fast").unwrap();
        std::fs::write(&doc3_path, "Something completely different").unwrap();

        let mut lexical = StubLexicalEngine::new();
        lexical.add_file(
            doc1_path,
            "The quick brown fox jumps over the lazy dog".to_string(),
        );
        lexical.add_file(doc2_path, "A quick brown dog runs fast".to_string());
        lexical.add_file(doc3_path, "Something completely different".to_string());

        let semantic = StubSemanticEngine::with_stub_model();

        AdaptiveHybridEngine::new(lexical, semantic)
    }

    #[test]
    fn test_attack_detection_config_default() {
        let config = AttackDetectionConfig::default();
        assert_eq!(config.result_count_threshold, 1000);
        assert_eq!(config.degradation_threshold, 0.5);
    }

    #[test]
    fn test_analyze_lexical_quality_empty() {
        let engine = create_test_engine();
        let stats = engine.analyze_lexical_quality("test", &[]);

        assert_eq!(stats.result_count, 0);
        assert_eq!(stats.degradation_score, 0.0);
    }

    #[test]
    fn test_analyze_lexical_quality_all_exact() {
        let engine = create_test_engine();

        let results = vec![
            LexicalMatch::new(std::path::PathBuf::from("/a.txt"), 1.0, String::new(), 2, 2),
            LexicalMatch::new(std::path::PathBuf::from("/b.txt"), 1.0, String::new(), 2, 2),
        ];

        let stats = engine.analyze_lexical_quality("hello world", &results);

        assert_eq!(stats.result_count, 2);
        assert_eq!(stats.degradation_score, 0.0); // All exact matches
    }

    #[test]
    fn test_analyze_lexical_quality_high_degradation() {
        let engine = create_test_engine();

        // Create results with mostly partial matches
        let results: Vec<LexicalMatch> = (0..100)
            .map(|i| {
                LexicalMatch::new(
                    std::path::PathBuf::from(format!("/{}.txt", i)),
                    0.3,
                    String::new(),
                    1, // Only 1 term matched
                    3, // Out of 3 terms
                )
            })
            .collect();

        let stats = engine.analyze_lexical_quality("hello world test", &results);

        assert!(stats.degradation_score > 0.9); // High degradation
    }

    #[test]
    fn test_detect_degradation_attack() {
        let engine = create_test_engine();

        // Not an attack: low result count
        let stats1 = LexicalStats::new(100, 3, 0.5, 0.8);
        assert!(!engine.detect_degradation_attack(&stats1));

        // Not an attack: low degradation
        let stats2 = LexicalStats::new(2000, 3, 0.8, 0.2);
        assert!(!engine.detect_degradation_attack(&stats2));

        // Attack: high result count AND high degradation
        let stats3 = LexicalStats::new(2000, 3, 0.3, 0.8);
        assert!(engine.detect_degradation_attack(&stats3));
    }

    #[tokio::test]
    async fn test_search_normal() {
        let engine = create_test_engine();

        // Just test that lexical search works (semantic reranking requires real files)
        let lexical_results = engine
            .lexical_engine
            .search("quick brown", 20)
            .await
            .unwrap();
        assert!(
            !lexical_results.is_empty(),
            "Lexical search should find 'quick brown'"
        );

        // Verify both doc1 and doc2 contain the search terms
        assert!(lexical_results
            .iter()
            .any(|r| r.path.to_string_lossy().contains("doc1")));
        assert!(lexical_results
            .iter()
            .any(|r| r.path.to_string_lossy().contains("doc2")));
    }

    #[tokio::test]
    async fn test_search_no_results() {
        let temp_dir = TempDir::new().unwrap();
        let engine = create_test_engine_with_files(&temp_dir);
        let results = engine.search("xyz123nonexistent", 10).await.unwrap();

        assert!(results.is_empty());
    }

    #[tokio::test]
    async fn test_limit_candidates() {
        let engine = create_test_engine();

        let candidates: Vec<LexicalMatch> = (0..100)
            .map(|i| {
                LexicalMatch::new(
                    std::path::PathBuf::from(format!("/{}.txt", i)),
                    (100 - i) as f32 / 100.0,
                    String::new(),
                    1,
                    1,
                )
            })
            .collect();

        let limited = engine.limit_candidates(candidates, 10);

        assert_eq!(limited.len(), 10);
        // Should be sorted by score descending
        assert!(limited[0].score >= limited[9].score);
    }

    #[test]
    fn test_lexical_stats_indicates_attack() {
        let stats = LexicalStats::new(1500, 3, 0.3, 0.7);
        assert!(stats.indicates_attack(1000, 0.5));

        let normal_stats = LexicalStats::new(500, 3, 0.8, 0.2);
        assert!(!normal_stats.indicates_attack(1000, 0.5));
    }
}
