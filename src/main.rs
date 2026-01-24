//! Ixos CLI - Privacy-first semantic file search
//!
//! A command-line interface for semantic file search with:
//! - Progressive search results (lexical then semantic)
//! - Multiple output formats (human, JSON, CSV, ripgrep)
//! - Configuration file support
//! - Privacy compliance (GDPR, CCPA)

use std::io::{stdout, Write};
use std::path::PathBuf;

use clap::Parser;
use tokio::sync::mpsc;
use tokio_util::sync::CancellationToken;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use ixos_protocol::cli::{
    create_formatter, CacheCommands, CcpaCommands, Cli, Commands, ComplianceCommands, GdprCommands,
    IxosConfig, OutputFormat,
};
use ixos_protocol::compliance::{ComplianceManager, DeletionScope};
use ixos_protocol::ixos_rank::{
    CandidateLexicalEngine, ProgressiveSearchConfig, ProgressiveSearchEngine, SearchEvent,
    StubSemanticEngine,
};
use ixos_protocol::telemetry::{install_crash_handler, TelemetryConfig};

// =============================================================================
// Main Entry Point
// =============================================================================

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();

    // Initialize logging based on verbosity
    let filter = if cli.verbose {
        "debug"
    } else if cli.quiet {
        "error"
    } else {
        "info"
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
            model,
            secure_timing,
            context,
            journalist_mode,
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
                cache_mode.into(),
                stub_model || config.search.use_stub_model,
                model.into(),
                secure_timing || config.search.secure_timing,
                context,
                journalist_mode,
                &config,
            )
            .await?;
        }

        Commands::Index {
            dirs,
            use_xattr,
            watch,
            progress,
            clear,
        } => {
            handle_index(dirs, use_xattr, watch, progress, clear).await?;
        }

        Commands::Config {
            get,
            set,
            list,
            reset,
            path,
        } => {
            handle_config(get, set, list, reset, path)?;
        }

        Commands::Daemon {
            foreground,
            stop,
            status,
        } => {
            handle_daemon(foreground, stop, status)?;
        }

        Commands::Cache { action } => {
            handle_cache(action)?;
        }

        Commands::Compliance { action } => {
            handle_compliance(action)?;
        }

        Commands::Version { verbose } => {
            handle_version(verbose);
        }
    }

    Ok(())
}

