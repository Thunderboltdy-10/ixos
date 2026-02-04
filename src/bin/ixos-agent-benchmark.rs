//! Ixos vs Lexical Search Comparison Tool for AI Agents
//!
//! Run with: cargo run --release --bin ixos-agent-benchmark [search_dir]
//!
//! This tool compares Ixos semantic search against traditional lexical search
//! to help AI agents understand when to use each approach.

use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::Instant;

/// Test query for benchmarking
struct TestQuery {
    /// Natural language query
    query: &'static str,
    /// Regex pattern for lexical search
    lexical_pattern: &'static str,
    /// Expected concepts that should appear in relevant results
    expected_concepts: &'static [&'static str],
    /// Whether this is semantic-preferred or lexical-preferred
    #[allow(dead_code)]
    semantic_preferred: bool,
}

fn main() {
    let search_dir = std::env::args()
        .nth(1)
        .unwrap_or_else(|| "./src".to_string());

    println!("╔══════════════════════════════════════════════════════════════════════════════╗");
    println!("║           Ixos vs Lexical Search - AI Agent Benchmark                       ║");
    println!("╚══════════════════════════════════════════════════════════════════════════════╝");
    println!();
    println!("Search directory: {}", search_dir);
    println!();

    let test_queries = vec![
        // Semantic-preferred queries (natural language)
        TestQuery {
            query: "error handling and recovery patterns",
            lexical_pattern: "error|Error|handle|catch",
            expected_concepts: &["error", "result", "handle"],
            semantic_preferred: true,
        },
        TestQuery {
            query: "user privacy protection mechanisms",
            lexical_pattern: "privacy|gdpr|consent|secure",
            expected_concepts: &["privacy", "consent", "gdpr"],
            semantic_preferred: true,
        },
        TestQuery {
            query: "cryptographic signing and verification",
            lexical_pattern: "sign|hmac|verify|crypto",
            expected_concepts: &["hmac", "sign", "key"],
            semantic_preferred: true,
        },
        TestQuery {
            query: "how search results are ranked",
            lexical_pattern: "rank|score|sort",
            expected_concepts: &["rank", "score", "semantic"],
            semantic_preferred: true,
        },
        // Lexical-preferred queries (exact patterns)
        TestQuery {
            query: "EmbeddingCache",
            lexical_pattern: "EmbeddingCache",
            expected_concepts: &["embeddingcache"],
            semantic_preferred: false,
        },
        TestQuery {
            query: "fn search",
            lexical_pattern: "fn search",
            expected_concepts: &["fn search"],
            semantic_preferred: false,
        },
        // Hybrid queries (both viable)
        TestQuery {
            query: "file caching implementation",
            lexical_pattern: "cache|Cache",
            expected_concepts: &["cache"],
            semantic_preferred: true,
        },
        TestQuery {
            query: "timing attack protection",
            lexical_pattern: "timing|attack|secure",
            expected_concepts: &["timing", "secure"],
            semantic_preferred: true,
        },
    ];

    let mut ixos_wins = 0;
    let mut lexical_wins = 0;
    let mut total_ixos_precision = 0.0f64;
    let mut total_lexical_precision = 0.0f64;
    let mut total_ixos_time = 0u64;
    let mut total_lexical_time = 0u64;

    println!("┌─────────────────────────────────────────┬────────────┬────────────┬────────┐");
    println!("│ Query                                   │ Ixos       │ Lexical    │ Winner │");
    println!("├─────────────────────────────────────────┼────────────┼────────────┼────────┤");

    for test in &test_queries {
        // Run Ixos search
        let ixos_start = Instant::now();
        let ixos_results = run_ixos_search(&search_dir, test.query);
        let ixos_time = ixos_start.elapsed().as_millis() as u64;

        // Run lexical search
        let lexical_start = Instant::now();
        let lexical_results = run_lexical_search(&search_dir, test.lexical_pattern);
        let lexical_time = lexical_start.elapsed().as_millis() as u64;

        // Calculate relevance
        let ixos_relevant = count_relevant(&ixos_results, test.expected_concepts);
        let lexical_relevant = count_relevant(&lexical_results, test.expected_concepts);

        let ixos_precision = if !ixos_results.is_empty() {
            ixos_relevant as f64 / ixos_results.len() as f64
        } else {
            0.0
        };

        let lexical_precision = if !lexical_results.is_empty() {
            lexical_relevant as f64 / lexical_results.len() as f64
        } else {
            0.0
        };

        // Determine winner
        let winner = if ixos_relevant > lexical_relevant
            || (ixos_relevant == lexical_relevant && ixos_precision > lexical_precision)
        {
            ixos_wins += 1;
            "IXOS"
        } else if lexical_relevant > ixos_relevant {
            lexical_wins += 1;
            "LEX"
        } else {
            "TIE"
        };

        total_ixos_precision += ixos_precision;
        total_lexical_precision += lexical_precision;
        total_ixos_time += ixos_time;
        total_lexical_time += lexical_time;

        // Truncate query for display
        let display_query = if test.query.len() > 37 {
            format!("{}...", &test.query[..34])
        } else {
            test.query.to_string()
        };

        println!(
            "│ {:<39} │ {:>3}/{:<3} {:>3}ms │ {:>3}/{:<3} {:>3}ms │ {:>6} │",
            display_query,
            ixos_relevant,
            ixos_results.len(),
            ixos_time,
            lexical_relevant,
            lexical_results.len(),
            lexical_time,
            winner
        );
    }

    println!("└─────────────────────────────────────────┴────────────┴────────────┴────────┘");
    println!();

    // Summary
    let total = test_queries.len();
    let avg_ixos_precision = total_ixos_precision / total as f64;
    let avg_lexical_precision = total_lexical_precision / total as f64;
    let avg_ixos_time = total_ixos_time / total as u64;
    let avg_lexical_time = total_lexical_time / total as u64;

    println!("╔═══════════════════════════════════════════════════════════════════════════════╗");
    println!("║                                  SUMMARY                                      ║");
    println!("╠═══════════════════════════════════════════════════════════════════════════════╣");
    println!(
        "║  Ixos wins:        {:>2} / {}                                                    ║",
        ixos_wins, total
    );
    println!(
        "║  Lexical wins:     {:>2} / {}                                                    ║",
        lexical_wins, total
    );
    println!("║                                                                               ║");
    println!(
        "║  Avg Ixos precision:    {:>5.1}%                                                ║",
        avg_ixos_precision * 100.0
    );
    println!(
        "║  Avg Lexical precision: {:>5.1}%                                                ║",
        avg_lexical_precision * 100.0
    );
    println!("║                                                                               ║");
    println!(
        "║  Avg Ixos time:    {:>5}ms                                                     ║",
        avg_ixos_time
    );
    println!(
        "║  Avg Lexical time: {:>5}ms                                                     ║",
        avg_lexical_time
    );
    println!("╚═══════════════════════════════════════════════════════════════════════════════╝");
    println!();

    // Recommendations
    println!("RECOMMENDATIONS FOR AI AGENTS:");
    println!("─────────────────────────────────────────────────────────────────────────────────");
    println!("• Use IXOS for:");
    println!("  - Natural language queries (\"how does X work\", \"find Y patterns\")");
    println!("  - Conceptual searches (\"error handling\", \"authentication flow\")");
    println!("  - Exploring unfamiliar codebases");
    println!("  - Cross-cutting concerns that span multiple files");
    println!();
    println!("• Use GREP/RIPGREP for:");
    println!("  - Exact function/class names (\"fn process_payment\")");
    println!("  - Regex patterns (\"TODO:.*\")");
    println!("  - Import statements (\"use tokio::\")");
    println!("  - Quick literal searches");
    println!();
    println!("• Best strategy: Use Ixos for discovery, grep for precision");
}

