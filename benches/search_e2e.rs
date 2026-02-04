//! End-to-end search benchmarks comparing Lexical, Semantic, and Hybrid modes
//!
//! Run with: cargo bench --bench search_e2e
//!
//! These benchmarks compare search approaches for AI agent use cases:
//! - Lexical-only (ripgrep-style keyword matching)
//! - Semantic-only (embedding similarity)
//! - Hybrid (combined with secure ranking)

use criterion::{criterion_group, criterion_main, BenchmarkId, Criterion, Throughput};
use std::path::PathBuf;
use tempfile::TempDir;

/// Test corpus that simulates realistic code search scenarios
struct TestCorpus {
    _temp_dir: TempDir,
    root: PathBuf,
    file_count: usize,
}

impl TestCorpus {
    /// Create a test corpus with code-like files
    fn new(num_files: usize) -> Self {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let root = temp_dir.path().to_path_buf();

        // Create realistic directory structure
        let subdirs = [
            "src",
            "src/handlers",
            "src/utils",
            "src/models",
            "tests",
            "docs",
        ];
        for subdir in &subdirs {
            std::fs::create_dir_all(root.join(subdir)).ok();
        }

        // Create files with varied content (simulating real code)
        let content_templates = [
            // Error handling file
            r#"//! Error handling utilities
pub enum AppError {
    NotFound(String),
    InvalidInput(String),
    DatabaseError(String),
}

impl std::error::Error for AppError {}

pub fn handle_error(err: AppError) -> Response {
    match err {
        AppError::NotFound(msg) => Response::not_found(&msg),
        AppError::InvalidInput(msg) => Response::bad_request(&msg),
        AppError::DatabaseError(msg) => Response::server_error(&msg),
    }
}
"#,
            // Authentication file
            r#"//! User authentication and authorization
use jwt::{Token, verify_signature};

pub struct AuthService {
    secret_key: Vec<u8>,
}

impl AuthService {
    pub fn verify_token(&self, token: &str) -> Result<Claims, AuthError> {
        let decoded = Token::decode(token, &self.secret_key)?;
        verify_signature(&decoded)?;
        Ok(decoded.claims)
    }

    pub fn login(&self, username: &str, password: &str) -> Result<String, AuthError> {
        // Validate credentials and return JWT
        unimplemented!()
    }
}
"#,
            // Database file
            r#"//! Database connection and query utilities
use sqlx::{Pool, Postgres};

pub struct Database {
    pool: Pool<Postgres>,
}

impl Database {
    pub async fn query_users(&self) -> Vec<User> {
        sqlx::query_as("SELECT * FROM users")
            .fetch_all(&self.pool)
            .await
            .unwrap_or_default()
    }

    pub async fn insert_record(&self, data: &Record) -> Result<i64, DbError> {
        sqlx::query("INSERT INTO records VALUES ($1, $2)")
            .bind(&data.name)
            .bind(&data.value)
            .execute(&self.pool)
            .await
            .map(|r| r.last_insert_id())
    }
}
"#,
            // Validation file
            r#"//! Input validation and sanitization
pub struct Validator;

impl Validator {
    pub fn validate_email(email: &str) -> bool {
        email.contains('@') && email.contains('.')
    }

    pub fn sanitize_input(input: &str) -> String {
        input.replace('<', "&lt;").replace('>', "&gt;")
    }

    pub fn check_password_strength(password: &str) -> PasswordStrength {
        if password.len() < 8 {
            PasswordStrength::Weak
        } else if password.len() < 12 {
            PasswordStrength::Medium
        } else {
            PasswordStrength::Strong
        }
    }
}
"#,
            // Logging file
            r#"//! Logging and monitoring utilities
use tracing::{info, warn, error, span};

pub struct Logger;

impl Logger {
    pub fn log_request(method: &str, path: &str, status: u16) {
        info!(method, path, status, "HTTP request");
    }

    pub fn log_error(err: &dyn std::error::Error) {
        error!(error = %err, "Operation failed");
    }

    pub fn create_span(name: &str) -> tracing::Span {
        span!(tracing::Level::INFO, "operation", name)
    }
}
"#,
        ];

        for i in 0..num_files {
            let subdir = subdirs[i % subdirs.len()];
            let content = content_templates[i % content_templates.len()];
            let filename = format!("module_{:05}.rs", i);
            let path = root.join(subdir).join(&filename);
            std::fs::write(&path, content).ok();
        }

        TestCorpus {
            _temp_dir: temp_dir,
            root,
            file_count: num_files,
        }
    }
}

