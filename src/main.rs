//! Ixos CLI - Privacy-first semantic file search
//!
//! A command-line interface for semantic file search with:
//! - Progressive search results (lexical then semantic)
//! - Multiple output formats (human, JSON, CSV, ripgrep)
//! - Configuration file support
//! - Privacy compliance (GDPR, CCPA)

use std::io::{stdout, Write};
use std::path::{Path, PathBuf};

use clap::Parser;
use tokio::sync::mpsc;
use tokio_util::sync::CancellationToken;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use ixos_protocol::cli::{
    create_formatter_with_options, CacheCommands, CcpaCommands, Cli, CliFlashModelType,
    CliProModelType, CliSearchMode, Commands, ComplianceCommands, GdprCommands, IxosConfig,
    ModelCommands, OutputFormat,
};
use ixos_protocol::compliance::{ComplianceManager, DeletionScope};
use ixos_protocol::ixos_embed::ModelType;
use ixos_protocol::ixos_rank::{
    CandidateLexicalEngine, IntentDetector, ProgressiveSearchConfig, ProgressiveSearchEngine,
    SearchEvent, StubSemanticEngine,
};
use ixos_protocol::telemetry::{install_crash_handler, TelemetryConfig};

// =============================================================================
// Main Entry Point
// =============================================================================

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();
    let config_path_override = cli.config.clone();

    // Initialize logging based on verbosity
    // Default to quiet (error-only) unless --verbose is specified
    let filter = if cli.verbose {
        "debug"
    } else {
        // Quiet by default - only show errors unless explicitly verbose
        "error"
    };

    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer().with_writer(std::io::stderr))
        .with(tracing_subscriber::EnvFilter::new(filter))
        .init();

    // Load configuration
    let config = match &cli.config {
        Some(path) => IxosConfig::load_from(path.clone()),
        None => IxosConfig::load(),
    };

    install_crash_handler(
        TelemetryConfig {
            crash_opt_in: config.security.telemetry_opt_in,
        },
        "cli",
    );

    // Dispatch to command handlers
    match cli.command {
        Commands::Search {
            query,
            limit,
            format,
            dir,
            json,
            progressive,
            show_scores,
            sandbox,
            min_score,
            no_secure_ranking,
            cache_mode,
            stub_model,
            search_mode,
            model,
            pro_model,
            secure_timing,
            context,
            deep_search,
            evidence,
        } => {
            handle_search(
                &query,
                limit,
                format.into(),
                dir,
                json,
                progressive || config.search.progressive_by_default,
                show_scores || config.output.show_scores,
                sandbox,
                min_score,
                !no_secure_ranking && config.search.enable_secure_ranking,
                cache_mode.map(Into::into),
                stub_model || config.search.use_stub_model,
                search_mode,
                model,
                pro_model,
                secure_timing || config.search.secure_timing,
                context,
                deep_search,
                evidence,
                &config,
            )
            .await?;
        }

        Commands::Index {
            dirs,
            use_xattr,
            progress,
            clear,
        } => {
            handle_index(dirs, use_xattr, progress, clear).await?;
        }

        Commands::Config {
            get,
            set,
            list,
            reset,
            path,
        } => {
            handle_config(get, set, list, reset, path, config_path_override.clone())?;
        }

        Commands::Daemon {
            foreground,
            stop,
            status,
        } => {
            handle_daemon(foreground, stop, status)?;
        }

        Commands::Cache { action } => {
            handle_cache(action, config_path_override.clone()).await?;
        }

        Commands::Compliance { action } => {
            handle_compliance(action)?;
        }

        Commands::Doctor { json, verbose } => {
            handle_doctor(json, verbose).await?;
        }

        Commands::Version { verbose } => {
            handle_version(verbose);
        }

        Commands::ReleaseCheck { quick } => {
            handle_release_check(quick).await?;
        }

        Commands::Model { action } => {
            handle_model(action).await?;
        }

        Commands::Update { check, yes, version } => {
            ixos_protocol::cli::self_update::run_update(check, yes, version)?;
        }
    }

    Ok(())
}

// =============================================================================
// Search Handler
// =============================================================================

fn resolve_flash_model_type(raw: &str) -> ModelType {
    raw.parse::<ModelType>().unwrap_or(ModelType::IxosFlashV2)
}

fn resolve_pro_model_type(raw: &str) -> ModelType {
    let normalized = raw.trim().to_lowercase();
    match normalized.as_str() {
        "ixos-pro-v2" | "pro-v2" | "pro" => ModelType::IxosProV2,
        "potion" | "potion-base-8m-int8" => ModelType::Potion,
        _ => raw.parse::<ModelType>().unwrap_or(ModelType::IxosProV2),
    }
}

fn parse_runtime_cache_mode(raw: &str) -> anyhow::Result<ixos_protocol::CacheMode> {
    match raw.trim().to_lowercase().as_str() {
        "native-cache" | "local" => Ok(ixos_protocol::CacheMode::NativeCache),
        "ephemeral" | "memory" => Ok(ixos_protocol::CacheMode::Ephemeral),
        invalid => Err(anyhow::anyhow!(
            "Invalid cache mode '{invalid}'. Use local/native-cache or memory/ephemeral."
        )),
    }
}

