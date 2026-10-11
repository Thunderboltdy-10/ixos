//! Ixos CLI - CPU retrieval with bounded source evidence.
//!
//! Code/document profiles, exact grep/read and resident JSONL are the default
//! engine. Explicit legacy search retains progressive desktop compatibility.

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
use ixos_protocol::EmbeddingModel;

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
    let config = if matches!(&cli.command, Commands::Config { reset: true, .. }) {
        IxosConfig::default()
    } else {
        IxosConfig::load_for_cli(cli.config.clone().unwrap_or_else(IxosConfig::default_path))?
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
            profile,
            retrieval,
            model_path,
            io_workers,
            typo_correction,
            representation,
            evidence_policy,
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
            stats,
            max_output_bytes,
            snippet_chars,
        } => {
            if retrieval != Some(ixos_protocol::retrieval::RetrievalMode::Legacy) {
                let outcome = (|| -> anyhow::Result<()> {
                    anyhow::ensure!(!progressive && !deep_search && !stub_model && search_mode.is_none() && model.is_none() && pro_model.is_none() && !secure_timing && !evidence && snippet_chars.is_none() && !no_secure_ranking,"Legacy/progressive options require --retrieval legacy; measured JSON views are exact and --show-scores explains ranking");
                    let root = dir
                        .or_else(|| config.search.default_directory.clone())
                        .unwrap_or(std::env::current_dir()?);
                    if let Some(sandbox) = sandbox {
                        anyhow::ensure!(
                            root.canonicalize()?.starts_with(sandbox.canonicalize()?),
                            "Search directory is outside --sandbox"
                        );
                    }
                    let began = std::time::Instant::now();
                    let mut options = config.retrieval.options(profile)?;
                    options.mode = retrieval.unwrap_or(options.mode);
                    options.representation = representation.unwrap_or(options.representation);
                    options.evidence_policy = evidence_policy.unwrap_or(options.evidence_policy);
                    options.io_workers = io_workers.unwrap_or(options.io_workers);
                    options.typo_correction = typo_correction.unwrap_or(options.typo_correction);
                    if let Some(mode) = cache_mode {
                        options.persist =
                            matches!(mode, ixos_protocol::cli::CliCacheMode::NativeCache);
                    }
                    options.limit = limit.unwrap_or(options.limit);
                    options.context = context.unwrap_or(options.context);
                    options.output_bytes = max_output_bytes.unwrap_or(options.output_bytes);
                    options.semantic_floor = min_score.unwrap_or(options.semantic_floor);
                    options.explain = show_scores || config.output.show_scores;
                    let model_path =
                        if options.mode == ixos_protocol::retrieval::RetrievalMode::Lexical {
                            None
                        } else {
                            Some(config.retrieval.model(profile, model_path)?)
                        };
                    let selected_format = format
                        .map(Into::into)
                        .map(Ok)
                        .unwrap_or_else(|| config.output.default_format.parse::<OutputFormat>())
                        .map_err(anyhow::Error::msg)?;
                    anyhow::ensure!(json || matches!(selected_format, OutputFormat::Json | OutputFormat::Human), "Measured retrieval supports human/JSON; add --retrieval legacy for other formats");
                    let mut engine = ixos_protocol::retrieval::Engine::new(
                        &root,
                        model_path.as_deref(),
                        options,
                    )?;
                    let model_load_ms = began.elapsed().as_secs_f64() * 1000.0;
                    let (raw, diagnostics) = engine.search(&query, "cli", None)?;
                    if json || matches!(selected_format, OutputFormat::Json) {
                        stdout().write_all(&raw)?;
                    } else {
                        ixos_protocol::retrieval::commands::print_human(&raw)?;
                    }
                    if stats {
                        eprintln!(
                            "{}",
                            serde_json::json!({"type":"stats","engine":"document-v1","modelLoadMs":model_load_ms,"fullRequestMs":began.elapsed().as_secs_f64()*1000.0,"diagnostics":diagnostics})
                        );
                    }
                    Ok(())
                })();
                if let Err(error) = &outcome {
                    if json
                        || matches!(format, Some(ixos_protocol::cli::CliOutputFormat::Json))
                        || format.is_none() && config.output.default_format == "json"
                    {
                        println!(
                            "{}",
                            serde_json::json!({"type":"error","message":error.to_string()})
                        );
                    }
                }
                return outcome;
            }
            anyhow::ensure!(
                profile.is_none()
                    && model_path.is_none()
                    && io_workers.is_none()
                    && typo_correction.is_none()
                    && representation.is_none()
                    && evidence_policy.is_none(),
                "Measured profile/model options cannot be mixed with --retrieval legacy"
            );
            let resolved_format = format
                .map(Into::into)
                .map(Ok)
                .unwrap_or_else(|| config.output.default_format.parse::<OutputFormat>())
                .map_err(anyhow::Error::msg)?;
            let outcome = handle_search(
                &query,
                limit.unwrap_or(config.search.default_limit),
                resolved_format,
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
                context.unwrap_or(config.search.context_lines),
                deep_search,
                evidence,
                stats,
                max_output_bytes,
                snippet_chars,
                &config,
            )
            .await;
            if let Err(error) = outcome {
                let formatter = create_formatter_with_options(
                    if json {
                        OutputFormat::Json
                    } else {
                        resolved_format
                    },
                    false,
                    false,
                );
                formatter.format_error(&error.to_string(), &mut stdout())?;
                return Err(error);
            }
        }

        Commands::Index {
            dirs,
            use_xattr,
            progress,
            clear,
        } => {
            handle_index(dirs, use_xattr, progress, clear, &config).await?;
        }

        Commands::Serve {
            dir,
            model_path,
            profile,
            io_workers,
            retrieval,
            representation,
            session,
            evidence_policy,
            typo_correction,
            quiet_stats,
            jit,
            max_output_bytes,
        } => {
            let mut options = config.retrieval.options(profile)?;
            options.mode = retrieval.unwrap_or(options.mode);
            options.representation = representation.unwrap_or(options.representation);
            options.io_workers = io_workers.unwrap_or(options.io_workers);
            options.session = session.unwrap_or(options.session);
            options.evidence_policy = evidence_policy.unwrap_or(options.evidence_policy);
            options.typo_correction = typo_correction.unwrap_or(options.typo_correction);
            options.persist = !jit && options.persist;
            options.output_bytes = max_output_bytes.unwrap_or(options.output_bytes);
            let model_path = if options.mode == ixos_protocol::retrieval::RetrievalMode::Lexical {
                None
            } else {
                Some(config.retrieval.model(profile, model_path)?)
            };
            ixos_protocol::retrieval::commands::serve_with_diagnostics(
                &dir,
                model_path.as_deref(),
                options,
                quiet_stats,
            )?;
        }
        Commands::Read {
            path,
            dir,
            start,
            lines,
            characters,
            character_offset,
            max_output_bytes,
        } => {
            stdout().write_all(&ixos_protocol::retrieval::commands::read_range(
                &dir,
                &path,
                start,
                lines,
                characters,
                character_offset,
                max_output_bytes,
            )?)?;
        }
        Commands::Grep {
            pattern,
            dir,
            fixed,
            ignore_case,
            context,
            limit,
            max_output_bytes,
        } => {
            let (raw, stats) = ixos_protocol::retrieval::commands::grep(
                &dir,
                &pattern,
                fixed,
                ignore_case,
                context,
                limit,
                max_output_bytes,
            )?;
            stdout().write_all(&raw)?;
            if cli.verbose {
                eprintln!("{}", serde_json::to_string(&stats)?);
            }
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
            handle_daemon(foreground, stop, status).await?;
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

        Commands::Update {
            check,
            yes,
            version,
            auto,
        } => {
            ixos_protocol::cli::self_update::run_update(check, yes, version, auto)?;
        }
    }

    // Background auto-update check (runs silently after any command)
    // Only check once per day to avoid excessive API calls
    std::thread::spawn(|| {
        if let Err(e) = ixos_protocol::cli::self_update::run_auto_update_background() {
            tracing::debug!("Background auto-update check failed: {}", e);
        }
    });

    Ok(())
}

