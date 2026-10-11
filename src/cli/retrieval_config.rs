//! Evidence-selected CLI profiles. Explicit query flags override these defaults.
use crate::retrieval::{record::Representation, Options, RetrievalMode, SessionPolicy};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, clap::ValueEnum, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum RetrievalProfile {
    #[default]
    Code,
    Documents,
    Lexical,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default, deny_unknown_fields)]
pub struct RetrievalConfig {
    pub profile: RetrievalProfile,
    pub mode: Option<RetrievalMode>,
    pub representation: Option<Representation>,
    pub model_path: Option<PathBuf>,
    pub persist: bool,
    pub limit: usize,
    pub context: usize,
    pub output_bytes: usize,
    pub semantic_floor: f32,
    pub io_workers: usize,
    pub typo_correction: bool,
    pub session: SessionPolicy,
}

impl Default for RetrievalConfig {
    fn default() -> Self {
        Self {
            profile: RetrievalProfile::Code,
            mode: None,
            representation: None,
            model_path: None,
            persist: true,
            limit: 10,
            context: 2,
            output_bytes: 6000,
            semantic_floor: 0.25,
            io_workers: 4,
            typo_correction: false,
            session: SessionPolicy::Off,
        }
    }
}

impl RetrievalConfig {
    pub fn validate(&self) -> anyhow::Result<()> {
        anyhow::ensure!(
            self.mode != Some(RetrievalMode::Legacy),
            "retrieval.mode cannot be legacy; use search --retrieval legacy explicitly"
        );
        anyhow::ensure!(
            (1..=8).contains(&self.io_workers),
            "retrieval.io_workers must be 1..8"
        );
        anyhow::ensure!(
            (1..=10000).contains(&self.limit),
            "retrieval.limit must be 1..10000"
        );
        anyhow::ensure!(
            self.context <= 100,
            "retrieval.context must be at most 100 lines"
        );
        anyhow::ensure!(
            (512..=16 * 1024 * 1024).contains(&self.output_bytes),
            "retrieval.output_bytes must be 512..16777216"
        );
        anyhow::ensure!(
            self.semantic_floor.is_finite() && (0.0..=1.0).contains(&self.semantic_floor),
            "retrieval.semantic_floor must be finite and 0..1"
        );
        Ok(())
    }

    pub fn options(&self, profile: Option<RetrievalProfile>) -> anyhow::Result<Options> {
        self.validate()?;
        let profile = profile.unwrap_or(self.profile);
        Ok(Options {
            mode: self
                .mode
                .unwrap_or(if profile == RetrievalProfile::Lexical {
                    RetrievalMode::Lexical
                } else {
                    RetrievalMode::Hybrid
                }),
            representation: self.representation.unwrap_or(
                if profile == RetrievalProfile::Documents {
                    Representation::WholeTokenCentroid
                } else {
                    Representation::IntroUniform
                },
            ),
            persist: self.persist,
            limit: self.limit,
            context: self.context,
            output_bytes: self.output_bytes,
            semantic_floor: self.semantic_floor,
            io_workers: self.io_workers,
            typo_correction: self.typo_correction,
            session: self.session,
            ..Options::default()
        })
    }

    pub fn model(
        &self,
        profile: Option<RetrievalProfile>,
        explicit: Option<PathBuf>,
    ) -> anyhow::Result<PathBuf> {
        if let Some(path) = explicit
            .or_else(|| std::env::var_os("IXOS_MODEL_PATH").map(PathBuf::from))
            .or_else(|| self.model_path.clone())
        {
            return Ok(path);
        }
        let folder = if profile.unwrap_or(self.profile) == RetrievalProfile::Documents {
            "potion-retrieval-32M-row-int8"
        } else {
            "potion-code-16M-v2-unbounded"
        };
        let path = dirs::data_local_dir()
            .ok_or_else(|| anyhow::anyhow!("No application data directory; supply --model-path"))?
            .join("ixos/models")
            .join(folder);
        anyhow::ensure!(path.join("model.safetensors").is_file(), "Model is not installed at {}. From the source checkout run python scripts/setup_models.py --profile {}, or supply --model-path. Lexical search needs no model: --profile lexical", path.display(), if profile.unwrap_or(self.profile) == RetrievalProfile::Documents { "documents" } else { "code" });
        Ok(path)
    }

    pub fn get(&self, key: &str) -> Option<String> {
        let object = serde_json::to_value(self).ok()?;
        Some(match object.get(key)? {
            serde_json::Value::String(value) => value.clone(),
            value => value.to_string(),
        })
    }

    pub fn set(&mut self, key: &str, value: &str) -> anyhow::Result<()> {
        let mut object = serde_json::to_value(&*self)?;
        let slot = object
            .get_mut(key)
            .ok_or_else(|| anyhow::anyhow!("Unknown retrieval setting: {key}"))?;
        *slot = match slot {
            serde_json::Value::Bool(_) => serde_json::Value::Bool(value.parse()?),
            serde_json::Value::Number(_) => serde_json::from_str(value)?,
            _ if value == "null" || value == "auto" => serde_json::Value::Null,
            _ => serde_json::Value::String(value.to_owned()),
        };
        let next: Self = serde_json::from_value(object)?;
        next.validate()?;
        *self = next;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn profiles_select_representation_without_changing_explicit_settings() {
        let mut config = RetrievalConfig::default();
        assert_eq!(
            config
                .options(Some(RetrievalProfile::Documents))
                .unwrap()
                .representation,
            Representation::WholeTokenCentroid
        );
        assert_eq!(
            config
                .options(Some(RetrievalProfile::Lexical))
                .unwrap()
                .mode,
            RetrievalMode::Lexical
        );
        config.set("representation", "intro-uniform").unwrap();
        config.set("io_workers", "2").unwrap();
        let options = config.options(Some(RetrievalProfile::Documents)).unwrap();
        assert_eq!(options.representation, Representation::IntroUniform);
        assert_eq!(options.io_workers, 2);
    }
    #[test]
    fn invalid_update_does_not_corrupt_config() {
        let mut config = RetrievalConfig::default();
        for (key, value) in [
            ("io_workers", "0"),
            ("output_bytes", "1"),
            ("mode", "invented"),
            ("mode", "legacy"),
            ("semantic_floor", "2"),
            ("profile", "null"),
            ("unknown", "1"),
        ] {
            assert!(config.set(key, value).is_err());
        }
        assert_eq!(config.io_workers, 4);
        assert_eq!(config.output_bytes, 6000);
    }
}