async fn handle_search(
    query: &str,
    limit: usize,
    format: OutputFormat,
    dir: Option<PathBuf>,
    json: bool,
    progressive: bool,
    show_scores: bool,
    sandbox: Option<PathBuf>,
    min_score: Option<f32>,
    secure_ranking: bool,
    cache_mode: Option<ixos_protocol::CacheMode>,
    stub_model: bool,
    search_mode: Option<CliSearchMode>,
    model: Option<CliFlashModelType>,
    pro_model: Option<CliProModelType>,
    secure_timing: bool,
    context_lines: usize,
    deep_search: bool,
    include_evidence: bool,
    config: &IxosConfig,
) -> anyhow::Result<()> {
    // Initialize deep search mode if enabled.
    let mut deep_search_tracker = if deep_search {
        let mut tracker = ixos_protocol::journalist_mode::JournalistMode::new();
        tracker.enable();
        if format == OutputFormat::Human && !json {
            println!("\x1b[1;33mDeep Search Mode Active\x1b[0m");
            println!("\x1b[90m  - More files, deeper reads, and cross-reference extraction\x1b[0m");
            println!("\x1b[90m  - Slower but more comprehensive coverage\x1b[0m");
            println!();
        }
        Some(tracker)
    } else {
        None
    };

    // Cache mode remains independent from Deep Search.
    let configured_cache_mode = parse_runtime_cache_mode(&config.search.cache_mode)?;
    let effective_cache_mode = cache_mode.unwrap_or(configured_cache_mode);

    // Check consent before AI operations
    let compliance = ComplianceManager::new()?;
    match compliance.ensure_consent_cli() {
        Ok(()) => {}
        Err(ixos_protocol::ComplianceError::ConsentRequired) => {
            println!("Search cancelled - consent required for AI-powered search.");
            println!("Grant consent with: ixos compliance consent --grant");
            return Ok(());
        }
        Err(e) => {
            return Err(anyhow::anyhow!("Compliance error: {}", e));
        }
    }

    // Determine output format
    let output_format = if json { OutputFormat::Json } else { format };
    let use_color = config.output.color && output_format == OutputFormat::Human;
    let formatter = create_formatter_with_options(output_format, use_color, include_evidence);
    let mut stdout = stdout();

    // Determine search directory
    let raw_search_dir = dir
        .or_else(|| config.search.default_directory.clone())
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")));
    let search_dir = std::fs::canonicalize(&raw_search_dir).unwrap_or(raw_search_dir);

    // Enforce sandbox if provided
    if let Some(sandbox_dir) = sandbox {
        if !sandbox_dir.exists() {
            formatter.format_error(
                &format!("Sandbox directory not found: {}", sandbox_dir.display()),
                &mut stdout,
            )?;
            return Ok(());
        }
        let sandbox_config =
            ixos_protocol::security::sandbox::SandboxConfig::with_directories(
                [sandbox_dir.clone()],
            );
        let sandbox = ixos_protocol::security::sandbox::Sandbox::new(sandbox_config)
            .map_err(|e| anyhow::anyhow!("{}", e))?;
        if let Err(e) = sandbox.validate_path(&search_dir) {
            formatter.format_error(
                &format!("Search directory outside sandbox: {}", e),
                &mut stdout,
            )?;
            return Ok(());
        }
    }

    if !search_dir.exists() {
        formatter.format_error(
            &format!("Search directory not found: {}", search_dir.display()),
            &mut stdout,
        )?;
        return Ok(());
    }

    // Resolve model and mode selection (CLI override > config)
    let resolved_search_mode = match search_mode {
        Some(mode) => match mode {
            CliSearchMode::Flash => ixos_protocol::ixos_rank::progressive::SearchMode::Flash,
            CliSearchMode::Pro => ixos_protocol::ixos_rank::progressive::SearchMode::Pro,
            CliSearchMode::Auto => ixos_protocol::ixos_rank::progressive::SearchMode::Auto,
        },
        None => match config.search.search_mode.as_str() {
            "flash" => ixos_protocol::ixos_rank::progressive::SearchMode::Flash,
            "pro" => ixos_protocol::ixos_rank::progressive::SearchMode::Pro,
            _ => ixos_protocol::ixos_rank::progressive::SearchMode::Auto,
        },
    };

    let model_type = model
        .map(ModelType::from)
        .unwrap_or_else(|| resolve_flash_model_type(&config.search.model_type));

    let pro_model_type = pro_model
        .map(ModelType::from)
        .unwrap_or_else(|| resolve_pro_model_type(&config.search.pro_model_type));
    let ask_mode_auto_intent = IntentDetector::new().should_activate_ask_mode(query);

    // Create search engines
    // P2: Use CandidateLexicalEngine to enforce hard caps and fast funneling
    let lexical = CandidateLexicalEngine::new(search_dir.clone());

    // Create semantic engine based on stub_model flag and cache_mode
    let mut semantic = if stub_model {
        StubSemanticEngine::with_stub_model_and_mode(effective_cache_mode)
    } else {
        // Use MmapModel2VecEmbedder for real semantic search with near-zero startup time
        // P1.1: Memory-mapped model loading for instant "load" (actual loading is lazy)
        use ixos_protocol::ixos_embed::MmapModel2VecEmbedder;
        use ixos_protocol::SecureEmbedder;
        use std::sync::Arc;

        // P1.3: Use the selected model type
        tracing::info!(
            "Using embedding model: {} ({})",
            model_type.display_name(),
            model_type.description()
        );
        let model_result = MmapModel2VecEmbedder::new_with_type(model_type);

        match model_result {
            Ok(model) => {
                // Check cache status for user feedback
                let status = model.cache_status();
                if !status.is_cached {
                    tracing::info!("Model not cached locally, will download on first use");
                }

                // Create embedder based on secure_timing flag
                let embedder = if secure_timing {
                    tracing::info!("Secure timing mode enabled (100ms floor)");
                    SecureEmbedder::new_secure(Arc::new(model))
                } else {
                    SecureEmbedder::new_fast(Arc::new(model))
                };
                StubSemanticEngine::with_cache_mode(embedder, effective_cache_mode)
            }
            Err(e) => {
                tracing::warn!(
                    "Failed to create model ({}), falling back to stub model: {}",
                    model_type,
                    e
                );
                StubSemanticEngine::with_stub_model_and_mode(effective_cache_mode)
            }
        }
    };

    let mut pro_engine: Option<StubSemanticEngine> = None;
    let should_load_pro_engine = matches!(
        resolved_search_mode,
        ixos_protocol::ixos_rank::progressive::SearchMode::Pro
    ) || (matches!(
        resolved_search_mode,
        ixos_protocol::ixos_rank::progressive::SearchMode::Auto
    ) && !ask_mode_auto_intent);
    if should_load_pro_engine {
        pro_engine = if stub_model {
            Some(StubSemanticEngine::with_stub_model_and_mode(
                effective_cache_mode,
            ))
        } else {
            use ixos_protocol::ixos_embed::MmapModel2VecEmbedder;
            use ixos_protocol::SecureEmbedder;
            use std::sync::Arc;

            tracing::info!(
                "Using pro embedding model: {} ({})",
                pro_model_type.display_name(),
                pro_model_type.description()
            );
            let model_result = MmapModel2VecEmbedder::new_with_type(pro_model_type);
            match model_result {
                Ok(model) => {
                    let embedder = if secure_timing {
                        tracing::info!("Secure timing mode enabled (100ms floor)");
                        SecureEmbedder::new_secure(Arc::new(model))
                    } else {
                        SecureEmbedder::new_fast(Arc::new(model))
                    };
                    Some(StubSemanticEngine::with_cache_mode(
                        embedder,
                        effective_cache_mode,
                    ))
                }
                Err(e) => {
                    tracing::warn!("Failed to create pro model ({}): {}", pro_model_type, e);
                    None
                }
            }
        };
    }

    if let Err(e) = semantic.index_directory(&search_dir).await {
        tracing::warn!("Failed to index for semantic search: {}", e);
    }
    if let Some(engine) = pro_engine.as_mut() {
        // Auto mode reranks top-K lexical candidates and does not require a full
        // pro index upfront. Eager indexing here made Auto pay near-Pro startup cost.
        if matches!(
            resolved_search_mode,
            ixos_protocol::ixos_rank::progressive::SearchMode::Pro
        ) {
            if let Err(e) = engine.index_directory(&search_dir).await {
                tracing::warn!("Failed to index for pro search: {}", e);
            }
        } else {
            tracing::debug!("Skipping eager pro index in Auto mode");
        }
    }

    // Determine secure timing (used in future for timing-based attack detection)
    let _enable_secure_timing = secure_timing || config.search.secure_timing;

    // Determine threshold (CLI override > Config)
    let threshold = min_score.unwrap_or(config.search.min_score_threshold);

    // Set threshold on semantic engine
    semantic.set_min_score_threshold(threshold);
    if let Some(engine) = pro_engine.as_mut() {
        engine.set_min_score_threshold(threshold);
    }

    // Create progressive search engine
    let search_config = ProgressiveSearchConfig {
        max_results: limit,
        enable_secure_ranking: secure_ranking,
        context_lines,
        min_score_threshold: threshold,
        search_mode: resolved_search_mode,
        ..ProgressiveSearchConfig::default()
    };

    let mut engine =
        ProgressiveSearchEngine::with_config_and_pro(lexical, semantic, pro_engine, search_config);
    engine
        .secure_ranker_mut()
        .config_mut()
        .personal_ranking_enabled = config.search.personal_ranking_enabled;

    let start_time = std::time::Instant::now();

    if progressive {
        // Progressive mode with streaming
        let (tx, mut rx) = mpsc::channel(10);
        let cancel = CancellationToken::new();

        let query_clone = query.to_string();
        let search_handle =
            tokio::spawn(async move { engine.search_progressive(query_clone, tx, cancel).await });

        while let Some(event) = rx.recv().await {
            match event {
                SearchEvent::LexicalResults(results) => {
                    formatter.format_lexical_results(&results, &mut stdout)?;
                    stdout.flush()?;
                }
                SearchEvent::LexicalBatch {
                    results,
                    batch_number: _,
                    is_final: _,
                } => {
                    // P2.1: Batched lexical results - treat like regular lexical results
                    formatter.format_lexical_results(&results, &mut stdout)?;
                    stdout.flush()?;
                }
                SearchEvent::Status(msg) => {
                    formatter.format_status(&msg, &mut stdout)?;
                    stdout.flush()?;
                }
                SearchEvent::SemanticResults(results) => {
                    formatter.format_semantic_results(&results, show_scores, &mut stdout)?;
                }
                SearchEvent::LateResult {
                    result,
                    discovery_time_ms: _,
                } => {
                    // P2.1: Late result - format as a single semantic result
                    formatter.format_semantic_results(&vec![result], show_scores, &mut stdout)?;
                }
                SearchEvent::Complete => {
                    formatter.format_complete(&mut stdout)?;
                }
                SearchEvent::Cancelled => {
                    formatter.format_status("Search cancelled", &mut stdout)?;
                }
                SearchEvent::Error(e) => {
                    formatter.format_error(&e, &mut stdout)?;
                }
                SearchEvent::StreamUpdate { .. } => {
                    // Stream updates are for UI/animation; ignore in CLI.
                }
            }
        }

        search_handle.await??;
    } else {
        // Simple blocking mode
        let results = engine.search(query, limit).await?;
        formatter.format_semantic_results(&results, show_scores, &mut stdout)?;
    }

    let duration_ms = start_time.elapsed().as_millis() as u64;

    // Record the search in history
    let _ = compliance.record_search(
        query,
        0, // Would be actual result count
        duration_ms,
        ixos_protocol::SearchMode::Hybrid,
    );

    // Emit deep-search summary if enabled.
    if let Some(ref mut tracker) = deep_search_tracker {
        tracker.record_search();
        if format == OutputFormat::Human && !json {
            println!("\x1b[90m{}\x1b[0m", tracker.summary_line());
        }
    }

    Ok(())
}

