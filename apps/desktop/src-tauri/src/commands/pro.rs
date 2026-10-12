//! Local query understanding and evidence extraction. No account is required.
use ixos_core::ixos_rank::candidate_generator::QueryPreprocessor;
use ixos_core::{
    ask_mode_plus as run_ask_mode_plus, extract_answer_card as run_extract_answer_card, AnswerCard,
    AskModePlusResult,
};

#[tauri::command]
pub async fn ask_mode_plus(query: String) -> Result<AskModePlusResult, String> {
    let mut preprocessor = QueryPreprocessor::with_defaults();
    Ok(run_ask_mode_plus(&preprocessor.preprocess(&query)))
}

#[tauri::command]
pub async fn extract_answer_card(passage: String, query: String) -> Result<AnswerCard, String> {
    Ok(run_extract_answer_card(&passage, &query))
}
