//! Shared search settings for the CLI and desktop.
use crate::retrieval::{record::Representation, Options};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

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
    pub profile: Profile,
    pub limit: usize,
    pub context: usize,
    pub cache: bool,
    pub model_dir: PathBuf,
}
impl Default for Config {
    fn default() -> Self {
        Self {
            profile: Profile::Code,
            limit: 10,
            context: 2,
            cache: true,
            model_dir: dirs::data_local_dir()
                .unwrap_or_else(std::env::temp_dir)
                .join("ixos/models"),
        }
    }
}
impl Config {
    pub fn path() -> PathBuf {
        dirs::config_dir()
            .unwrap_or_else(std::env::temp_dir)
            .join("ixos/settings.toml")
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
            representation: if profile == Profile::Code {
                Representation::IntroUniform
            } else {
                Representation::WholeTokenCentroid
            },
            limit: self.limit,
            context: self.context,
            persist: self.cache,
            output_bytes: 6000,
            io_workers: 4,
            ..Default::default()
        }
    }
}