// =============================================================================
// Index Handler
// =============================================================================

async fn handle_index(
    dirs: Vec<PathBuf>,
    use_xattr: bool,
    progress: bool,
    clear: bool,
) -> anyhow::Result<()> {
    if dirs.is_empty() {
        println!("No directories specified. Usage: ixos index <directory> [--use-xattr]");
        return Ok(());
    }

    println!("Indexing {} directories...", dirs.len());
    for raw_dir in dirs {
        let dir = std::fs::canonicalize(&raw_dir).unwrap_or(raw_dir);
        if progress {
            print!("  {} ... ", dir.display());
            std::io::stdout().flush()?;
        }

        // Check if directory exists
        if !dir.exists() {
            if progress {
                println!("NOT FOUND");
            } else {
                println!("  - {} (not found)", dir.display());
            }
            continue;
        }

        if clear {
            let cleared = clear_embedding_cache_for_directory(&dir);
            if progress {
                println!("  Cleared {} cached embeddings", cleared);
            } else {
                println!(
                    "  - {} (cleared {} cached embeddings)",
                    dir.display(),
                    cleared
                );
            }
        }

        // Index the directory
        let cache_mode = if use_xattr {
            ixos_protocol::ixos_rank::semantic_engine::CacheMode::NativeCache
        } else {
            ixos_protocol::ixos_rank::semantic_engine::CacheMode::Ephemeral
        };

        let mut semantic = StubSemanticEngine::with_stub_model_and_mode(cache_mode);
        match semantic.index_directory(&dir).await {
            Ok(count) => {
                if progress {
                    println!("{} files", count);
                } else {
                    println!("  - {} ({} files indexed)", dir.display(), count);
                }
            }
            Err(e) => {
                if progress {
                    println!("ERROR: {}", e);
                } else {
                    println!("  - {} (error: {})", dir.display(), e);
                }
            }
        }
    }

    if use_xattr {
        println!("Using xattr/ADS caching: enabled");
    }

    println!("Indexing complete.");
    Ok(())
}