/// Simulate lexical search (keyword matching like ripgrep)
fn lexical_search(root: &PathBuf, query: &str) -> Vec<(PathBuf, f32)> {
    let query_terms: Vec<&str> = query.split_whitespace().collect();
    let mut results = Vec::new();

    fn walk(dir: &std::path::Path, query_terms: &[&str], results: &mut Vec<(PathBuf, f32)>) {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    walk(&path, query_terms, results);
                } else if path.is_file() {
                    if let Ok(content) = std::fs::read_to_string(&path) {
                        let content_lower = content.to_lowercase();
                        let matches: usize = query_terms
                            .iter()
                            .filter(|t| content_lower.contains(&t.to_lowercase()))
                            .count();
                        if matches > 0 {
                            let score = matches as f32 / query_terms.len() as f32;
                            results.push((path, score));
                        }
                    }
                }
            }
        }
    }

    walk(root, &query_terms, &mut results);
    results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
    results.truncate(20);
    results
}

/// Simulate semantic search (embedding-based)
fn semantic_search(root: &PathBuf, query: &str) -> Vec<(PathBuf, f32)> {
    // Simulated semantic understanding - in real implementation this uses embeddings
    let semantic_concepts: Vec<(&str, Vec<&str>)> = vec![
        (
            "error",
            vec!["error", "exception", "handle", "fail", "result", "unwrap"],
        ),
        (
            "authentication",
            vec!["auth", "login", "token", "jwt", "verify", "credential"],
        ),
        (
            "database",
            vec!["query", "sql", "pool", "insert", "fetch", "database"],
        ),
        (
            "validation",
            vec![
                "validate", "sanitize", "check", "input", "password", "email",
            ],
        ),
        (
            "logging",
            vec!["log", "trace", "info", "warn", "error", "span"],
        ),
    ];

    let query_lower = query.to_lowercase();
    let mut results = Vec::new();

    fn walk_semantic(
        dir: &std::path::Path,
        query: &str,
        concepts: &[(&str, Vec<&str>)],
        results: &mut Vec<(PathBuf, f32)>,
    ) {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    walk_semantic(&path, query, concepts, results);
                } else if path.is_file() {
                    if let Ok(content) = std::fs::read_to_string(&path) {
                        let content_lower = content.to_lowercase();

                        // Find which concepts match the query
                        let mut total_score = 0.0f32;
                        for (concept, related) in concepts {
                            let query_relevance = if query.contains(concept) {
                                1.0
                            } else {
                                related.iter().filter(|r| query.contains(*r)).count() as f32 * 0.3
                            };

                            if query_relevance > 0.0 {
                                // Check how well file matches concept
                                let file_matches = related
                                    .iter()
                                    .filter(|r| content_lower.contains(*r))
                                    .count()
                                    as f32;
                                total_score += query_relevance * file_matches * 0.1;
                            }
                        }

                        if total_score > 0.0 {
                            results.push((path, total_score.min(1.0)));
                        }
                    }
                }
            }
        }
    }

    walk_semantic(root, &query_lower, &semantic_concepts, &mut results);
    results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
    results.truncate(20);
    results
}

/// Simulate hybrid search (lexical + semantic with secure ranking)
fn hybrid_search(root: &PathBuf, query: &str) -> Vec<(PathBuf, f32)> {
    let lexical = lexical_search(root, query);
    let semantic = semantic_search(root, query);

    // Merge results with weighted scoring
    let mut merged: std::collections::HashMap<PathBuf, f32> = std::collections::HashMap::new();

    for (path, score) in lexical {
        *merged.entry(path).or_insert(0.0) += score * 0.3; // Lexical weight
    }

    for (path, score) in semantic {
        *merged.entry(path).or_insert(0.0) += score * 0.7; // Semantic weight
    }

    let mut results: Vec<_> = merged.into_iter().collect();
    results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
    results.truncate(20);
    results
}

