//! Private desktop transport. MCP remains the public agent interface.
use anyhow::Context;
use ixos_core::{
    config::Config,
    engine::{Engine, Options, Progress, RetrievalMode},
};
use serde_json::{json, Value};
use std::{
    io::{BufRead, Read, Write},
    path::PathBuf,
    sync::{
        atomic::{AtomicU64, Ordering},
        mpsc, Arc, Mutex,
    },
};

pub fn info() -> Value {
    json!({"name":"ixos","version":env!("CARGO_PKG_VERSION"),"protocol_major":ixos_runtime::PROTOCOL_MAJOR,"capabilities":["resident-search","shared-settings","models","cache","skill","read","progress"],"function_evidence":cfg!(feature="evidence-functions")})
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
                let (files, bytes, lines) = engine.source_stats(root);
                let discovered = engine.discovered(root);
                json!({"root":root,"files":files,"bytes":bytes,"lines":lines,"discovered":discovered})
            })
            .collect::<Vec<_>>())
    }
    fn call(
        &mut self,
        op: &str,
        p: Value,
        config: &Config,
        cancelled: &dyn Fn() -> bool,
        report: &mut dyn FnMut(Progress),
    ) -> anyhow::Result<Value> {
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
                    .refresh_with(cancelled, report)?;
                Ok(json!({"stats":stats,"sources":self.reports()}))
            }
            "search" => {
                let query = p["query"].as_str().context("Missing query")?;
                let directory = p["directory"].as_str().map(PathBuf::from);
                let (raw, stats) = self
                    .engine
                    .as_mut()
                    .context("Open a source scope first")?
                    .search_location_with(query, directory.as_deref(), cancelled, report)?;
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
            "read" => {
                let root = PathBuf::from(p["root"].as_str().context("Missing root")?);
                let path = PathBuf::from(p["path"].as_str().context("Missing path")?);
                let start = p["start"].as_u64().unwrap_or(1) as usize;
                let lines = p["lines"].as_u64().unwrap_or(40) as usize;
                let raw = ixos_core::tools::read(&root, &path, start, lines, 24_000)?;
                Ok(serde_json::from_slice(&raw)?)
            }
            _ => anyhow::bail!("Unknown runtime operation: {op}"),
        }
    }
}
pub fn serve(config: Config) -> anyhow::Result<()> {
    let output = Mutex::new(crate::stdio::protocol_output()?);
    let send = |value: &Value| -> anyhow::Result<()> {
        let frame = serde_json::to_vec(value)?;
        anyhow::ensure!(
            (frame.len() as u64) < ixos_runtime::MAX_FRAME_BYTES,
            "Runtime response exceeds frame limit"
        );
        let mut output = output
            .lock()
            .map_err(|_| anyhow::anyhow!("Output failed"))?;
        output.write_all(&frame)?;
        output.write_all(b"\n")?;
        output.flush()?;
        Ok(())
    };
    // Requests are read beside the work, so one can be cancelled while it runs.
    let cancelled_through = Arc::new(AtomicU64::new(0));
    let (requests, incoming) = mpsc::channel();
    std::thread::spawn({
        let cancelled_through = cancelled_through.clone();
        move || read_requests(requests, &cancelled_through)
    });
    let mut worker = Worker::default();
    for request in incoming {
        let request: Value = request?;
        let id = request["id"].as_u64().unwrap_or(u64::MAX);
        let params = request["params"].clone();
        let wants_progress = params["progress"] == true;
        let cancelled = || id <= cancelled_through.load(Ordering::Acquire);
        let mut report = |progress: Progress| {
            if wants_progress {
                // A closed pipe ends the session when the response is written.
                let _ = send(&json!({"progress":progress}));
            }
        };
        let result = match worker.call(
            request["op"].as_str().unwrap_or(""),
            params,
            &config,
            &cancelled,
            &mut report,
        ) {
            Ok(value) => json!({"id":request["id"],"result":value}),
            Err(error) => json!({"id":request["id"],"error":format!("{error:#}")}),
        };
        send(&result)?;
    }
    Ok(())
}
fn read_requests(requests: mpsc::Sender<anyhow::Result<Value>>, cancelled_through: &AtomicU64) {
    let mut input = std::io::stdin().lock();
    let mut bytes = Vec::new();
    loop {
        bytes.clear();
        let frame = input
            .by_ref()
            .take(ixos_runtime::MAX_FRAME_BYTES + 1)
            .read_until(b'\n', &mut bytes)
            .map_err(anyhow::Error::from)
            .and_then(|count| {
                anyhow::ensure!(
                    count as u64 <= ixos_runtime::MAX_FRAME_BYTES,
                    "Runtime request exceeds frame limit"
                );
                Ok(count)
            });
        let request = match frame {
            Ok(0) => return,
            Ok(_) => serde_json::from_slice::<Value>(&bytes).map_err(anyhow::Error::from),
            Err(error) => Err(error),
        };
        let failed = request.is_err();
        if let Ok(frame) = &request {
            if frame["op"] == "cancel" {
                if let Some(id) = frame["params"]["id"].as_u64() {
                    cancelled_through.fetch_max(id, Ordering::AcqRel);
                }
                continue;
            }
        }
        if requests.send(request).is_err() || failed {
            return;
        }
    }
}