fn clear_embedding_cache_for_directory(dir: &Path) -> usize {
    use ixos_protocol::storage::get_cache_for_path;

    let mut cleared = 0usize;
    for entry in walkdir::WalkDir::new(dir)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
    {
        let candidate_path =
            std::fs::canonicalize(entry.path()).unwrap_or_else(|_| entry.into_path());
        let cache = get_cache_for_path(&candidate_path);
        if cache.delete(&candidate_path).is_ok() {
            cleared += 1;
        }
    }
    cleared += clear_lmdb_sidecar_cache();
    cleared
}

fn clear_lmdb_sidecar_cache() -> usize {
    let lmdb = match ixos_protocol::storage::sidecar_lmdb::LmdbSidecarCache::new() {
        Ok(lmdb) => lmdb,
        Err(_) => return 0,
    };

    let before = lmdb.stats().map(|s| s.entry_count).unwrap_or(0);
    if lmdb.clear().is_ok() {
        before
    } else {
        0
    }
}

fn active_flash_model_fingerprint(config_path_override: Option<PathBuf>) -> [u8; 32] {
    use ixos_protocol::ixos_embed::MmapModel2VecEmbedder;
    use ixos_protocol::EmbeddingModel;

    let config = match config_path_override {
        Some(path) => IxosConfig::load_from(path),
        None => IxosConfig::load(),
    };
    let model_type = resolve_flash_model_type(&config.search.model_type);
    MmapModel2VecEmbedder::new_with_type(model_type)
        .map(|model| model.fingerprint())
        .unwrap_or(ixos_protocol::storage::DEFAULT_MODEL_FINGERPRINT)
}

// =============================================================================
// Config Handler
// =============================================================================

fn handle_config(
    get: Option<String>,
    set: Option<String>,
    list: bool,
    reset: bool,
    path: bool,
    config_path_override: Option<PathBuf>,
) -> anyhow::Result<()> {
    let config_path = config_path_override.unwrap_or_else(IxosConfig::default_path);

    if path {
        println!("{}", config_path.display());
        return Ok(());
    }

    if reset {
        let default_cfg = IxosConfig::default();
        default_cfg.save_to(config_path.clone())?;
        println!("Configuration reset to defaults.");
        println!("Saved to: {}", config_path.display());
        return Ok(());
    }

    let mut config = IxosConfig::load_from(config_path.clone());

    if let Some(key) = get {
        match config.get(&key) {
            Some(value) => println!("{}", value),
            None => {
                eprintln!("Unknown configuration key: {}", key);
                std::process::exit(1);
            }
        }
        return Ok(());
    }

    if let Some(kv) = set {
        let parts: Vec<&str> = kv.splitn(2, '=').collect();
        if parts.len() != 2 {
            eprintln!("Invalid format. Use: --set key=value");
            std::process::exit(1);
        }

        let key = parts[0];
        let value = parts[1];

        match config.set(key, value) {
            Ok(()) => {
                config.save_to(config_path.clone())?;
                println!("Set {} = {}", key, value);
            }
            Err(e) => {
                eprintln!("Error: {}", e);
                std::process::exit(1);
            }
        }
        return Ok(());
    }

    if list {
        println!("Current configuration:");
        println!();
        for (key, value) in config.list() {
            println!("  {} = {}", key, value);
        }
        println!();
        println!("Config file: {}", config_path.display());
        return Ok(());
    }

    // Default: show usage
    println!("Configuration commands:");
    println!("  ixos config --list            Show all settings");
    println!("  ixos config --get <key>       Get a setting");
    println!("  ixos config --set <key>=<val> Set a setting");
    println!("  ixos config --reset           Reset to defaults");
    println!("  ixos config --path            Show config file path");

    Ok(())
}

