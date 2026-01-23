//! Benchmarks for P2 candidate generation pipeline
//!
//! Run with: cargo bench --bench candidate_generation

use criterion::{criterion_group, criterion_main, BenchmarkId, Criterion, Throughput};
use std::path::PathBuf;
use tempfile::TempDir;

/// Create a synthetic test corpus with the specified number of files
fn create_test_corpus(num_files: usize) -> (TempDir, PathBuf) {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let root = temp_dir.path().to_path_buf();

    // Create directory structure
    let subdirs = ["documents", "reports", "projects", "archive"];
    for subdir in &subdirs {
        std::fs::create_dir_all(root.join(subdir)).ok();
    }

    // Create files
    for i in 0..num_files {
        let subdir = subdirs[i % subdirs.len()];
        let filename = format!("file_{:05}.txt", i);
        let path = root.join(subdir).join(&filename);
        let content = format!(
            "This is test file number {}.\nIt contains some sample content for benchmarking.\nKeywords: report, analysis, data, quarterly.",
            i
        );
        std::fs::write(&path, content).ok();
    }

    (temp_dir, root)
}

fn bench_path_index_build(c: &mut Criterion) {
    let mut group = c.benchmark_group("path_index_build");

    for size in [1000, 5000, 10000] {
        let (_temp, root) = create_test_corpus(size);

        group.throughput(Throughput::Elements(size as u64));
        group.bench_with_input(BenchmarkId::new("build", size), &root, |b, root| {
            b.iter(|| {
                // Build path index
                let mut paths = Vec::new();
                collect_paths_recursive(root, &mut paths);
                paths.len()
            })
        });
    }

    group.finish();
}

fn bench_path_scoring(c: &mut Criterion) {
    let mut group = c.benchmark_group("path_scoring");
    let (_temp, root) = create_test_corpus(10000);

    // Pre-build the path list
    let mut paths = Vec::new();
    collect_paths_recursive(&root, &mut paths);

    group.bench_function("score_10k_paths", |b| {
        b.iter(|| {
            // Simple scoring simulation
            let query = "quarterly report";
            let query_terms: Vec<&str> = query.split_whitespace().collect();
            let mut scores: Vec<(PathBuf, f32)> = paths
                .iter()
                .map(|p| {
                    let path_str = p.to_string_lossy().to_lowercase();
                    let score: f32 =
                        query_terms.iter().filter(|t| path_str.contains(*t)).count() as f32;
                    (p.clone(), score)
                })
                .collect();
            scores.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
            scores.truncate(1500); // Hard cap
            scores.len()
        })
    });

    group.finish();
}

fn collect_paths_recursive(dir: &std::path::Path, paths: &mut Vec<PathBuf>) {
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                collect_paths_recursive(&path, paths);
            } else if path.is_file() {
                paths.push(path);
            }
        }
    }
}

criterion_group!(benches, bench_path_index_build, bench_path_scoring);
criterion_main!(benches);