// =============================================================================
// Search Handler
// =============================================================================

fn resolve_flash_model_type(raw: &str) -> anyhow::Result<ModelType> {
    raw.parse::<ModelType>().map_err(anyhow::Error::msg)
}

fn resolve_pro_model_type(raw: &str) -> anyhow::Result<ModelType> {
    let normalized = raw.trim().to_lowercase();
    match normalized.as_str() {
        "ixos-pro-v2" | "pro-v2" | "pro" => Ok(ModelType::IxosProV2),
        "potion" | "potion-base-8m-int8" => Ok(ModelType::Potion),
        _ => raw.parse::<ModelType>().map_err(anyhow::Error::msg),
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

fn should_eager_index_semantic(
    search_mode: ixos_protocol::ixos_rank::progressive::SearchMode,
    lexical_probe_is_empty: bool,
) -> bool {
    matches!(
        search_mode,
        ixos_protocol::ixos_rank::progressive::SearchMode::Pro
    ) || lexical_probe_is_empty
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
    show_stats: bool,
    max_output_bytes: Option<usize>,
    snippet_chars: Option<usize>,
    config: &IxosConfig,
) -> anyhow::Result<()> {
    let request_started = std::time::Instant::now();
    anyhow::ensure!(!query.trim().is_empty(), "Search query must not be empty");
    anyhow::ensure!(limit > 0, "Result limit must be greater than zero");
    anyhow::ensure!(
        min_score
            .unwrap_or(config.search.min_score_threshold)
            .is_finite(),
        "Minimum score must be finite"
    );
    anyhow::ensure!(
        (0.0..=1.0).contains(&min_score.unwrap_or(config.search.min_score_threshold)),
        "Minimum score must be between zero and one"
    );
    anyhow::ensure!(
        config.search.timeout_seconds > 0,
        "Search timeout must be greater than zero"
    );
    anyhow::ensure!(
        !progressive || max_output_bytes.is_none(),
        "Output byte budgets currently apply to final-only searches; disable progressive mode"
    );
    anyhow::ensure!(
        max_output_bytes.is_none_or(|n| n >= 256),
        "Output budget must be at least 256 bytes"
    );
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

    // Search runs locally; optional compliance/history commands never gate retrieval.
    let compliance = ComplianceManager::new()?;

    // Determine output format
    let output_format = if json { OutputFormat::Json } else { format };
    let use_color = config.output.color && output_format == OutputFormat::Human;
    let formatter = create_formatter_with_options(output_format, use_color, include_evidence);
    let mut stdout = CountingOutput {
        writer: stdout(),
        bytes: 0,
    };

    // Determine search directory
    let raw_search_dir = dir
        .or_else(|| config.search.default_directory.clone())
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")));
    let search_dir = std::fs::canonicalize(&raw_search_dir).unwrap_or(raw_search_dir);

    // Enforce sandbox if provided
    if let Some(sandbox_dir) = sandbox {
        if !sandbox_dir.exists() {
            anyhow::bail!("Sandbox directory not found: {}", sandbox_dir.display());
        }
        let sandbox_config =
            ixos_protocol::security::sandbox::SandboxConfig::with_directories(
                [sandbox_dir.clone()],
            );
        let sandbox = ixos_protocol::security::sandbox::Sandbox::new(sandbox_config)
            .map_err(|e| anyhow::anyhow!("{}", e))?;
        if let Err(e) = sandbox.validate_path(&search_dir) {
            anyhow::bail!("Search directory outside sandbox: {}", e);
        }
    }

    if !search_dir.is_dir() {
        anyhow::bail!(
            "Search directory not found or not a directory: {}",
            search_dir.display()
        );
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
            "auto" => ixos_protocol::ixos_rank::progressive::SearchMode::Auto,
            invalid => anyhow::bail!("Invalid search mode '{invalid}'; use flash, pro or auto"),
        },
    };

    let model_type = model
        .map(ModelType::from)
        .map(Ok)
        .unwrap_or_else(|| resolve_flash_model_type(&config.search.model_type))?;

    let pro_model_type = pro_model
        .map(ModelType::from)
        .map(Ok)
        .unwrap_or_else(|| resolve_pro_model_type(&config.search.pro_model_type))?;
    let ask_mode_auto_intent = IntentDetector::new().should_activate_ask_mode(query);

    // Create search engines
    // P2: Use CandidateLexicalEngine to enforce hard caps and fast funneling
    let lexical = CandidateLexicalEngine::new(search_dir.clone());
    let model_load_started = std::time::Instant::now();
    let mut model_identities = Vec::new();

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
                model.ensure_loaded()?;
                model_identities.push(serde_json::json!({
                    "role": "primary", "id": model_type.to_string(),
                    "fingerprint": hex::encode(model.fingerprint()), "dimensions": model.dimensions()
                }));
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
                anyhow::bail!("Failed to load embedding model {model_type}: {e}. Install the model or select an available one; --stub-model is only for explicit tests.");
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
            let model_result =
                MmapModel2VecEmbedder::new_with_type(pro_model_type).and_then(|model| {
                    model.ensure_loaded()?;
                    Ok(model)
                });
            match model_result {
                Ok(model) => {
                    model_identities.push(serde_json::json!({
                        "role": "secondary", "id": pro_model_type.to_string(),
                        "fingerprint": hex::encode(model.fingerprint()), "dimensions": model.dimensions()
                    }));
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
                    if matches!(
                        resolved_search_mode,
                        ixos_protocol::ixos_rank::progressive::SearchMode::Pro
                    ) {
                        anyhow::bail!("Requested Pro model {pro_model_type} is unavailable: {e}");
                    }
                    tracing::warn!("Failed to create pro model ({}): {}", pro_model_type, e);
                    None
                }
            }
        };
    }

    let model_load_ms = model_load_started.elapsed().as_secs_f64() * 1000.0;

    let preflight_started = std::time::Instant::now();
    let lexical_probe_is_empty = if matches!(
        resolved_search_mode,
        ixos_protocol::ixos_rank::progressive::SearchMode::Pro
    ) || ask_mode_auto_intent
    {
        false
    } else {
        match lexical.preflight(query).await {
            Ok(empty) => empty,
            Err(e) => {
                tracing::warn!(
                    "Lexical preflight failed, enabling semantic eager indexing fallback: {}",
                    e
                );
                true
            }
        }
    };
    let preflight_ms = preflight_started.elapsed().as_secs_f64() * 1000.0;

    if should_eager_index_semantic(resolved_search_mode, lexical_probe_is_empty) {
        if let Err(e) = semantic.index_directory(&search_dir).await {
            tracing::warn!("Failed to index for semantic search: {}", e);
        }
    } else {
        tracing::debug!(
            "Skipping eager semantic index for low-latency lexical-first CLI flow (lexical preflight had hits)"
        );
    }

    if let Some(engine) = pro_engine.as_mut() {
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
        lexical_timeout: std::time::Duration::from_secs(config.search.timeout_seconds),
        semantic_timeout: std::time::Duration::from_secs(config.search.timeout_seconds),
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
    let mut result_count = 0;
    let mut first_result_ms = None;
    let diagnostics;

    if progressive {
        // Progressive mode with streaming
        let (tx, mut rx) = mpsc::channel(10);
        let cancel = CancellationToken::new();

        let query_clone = query.to_string();
        let search_handle = tokio::spawn(async move {
            let outcome = engine.search_progressive(query_clone, tx, cancel).await;
            (outcome, engine.diagnostics().clone())
        });

        while let Some(event) = rx.recv().await {
            match event {
                SearchEvent::LexicalResults(results) => {
                    if !results.is_empty() {
                        first_result_ms.get_or_insert(start_time.elapsed().as_millis() as u64);
                    }
                    formatter.format_lexical_results(
                        &results[..results.len().min(limit)],
                        &mut stdout,
                    )?;
                    stdout.flush()?;
                }
                SearchEvent::LexicalBatch {
                    results,
                    batch_number: _,
                    is_final: _,
                } => {
                    // P2.1: Batched lexical results - treat like regular lexical results
                    if !results.is_empty() {
                        first_result_ms.get_or_insert(start_time.elapsed().as_millis() as u64);
                    }
                    formatter.format_lexical_results(
                        &results[..results.len().min(limit)],
                        &mut stdout,
                    )?;
                    stdout.flush()?;
                }
                SearchEvent::Status(msg) => {
                    formatter.format_status(&msg, &mut stdout)?;
                    stdout.flush()?;
                }
                SearchEvent::SemanticResults(mut results) => {
                    results.truncate(limit);
                    result_count = results.len();
                    if !results.is_empty() {
                        first_result_ms.get_or_insert(start_time.elapsed().as_millis() as u64);
                    }
                    clip_snippets(&mut results, snippet_chars);
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
                    tracing::debug!("Search pipeline error: {e}");
                }
                SearchEvent::StreamUpdate { .. } => {
                    // Stream updates are for UI/animation; ignore in CLI.
                }
            }
        }

        let (outcome, measured) = search_handle.await?;
        outcome?;
        diagnostics = measured;
    } else {
        // Simple blocking mode
        let mut results = engine.search(query, limit).await?;
        if !results.is_empty() {
            first_result_ms = Some(start_time.elapsed().as_millis() as u64);
        }
        clip_snippets(&mut results, snippet_chars);
        loop {
            let mut rendered = Vec::new();
            formatter.format_semantic_results(&results, show_scores, &mut rendered)?;
            if max_output_bytes.is_none_or(|budget| rendered.len() <= budget) {
                stdout.write_all(&rendered)?;
                break;
            }
            if results.len() > 1 {
                results.pop();
            } else if results
                .first()
                .is_some_and(|r| r.context_snippet.is_some() || r.evidence.is_some())
            {
                results[0].context_snippet = None;
                results[0].evidence = None;
            } else {
                anyhow::bail!("Output budget is too small for the best result's path and metadata");
            }
        }
        result_count = results.len();
        diagnostics = engine.diagnostics().clone();
    }

    let duration_ms = start_time.elapsed().as_millis() as u64;

    // Record the search in history
    let _ = compliance.record_search(
        query,
        result_count,
        duration_ms,
        ixos_protocol::SearchMode::Hybrid,
    );

    if show_stats {
        eprintln!(
            "{}",
            serde_json::json!({
                "type": "searchStats", "durationMs": duration_ms, "firstResultMs": first_result_ms,
                "resultCount": result_count, "outputBytes": stdout.bytes,
                "cacheMode": if effective_cache_mode == ixos_protocol::CacheMode::NativeCache { "cached" } else { "jit" },
                "model": if stub_model { "stub".to_owned() } else { model_type.to_string() },
                "models": model_identities, "modelLoadMs": model_load_ms, "preflightMs": preflight_ms,
                "requestMs": request_started.elapsed().as_secs_f64() * 1000.0,
                "firstResultRequestMs": first_result_ms.map(|ms| start_time.duration_since(request_started).as_secs_f64() * 1000.0 + ms as f64),
                "diagnostics": diagnostics
            })
        );
    }

    // Emit deep-search summary if enabled.
    if let Some(ref mut tracker) = deep_search_tracker {
        tracker.record_search();
        if format == OutputFormat::Human && !json {
            println!("\x1b[90m{}\x1b[0m", tracker.summary_line());
        }
    }

    Ok(())
}