// =============================================================================
// Daemon Handler
// =============================================================================

fn handle_daemon(foreground: bool, stop: bool, status: bool) -> anyhow::Result<()> {
    use ixos_protocol::daemon::{DaemonConfig, DaemonService};

    if status {
        println!("Daemon status check via IPC is not available in this build.");
        println!("Use `ixos daemon --foreground` to run and observe status in-terminal.");
        return Ok(());
    }

    if stop {
        println!("Daemon stop via IPC is not available in this build.");
        println!("If running in foreground, stop with Ctrl+C in that terminal.");
        return Ok(());
    }

    if foreground {
        println!("Running daemon in foreground...");
        println!("Press Ctrl+C to stop.");
        println!();

        // Create daemon with default config
        let config = DaemonConfig::default();
        let rt = tokio::runtime::Runtime::new()?;

        rt.block_on(async {
            let mut daemon = DaemonService::new(config);
            if let Err(e) = daemon.start().await {
                eprintln!("Failed to start daemon: {}", e);
                return;
            }

            println!("Daemon started. Watching for file changes...");

            // Wait for Ctrl+C
            tokio::signal::ctrl_c().await.ok();

            println!("\nStopping daemon...");
            daemon.stop().await;
        });
    } else {
        println!("Background daemon mode is disabled in this build.");
        println!("Use `ixos daemon --foreground`.");
    }

    Ok(())
}

// =============================================================================
// Cache Handler (P5)
// =============================================================================

