//! Benchmarks for directory centroid boost (P6.3)
//!
//! Run with: cargo bench --bench directory_centroids_boost

use criterion::{criterion_group, criterion_main, BenchmarkId, Criterion, Throughput};
use ixos_protocol::ixos_rank::evidence::{CentroidConfig, DirectoryCentroids};
use std::path::PathBuf;

fn synthetic_embedding(seed: f32, dim: usize) -> Vec<f32> {
    (0..dim).map(|i| (i as f32 * seed).sin()).collect()
}

fn bench_directory_centroids_boost(c: &mut Criterion) {
    let mut group = c.benchmark_group("directory_centroids_boost");

    let dim = 64;
    let query_embedding = synthetic_embedding(0.7, dim);

    for size in [200usize, 500usize, 1000usize] {
        let mut centroids = DirectoryCentroids::new(CentroidConfig::default());
        let mut paths = Vec::with_capacity(size);
        let mut embeddings = Vec::with_capacity(size);

        for i in 0..size {
            let dir = PathBuf::from(format!("/project/dir{}", i % 50));
            paths.push(dir);
            embeddings.push(synthetic_embedding(i as f32 + 1.0, dim));
        }

        group.throughput(Throughput::Elements(size as u64));
        group.bench_with_input(BenchmarkId::new("update_and_score", size), &size, |b, _| {
            b.iter(|| {
                for (dir, emb) in paths.iter().zip(embeddings.iter()) {
                    centroids.update(dir, emb);
                }
                let mut total = 0.0;
                for dir in paths.iter() {
                    if let Some(sim) = centroids.similarity(dir, &query_embedding) {
                        total += sim;
                    }
                }
                total
            })
        });
    }

    group.finish();
}

criterion_group!(benches, bench_directory_centroids_boost);
criterion_main!(benches);
