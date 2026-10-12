use crate::{commands::settings::Settings, state::AppState};
use ixos_core::engine::{Engine, RetrievalMode};
use serde_json::{json, Value};
use std::sync::atomic::Ordering;
use tauri::{ipc::Channel, Manager, State};

#[tauri::command]
pub async fn search_progressive(
    app: tauri::AppHandle,
    query: String,
    directory: Option<String>,
    on_event: Channel<Value>,
) -> Result<(), String> {
    let settings = Settings::load();
    let locations = settings
        .search
        .locations
        .iter()
        .filter(|path| {
            directory
                .as_ref()
                .is_none_or(|dir| path.to_string_lossy() == dir.as_str())
        })
        .cloned()
        .collect::<Vec<_>>();
    if locations.is_empty() {
        return Err("Choose a search location in Settings".into());
    }
    let generation = app
        .state::<AppState>()
        .generation
        .fetch_add(1, Ordering::SeqCst)
        + 1;
    tauri::async_runtime::spawn_blocking(move ||->Result<(),String> {
        let state=app.state::<AppState>();
        let mut engines=state.engines.lock().map_err(|e|e.to_string())?;
        for mode in [RetrievalMode::Lexical,RetrievalMode::Hybrid] {
            let mut results=Vec::new();
            for location in &locations {
                if state.generation.load(Ordering::SeqCst)!=generation {return Ok(());}
                let key=format!("{}:{mode:?}",location.display());
                if !engines.contains_key(&key) {
                    let mut options=settings.search.options(settings.search.profile);options.mode=mode;
                    let path=settings.search.model_path(settings.search.profile,None);
                    engines.insert(key.clone(),Engine::new(location,Some(&path),options).map_err(|e|e.to_string())?);
                }
                let (raw,_)=engines.get_mut(&key).unwrap().search(&query).map_err(|e|e.to_string())?;
                let value:Value=serde_json::from_slice(&raw).map_err(|e|e.to_string())?;
                for row in value["results"].as_array().unwrap() {
                    let path=location.join(row["path"].as_str().unwrap());
                    let mut result=row.clone();
                    result["path"]=json!(path);
                    result["filename"]=json!(path.file_name().unwrap_or_default().to_string_lossy());
                    result["directory"]=json!(location);
                    result["snippet"]=json!(row["snippet"]["text"].as_str().unwrap_or(""));
                    results.push(result);
                }
            }
            results.sort_by(|a,b|b["score"].as_f64().unwrap_or(0.0).total_cmp(&a["score"].as_f64().unwrap_or(0.0)));
            results.truncate(settings.search.limit);
            if state.generation.load(Ordering::SeqCst)!=generation {return Ok(());}
            on_event.send(json!({"type":if mode==RetrievalMode::Lexical {"lexicalResults"} else {"semanticResults"},"count":results.len(),"results":results})).map_err(|e|e.to_string())?;
        }
        on_event.send(json!({"type":"complete"})).map_err(|e|e.to_string())
    }).await.map_err(|e|e.to_string())?
}
#[tauri::command]
pub fn cancel_search(state: State<'_, AppState>) {
    state.generation.fetch_add(1, Ordering::SeqCst);
}