async fn handle_cache(
    action: CacheCommands,
    config_path_override: Option<PathBuf>,
) -> anyhow::Result<()> {
    use ixos_protocol::storage::{get_cache_for_path, get_cache_for_path_with_fingerprint};

    match action {
        CacheCommands::Stats { dir, json } => {
            let raw_dir = dir.unwrap_or_else(|| PathBuf::from("."));
            let target_dir = std::fs::canonicalize(&raw_dir).unwrap_or(raw_dir);
            let model_fingerprint = active_flash_model_fingerprint(config_path_override.clone());

            // Walk directory and count cached files (validated by current file hash).
            let mut total_files = 0;
            let mut cached_files = 0;
            let mut cache_size_bytes = 0u64;

            if target_dir.is_dir() {
                for entry in walkdir::WalkDir::new(&target_dir)
                    .max_depth(10)
                    .into_iter()
                    .filter_map(|e| e.ok())
                    .filter(|e| e.file_type().is_file())
                {
                    total_files += 1;
                    let candidate_path =
                        std::fs::canonicalize(entry.path()).unwrap_or_else(|_| entry.into_path());
                    let file_hash =
                        match ixos_protocol::security::crypto::sha256_file(&candidate_path) {
                            Ok(hash) => hash,
                            Err(_) => continue,
                        };
                    let cache =
                        get_cache_for_path_with_fingerprint(&candidate_path, model_fingerprint);
                    let mut counted = false;
                    if let Ok(Some(embedding)) = cache.get(&candidate_path, &file_hash) {
                        cached_files += 1;
                        // Approximate entry storage (embedding + metadata/signature envelope).
                        cache_size_bytes += (embedding.len() as u64 * 4).saturating_add(97);
                        counted = true;
                    }

                    // Fallback signal for entries produced by a different model fingerprint
                    // (e.g., stub-model test runs). This keeps cache-mode truthfulness checks
                    // meaningful even when model identity differs from current config.
                    if !counted && cache.contains(&candidate_path) {
                        cached_files += 1;
                        cache_size_bytes += 225;
                    }
                }
            }

            let hit_rate = if total_files > 0 {
                ((cached_files as f32 / total_files as f32) * 100.0).min(100.0)
            } else {
                0.0
            };

            if json {
                println!("{{");
                println!("  \"total_files\": {},", total_files);
                println!("  \"cached_files\": {},", cached_files);
                println!("  \"cache_size_bytes\": {},", cache_size_bytes);
                println!("  \"hit_rate_percent\": {:.1}", hit_rate);
                println!("}}");
            } else {
                println!("Cache Statistics for: {}", target_dir.display());
                println!("{}", "-".repeat(50));
                println!("Total files scanned:    {}", total_files);
                println!("Files with cache:       {}", cached_files);
                println!("Cache size (est.):      {} bytes", cache_size_bytes);
                println!("Coverage:               {:.1}%", hit_rate);
            }
        }

        CacheCommands::Clear {
            dir,
            force,
            stale_days,
        } => {
            let target_dir = dir.unwrap_or_else(|| PathBuf::from("."));

            if !force {
                print!("Clear cache for {}? [y/N]: ", target_dir.display());
                std::io::stdout().flush()?;

                let mut input = String::new();
                std::io::stdin().read_line(&mut input)?;

                if !input.trim().eq_ignore_ascii_case("y") {
                    println!("Cancelled.");
                    return Ok(());
                }
            }

            println!("Clearing cache for: {}", target_dir.display());

            let mut cleared = 0;
            if target_dir.is_dir() {
                for entry in walkdir::WalkDir::new(&target_dir)
                    .max_depth(10)
                    .into_iter()
                    .filter_map(|e| e.ok())
                    .filter(|e| e.file_type().is_file())
                {
                    let candidate_path =
                        std::fs::canonicalize(entry.path()).unwrap_or_else(|_| entry.into_path());

                    // Check stale_days filter
                    if let Some(days) = stale_days {
                        if let Ok(metadata) = std::fs::metadata(&candidate_path) {
                            if let Ok(modified) = metadata.modified() {
                                let age = std::time::SystemTime::now()
                                    .duration_since(modified)
                                    .unwrap_or_default();
                                if age.as_secs() < (days as u64 * 86400) {
                                    continue; // Not stale enough
                                }
                            }
                        }
                    }

                    let cache = get_cache_for_path(&candidate_path);
                    if cache.delete(&candidate_path).is_ok() {
                        cleared += 1;
                    }
                }
            }

            if stale_days.is_some() {
                println!(
                    "Note: LMDB fallback cache is cleared globally because per-file stale filtering is not supported."
                );
            }
            cleared += clear_lmdb_sidecar_cache();

            println!("Cleared {} cache entries.", cleared);
        }

        CacheCommands::Audit { detailed, verify } => {
            println!("Cache Audit");
            println!("{}", "-".repeat(50));
            let model_fingerprint = active_flash_model_fingerprint(config_path_override.clone());

            let raw_cwd = std::env::current_dir()?;
            let cwd = std::fs::canonicalize(&raw_cwd).unwrap_or(raw_cwd);
            let mut total = 0;
            let mut valid = 0;
            let mut invalid = 0;

            for entry in walkdir::WalkDir::new(&cwd)
                .max_depth(5)
                .into_iter()
                .filter_map(|e| e.ok())
                .filter(|e| e.file_type().is_file())
            {
                let cache = get_cache_for_path_with_fingerprint(entry.path(), model_fingerprint);

                // P2 Badge: Use real file hash when detecting cached entries for audit
                let file_hash = match ixos_protocol::security::crypto::sha256_file(entry.path()) {
                    Ok(h) => h,
                    Err(e) => {
                        if detailed {
                            println!("SKIP: {} (hash error: {})", entry.path().display(), e);
                        }
                        continue;
                    }
                };

                if let Ok(Some(embedding)) = cache.get(entry.path(), &file_hash) {
                    total += 1;

                    if verify {
                        // Check embedding dimensions and values
                        let is_valid =
                            embedding.len() == 64 && embedding.iter().all(|&v| v.is_finite());

                        if is_valid {
                            valid += 1;
                        } else {
                            invalid += 1;
                            if detailed {
                                println!(
                                    "INVALID: {} (dim: {})",
                                    entry.path().display(),
                                    embedding.len()
                                );
                            }
                        }
                    } else {
                        valid += 1;
                    }

                    if detailed && !verify {
                        println!("{}: cached", entry.path().display());
                    }
                }
            }

            println!();
            println!("Total cached:  {}", total);
            if verify {
                println!("Valid:         {}", valid);
                println!("Invalid:       {}", invalid);
            }
        }

        CacheCommands::Mode { mode } => {
            use ixos_protocol::cli::CliCacheModePreference;

            let config_path = config_path_override
                .clone()
                .unwrap_or_else(IxosConfig::default_path);
            let mut config = IxosConfig::load_from(config_path.clone());
            match mode {
                CliCacheModePreference::Memory => {
                    config.search.cache_mode = "ephemeral".to_string();
                    println!("Cache mode set to: MEMORY (RAM only)");
                    println!("Embeddings will not be persisted to disk.");
                    println!("This provides maximum privacy.");
                }
                CliCacheModePreference::Local => {
                    config.search.cache_mode = "native-cache".to_string();
                    println!("Cache mode set to: LOCAL (ADS/xattr)");
                    println!("Embeddings will be stored alongside files.");
                    println!("This provides faster repeat searches.");
                }
            }

            config.save_to(config_path.clone())?;
            println!();
            println!("Preference saved to: {}", config_path.display());
        }

        CacheCommands::Rebuild {
            dir,
            workers,
            force,
        } => {
            if !dir.exists() {
                anyhow::bail!("Directory does not exist: {}", dir.display());
            }

            if !force {
                print!(
                    "Rebuild cache for {}? This may take a while. [y/N]: ",
                    dir.display()
                );
                std::io::stdout().flush()?;

                let mut input = String::new();
                std::io::stdin().read_line(&mut input)?;

                if !input.trim().eq_ignore_ascii_case("y") {
                    println!("Cancelled.");
                    return Ok(());
                }
            }

            println!("Rebuilding cache for: {}", dir.display());
            println!("Workers: {}", workers);
            println!();

            let config = IxosConfig::load();
            let model_type = resolve_flash_model_type(&config.search.model_type);
            let rebuild_dir = std::fs::canonicalize(&dir).unwrap_or(dir.clone());
            let started = std::time::Instant::now();
            use ixos_protocol::ixos_embed::MmapModel2VecEmbedder;
            use ixos_protocol::ixos_rank::semantic_engine::CacheMode;
            use ixos_protocol::SecureEmbedder;
            use std::sync::Arc;

            let model = MmapModel2VecEmbedder::new_with_type(model_type).map_err(|e| {
                anyhow::anyhow!(
                    "Failed to load {} for cache rebuild: {}",
                    model_type.display_name(),
                    e
                )
            })?;
            let embedder = SecureEmbedder::new_fast(Arc::new(model));
            let mut semantic =
                StubSemanticEngine::with_cache_mode(embedder, CacheMode::NativeCache);

            let indexed_files = semantic.index_directory(&rebuild_dir).await?;
            let warmed_files = semantic.precompute_embeddings().await;

            println!("Indexed files discovered: {}", indexed_files);
            println!("Embeddings rebuilt: {}", warmed_files);
            println!("Elapsed: {:.2?}", started.elapsed());
        }
    }

    Ok(())
}