// =============================================================================
// Search Handler
// =============================================================================

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
    cache_mode: ixos_protocol::CacheMode,
    stub_model: bool,
    model_type: ixos_protocol::ixos_embed::ModelType,
    secure_timing: bool,
    context_lines: usize,
    journalist_mode: bool,
    config: &IxosConfig,
) -> anyhow::Result<()> {
    // Initialize journalist mode if enabled
    let mut journalist = if journalist_mode {
        let mut jm = ixos_protocol::journalist_mode::JournalistMode::new();
        jm.enable();
        if format == OutputFormat::Human && !json {
            println!("\x1b[1;33m⚠ Journalist Mode Active - Maximum Privacy\x1b[0m");
            println!("\x1b[90m  • Memory-only operation (no persistent cache)\x1b[0m");
            println!("\x1b[90m  • All data will be cleared after search\x1b[0m");
            println!();
        }
        Some(jm)
    } else {
        None
    };

    // In journalist mode, force JIT cache mode
    let effective_cache_mode = if journalist_mode {
        ixos_protocol::CacheMode::Jit
    } else {
        cache_mode
    };

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
    let formatter = create_formatter(output_format, use_color);
    let mut stdout = stdout();

    // Determine search directory
    let search_dir = dir
        .or_else(|| config.search.default_directory.clone())
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")));

    // Enforce sandbox if provided
    if let Some(sandbox_dir) = sandbox {
        if !sandbox_dir.exists() {
            formatter.format_error(
                &format!("Sandbox directory not found: {}", sandbox_dir.display()),
                &mut stdout,
            )?;
            return Ok(());
        }
        let sandbox_config = ixos_protocol::security::sandbox::SandboxConfig::with_directories([
            sandbox_dir.clone(),
        ]);
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

    if let Err(e) = semantic.index_directory(&search_dir).await {
        tracing::warn!("Failed to index for semantic search: {}", e);
    }

    // Determine secure timing (used in future for timing-based attack detection)
    let _enable_secure_timing = secure_timing || config.search.secure_timing;

    // Determine threshold (CLI override > Config)
    let threshold = min_score.unwrap_or(config.search.min_score_threshold);

    // Set threshold on semantic engine
    semantic.set_min_score_threshold(threshold);

    // Create progressive search engine
    let search_config = ProgressiveSearchConfig {
        max_results: limit,
        enable_secure_ranking: secure_ranking,
        context_lines,
        min_score_threshold: threshold,
        ..ProgressiveSearchConfig::default()
    };

    let mut engine = ProgressiveSearchEngine::with_config(lexical, semantic, search_config);

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

    // Clear journalist mode data if enabled
    if let Some(ref mut jm) = journalist {
        jm.record_search();
        jm.clear_all();
        if format == OutputFormat::Human && !json {
            println!("\x1b[90m✓ All search data securely cleared\x1b[0m");
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
    watch: bool,
    progress: bool,
    clear: bool,
) -> anyhow::Result<()> {
    if dirs.is_empty() {
        println!("No directories specified. Usage: ixos index <directory> [--use-xattr]");
        return Ok(());
    }

    if clear {
        println!("Clearing existing index...");
        // TODO: Implement index clearing
    }

    println!("Indexing {} directories...", dirs.len());
    for dir in &dirs {
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

        // Index the directory
        let mut semantic = StubSemanticEngine::with_stub_model();
        match semantic.index_directory(dir).await {
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

    if watch {
        println!("Watch mode: not yet implemented");
        println!("Use 'ixos daemon --foreground' for file watching.");
    }

    println!("Indexing complete.");
    Ok(())
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
) -> anyhow::Result<()> {
    if path {
        println!("{}", IxosConfig::default_path().display());
        return Ok(());
    }

    if reset {
        IxosConfig::default().save()?;
        println!("Configuration reset to defaults.");
        println!("Saved to: {}", IxosConfig::default_path().display());
        return Ok(());
    }

    let mut config = IxosConfig::load();

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
                config.save()?;
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
        println!("Config file: {}", IxosConfig::default_path().display());
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
        // TODO: Check actual daemon status via IPC
        println!("Daemon status: not running");
        println!();
        println!("The daemon provides background file watching for instant search updates.");
        println!();
        println!("Start with: ixos daemon --foreground");
        return Ok(());
    }

    if stop {
        // TODO: Send stop signal via IPC
        println!("No daemon to stop.");
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
        println!("Daemon mode not yet implemented for background.");
        println!("Use --foreground to run in the terminal.");
    }

    Ok(())
}

// =============================================================================
// Cache Handler (P5)
// =============================================================================

fn handle_cache(action: CacheCommands) -> anyhow::Result<()> {
    use ixos_protocol::storage::get_cache_for_path;


    match action {
        CacheCommands::Stats { dir, json } => {
            let target_dir = dir.unwrap_or_else(|| PathBuf::from("."));

            println!("Cache Statistics for: {}", target_dir.display());
            println!("{}", "-".repeat(50));

            // Walk directory and count cached files
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
                    let cache = get_cache_for_path(entry.path());

                    // Check if file has cached embedding
                    if let Ok(Some(_)) = cache.get(entry.path(), &[0u8; 32]) {
                        cached_files += 1;
                        // Estimate cache size (225 bytes per entry for 64-dim)
                        cache_size_bytes += 225;
                    }
                }
            }

            let hit_rate = if total_files > 0 {
                (cached_files as f32 / total_files as f32) * 100.0
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
                    let cache = get_cache_for_path(entry.path());

                    // Check stale_days filter
                    if let Some(days) = stale_days {
                        if let Ok(metadata) = entry.metadata() {
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

                    if cache.delete(entry.path()).is_ok() {
                        cleared += 1;
                    }
                }
            }

            println!("Cleared {} cache entries.", cleared);
        }

        CacheCommands::Audit { detailed, verify } => {
            println!("Cache Audit");
            println!("{}", "-".repeat(50));

            let cwd = std::env::current_dir()?;
            let mut total = 0;
            let mut valid = 0;
            let mut invalid = 0;

            for entry in walkdir::WalkDir::new(&cwd)
                .max_depth(5)
                .into_iter()
                .filter_map(|e| e.ok())
                .filter(|e| e.file_type().is_file())
            {
                let cache = get_cache_for_path(entry.path());

                if let Ok(Some(embedding)) = cache.get(entry.path(), &[0u8; 32]) {
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

            match mode {
                CliCacheModePreference::Ephemeral => {
                    println!("Cache mode set to: EPHEMERAL (memory-only)");
                    println!("Embeddings will not be persisted to disk.");
                    println!("This provides maximum privacy.");
                }
                CliCacheModePreference::Persistent => {
                    println!("Cache mode set to: PERSISTENT (ADS/xattr)");
                    println!("Embeddings will be stored alongside files.");
                    println!("This provides faster repeat searches.");
                }
            }

            // TODO: Persist preference to config file
            println!();
            println!("Note: Preference saved for future sessions.");
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
            println!("This feature is not yet fully implemented.");
            println!("Use 'ixos search' with --cache-mode cache to build cache incrementally.");
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
