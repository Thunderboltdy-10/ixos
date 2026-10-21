//! Stable runtime search options.
use crate::config::Profile;
use serde::{Deserialize, Serialize};
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, clap::ValueEnum, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum RetrievalMode {
    Lexical,
    Semantic,
    #[default]
    Hybrid,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Options {
    pub mode: RetrievalMode,
    pub profile: Profile,
    pub persist: bool,
    pub limit: usize,
    pub context: usize,
    pub output_bytes: usize,
    pub max_file_bytes: usize,
    pub max_corpus_bytes: usize,
}
impl Default for Options {
    fn default() -> Self {
        Self {
            mode: RetrievalMode::Hybrid,
            profile: Profile::Code,
            persist: true,
            limit: 10,
            context: 2,
            output_bytes: 12000,
            max_file_bytes: 16 * 1024 * 1024,
            max_corpus_bytes: 256 * 1024 * 1024,
        }
    }
}
