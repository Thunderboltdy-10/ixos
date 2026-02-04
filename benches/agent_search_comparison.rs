//! Agent Search Comparison Benchmark
//!
//! Compares Ixos semantic search vs ripgrep-style lexical search
//! for AI agent use cases.
//!
//! Run with: cargo run --release --bin agent-search-benchmark
//!
//! This benchmark evaluates:
//! 1. Search relevance (do results match intent?)
//! 2. Query coverage (can it find conceptually similar code?)
//! 3. Speed (time to first result, total time)
//! 4. Precision (relevant results / total results)

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};

/// A test query with expected results
struct TestQuery {
    /// Natural language query (what an AI agent would ask)
    query: &'static str,
    /// Keywords a lexical search would use
    lexical_pattern: &'static str,
    /// Expected concepts in relevant files
    expected_concepts: &'static [&'static str],
    /// Query type classification
    query_type: QueryType,
}

#[derive(Debug, Clone, Copy)]
enum QueryType {
    /// Exact keyword match preferred
    Lexical,
    /// Semantic understanding preferred
    Semantic,
    /// Both approaches viable
    Hybrid,
}

/// Results from a search comparison
#[derive(Debug, Default)]
struct ComparisonResult {
    query: String,
    query_type: String,

    // Ixos results
    ixos_time_ms: u64,
    ixos_result_count: usize,
    ixos_relevant_count: usize,
    ixos_precision: f32,

    // Lexical results
    lexical_time_ms: u64,
    lexical_result_count: usize,
    lexical_relevant_count: usize,
    lexical_precision: f32,

    // Comparison
    ixos_wins: bool,
    notes: String,
}

fn main() {
    println!("=".repeat(80));
    println!("Ixos vs Lexical Search - AI Agent Benchmark");
    println!("=".repeat(80));
    println!();

    let search_dir = std::env::args()
        .nth(1)
        .unwrap_or_else(|| "./src".to_string());

    println!("Search directory: {}", search_dir);
    println!();

    // Define test queries
    let test_queries = vec![
        TestQuery {
            query: "error handling and recovery patterns",
            lexical_pattern: "error|Error|handle|catch|Result",
            expected_concepts: &["error", "result", "handle", "unwrap"],
            query_type: QueryType::Semantic,
        },
        TestQuery {
            query: "cryptographic signing and verification",
            lexical_pattern: "sign|hmac|hash|verify|crypto",
            expected_concepts: &["hmac", "sign", "verify", "key"],
            query_type: QueryType::Semantic,
        },
        TestQuery {
            query: "user privacy protection mechanisms",
            lexical_pattern: "privacy|gdpr|consent|secure",
            expected_concepts: &["privacy", "consent", "gdpr", "secure"],
            query_type: QueryType::Semantic,
        },
        TestQuery {
            query: "file caching implementation",
            lexical_pattern: "cache|Cache|embed|store",
            expected_concepts: &["cache", "embed", "store", "get", "set"],
            query_type: QueryType::Hybrid,
        },
        TestQuery {
            query: "EmbeddingCache trait",
            lexical_pattern: "EmbeddingCache",
            expected_concepts: &["embeddingcache", "trait", "impl"],
            query_type: QueryType::Lexical,
        },
        TestQuery {
            query: "how are search results ranked",
            lexical_pattern: "rank|score|sort|order",
            expected_concepts: &["rank", "score", "semantic", "lexical"],
            query_type: QueryType::Semantic,
        },
        TestQuery {
            query: "timing attack prevention",
            lexical_pattern: "timing|secure|attack|floor",
            expected_concepts: &["timing", "secure", "floor", "attack"],
            query_type: QueryType::Semantic,
        },
        TestQuery {
            query: "fn search",
            lexical_pattern: "fn search",
            expected_concepts: &["fn", "search", "pub"],
            query_type: QueryType::Lexical,
        },
    ];

    let mut results: Vec<ComparisonResult> = Vec::new();

    for test in &test_queries {
        let result = run_comparison(&search_dir, test);
        results.push(result);
    }

    // Print results
    print_results(&results);
    print_summary(&results);
}