// =============================================================================
// Compliance Handler
// =============================================================================

fn handle_compliance(action: ComplianceCommands) -> anyhow::Result<()> {
    let compliance = ComplianceManager::new()?;

    match action {
        ComplianceCommands::Consent {
            status,
            grant,
            withdraw,
        } => {
            if status {
                println!("{}", compliance.consent_status()?);
            } else if grant {
                compliance.grant_consent()?;
                println!("Consent granted for AI-powered search.");
                println!("You can withdraw anytime with: ixos compliance consent --withdraw");
            } else if withdraw {
                compliance.withdraw_consent()?;
                println!("Consent withdrawn. AI-powered search is now disabled.");
                println!("You can grant consent again with: ixos compliance consent --grant");
            } else {
                println!("{}", compliance.consent_status()?);
            }
        }

        ComplianceCommands::Gdpr { action } => match action {
            GdprCommands::Access => {
                println!("Processing GDPR access request (Article 15)...\n");
                let export = compliance.gdpr_access()?;
                println!("{}", compliance.format_gdpr_access(&export));
            }

            GdprCommands::Erase { scope, force } => {
                let deletion_scope = scope
                    .parse::<DeletionScope>()
                    .map_err(|e| anyhow::anyhow!("{}", e))?;

                if !force {
                    println!("WARNING: This will delete the following data:");
                    println!("  Scope: {:?}", deletion_scope);
                    println!();
                    print!("Are you sure? [y/N]: ");
                    std::io::stdout().flush()?;

                    let mut input = String::new();
                    std::io::stdin().read_line(&mut input)?;

                    if !input.trim().eq_ignore_ascii_case("y") {
                        println!("Erasure cancelled.");
                        return Ok(());
                    }
                }

                println!("Processing GDPR erasure request (Article 17)...\n");
                let report = compliance.gdpr_erase(deletion_scope)?;

                println!("Erasure completed:");
                println!("  Request ID: {}", report.request_id);
                println!(
                    "  Consent records deleted: {}",
                    report.details.consent_records_deleted
                );
                println!(
                    "  Search history entries deleted: {}",
                    report.details.search_history_entries_deleted
                );
                println!(
                    "  Cached embeddings cleared: {}",
                    report.details.cached_embeddings_cleared
                );
            }

            GdprCommands::Export { output } => {
                println!("Processing GDPR data portability request (Article 20)...\n");
                let export_path = compliance.gdpr_export()?;

                if let Some(dest) = output {
                    std::fs::copy(&export_path, &dest)?;
                    println!("Data exported to: {}", dest.display());
                    std::fs::remove_file(export_path)?;
                } else {
                    println!("Data exported to: {}", export_path.display());
                }
            }
        },

        ComplianceCommands::Ccpa { action } => match action {
            CcpaCommands::Know => {
                println!("Processing CCPA 'Right to Know' request...\n");
                let response = compliance.ccpa_know()?;
                println!("{}", compliance.format_ccpa_know(&response));
            }

            CcpaCommands::Delete { force } => {
                if !force {
                    println!("WARNING: This will delete all your personal information.");
                    println!();
                    print!("Are you sure? [y/N]: ");
                    std::io::stdout().flush()?;

                    let mut input = String::new();
                    std::io::stdin().read_line(&mut input)?;

                    if !input.trim().eq_ignore_ascii_case("y") {
                        println!("Deletion cancelled.");
                        return Ok(());
                    }
                }

                println!("Processing CCPA deletion request...\n");
                let response = compliance.ccpa_delete()?;

                println!("Deletion completed:");
                println!("  Request ID: {}", response.request_id);
                println!("  Status: {}", response.status);
                println!(
                    "  Categories deleted: {}",
                    response.categories_deleted.join(", ")
                );
            }

            CcpaCommands::OptOut => {
                let status = compliance.ccpa_opt_out()?;
                println!("CCPA Opt-Out Status");
                println!("-------------------");
                println!("Opted out: {}", if status.opted_out { "Yes" } else { "No" });
                if let Some(at) = status.opted_out_at {
                    println!("Opted out at: {}", at.format("%Y-%m-%d %H:%M:%S UTC"));
                }
                println!();
                println!("{}", status.note);
            }

            CcpaCommands::Notice => {
                println!("{}", compliance.format_ccpa_notice());
            }
        },

        ComplianceCommands::Docs { format, output } => {
            let docs = compliance.generate_documentation();

            let content = match format.to_lowercase().as_str() {
                "markdown" | "md" => docs.to_markdown(),
                "json" | _ => docs.to_json()?,
            };

            if let Some(path) = output {
                std::fs::write(&path, &content)?;
                println!("Technical documentation written to: {}", path.display());
            } else {
                println!("{}", content);
            }
        }

        ComplianceCommands::Audit { days, summary } => {
            if summary {
                let counts = compliance.audit_counts(days)?;
                println!("Audit Event Summary (last {} days)", days);
                println!("----------------------------------");

                if counts.is_empty() {
                    println!("No audit events found.");
                } else {
                    let mut entries: Vec<_> = counts.iter().collect();
                    entries.sort_by(|a, b| b.1.cmp(a.1));

                    for (event_type, count) in entries {
                        println!("  {}: {}", event_type, count);
                    }
                }
            } else {
                let entries = compliance.audit_recent(days)?;
                println!("Audit Log (last {} days)", days);
                println!("----------------------------------");

                if entries.is_empty() {
                    println!("No audit entries found.");
                } else {
                    for entry in entries.iter().take(50) {
                        println!(
                            "[{}] {} - {:?}",
                            entry.timestamp.format("%Y-%m-%d %H:%M:%S"),
                            entry.source,
                            entry.event
                        );
                        if let Some(details) = &entry.details {
                            println!("    Details: {}", details);
                        }
                    }

                    if entries.len() > 50 {
                        println!("\n... and {} more entries", entries.len() - 50);
                    }
                }
            }
        }
    }

    Ok(())
}

