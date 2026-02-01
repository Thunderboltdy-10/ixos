use crate::pro_loader::{AnswerCard, AskModePlusResult, ProModule};
use crate::state::AppState;
use ixos_protocol::capabilities::Capability;
use ixos_protocol::security::DeviceIdentity;
use ixos_protocol::ixos_rank::candidate_generator::QueryPreprocessor;
use tauri::State;

#[tauri::command]
pub async fn load_pro_module(state: State<'_, AppState>) -> Result<(), String> {
    ensure_pro_module_loaded(&state).await?;
    Ok(())
}

#[tauri::command]
pub async fn ask_mode_plus(
    state: State<'_, AppState>,
    query: String,
) -> Result<AskModePlusResult, String> {
    ensure_pro_module_loaded(&state).await?;

    let mut preprocessor = QueryPreprocessor::with_defaults();
    let processed = preprocessor.preprocess(&query);

    let module_guard = state.pro_module.lock();
    let module = module_guard
        .as_ref()
        .ok_or_else(|| "Pro module not loaded".to_string())?;
    module
        .ask_mode_plus(&processed)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn extract_answer_card(
    state: State<'_, AppState>,
    passage: String,
    query: String,
) -> Result<AnswerCard, String> {
    ensure_pro_module_loaded(&state).await?;
    let module_guard = state.pro_module.lock();
    let module = module_guard
        .as_ref()
        .ok_or_else(|| "Pro module not loaded".to_string())?;
    module
        .extract_answer_card(&passage, &query)
        .map_err(|e| e.to_string())
}

async fn ensure_pro_module_loaded(state: &State<'_, AppState>) -> Result<(), String> {
    let token = state
        .get_entitlement_token()
        .ok_or_else(|| "Authentication required".to_string())?;

    let device = DeviceIdentity::load_or_create().map_err(|e| e.to_string())?;

    {
        let mut manager = state.entitlement_manager.lock();
        manager.refresh_if_needed(Some(token.clone()), &device)?;
        if !manager.is_valid() {
            return Err("Entitlement expired".into());
        }
        if !manager.capabilities().has(Capability::AskModePlus) {
            return Err("Pro capability required".into());
        }
    }

    let should_load = state.pro_module.lock().is_none();
    if should_load {
        let module = ProModule::download_and_load(device.clone(), token.clone())
            .await
            .map_err(|e| format!("Failed to load pro module: {}", e))?;
        *state.pro_module.lock() = Some(module);
    }

    Ok(())
}