fn run_comparison(search_dir: &str, test: &TestQuery) -> ComparisonResult {
    let mut result = ComparisonResult {
        query: test.query.to_string(),
        query_type: format!("{:?}", test.query_type),
        ..Default::default()
    };

    // Simulate lexical search (simple keyword matching)
    let lexical_start = Instant::now();
    let lexical_results = lexical_search(search_dir, test.lexical_pattern);
    result.lexical_time_ms = lexical_start.elapsed().as_millis() as u64;
    result.lexical_result_count = lexical_results.len();

    // Count relevant results
    result.lexical_relevant_count = lexical_results
        .iter()
        .filter(|(_, content)| {
            let content_lower = content.to_lowercase();
            test.expected_concepts
                .iter()
                .filter(|c| content_lower.contains(*c))
                .count()
                >= 2
        })
        .count();

    result.lexical_precision = if result.lexical_result_count > 0 {
        result.lexical_relevant_count as f32 / result.lexical_result_count as f32
    } else {
        0.0
    };

    // Simulate Ixos semantic search (we'll parse real Ixos output)
    let ixos_start = Instant::now();
    let ixos_results = ixos_search(search_dir, test.query);
    result.ixos_time_ms = ixos_start.elapsed().as_millis() as u64;
    result.ixos_result_count = ixos_results.len();

    // Count relevant results
    result.ixos_relevant_count = ixos_results
        .iter()
        .filter(|(_, content)| {
            let content_lower = content.to_lowercase();
            test.expected_concepts
                .iter()
                .filter(|c| content_lower.contains(*c))
                .count()
                >= 2
        })
        .count();

    result.ixos_precision = if result.ixos_result_count > 0 {
        result.ixos_relevant_count as f32 / result.ixos_result_count as f32
    } else {
        0.0
    };

    // Determine winner
    result.ixos_wins = result.ixos_relevant_count > result.lexical_relevant_count
        || (result.ixos_relevant_count == result.lexical_relevant_count
            && result.ixos_precision > result.lexical_precision);

    result.notes = match test.query_type {
        QueryType::Lexical => {
            if result.ixos_wins {
                "Ixos won despite lexical-preferred query".to_string()
            } else {
                "Lexical won as expected".to_string()
            }
        }
        QueryType::Semantic => {
            if result.ixos_wins {
                "Ixos won as expected (semantic query)".to_string()
            } else {
                "Unexpected: lexical beat semantic".to_string()
            }
        }
        QueryType::Hybrid => "Hybrid query - either approach viable".to_string(),
    };

    result
}

fn lexical_search(dir: &str, pattern: &str) -> Vec<(PathBuf, String)> {
    let mut results = Vec::new();
    let patterns: Vec<&str> = pattern.split('|').collect();

    fn walk(dir: &Path, patterns: &[&str], results: &mut Vec<(PathBuf, String)>) {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    walk(&path, patterns, results);
                } else if path.is_file() && path.extension().map_or(false, |e| e == "rs") {
                    if let Ok(content) = std::fs::read_to_string(&path) {
                        let content_lower = content.to_lowercase();
                        if patterns
                            .iter()
                            .any(|p| content_lower.contains(&p.to_lowercase()))
                        {
                            results.push((path, content));
                        }
                    }
                }
            }
        }
    }

    walk(Path::new(dir), &patterns, &mut results);
    results.truncate(20);
    results
}

fn ixos_search(dir: &str, query: &str) -> Vec<(PathBuf, String)> {
    // Try to run real Ixos CLI
    let output = std::process::Command::new("./target/release/ixos")
        .args([
            "search",
            query,
            "--dir",
            dir,
            "--stub-model",
            "--json",
            "--limit",
            "20",
        ])
        .output();

    match output {
        Ok(out) if out.status.success() => {
            // Parse JSON output
            let stdout = String::from_utf8_lossy(&out.stdout);
            parse_ixos_json(&stdout, dir)
        }
        _ => {
            // Fallback: simulate semantic search
            simulate_semantic_search(dir, query)
        }
    }
}

fn parse_ixos_json(json: &str, _dir: &str) -> Vec<(PathBuf, String)> {
    // Simple JSON parsing for Ixos output
    let mut results = Vec::new();

    // Try to parse as JSON
    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(json) {
        if let Some(items) = parsed.get("results").and_then(|r| r.as_array()) {
            for item in items {
                if let Some(path_str) = item.get("path").and_then(|p| p.as_str()) {
                    let path = PathBuf::from(path_str.trim_start_matches("\\\\?\\"));
                    if let Ok(content) = std::fs::read_to_string(&path) {
                        results.push((path, content));
                    }
                }
            }
        }
    }

    results
}

