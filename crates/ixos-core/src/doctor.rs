//! A small installation check shared by the CLI and desktop.
use crate::{
    config::{Config, Profile},
    engine::Engine,
    model::Model,
};
use serde::Serialize;
use std::path::Path;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Report {
    pub profile: Profile,
    pub dimensions: usize,
    pub cache_writable: bool,
    pub search_works: bool,
}
pub fn check(config: &Config, profile: Profile, model_path: &Path) -> anyhow::Result<Report> {
    let model = Model::load(model_path)?;
    let dimensions = model.dimensions();
    drop(model);
    let cache_dir = dirs::cache_dir()
        .ok_or_else(|| anyhow::anyhow!("No application cache directory"))?
        .join("ixos");
    std::fs::create_dir_all(&cache_dir)?;
    drop(tempfile::NamedTempFile::new_in(cache_dir)?);
    let folder = tempfile::tempdir()?;
    std::fs::write(folder.path().join("check.txt"), "Ixos search check")?;
    let mut options = config.options(profile);
    options.persist = false;
    let mut engine = Engine::new(folder.path(), Some(model_path), options)?;
    let (raw, _) = engine.search("Ixos search check")?;
    anyhow::ensure!(
        !serde_json::from_slice::<serde_json::Value>(&raw)?["results"]
            .as_array()
            .unwrap()
            .is_empty(),
        "Search check returned no results"
    );
    Ok(Report {
        profile,
        dimensions,
        cache_writable: true,
        search_works: true,
    })
}
