//! Shared search settings for the CLI and desktop.
use crate::protocol::Options;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

/// Explicit portable/test root; defaults retain the native platform locations.
/// Skill discovery has its own IXOS_SKILL_HOME and is never redirected implicitly.
fn application_dir(kind: &str, native: Option<PathBuf>) -> PathBuf {
    std::env::var_os("IXOS_HOME")
        .filter(|p| !p.is_empty())
        .map(|p| PathBuf::from(p).join(kind))
        .unwrap_or_else(|| native.unwrap_or_else(std::env::temp_dir).join("ixos"))
}
pub fn settings_dir() -> PathBuf {
    application_dir("config", dirs::config_dir())
}
pub fn data_dir() -> PathBuf {
    application_dir("data", dirs::data_local_dir())
}
pub fn cache_dir() -> PathBuf {
    application_dir("cache", dirs::cache_dir())
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, clap::ValueEnum, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Profile {
    #[default]
    Code,
    Documents,
}
impl Profile {
    pub fn name(self) -> &'static str {
        match self {
            Self::Code => "code",
            Self::Documents => "documents",
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default, deny_unknown_fields)]
pub struct Config {
    pub locations: Vec<PathBuf>,
    pub profile: Profile,
    pub limit: usize,
    pub context: usize,
    pub cache: bool,
    pub model_dir: PathBuf,
}
impl Default for Config {
    fn default() -> Self {
        Self {
            locations: Vec::new(),
            profile: Profile::Code,
            limit: 10,
            context: 2,
            cache: true,
            model_dir: data_dir().join("models"),
        }
    }
}
impl Config {
    pub fn path() -> PathBuf {
        settings_dir().join("settings.toml")
    }
    pub fn load(path: &Path) -> anyhow::Result<Self> {
        let result = match std::fs::read_to_string(path) {
            Ok(text) => toml::from_str(&text)?,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Self::default(),
            Err(e) => return Err(e.into()),
        };
        result.validate()?;
        Ok(result)
    }
    pub fn validate(&self) -> anyhow::Result<()> {
        anyhow::ensure!(
            (1..=10000).contains(&self.limit) && self.context <= 100,
            "Limit must be 1–10000 and context at most 100"
        );
        Ok(())
    }
    pub fn save(&self, path: &Path) -> anyhow::Result<()> {
        self.validate()?;
        if let Some(parent) = path.parent().filter(|p| !p.as_os_str().is_empty()) {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::write(path, toml::to_string_pretty(self)?)?;
        Ok(())
    }
    pub fn model_path(&self, profile: Profile, explicit: Option<PathBuf>) -> PathBuf {
        explicit
            .or_else(|| std::env::var_os("IXOS_MODEL_PATH").map(PathBuf::from))
            .unwrap_or_else(|| self.model_dir.join(profile.name()))
    }
    pub fn options(&self, profile: Profile) -> Options {
        Options {
            profile,
            limit: self.limit,
            context: self.context,
            persist: self.cache,
            output_bytes: 6000,
            ..Default::default()
        }
    }
}
