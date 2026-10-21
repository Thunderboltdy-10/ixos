//! Private desktop transport. MCP remains the public agent interface.
use anyhow::Context;
use ixos_core::{
    config::Config,
    engine::{Engine, Options, RetrievalMode},
};
use serde_json::{json, Value};
use std::{
    io::{BufRead, Read, Write},
    path::PathBuf,
};

pub fn info() -> Value {
    json!({"name":"ixos","version":env!("CARGO_PKG_VERSION"),"protocol_major":ixos_runtime::PROTOCOL_MAJOR,"capabilities":["resident-search","shared-settings","models","cache","skill"],"function_evidence":cfg!(feature="evidence-functions")})
}
#[derive(Default)]
struct Worker {
    engine: Option<Engine>,
    roots: Vec<PathBuf>,
}
impl Worker {
    fn reports(&self) -> Value {
        let Some(engine) = self.engine.as_ref() else {
            return json!([]);
        };
        json!(self
            .roots
            .iter()
            .map(|root| {
                let (files, bytes) = engine.source_stats(root);
                let discovered = ixos_core::discover::search_walk(root, true, true, false, None)
                    .build()
                    .filter_map(Result::ok)
                    .filter(|entry| entry.file_type().is_some_and(|kind| kind.is_file()))
                    .count();
                json!({"root":root,"files":files,"bytes":bytes,"discovered":discovered})
            })
            .collect::<Vec<_>>())
    }
    fn call(&mut self, op: &str, p: Value, config: &Config) -> anyhow::Result<Value> {
        match op {
            "hello" => Ok(info()),
            "open" => {
                let roots: Vec<PathBuf> = serde_json::from_value(p["roots"].clone())?;
                let options: Options = serde_json::from_value(p["options"].clone())?;
                let model = p["model"].as_str().map(PathBuf::from);
                let engine = Engine::new_locations(&roots, model.as_deref(), options)?;
                self.roots = roots
                    .iter()
                    .map(|r| r.canonicalize())
                    .collect::<std::io::Result<_>>()?;
                self.engine = Some(engine);
                Ok(json!({}))
            }
            "configure" => {
                let mode: RetrievalMode = serde_json::from_value(p["mode"].clone())?;
                let limit = serde_json::from_value(p["limit"].clone())?;
                let context = serde_json::from_value(p["context"].clone())?;
                let model = p["model"].as_str().map(PathBuf::from);
                self.engine
                    .as_mut()
                    .context("Open a source scope first")?
                    .configure_search(mode, limit, context, model.as_deref())?;
                Ok(json!({}))
            }
            "refresh" => {
                let stats = self
                    .engine
                    .as_mut()
                    .context("Open a source scope first")?
                    .refresh()?;
                Ok(json!({"stats":stats,"sources":self.reports()}))
            }
            "search" => {
                let query = p["query"].as_str().context("Missing query")?;
                let directory = p["directory"].as_str().map(PathBuf::from);
                let (raw, stats) = self
                    .engine
                    .as_mut()
                    .context("Open a source scope first")?
                    .search_location(query, directory.as_deref())?;
                Ok(json!({"output":serde_json::from_slice::<Value>(&raw)?,"stats":stats}))
            }
            "model-verify" => {
                let profile = serde_json::from_value(p["profile"].clone())?;
                let path = config.model_path(profile, None);
                ixos_core::model::install::verify(&path, profile)?;
                Ok(json!(path))
            }
            "model-install" => {
                let profile = serde_json::from_value(p["profile"].clone())?;
                let source = p["source"].as_str().map(PathBuf::from);
                let path = config.model_path(profile, None);
                let path = if source.is_none() && path != config.model_dir.join(profile.name()) {
                    ixos_core::model::install::verify(&path, profile)?;
                    path
                } else {
                    ixos_core::model::install::install(
                        profile,
                        &config.model_dir,
                        source.as_deref(),
                    )?
                };
                Ok(json!(path))
            }
            "cache" => {
                let roots = serde_json::from_value::<Vec<PathBuf>>(p["roots"].clone())?;
                Ok(serde_json::to_value(ixos_core::cache::manage(
                    &roots,
                    false,
                    p["remove"] == true,
                )?)?)
            }
            "doctor" => Ok(serde_json::to_value(ixos_core::doctor::check(
                config,
                config.profile,
                &config.model_path(config.profile, None),
            )?)?),
            "skill" => Ok(json!(crate::skill::ensure()?)),
            _ => anyhow::bail!("Unknown runtime operation: {op}"),
        }
    }
}
pub fn serve(config: Config) -> anyhow::Result<()> {
    let mut worker = Worker::default();
    let mut input = std::io::stdin().lock();
    let mut output = std::io::stdout().lock();
    let mut bytes = Vec::new();
    loop {
        bytes.clear();
        let count = input
            .by_ref()
            .take(ixos_runtime::MAX_FRAME_BYTES + 1)
            .read_until(b'\n', &mut bytes)?;
        if count == 0 {
            break;
        }
        anyhow::ensure!(
            count as u64 <= ixos_runtime::MAX_FRAME_BYTES,
            "Runtime request exceeds frame limit"
        );
        let request: Value = serde_json::from_slice(&bytes)?;
        let result = match worker.call(
            request["op"].as_str().unwrap_or(""),
            request["params"].clone(),
            &config,
        ) {
            Ok(value) => json!({"id":request["id"],"result":value}),
            Err(error) => json!({"id":request["id"],"error":format!("{error:#}")}),
        };
        let frame = serde_json::to_vec(&result)?;
        anyhow::ensure!(
            (frame.len() as u64) < ixos_runtime::MAX_FRAME_BYTES,
            "Runtime response exceeds frame limit"
        );
        output.write_all(&frame)?;
        output.write_all(b"\n")?;
        output.flush()?;
    }
    Ok(())
}
