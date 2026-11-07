use super::{recent, settings::Settings};
use crate::state::{AppState, LocationStatus};
use ixos_runtime::{
    client::{Cancellation, Engine},
    protocol::{Progress, RetrievalMode, Stage},
};
use serde_json::{json, Value};
use std::{path::PathBuf, sync::atomic::Ordering};
use tauri::{ipc::Channel, Emitter, Manager, State};

/// The chosen folders that still exist. The status line reports the others.
fn key(locations: &[PathBuf]) -> Vec<PathBuf> {
    let mut paths = locations
        .iter()
        .filter_map(|path| path.canonicalize().ok())
        .collect::<Vec<_>>();
    paths.sort();
    paths.dedup();
    paths
}
fn publish(app: &tauri::AppHandle, engine: Option<&Engine>, stage: &str, error: Option<String>) {
    let statuses = Settings::load()
        .search
        .locations
        .iter()
        .map(|chosen| {
            let Ok(directory) = chosen.canonicalize() else {
                return LocationStatus {
                    directory: chosen.clone(),
                    stage: "error".into(),
                    error: Some(format!(
                        "{} is no longer there. Restore it or remove it in Settings.",
                        chosen.display()
                    )),
                    ..Default::default()
                };
            };
            let source = engine
                .map(|engine| engine.source(&directory))
                .unwrap_or_default();
            LocationStatus {
                directory: dunce::simplified(&directory).to_path_buf(),
                file_count: source.files,
                line_count: source.lines,
                source_bytes: source.bytes,
                skipped_files: source.discovered.saturating_sub(source.files),
                budget_bytes: 256 * 1024 * 1024,
                stage: stage.into(),
                error: error.clone(),
            }
        })
        .collect::<Vec<_>>();
    if let Ok(mut state) = app.state::<AppState>().locations.lock() {
        *state = statuses.clone();
    }
    let _ = app.emit("warming", statuses);
}
/// Tells the windows how far reading has got, as one percentage over both passes.
fn show_progress(app: tauri::AppHandle, has_model: bool) -> impl FnMut(Progress) + Send + 'static {
    // Measured on real folders, embedding takes from about as long as reading to several
    // times longer, depending on how much text the files hold.
    let read_share = if has_model { 0.4 } else { 1.0 };
    move |progress| {
        let percent = match progress.stage {
            Stage::Walking => 0.0,
            Stage::Reading => progress.fraction * read_share,
            Stage::Embedding => read_share + (1.0 - read_share) * progress.fraction,
        };
        let _ = app.emit(
            "reading",
            json!({
                "stage": progress.stage,
                "percent": percent,
                "done": progress.done,
                "total": progress.total,
            }),
        );
    }
}
fn hide_progress(app: &tauri::AppHandle) {
    let _ = app.emit("reading", Value::Null);
}
fn has_model(settings: &Settings) -> bool {
    settings
        .search
        .model_path(settings.search.profile, None)
        .join("model.safetensors")
        .is_file()
}
/// Read the chosen folders ahead of the first search.
pub fn warm(app: tauri::AppHandle) {
    let settings = Settings::load();
    crate::watcher::sync(&app, &settings);
    start_warming(app, settings, false);
}
/// Catch up with changed files without telling the windows, unless a read is already showing.
pub fn refresh_quietly(app: tauri::AppHandle) {
    let settled = app.state::<AppState>().locations.lock().is_ok_and(|locations| {
        locations
            .iter()
            .all(|location| matches!(location.stage.as_str(), "ready" | "error"))
    });
    if settled {
        start_warming(app, Settings::load(), true);
    }
}
fn start_warming(app: tauri::AppHandle, settings: Settings, quiet: bool) {
    let generation = app
        .state::<AppState>()
        .warming_generation
        .fetch_add(1, Ordering::SeqCst)
        + 1;
    drop(tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<AppState>();
        let locations = key(&settings.search.locations);
        if locations.is_empty() {
            publish(&app, None, "ready", None);
            return;
        }
        if !quiet {
            publish(&app, None, "discover", None);
        }
        let result = (|| -> Result<(), String> {
            let mut resident = state.engine.lock().map_err(|error| error.to_string())?;
            if state.warming_generation.load(Ordering::Acquire) != generation {
                return Ok(());
            }
            if resident
                .as_ref()
                .is_some_and(|engine| !engine.is_healthy() || engine.roots() != locations)
            {
                *resident = None;
            }
            let cancellation = Cancellation::new(state.warming_generation.clone(), generation);
            let mut options = settings.search.options(settings.search.profile);
            options.mode = RetrievalMode::Lexical;
            if resident.is_none() {
                *resident = Some(
                    Engine::new_locations_cancelled(
                        &locations,
                        None,
                        options,
                        Some(cancellation.clone()),
                    )
                    .map_err(|error| error.to_string())?,
                );
            }
            let engine = resident.as_mut().unwrap();
            engine.set_cancellation(cancellation);
            let has_model = has_model(&settings);
            if quiet {
                engine.set_progress(|_| {});
            } else {
                engine.set_progress(show_progress(app.clone(), has_model));
            }
            engine
                .configure_search(
                    RetrievalMode::Lexical,
                    settings.search.limit,
                    settings.search.context,
                    None,
                )
                .map_err(|error| error.to_string())?;
            engine.refresh().map_err(|error| error.to_string())?;
            if state.warming_generation.load(Ordering::SeqCst) != generation {
                return Ok(());
            }
            if has_model {
                if !quiet {
                    publish(&app, Some(engine), "lexical", None);
                    publish(&app, Some(engine), "semantic", None);
                }
                let model = settings.search.model_path(settings.search.profile, None);
                engine
                    .configure_search(
                        RetrievalMode::Hybrid,
                        settings.search.limit,
                        settings.search.context,
                        Some(&model),
                    )
                    .map_err(|error| error.to_string())?;
                engine.refresh().map_err(|error| error.to_string())?;
            }
            if state.warming_generation.load(Ordering::SeqCst) == generation {
                hide_progress(&app);
                publish(&app, Some(engine), "ready", None);
            }
            Ok(())
        })();
        if let Err(error) = result {
            if state.warming_generation.load(Ordering::Acquire) == generation {
                hide_progress(&app);
                publish(&app, None, "error", Some(error));
            }
        }
    }));
}
#[tauri::command]
pub fn get_location_status(state: State<'_, AppState>) -> Result<Vec<LocationStatus>, String> {
    state
        .locations
        .lock()
        .map(|locations| locations.clone())
        .map_err(|error| error.to_string())
}
#[tauri::command]
pub async fn search_progressive(
    app: tauri::AppHandle,
    query: String,
    directory: Option<PathBuf>,
    on_event: Channel<Value>,
) -> Result<(), String> {
    let settings = Settings::load();
    let directory = directory
        .map(|path| path.canonicalize().map_err(|error| error.to_string()))
        .transpose()?;
    let locations = key(&settings.search.locations);
    if locations.is_empty() {
        return Err("Choose a search location in Settings".into());
    }
    if directory
        .as_ref()
        .is_some_and(|directory| !locations.contains(directory))
    {
        return Err("Choose one of the configured locations".into());
    }
    let generation = app
        .state::<AppState>()
        .generation
        .fetch_add(1, Ordering::SeqCst)
        + 1;
    // Search takes precedence over a background warm that may own the engine. It answers
    // quickly and keeps what it has read, and this search carries on from there.
    app.state::<AppState>()
        .warming_generation
        .fetch_add(1, Ordering::AcqRel);
    let started = std::time::Instant::now();
    tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        let state = app.state::<AppState>();
        let mut first_results = None;
        let result = (|| -> Result<(), String> {
        let mut resident = state.engine.lock().map_err(|error| error.to_string())?;
        if state.generation.load(Ordering::Acquire) != generation { return Ok(()); }
        if resident.as_ref().is_some_and(|engine| !engine.is_healthy() || engine.roots() != locations) { *resident = None; }
        let cancellation = Cancellation::new(state.generation.clone(), generation);
        let mut options = settings.search.options(settings.search.profile);
        options.mode = RetrievalMode::Lexical;
        if resident.is_none() {
            *resident = Some(Engine::new_locations_cancelled(&locations, None, options, Some(cancellation.clone()))
                .map_err(|error| error.to_string())?);
        }
        let engine = resident.as_mut().unwrap();
        engine.set_cancellation(cancellation);
        engine.set_progress(show_progress(app.clone(), has_model(&settings)));
        let model = settings.search.model_path(settings.search.profile, None);
        let emit = |event| on_event.send(event).map_err(|error| error.to_string());
        for mode in [RetrievalMode::Lexical, RetrievalMode::Hybrid] {
            if state.generation.load(Ordering::SeqCst) != generation {
                return Ok(());
            }
            let stage = if mode == RetrievalMode::Lexical { "discover" } else { "semantic" };
            emit(json!({"type": "phase", "stage": stage}))?;
            if mode == RetrievalMode::Hybrid && !model.join("model.safetensors").is_file() {
                let message = format!("Using keyword search. Install the {} model in Settings for hybrid search.",
                    settings.search.profile.name());
                emit(json!({"type": "warning", "message": message}))?;
                break;
            }
            if let Err(error) = engine.configure_search(
                mode, settings.search.limit, settings.search.context, Some(&model),
            ) {
                if mode == RetrievalMode::Lexical || !engine.is_healthy() {
                    return Err(error.to_string());
                }
                emit(json!({"type": "warning", "message": format!("Using keyword search. The model could not load: {error}")}))?;
                break;
            }
            let (raw, stats) = engine.search_location(&query, directory.as_deref())
                .map_err(|error| error.to_string())?;
            if state.generation.load(Ordering::SeqCst) != generation {
                return Ok(());
            }
            let mut value: Value = serde_json::from_slice(&raw).map_err(|error| error.to_string())?;
            for row in value["results"].as_array_mut().unwrap() {
                let result_path = PathBuf::from(row["path"].as_str().unwrap());
                let path = if result_path.is_absolute() {
                    result_path
                } else {
                    locations[0].join(result_path)
                };
                let path = dunce::simplified(&path).to_path_buf();
                row["path"] = json!(path);
                row["filename"] = json!(path.file_name().unwrap_or_default().to_string_lossy());
                if let Some(snippet) = row.get_mut("snippet") {
                    snippet["path"] = json!(path);
                }
            }
            let elapsed = started.elapsed().as_secs_f32() * 1000.0;
            first_results.get_or_insert(elapsed);
            let event_type = if mode == RetrievalMode::Lexical { "lexicalResults" } else { "semanticResults" };
            emit(json!({"type": event_type, "results": value["results"], "stats": stats, "elapsedMs": elapsed}))?;
        }
        if state.generation.load(Ordering::SeqCst) != generation {
            return Ok(());
        }
        let searched = locations
            .iter()
            .filter(|root| directory.as_ref().is_none_or(|directory| directory == *root))
            .map(|root| engine.source(root))
            .fold((0, 0), |(files, lines), source| (files + source.files, lines + source.lines));
        if let Some(wait) = first_results {
            let _ = super::usage::record(searched.0, searched.1, wait);
        }
        let directory = directory.map(|path| dunce::simplified(&path).to_path_buf());
        let _ = recent::record(&app, &query, directory);
        // This search may have finished a read it took over from the warm.
        hide_progress(&app);
        publish(&app, Some(engine), "ready", None);
        emit(json!({"type": "complete"}))
        })();
        if state.generation.load(Ordering::Acquire) != generation { Ok(()) } else {
            if result.is_err() { hide_progress(&app); }
            result
        }
    }).await.map_err(|error| error.to_string())?
}
#[tauri::command]
pub fn cancel_search(state: State<'_, AppState>) {
    state.generation.fetch_add(1, Ordering::SeqCst);
}

/// Lines around a result for the preview column. Paths must belong to a chosen location.
#[tauri::command]
pub async fn read_preview(
    app: tauri::AppHandle,
    path: PathBuf,
    start: usize,
    lines: usize,
) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let locations = key(&Settings::load().search.locations);
        let file = path.canonicalize().map_err(|error| error.to_string())?;
        let root = locations
            .iter()
            .filter(|root| file.starts_with(root))
            .max_by_key(|root| root.as_os_str().len())
            .ok_or("This file is outside your folders")?;
        let state = app.state::<AppState>();
        let mut resident = state.engine.lock().map_err(|error| error.to_string())?;
        let engine = resident.as_mut().ok_or("Search is still starting")?;
        engine
            .read(root, &file, start.max(1), lines.clamp(1, 400))
            .map_err(|error| error.to_string())
    })
    .await
    .map_err(|error| error.to_string())?
}