fn run_ixos_search(dir: &str, query: &str) -> Vec<PathBuf> {
    // Try to run the Ixos CLI
    let ixos_path = if cfg!(windows) {
        "./target/release/ixos.exe"
    } else {
        "./target/release/ixos"
    };

    let output = Command::new(ixos_path)
        .args(["search", query, "--dir", dir, "--json", "--limit", "20"])
        .output();

    match output {
        Ok(out) if out.status.success() => {
            let stdout = String::from_utf8_lossy(&out.stdout);
            parse_ixos_json(&stdout)
        }
        Ok(out) => {
            let stderr = String::from_utf8_lossy(&out.stderr);
            if !stderr.is_empty() {
                eprintln!("Ixos warning: {}", stderr.lines().next().unwrap_or(""));
            }
            Vec::new()
        }
        Err(_) => {
            // Ixos binary not available
            Vec::new()
        }
    }
}

fn parse_ixos_json(json: &str) -> Vec<PathBuf> {
    let mut results = Vec::new();

    // Simple parsing
    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(json) {
        if let Some(items) = parsed.get("results").and_then(|r| r.as_array()) {
            for item in items {
                if let Some(path_str) = item.get("path").and_then(|p| p.as_str()) {
                    // Clean up Windows \\?\ prefix if present
                    let clean_path = path_str.trim_start_matches("\\\\?\\");
                    results.push(PathBuf::from(clean_path));
                }
            }
        }
    }

    results
}

fn run_lexical_search(dir: &str, pattern: &str) -> Vec<PathBuf> {
    let mut results = Vec::new();
    let patterns: Vec<&str> = pattern.split('|').collect();

    fn walk(dir: &Path, patterns: &[&str], results: &mut Vec<PathBuf>) {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() && !path.ends_with("target") {
                    walk(&path, patterns, results);
                } else if path.is_file() && path.extension().map_or(false, |e| e == "rs") {
                    if let Ok(content) = std::fs::read_to_string(&path) {
                        let content_lower = content.to_lowercase();
                        if patterns
                            .iter()
                            .any(|p| content_lower.contains(&p.to_lowercase()))
                        {
                            results.push(path);
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

fn count_relevant(results: &[PathBuf], expected_concepts: &[&str]) -> usize {
    results
        .iter()
        .filter(|path| {
            if let Ok(content) = std::fs::read_to_string(path) {
                let content_lower = content.to_lowercase();
                // A result is relevant if it contains at least 1 expected concept
                expected_concepts
                    .iter()
                    .any(|c| content_lower.contains(&c.to_lowercase()))
            } else {
                false
            }
        })
        .count()
}
