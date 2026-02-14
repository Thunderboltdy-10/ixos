use std::path::Path;
use std::sync::Arc;

use ixos_protocol::ixos_rank::progressive::SearchMode as RankSearchMode;
use ixos_protocol::ixos_rank::CandidateLexicalEngine;
use ixos_protocol::{
    CacheMode, ProgressiveSearchConfig, ProgressiveSearchEngine, SearchEvent, SecureEmbedder,
    StubModel, StubSemanticEngine,
};
use tempfile::TempDir;
use tokio::sync::mpsc;
use tokio_util::sync::CancellationToken;

#[derive(Clone, Copy)]
struct Combo {
    cache_mode: CacheMode,
    search_mode: RankSearchMode,
    progressive: bool,
    secure_timing: bool,
    journalist_mode: bool,
}

fn all_combos() -> Vec<Combo> {
    let cache_modes = [CacheMode::NativeCache, CacheMode::Ephemeral];
    let search_modes = [
        RankSearchMode::Flash,
        RankSearchMode::Auto,
        RankSearchMode::Pro,
    ];
    let progressive_values = [false, true];
    let secure_timing_values = [false, true];
    let journalist_values = [false, true];

    let mut combos = Vec::new();
    for cache_mode in cache_modes {
        for search_mode in search_modes {
            for progressive in progressive_values {
                for secure_timing in secure_timing_values {
                    for journalist_mode in journalist_values {
                        combos.push(Combo {
                            cache_mode,
                            search_mode,
                            progressive,
                            secure_timing,
                            journalist_mode,
                        });
                    }
                }
            }
        }
    }
    combos
}

fn seed_corpus(root: &Path) {
    std::fs::create_dir_all(root.join("docs")).unwrap();
    std::fs::create_dir_all(root.join("src")).unwrap();
    std::fs::create_dir_all(root.join("config")).unwrap();
    std::fs::create_dir_all(root.join("logs")).unwrap();

    std::fs::write(
        root.join("docs").join("project_plan.md"),
        "Project plan for semantic search improvements and release-check automation.",
    )
    .unwrap();
    std::fs::write(
        root.join("src").join("search.rs"),
        "fn search(query: &str) { println!(\"search mode flash auto pro\"); }",
    )
    .unwrap();
    std::fs::write(
        root.join("config").join("settings.toml"),
        "cache_mode = \"native-cache\"\nsearch_mode = \"auto\"\n",
    )
    .unwrap();
    std::fs::write(
        root.join("logs").join("app.log"),
        "progressive search complete with semantic ranking and cached embeddings",
    )
    .unwrap();
}

fn make_embedder(secure_timing: bool) -> SecureEmbedder {
    let model = Arc::new(StubModel::new());
    if secure_timing {
        SecureEmbedder::new_secure(model)
    } else {
        SecureEmbedder::new_fast(model)
    }
}

#[tokio::test]
async fn settings_matrix_programmatic_contract() {
    let temp = TempDir::new().unwrap();
    seed_corpus(temp.path());

    for combo in all_combos() {
        let effective_cache_mode = if combo.journalist_mode {
            CacheMode::Ephemeral
        } else {
            combo.cache_mode
        };

        let lexical = CandidateLexicalEngine::new(temp.path().to_path_buf());
        let mut semantic = StubSemanticEngine::with_cache_mode(
            make_embedder(combo.secure_timing),
            effective_cache_mode,
        );
        semantic.index_directory(temp.path()).await.unwrap();

        let mut pro = StubSemanticEngine::with_cache_mode(
            make_embedder(combo.secure_timing),
            effective_cache_mode,
        );
        pro.index_directory(temp.path()).await.unwrap();

        let config = ProgressiveSearchConfig {
            max_results: 5,
            search_mode: combo.search_mode,
            enable_secure_ranking: false,
            min_score_threshold: 0.0,
            ..ProgressiveSearchConfig::fast()
        };

        let mut engine =
            ProgressiveSearchEngine::with_config_and_pro(lexical, semantic, Some(pro), config);

        if combo.progressive {
            let (tx, mut rx) = mpsc::channel(128);
            let cancel = CancellationToken::new();
            let mut saw_non_empty_batch = false;
            let search_task = tokio::spawn(async move {
                engine
                    .search_progressive("project plan".to_string(), tx, cancel)
                    .await
            });

            while let Some(event) = rx.recv().await {
                match event {
                    SearchEvent::LexicalResults(items) if !items.is_empty() => {
                        saw_non_empty_batch = true;
                    }
                    SearchEvent::LexicalBatch { results, .. } if !results.is_empty() => {
                        saw_non_empty_batch = true;
                    }
                    SearchEvent::SemanticResults(items) if !items.is_empty() => {
                        saw_non_empty_batch = true;
                    }
                    SearchEvent::Complete | SearchEvent::Cancelled => {
                        break;
                    }
                    SearchEvent::Error(message) => {
                        panic!(
                            "progressive search emitted error for combo cache={:?}, mode={:?}, secure_timing={}, journalist_mode={}: {}",
                            combo.cache_mode,
                            combo.search_mode,
                            combo.secure_timing,
                            combo.journalist_mode,
                            message
                        );
                    }
                    _ => {}
                }
            }
            search_task.await.unwrap().unwrap();

            assert!(
                saw_non_empty_batch,
                "progressive combo produced no results: cache={:?}, mode={:?}, secure_timing={}, journalist_mode={}",
                combo.cache_mode,
                combo.search_mode,
                combo.secure_timing,
                combo.journalist_mode
            );
        } else {
            let results = engine.search("project plan", 5).await.unwrap();
            assert!(
                !results.is_empty(),
                "non-progressive combo produced no results: cache={:?}, mode={:?}, secure_timing={}, journalist_mode={}",
                combo.cache_mode,
                combo.search_mode,
                combo.secure_timing,
                combo.journalist_mode
            );
        }
    }
}