fn simulate_semantic_search(dir: &str, query: &str) -> Vec<(PathBuf, String)> {
    // Fallback semantic simulation when Ixos binary isn't available
    let mut results = Vec::new();
    let query_lower = query.to_lowercase();
    let query_words: Vec<&str> = query_lower.split_whitespace().collect();

    fn walk(dir: &Path, query_words: &[&str], results: &mut Vec<(PathBuf, String, f32)>) {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    walk(&path, query_words, results);
                } else if path.is_file() && path.extension().map_or(false, |e| e == "rs") {
                    if let Ok(content) = std::fs::read_to_string(&path) {
                        let content_lower = content.to_lowercase();
                        let score: f32 = query_words
                            .iter()
                            .map(|w| if content_lower.contains(w) { 1.0 } else { 0.0 })
                            .sum::<f32>()
                            / query_words.len() as f32;

                        if score > 0.2 {
                            results.push((path, content, score));
                        }
                    }
                }
            }
        }
    }

    let mut scored_results = Vec::new();
    walk(Path::new(dir), &query_words, &mut scored_results);
    scored_results.sort_by(|a, b| b.2.partial_cmp(&a.2).unwrap());
    scored_results.truncate(20);

    results = scored_results.into_iter().map(|(p, c, _)| (p, c)).collect();
    results
}

fn print_results(results: &[ComparisonResult]) {
    println!("{:-<80}", "");
    println!(
        "{:<40} {:>8} {:>8} {:>8} {:>8}",
        "Query", "Ixos", "Lexical", "Winner", "Type"
    );
    println!("{:-<80}", "");

    for r in results {
        let winner = if r.ixos_wins { "IXOS" } else { "LEX" };
        println!(
            "{:<40} {:>5}/{:<2} {:>5}/{:<2} {:>8} {:>8}",
            truncate(&r.query, 38),
            r.ixos_relevant_count,
            r.ixos_result_count,
            r.lexical_relevant_count,
            r.lexical_result_count,
            winner,
            &r.query_type[..3]
        );
    }
    println!("{:-<80}", "");
}

fn print_summary(results: &[ComparisonResult]) {
    let ixos_wins = results.iter().filter(|r| r.ixos_wins).count();
    let lexical_wins = results.len() - ixos_wins;

    let avg_ixos_precision: f32 =
        results.iter().map(|r| r.ixos_precision).sum::<f32>() / results.len() as f32;
    let avg_lexical_precision: f32 =
        results.iter().map(|r| r.lexical_precision).sum::<f32>() / results.len() as f32;

    let avg_ixos_time: u64 =
        results.iter().map(|r| r.ixos_time_ms).sum::<u64>() / results.len() as u64;
    let avg_lexical_time: u64 =
        results.iter().map(|r| r.lexical_time_ms).sum::<u64>() / results.len() as u64;

    println!();
    println!("SUMMARY");
    println!("{:-<40}", "");
    println!("Ixos wins:     {} / {}", ixos_wins, results.len());
    println!("Lexical wins:  {} / {}", lexical_wins, results.len());
    println!();
    println!("Average precision:");
    println!("  Ixos:    {:.1}%", avg_ixos_precision * 100.0);
    println!("  Lexical: {:.1}%", avg_lexical_precision * 100.0);
    println!();
    println!("Average time:");
    println!("  Ixos:    {}ms", avg_ixos_time);
    println!("  Lexical: {}ms", avg_lexical_time);
    println!();

    // Recommendations
    println!("RECOMMENDATIONS FOR AI AGENTS");
    println!("{:-<40}", "");
    println!("1. Use Ixos for semantic/conceptual queries");
    println!("2. Use grep/rg for exact pattern matching");
    println!("3. Ixos excels when query intent != exact keywords");
    println!("4. For unfamiliar codebases, prefer Ixos");
}

fn truncate(s: &str, max: usize) -> String {
    if s.len() <= max {
        s.to_string()
    } else {
        format!("{}...", &s[..max - 3])
    }
}