// =============================================================================
// Version Handler
// =============================================================================

fn handle_version(verbose: bool) {
    println!("ixos {}", env!("CARGO_PKG_VERSION"));

    if verbose {
        println!();
        println!("Platform: {}", std::env::consts::OS);
        println!("Architecture: {}", std::env::consts::ARCH);

        #[cfg(windows)]
        println!("Cache backend: Windows ADS (NTFS)");
        #[cfg(unix)]
        println!("Cache backend: Unix xattr");

        println!();
        println!("Features:");
        println!("  - P0: Security Foundation (complete)");
        println!("  - P1: Legal Compliance (complete)");
        println!("  - P2.1: Progressive Search Engine");
        println!("  - P2.2: CLI Interface");

        println!();
        println!("Config file: {}", IxosConfig::default_path().display());
        println!(
            "Compliance storage: {}",
            ixos_protocol::compliance::compliance_dir().display()
        );
    }
}

async fn handle_release_check(quick: bool) -> anyhow::Result<()> {
    println!("Release-check stub");
    println!("------------------");
    if quick {
        println!("Quick mode enabled.");
    }
    println!("Full release-check workflow lands in Phase 7.");
    println!("Current recommended checks:");
    println!("  1) cargo test --test settings_matrix");
    println!("  2) python scripts/run_settings_matrix.py");
    println!("  3) cargo run --release --bin ixos-big-bench -- --dir . --runs 3");
    Ok(())
}

async fn handle_doctor(json: bool, verbose: bool) -> anyhow::Result<()> {
    use ixos_protocol::diagnostics::{run_doctor, DoctorOptions, DoctorStatus};

    let report = run_doctor(DoctorOptions { verbose }).await;

    if json {
        println!("{}", serde_json::to_string_pretty(&report)?);
        return Ok(());
    }

    println!("Ixos Doctor");
    println!("{}", "-".repeat(50));

    for check in &report.checks {
        let status = match check.status {
            DoctorStatus::Pass => "PASS",
            DoctorStatus::Warn => "WARN",
            DoctorStatus::Fail => "FAIL",
            DoctorStatus::Info => "INFO",
        };

        println!("[{}] {}", status, check.name);
        println!("  {}", check.message);
        if let Some(details) = &check.details {
            println!("  {}", details);
        }
    }

    println!();
    println!(
        "Summary: {} pass, {} warn, {} fail, {} info",
        report.summary.pass, report.summary.warn, report.summary.fail, report.summary.info
    );

    if report.summary.fail > 0 {
        std::process::exit(2);
    }

    Ok(())
}

async fn handle_model(action: ModelCommands) -> anyhow::Result<()> {
    use ixos_protocol::ixos_embed::MmapModel2VecEmbedder;

    match action {
        ModelCommands::List { all, json } => {
            let models = MmapModel2VecEmbedder::available_models();
            if json {
                #[derive(serde::Serialize)]
                struct ModelListEntry {
                    model_id: String,
                    display_name: String,
                    available: bool,
                    path: Option<String>,
                    description: String,
                }

                let payload: Vec<ModelListEntry> = models
                    .into_iter()
                    .filter(|(_, available, _)| all || *available)
                    .map(|(model_type, available, path)| ModelListEntry {
                        model_id: model_type.to_string(),
                        display_name: model_type.display_name().to_string(),
                        available,
                        path: path.map(|p| p.display().to_string()),
                        description: model_type.description().to_string(),
                    })
                    .collect();
                println!("{}", serde_json::to_string_pretty(&payload)?);
            } else {
                println!("Available Models:");
                for (model_type, available, _) in models {
                    if !all && !available {
                        continue;
                    }
                    println!(
                        "  {} - {}",
                        model_type.display_name(),
                        if available {
                            "Available"
                        } else {
                            "Not installed"
                        }
                    );
                }
            }
        }
        ModelCommands::Download { model, .. } => {
            println!("Downloading {}...", model);
            println!("Model download is only available in the Ixos desktop app.");
        }
        ModelCommands::Preload { model } => {
            println!("Preloading {}...", model);
            match model.parse::<ixos_protocol::ixos_embed::ModelType>() {
                Ok(mt) => match MmapModel2VecEmbedder::new_with_type(mt) {
                    Ok(_) => println!("Model loaded successfully"),
                    Err(e) => eprintln!("Failed: {}", e),
                },
                Err(_) => eprintln!("Unknown model type"),
            }
        }
        ModelCommands::Status { .. } => {
            let models = MmapModel2VecEmbedder::available_models();
            for (model_type, available, _) in models {
                println!(
                    "{}: {}",
                    model_type.display_name(),
                    if available {
                        "Available"
                    } else {
                        "Not installed"
                    }
                );
            }
        }
        ModelCommands::Delete { model, force } => {
            if !force {
                println!("Use --force to confirm deletion of {}", model);
            } else {
                println!("Deleting {}...", model);
                println!("Model management is only available in the Ixos desktop app.");
            }
        }
    }
    Ok(())
}
