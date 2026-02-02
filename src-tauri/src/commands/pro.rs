use std::time::SystemTime;

use crate::state::AppState;
use ixos_protocol::capabilities::Capability;
use ixos_protocol::entitlements::ProStatus;
use ixos_protocol::security::DeviceIdentity;
use ixos_protocol::{
    ask_mode_plus as run_ask_mode_plus,
    extract_answer_card as run_extract_answer_card,
    AnswerCard,
    AskModePlusResult,
};
use ixos_protocol::ixos_rank::candidate_generator::QueryPreprocessor;
use tauri::State;

#[tauri::command]
pub async fn ask_mode_plus(
    state: State<'_, AppState>,
    query: String,
) -> Result<AskModePlusResult, String> {
    let device = DeviceIdentity::load_or_create().map_err(|e| e.to_string())?;
    let mut manager = state.entitlement_manager.lock();
    let status = manager.pro_status(SystemTime::now(), &device);
    if !status.is_enabled() {
        return Err(match status {
            ProStatus::TimeSuspect { .. } => {
                "Local time change detected - refresh required to re-enable Pro".to_string()
            }
            _ => "Entitlement expired".to_string(),
        });
    }
    if !manager.capabilities().has(Capability::AskModePlus) {
        return Err("Pro capability required".into());
    }

    let mut preprocessor = QueryPreprocessor::with_defaults();
    let processed = preprocessor.preprocess(&query);

    Ok(run_ask_mode_plus(&processed))
}

#[tauri::command]
pub async fn extract_answer_card(
    state: State<'_, AppState>,
    passage: String,
    query: String,
) -> Result<AnswerCard, String> {
    let device = DeviceIdentity::load_or_create().map_err(|e| e.to_string())?;
    let mut manager = state.entitlement_manager.lock();
    let status = manager.pro_status(SystemTime::now(), &device);
    if !status.is_enabled() {
        return Err(match status {
            ProStatus::TimeSuspect { .. } => {
                "Local time change detected - refresh required to re-enable Pro".to_string()
            }
            _ => "Entitlement expired".to_string(),
        });
    }
    if !manager.capabilities().has(Capability::AskModePlus) {
        return Err("Pro capability required".into());
    }

    Ok(run_extract_answer_card(&passage, &query))
}