struct CountingOutput<W> {
    writer: W,
    bytes: usize,
}
impl<W: Write> Write for CountingOutput<W> {
    fn write(&mut self, data: &[u8]) -> std::io::Result<usize> {
        let written = self.writer.write(data)?;
        self.bytes += written;
        Ok(written)
    }
    fn flush(&mut self) -> std::io::Result<()> {
        self.writer.flush()
    }
}

fn clip_snippets(results: &mut [ixos_protocol::ixos_rank::RankedResult], cap: Option<usize>) {
    let Some(cap) = cap else {
        return;
    };
    for result in results {
        if cap == 0 {
            result.context_snippet = None;
            continue;
        }
        if let Some(snippet) = &mut result.context_snippet {
            snippet.raw_matched = snippet.raw_matched.chars().take(cap).collect();
            for line in snippet
                .before
                .iter_mut()
                .chain(snippet.matched.iter_mut())
                .chain(snippet.after.iter_mut())
            {
                *line = line.chars().take(cap).collect();
            }
        }
    }
}

// =============================================================================
// Index Handler
// =============================================================================

async fn handle_index(
    dirs: Vec<PathBuf>,
    use_xattr: bool,
    progress: bool,
    clear: bool,
    config: &IxosConfig,
) -> anyhow::Result<()> {
    if dirs.is_empty() {
        anyhow::bail!("No directories specified. Usage: ixos index <directory>");
    }

    println!("Indexing {} directories...", dirs.len());
    for raw_dir in dirs {
        let dir = std::fs::canonicalize(&raw_dir).unwrap_or(raw_dir);
        if progress {
            print!("  {} ... ", dir.display());
            std::io::stdout().flush()?;
        }

        // Check if directory exists
        if !dir.is_dir() {
            if progress {
                println!("NOT FOUND");
            } else {
                println!("  - {} (not found)", dir.display());
            }
            anyhow::bail!(
                "Index directory not found or not a directory: {}",
                dir.display()
            );
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
        let cache_mode = if use_xattr || config.index.use_xattr {
            ixos_protocol::ixos_rank::semantic_engine::CacheMode::NativeCache
        } else {
            ixos_protocol::ixos_rank::semantic_engine::CacheMode::Ephemeral
        };

        let model = ixos_protocol::ixos_embed::MmapModel2VecEmbedder::new_with_type(
            resolve_flash_model_type(&config.search.model_type)?,
        )?;
        model.ensure_loaded()?;
        let embedder = if config.search.secure_timing {
            ixos_protocol::SecureEmbedder::new_secure(std::sync::Arc::new(model))
        } else {
            ixos_protocol::SecureEmbedder::new_fast(std::sync::Arc::new(model))
        };
        let mut semantic = StubSemanticEngine::with_cache_mode(embedder, cache_mode);
        match semantic.index_directory(&dir).await {
            Ok(count) => {
                let warmed = if cache_mode == ixos_protocol::CacheMode::NativeCache {
                    semantic.precompute_embeddings().await
                } else {
                    0
                };
                if progress {
                    println!("{} eligible files, {} embeddings warmed", count, warmed);
                } else {
                    println!(
                        "  - {} ({} eligible files, {} embeddings warmed)",
                        dir.display(),
                        count,
                        warmed
                    );
                }
            }
            Err(e) => {
                return Err(e.into());
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
    for entry in cache_file_walk(dir) {
        let candidate_path =
            std::fs::canonicalize(entry.path()).unwrap_or_else(|_| entry.into_path());
        let cache = get_cache_for_path(&candidate_path);
        if cache.contains(&candidate_path) && cache.delete(&candidate_path).is_ok() {
            cleared += 1;
        }
    }
    cleared
}

fn cache_file_walk(dir: &Path) -> impl Iterator<Item = ignore::DirEntry> {
    ixos_protocol::ixos_rank::candidate_generator::path_engine::search_walk(
        dir, true, true, false, None,
    )
    .build()
    .filter_map(Result::ok)
    .filter(|entry| {
        entry.file_type().is_some_and(|kind| kind.is_file())
            && ixos_protocol::parsers::can_extract_text(entry.path())
    })
}

fn active_flash_model_fingerprint(
    config_path_override: Option<PathBuf>,
) -> anyhow::Result<[u8; 32]> {
    use ixos_protocol::ixos_embed::MmapModel2VecEmbedder;

    let config = match config_path_override {
        Some(path) => IxosConfig::load_from(path),
        None => IxosConfig::load(),
    };
    let model_type = resolve_flash_model_type(&config.search.model_type)?;
    let model = MmapModel2VecEmbedder::new_with_type(model_type)?;
    model.ensure_loaded()?;
    let embedder = if config.search.secure_timing {
        ixos_protocol::SecureEmbedder::new_secure(std::sync::Arc::new(model))
    } else {
        ixos_protocol::SecureEmbedder::new_fast(std::sync::Arc::new(model))
    };
    Ok(ixos_protocol::ixos_rank::semantic_engine::embedding_cache_fingerprint(&embedder))
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

    let mut config = IxosConfig::load_for_cli(config_path.clone())?;

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

async fn handle_daemon(foreground: bool, stop: bool, status: bool) -> anyhow::Result<()> {
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
        let mut daemon = DaemonService::new(config);
        daemon.start().await?;
        println!("Daemon started. Watching for file changes...");
        // Reuse the CLI runtime; nesting Runtime::block_on here panics.
        let interrupted = tokio::signal::ctrl_c().await;
        println!("\nStopping daemon...");
        daemon.stop().await;
        interrupted?;
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
        CacheCommands::Warm {
            dir,
            profile,
            model_path,
            representation,
            io_workers,
        } => {
            let config = IxosConfig::load_for_cli(
                config_path_override.unwrap_or_else(IxosConfig::default_path),
            )?;
            let mut options = config.retrieval.options(profile)?;
            anyhow::ensure!(
                options.mode != ixos_protocol::retrieval::RetrievalMode::Lexical,
                "Lexical mode has no document vectors to warm"
            );
            options.persist = true;
            options.representation = representation.unwrap_or(options.representation);
            options.io_workers = io_workers.unwrap_or(options.io_workers);
            let model_path = config.retrieval.model(profile, model_path)?;
            let mut engine =
                ixos_protocol::retrieval::Engine::new(&dir, Some(&model_path), options)?;
            println!(
                "{}",
                serde_json::json!({"type":"cacheWarmup","diagnostics":engine.refresh()?})
            );
        }
        CacheCommands::Stats { dir, json, legacy } => {
            let raw_dir = dir.unwrap_or_else(|| PathBuf::from("."));
            let target_dir = std::fs::canonicalize(&raw_dir).unwrap_or(raw_dir);
            if !target_dir.is_dir() {
                anyhow::bail!("Cache directory not found: {}", target_dir.display());
            }
            if !legacy {
                use ixos_protocol::security::crypto::sha256;
                use std::io::Read;
                let mut cache = ixos_protocol::retrieval::cache::DocumentCache::new([0; 32]);
                let (mut total, mut present, mut valid, mut size) =
                    (0usize, 0usize, 0usize, 0usize);
                for entry in cache_file_walk(&target_dir) {
                    total += 1;
                    let path = entry.path().canonicalize()?;
                    let mut raw = Vec::new();
                    std::fs::File::open(&path)?
                        .take(16 * 1024 * 1024 + 1)
                        .read_to_end(&mut raw)?;
                    if raw.len() > 16 * 1024 * 1024 {
                        continue;
                    }
                    let Some(text) = ixos_protocol::parsers::extract_text_from_bytes(
                        &path,
                        &raw,
                        16 * 1024 * 1024 + 1,
                    ) else {
                        continue;
                    };
                    let text = ixos_protocol::retrieval::normalize_text(&text);
                    if text.chars().count() > 16 * 1024 * 1024 {
                        continue;
                    }
                    let mut identity = sha256(&raw).to_vec();
                    identity.extend_from_slice(&sha256(text.as_bytes()));
                    let (found, current, bytes) = cache.inspect(&path, &sha256(&identity), &text);
                    present += usize::from(found);
                    valid += usize::from(current);
                    size += bytes;
                }
                let payload = serde_json::json!({"namespace":"document-v1","total_files":total,"present_entries":present,"cached_files":valid,"cache_size_bytes":size,"model_compatibility":"Not checked; search --stats reports actual model/recipe hits","hit_rate_percent":if total>0 {valid as f64*100.0/total as f64} else {0.0}});
                if json {
                    println!("{payload}");
                } else {
                    println!("Document cache for {}\n{payload}", target_dir.display());
                }
                return Ok(());
            }
            let model_fingerprint = active_flash_model_fingerprint(config_path_override.clone())?;

            // Walk directory and count cached files (validated by current file hash).
            let mut total_files = 0;
            let mut cached_files = 0;
            let mut cache_size_bytes = 0u64;
            let mut present_entries = 0;

            if target_dir.is_dir() {
                for entry in cache_file_walk(&target_dir) {
                    total_files += 1;
                    let candidate_path =
                        std::fs::canonicalize(entry.path()).unwrap_or_else(|_| entry.into_path());
                    let file_hash =
                        match ixos_protocol::ixos_rank::semantic_engine::cached_source_identity(
                            &candidate_path,
                        ) {
                            Ok(hash) => hash,
                            Err(_) => continue,
                        };
                    let cache =
                        get_cache_for_path_with_fingerprint(&candidate_path, model_fingerprint);
                    if cache.contains(&candidate_path) {
                        present_entries += 1;
                    }
                    if let Ok(Some(embedding)) = cache.get(&candidate_path, &file_hash) {
                        cached_files += 1;
                        cache_size_bytes += (embedding.len() as u64 * 2) + 101;
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
                println!("  \"present_entries\": {},", present_entries);
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
            if !target_dir.is_dir() {
                anyhow::bail!("Cache directory not found: {}", target_dir.display());
            }

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
            let mut documents = ixos_protocol::retrieval::cache::DocumentCache::new([0; 32]);
            if target_dir.is_dir() {
                for entry in cache_file_walk(&target_dir) {
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
                    if cache.contains(&candidate_path) && cache.delete(&candidate_path).is_ok() {
                        cleared += 1;
                    }
                    if documents.remove(&candidate_path)? {
                        cleared += 1;
                    }
                }
            }

            println!("Cleared {} cache entries.", cleared);
        }

        CacheCommands::Audit { detailed, verify } => {
            println!("Cache Audit");
            println!("{}", "-".repeat(50));
            let model_fingerprint = active_flash_model_fingerprint(config_path_override.clone())?;

            let raw_cwd = std::env::current_dir()?;
            let cwd = std::fs::canonicalize(&raw_cwd).unwrap_or(raw_cwd);
            let mut total: usize = 0;
            let mut valid = 0;
            let mut invalid = 0;

            for entry in cache_file_walk(&cwd) {
                let cache = get_cache_for_path_with_fingerprint(entry.path(), model_fingerprint);

                // P2 Badge: Use real file hash when detecting cached entries for audit
                let file_hash =
                    match ixos_protocol::ixos_rank::semantic_engine::cached_source_identity(
                        entry.path(),
                    ) {
                        Ok(h) => h,
                        Err(e) => {
                            if detailed {
                                println!("SKIP: {} (hash error: {})", entry.path().display(), e);
                            }
                            continue;
                        }
                    };

                if cache.contains(entry.path()) {
                    total += 1;
                }
                if let Ok(Some(embedding)) = cache.get(entry.path(), &file_hash) {
                    if verify {
                        // Check embedding dimensions and values
                        let is_valid =
                            !embedding.is_empty() && embedding.iter().all(|&v| v.is_finite());

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
            invalid = invalid.max(total.saturating_sub(valid));
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
            if !dir.is_dir() {
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

            let config = match config_path_override {
                Some(path) => IxosConfig::load_from(path),
                None => IxosConfig::load(),
            };
            let model_type = resolve_flash_model_type(&config.search.model_type)?;
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
            model.ensure_loaded()?;
            let embedder = if config.search.secure_timing {
                SecureEmbedder::new_secure(Arc::new(model))
            } else {
                SecureEmbedder::new_fast(Arc::new(model))
            };
            clear_embedding_cache_for_directory(&rebuild_dir);
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
        println!("  - CPU code/document/lexical retrieval profiles");
        println!("  - Signed ADS/xattr records and application-cache fallback");
        println!("  - Bounded exact grep/read and resident JSONL sessions");
        println!("  - Retained desktop progressive/compliance utilities");

        println!();
        println!("Config file: {}", IxosConfig::default_path().display());
        println!(
            "Compliance storage: {}",
            ixos_protocol::compliance::compliance_dir().display()
        );
    }
}

async fn handle_release_check(quick: bool) -> anyhow::Result<()> {
    println!("Release verification requires captured native checks");
    println!("------------------");
    if quick {
        println!("Quick mode enabled.");
    }
    println!("See docs/engineering/RELEASE.md and .github/workflows/engine-ci.yml.");
    println!("  cargo test --workspace --locked --jobs 2");
    println!("  python -m unittest discover -s eval -t .");
    println!("  python scripts/verify_restored_cli.py --help");
    anyhow::bail!("Release readiness is not established by this command; native platform and historical credential checks remain required")
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
        ModelCommands::List { all, json, remote } => {
            if remote {
                let models = ixos_protocol::ixos_embed::MmapModel2VecEmbedder::remote_models();
                if json {
                    #[derive(serde::Serialize)]
                    struct RemoteModelJson {
                        model_id: String,
                        display_name: String,
                        description: String,
                        hf_id: Option<String>,
                        tier: String,
                        size_mb: Option<f32>,
                    }
                    let payload: Vec<RemoteModelJson> = models
                        .into_iter()
                        .map(|m| RemoteModelJson {
                            model_id: m.model_id,
                            display_name: m.display_name,
                            description: m.description,
                            hf_id: m.hf_id,
                            tier: m.tier,
                            size_mb: m.size_mb,
                        })
                        .collect();
                    println!("{}", serde_json::to_string_pretty(&payload)?);
                } else {
                    println!("Available Remote Models (downloadable from HuggingFace):");
                    println!("");
                    for m in models {
                        let download_status = if m.hf_id.is_some() {
                            "Downloadable"
                        } else {
                            "Local only"
                        };
                        println!("  {} ({})", m.model_id, download_status);
                        println!("    Description: {}", m.description);
                        if let Some(size) = m.size_mb {
                            println!("    Size: ~{:.0} MB", size);
                        }
                        if let Some(hf) = &m.hf_id {
                            println!("    HF ID: {}", hf);
                        }
                        println!("");
                    }
                }
                return Ok(());
            }

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
        ModelCommands::Download {
            model,
            all,
            progress,
        } => {
            use ixos_protocol::ixos_embed::MmapModel2VecEmbedder;

            let remote_catalog = MmapModel2VecEmbedder::remote_models();

            let models_to_download: Vec<_> = if all {
                remote_catalog
                    .into_iter()
                    .filter(|m| m.hf_id.is_some())
                    .collect()
            } else if let Some(model_name) = model {
                let name_lower = model_name.to_lowercase();
                remote_catalog
                    .into_iter()
                    .filter(|m| {
                        m.model_id.to_lowercase() == name_lower
                            || m.display_name.to_lowercase().contains(&name_lower)
                    })
                    .collect()
            } else {
                // Default: only download potion (the only model2vec-compatible model)
                remote_catalog
                    .into_iter()
                    .filter(|m| m.model_id == "potion")
                    .collect()
            };

            if models_to_download.is_empty() {
                println!("No downloadable models found.");
                println!("Use 'ixos model list --remote' to see available models.");
                println!("Note: ixos-flash-v2, ixos-pro-v2 are local models that must be built using Python scripts:");
                println!("  python scripts/distill_model2vec_lab.py --mode flash --flash-id ixos-flash-v2");
                println!(
                    "  python scripts/distill_model2vec_lab.py --mode pro --pro-id ixos-pro-v2"
                );
                return Ok(());
            }

            println!("Downloading {} model(s)...", models_to_download.len());

            for entry in models_to_download {
                if let Some(hf_id) = entry.hf_id {
                    println!("\nDownloading {} from HuggingFace...", entry.model_id);
                    println!("  HF ID: {}", hf_id);

                    // Get the models directory
                    let models_dir = dirs::data_local_dir()
                        .unwrap_or_else(|| std::path::PathBuf::from("."))
                        .join("Ixos")
                        .join("models")
                        .join(entry.model_id.clone());

                    // Convert to forward slashes for Python compatibility on Windows
                    let models_dir_str = models_dir.display().to_string().replace('\\', "/");

                    println!("  Target: {}", models_dir_str);

                    // Use Python directly with -c and proper escaping
                    let python_script = format!(
                        "import sys; from model2vec import StaticModel; m = StaticModel.from_pretrained('{}'); m.save_pretrained('{}')",
                        hf_id,
                        models_dir_str
                    );

                    if progress {
                        println!("  Running: python -c '...' ");
                    }

                    match std::process::Command::new("python")
                        .args(["-c", &python_script])
                        .output()
                    {
                        Ok(output) => {
                            if output.status.success() {
                                println!("  [OK] Downloaded successfully to {:?}", models_dir);
                            } else {
                                let stderr = String::from_utf8_lossy(&output.stderr);
                                println!(
                                    "  [ERROR] Download failed: {}",
                                    stderr.lines().last().unwrap_or("Unknown error")
                                );
                                println!("  Note: Some models require the fetch_models.py script:");
                                println!("    python scripts/fetch_models.py --manifest models/lab/manifest.json");
                            }
                        }
                        Err(e) => {
                            println!("  [ERROR] Failed to run Python: {}. Make sure Python and model2vec are installed.", e);
                            println!("  Install with: pip install model2vec");
                        }
                    }
                } else {
                    println!(
                        "\n{}: Local-only model, cannot download from HuggingFace",
                        entry.model_id
                    );
                    println!("  To build this model, run:");
                    if entry.model_id.contains("flash") {
                        println!("    python scripts/distill_model2vec_lab.py --mode flash --flash-id {}", entry.model_id);
                    } else if entry.model_id.contains("pro") {
                        println!(
                            "    python scripts/distill_model2vec_lab.py --mode pro --pro-id {}",
                            entry.model_id
                        );
                    }
                }
            }
            println!("\nDone!");
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