fn bench_lexical_search(c: &mut Criterion) {
    let mut group = c.benchmark_group("lexical_search");

    for size in [100, 500, 1000] {
        let corpus = TestCorpus::new(size);
        group.throughput(Throughput::Elements(size as u64));

        // Test queries that benefit from lexical search
        let queries = [
            "error handling",
            "validate input",
            "database query",
            "authentication token",
        ];

        for query in queries {
            group.bench_with_input(
                BenchmarkId::new(format!("files_{}", size), query),
                &(&corpus.root, query),
                |b, (root, query)| {
                    b.iter(|| lexical_search(root, query));
                },
            );
        }
    }

    group.finish();
}

fn bench_semantic_search(c: &mut Criterion) {
    let mut group = c.benchmark_group("semantic_search");

    for size in [100, 500, 1000] {
        let corpus = TestCorpus::new(size);
        group.throughput(Throughput::Elements(size as u64));

        // Test queries that benefit from semantic search (natural language)
        let queries = [
            "how are errors handled",
            "user login flow",
            "data storage",
            "input security",
        ];

        for query in queries {
            group.bench_with_input(
                BenchmarkId::new(format!("files_{}", size), query),
                &(&corpus.root, query),
                |b, (root, query)| {
                    b.iter(|| semantic_search(root, query));
                },
            );
        }
    }

    group.finish();
}

fn bench_hybrid_search(c: &mut Criterion) {
    let mut group = c.benchmark_group("hybrid_search");

    for size in [100, 500, 1000] {
        let corpus = TestCorpus::new(size);
        group.throughput(Throughput::Elements(size as u64));

        // Mixed queries (some benefit from both approaches)
        let queries = [
            "error handling patterns",
            "authentication and authorization",
            "database connection",
            "validate user input",
        ];

        for query in queries {
            group.bench_with_input(
                BenchmarkId::new(format!("files_{}", size), query),
                &(&corpus.root, query),
                |b, (root, query)| {
                    b.iter(|| hybrid_search(root, query));
                },
            );
        }
    }

    group.finish();
}

/// Benchmark comparing search effectiveness (quality, not just speed)
fn bench_search_effectiveness(c: &mut Criterion) {
    let mut group = c.benchmark_group("search_effectiveness");
    let corpus = TestCorpus::new(500);

    // Queries where semantic should beat lexical
    let semantic_preferred_queries = [
        ("find user login code", "authentication"), // No exact "login" in file
        ("where are exceptions caught", "error"),   // Semantic: exceptions ≈ errors
        ("data persistence layer", "database"),     // Semantic: persistence ≈ database
        ("sanitize untrusted input", "validation"), // Semantic understanding
    ];

    group.bench_function("semantic_vs_lexical_quality", |b| {
        b.iter(|| {
            let mut semantic_wins = 0;
            let mut lexical_wins = 0;

            for (query, expected_concept) in &semantic_preferred_queries {
                let lexical_results = lexical_search(&corpus.root, query);
                let semantic_results = semantic_search(&corpus.root, query);

                // Count how many results contain the expected concept
                let lexical_hits = lexical_results
                    .iter()
                    .filter(|(p, _)| {
                        std::fs::read_to_string(p)
                            .map(|c| c.to_lowercase().contains(expected_concept))
                            .unwrap_or(false)
                    })
                    .count();

                let semantic_hits = semantic_results
                    .iter()
                    .filter(|(p, _)| {
                        std::fs::read_to_string(p)
                            .map(|c| c.to_lowercase().contains(expected_concept))
                            .unwrap_or(false)
                    })
                    .count();

                if semantic_hits > lexical_hits {
                    semantic_wins += 1;
                } else if lexical_hits > semantic_hits {
                    lexical_wins += 1;
                }
            }

            (semantic_wins, lexical_wins)
        });
    });

    group.finish();
}

criterion_group!(
    benches,
    bench_lexical_search,
    bench_semantic_search,
    bench_hybrid_search,
    bench_search_effectiveness
);
criterion_main!(benches);
