use super::{recent, settings::Settings};
use crate::state::{AppState, LocationStatus};
use ixos_core::engine::{Engine, RetrievalMode};
use serde_json::{json, Value};
use std::{path::PathBuf, sync::atomic::Ordering};
use tauri::{ipc::Channel, Emitter, Manager, State};

fn key(locations: &[PathBuf]) -> Result<Vec<PathBuf>, String> {
    let mut paths = locations
        .iter()
        .map(|path| path.canonicalize().map_err(|error| error.to_string()))
        .collect::<Result<Vec<_>, _>>()?;
    paths.sort();
    paths.dedup();
    Ok(paths)
}
fn publish(
    app: &tauri::AppHandle,
    locations: &[PathBuf],
    engine: Option<&Engine>,
    stage: &str,
    error: Option<String>,
) {
    let statuses = locations
        .iter()
        .map(|directory| {
            let (file_count, source_bytes) = engine
                .map(|engine| engine.source_stats(directory))
                .unwrap_or_default();
            let discovered = if engine.is_some() {
                ixos_core::discover::search_walk(directory, true, true, false, None)
                    .build()
                    .filter_map(Result::ok)
                    .filter(|entry| entry.file_type().is_some_and(|kind| kind.is_file()))
                    .count()
            } else {
                0
            };
            LocationStatus {
                directory: dunce::simplified(directory).to_path_buf(),
                file_count,
                source_bytes,
                skipped_files: discovered.saturating_sub(file_count),
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
pub fn warm(app: tauri::AppHandle) {
    let settings = Settings::load();
    let generation = app
        .state::<AppState>()
        .warming_generation
        .fetch_add(1, Ordering::SeqCst)
        + 1;
    drop(tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<AppState>();
        let locations = match key(&settings.search.locations) {
            Ok(locations) => locations,
            Err(error) => {
                publish(&app, &settings.search.locations, None, "error", Some(error));
                return;
            }
        };
        if locations.is_empty() {
            publish(&app, &locations, None, "ready", None);
            return;
        }
        publish(&app, &locations, None, "discover", None);
        let result = (|| -> Result<(), String> {
            let mut resident = state.engine.lock().map_err(|error| error.to_string())?;
            let mut options = settings.search.options(settings.search.profile);
            options.mode = RetrievalMode::Lexical;
            if resident.is_none() {
                *resident = Some(
                    Engine::new_locations(&locations, None, options)
                        .map_err(|error| error.to_string())?,
                );
            }
            let engine = resident.as_mut().unwrap();
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
            publish(&app, &locations, Some(engine), "lexical", None);
            let model = settings.search.model_path(settings.search.profile, None);
            if !model.join("model.safetensors").is_file() {
                publish(&app, &locations, Some(engine), "ready", None);
                return Ok(());
            }
            publish(&app, &locations, Some(engine), "semantic", None);
            engine
                .configure_search(
                    RetrievalMode::Hybrid,
                    settings.search.limit,
                    settings.search.context,
                    Some(&model),
                )
                .map_err(|error| error.to_string())?;
            engine.refresh().map_err(|error| error.to_string())?;
            if state.warming_generation.load(Ordering::SeqCst) == generation {
                publish(&app, &locations, Some(engine), "ready", None);
            }
            Ok(())
        })();
        if let Err(error) = result {
            publish(&app, &locations, None, "error", Some(error));
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
    let locations = key(&settings.search.locations)?;
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
    tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        let state = app.state::<AppState>();
        let mut resident = state.engine.lock().map_err(|error| error.to_string())?;
        let mut options = settings.search.options(settings.search.profile);
        options.mode = RetrievalMode::Lexical;
        if resident.is_none() {
            *resident = Some(Engine::new_locations(&locations, None, options)
                .map_err(|error| error.to_string())?);
        }
        let engine = resident.as_mut().unwrap();
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
                if mode == RetrievalMode::Lexical {
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
            let event_type = if mode == RetrievalMode::Lexical { "lexicalResults" } else { "semanticResults" };
            emit(json!({"type": event_type, "results": value["results"], "stats": stats}))?;
        }
        if state.generation.load(Ordering::SeqCst) != generation {
            return Ok(());
        }
        let directory = directory.map(|path| dunce::simplified(&path).to_path_buf());
        let _ = recent::record(&app, &query, directory);
        emit(json!({"type": "complete"}))
    }).await.map_err(|error| error.to_string())?
}
#[tauri::command]
pub fn cancel_search(state: State<'_, AppState>) {
    state.generation.fetch_add(1, Ordering::SeqCst);
}
