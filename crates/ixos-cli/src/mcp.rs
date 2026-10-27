//! MCP stdio transport with the three local source tools.
use crate::args::Location;
use ixos_core::{
    config::{Config, Profile},
    engine::{Engine, RetrievalMode},
    evidence::EvidenceMode,
    tools,
};
use serde::Deserialize;
use serde_json::{json, Value};
use std::{
    collections::HashMap,
    io::{BufRead, Write},
    path::PathBuf,
};

pub fn serve(config: Config, location: Location) -> anyhow::Result<()> {
    let root = location.dir.canonicalize()?;
    anyhow::ensure!(root.is_dir(), "Location must be a directory");
    let mut server = Server {
        root,
        profile: location.profile.unwrap_or(config.profile),
        config,
        model_path: location.model_path,
        engines: HashMap::new(),
        diagnostics: None,
    };
    run(
        std::io::stdin().lock(),
        std::io::stdout().lock(),
        &mut server,
    )
}
struct Server {
    root: PathBuf,
    config: Config,
    profile: Profile,
    model_path: Option<PathBuf>,
    engines: HashMap<String, Engine>,
    diagnostics: Option<Value>,
}
fn run(mut input: impl BufRead, mut output: impl Write, server: &mut Server) -> anyhow::Result<()> {
    let mut initialized = false;
    let mut bytes = Vec::new();
    loop {
        bytes.clear();
        let length = input
            .by_ref()
            .take(1024 * 1024 + 1)
            .read_until(b'\n', &mut bytes)?;
        if length == 0 {
            break;
        }
        let value: Value = match serde_json::from_slice(&bytes) {
            Ok(value) if length <= 1024 * 1024 => value,
            _ => {
                send(
                    &mut output,
                    &json!({"jsonrpc":"2.0","id":null,"error":{"code":-32700,"message":"Invalid JSON request"}}),
                )?;
                if length > 1024 * 1024 && !bytes.ends_with(b"\n") {
                    discard_line(&mut input)?;
                }
                continue;
            }
        };
        if value["jsonrpc"] != "2.0"
            || !value["method"].is_string()
            || value
                .get("id")
                .is_some_and(|id| !id.is_string() && !id.is_number())
        {
            send(
                &mut output,
                &json!({"jsonrpc":"2.0","id":null,"error":{"code":-32600,"message":"Invalid JSON-RPC request"}}),
            )?;
            continue;
        }
        let Some(id) = value.get("id") else { continue };
        let method = value["method"].as_str().unwrap_or("");
        let result = match method {
            "initialize" => {
                initialized = true;
                let requested = value["params"]["protocolVersion"]
                    .as_str()
                    .unwrap_or("2024-11-05");
                let protocol = if ["2024-11-05", "2025-03-26", "2025-06-18", "2025-11-25"]
                    .contains(&requested)
                {
                    requested
                } else {
                    "2025-11-25"
                };
                Ok(
                    json!({"protocolVersion":protocol,"capabilities":{"tools":{}},"serverInfo":{"name":"ixos","version":env!("CARGO_PKG_VERSION")},"instructions":"Local source retrieval: search by concept, grep exact identifiers, read known ranges. Use evidence=functions for code alternatives; view=numbered for compact source. Scores are ranking signals, not confidence probabilities."}),
                )
            }
            "ping" => Ok(json!({})),
            "tools/list" if initialized => Ok(json!({"tools":tool_definitions()})),
            "tools/call" if initialized => {
                match server.call(
                    value["params"]["name"].as_str().unwrap_or(""),
                    value["params"]["arguments"].clone(),
                ) {
                    Ok(mut result) => {
                        let numbered = value["params"]["arguments"]["view"] == "numbered";
                        let budget = value["params"]["arguments"]["max_bytes"]
                            .as_u64()
                            .unwrap_or(6000) as usize;
                        let batch =
                            result.get("results").is_some() && value["params"]["name"] == "read";
                        if numbered && value["params"]["name"] == "read" && !batch {
                            crate::agent_view::fit_read(&mut result, budget);
                        }
                        let rendered = if numbered && !batch {
                            crate::agent_view::render(
                                value["params"]["name"].as_str().unwrap_or(""),
                                &result,
                                budget,
                            )
                        } else {
                            None
                        };
                        let text = match rendered {
                            Some(text) => text,
                            None => serde_json::to_string(&result)?,
                        };
                        let mut response = json!({"content":[{"type":"text","text":text}],"structuredContent":result,"isError":false});
                        if let Some(notice) = crate::updates::notice() {
                            response["content"]
                                .as_array_mut()
                                .unwrap()
                                .push(json!({"type":"text","text":notice}));
                        }
                        if value["params"]["_meta"]["io.ixos/diagnostics"] == true {
                            if let Some(stats) = server.diagnostics.take() {
                                response["_meta"] = json!({"io.ixos/diagnostics":stats});
                            }
                        }
                        Ok(response)
                    }
                    Err(error) => Ok(
                        json!({"content":[{"type":"text","text":error.to_string()}],"isError":true}),
                    ),
                }
            }
            _ => Err(
                json!({"code":-32601,"message":if initialized {"Unknown method"} else {"Initialize the server first"}}),
            ),
        };
        let response = match result {
            Ok(result) => json!({"jsonrpc":"2.0","id":id,"result":result}),
            Err(error) => json!({"jsonrpc":"2.0","id":id,"error":error}),
        };
        send(&mut output, &response)?;
    }
    Ok(())
}
use std::io::Read;
fn discard_line(input: &mut impl BufRead) -> std::io::Result<()> {
    loop {
        let buffer = input.fill_buf()?;
        if buffer.is_empty() {
            return Ok(());
        }
        let newline = buffer.iter().position(|byte| *byte == b'\n');
        let consumed = newline.map_or(buffer.len(), |index| index + 1);
        input.consume(consumed);
        if newline.is_some() {
            return Ok(());
        }
    }
}
fn send(output: &mut impl Write, value: &Value) -> anyhow::Result<()> {
    serde_json::to_writer(&mut *output, value)?;
    output.write_all(b"\n")?;
    output.flush()?;
    Ok(())
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Search {
    query: String,
    dir: Option<PathBuf>,
    profile: Option<Profile>,
    mode: Option<RetrievalMode>,
    limit: Option<usize>,
    context: Option<usize>,
    evidence: Option<EvidenceMode>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Grep {
    pattern: String,
    dir: Option<PathBuf>,
    #[serde(default)]
    fixed: bool,
    #[serde(default)]
    ignore_case: bool,
    limit: Option<usize>,
    context: Option<usize>,
}
impl Server {
    fn dir(&self, path: Option<PathBuf>) -> anyhow::Result<PathBuf> {
        let path = path
            .map(|path| {
                if path.is_absolute() {
                    path
                } else {
                    self.root.join(path)
                }
            })
            .unwrap_or_else(|| self.root.clone());
        Ok(path.canonicalize()?)
    }
    fn call(&mut self, name: &str, mut args: Value) -> anyhow::Result<Value> {
        self.diagnostics = None;
        if let Some(view) = args.as_object_mut().and_then(|a| a.remove("view")) {
            anyhow::ensure!(
                view == "json" || view == "numbered",
                "View must be json or numbered"
            );
        }
        let raw = match name {
            "search" => {
                let args: Search = serde_json::from_value(args)?;
                let dir = self.dir(args.dir)?;
                let profile = args.profile.unwrap_or(self.profile);
                let mut options = self.config.options(profile);
                options.mode = args.mode.unwrap_or(RetrievalMode::Hybrid);
                options.limit = args.limit.unwrap_or(options.limit);
                options.context = args.context.unwrap_or(options.context);
                let key = format!("{}:{}", dir.display(), profile.name());
                let model = self.config.model_path(profile, self.model_path.clone());
                if options.mode != RetrievalMode::Lexical {
                    ixos_core::model::install::ensure(&self.config, profile, &model)?;
                }
                if !self.engines.contains_key(&key) {
                    self.engines.insert(
                        key.clone(),
                        Engine::new(&dir, Some(&model), options.clone())?,
                    );
                }
                let engine = self.engines.get_mut(&key).unwrap();
                let evidence = args.evidence.unwrap_or_default();
                anyhow::ensure!(
                    evidence != EvidenceMode::Functions || cfg!(feature = "evidence-functions"),
                    "This build has no function evidence support; use passages"
                );
                engine.configure_evidence(evidence);
                engine.configure_search(
                    options.mode,
                    options.limit,
                    options.context,
                    Some(&model),
                )?;
                let (raw, stats) = engine.search(&args.query)?;
                self.diagnostics = Some(serde_json::to_value(stats)?);
                raw
            }
            "grep" => {
                let args: Grep = serde_json::from_value(args)?;
                let (raw, stats) = tools::grep(
                    &self.dir(args.dir)?,
                    &args.pattern,
                    args.fixed,
                    args.ignore_case,
                    args.context.unwrap_or(self.config.context),
                    args.limit.unwrap_or(self.config.limit),
                    6000,
                )?;
                self.diagnostics = Some(stats);
                raw
            }
            "read" => {
                let dir = args
                    .as_object_mut()
                    .and_then(|a| a.remove("dir"))
                    .map(serde_json::from_value::<Option<PathBuf>>)
                    .transpose()?
                    .flatten();
                let dir = self.dir(dir)?;
                let advanced = has_source_selector(&args)
                    || args.get("requests").is_some()
                    || args.get("max_bytes").is_some();
                if !advanced {
                    return crate::source_read::execute(&dir, args);
                }
                let mut aggregate = ixos_core::inspect::Stats::default();
                return crate::source_read::execute_with(&dir, args, |spec, budget| {
                    let selection = if spec.has_symbol_selector() {
                        Some(spec.selection()?)
                    } else {
                        None
                    };
                    let profile = self.profile;
                    let key = format!("{}:{}", dir.display(), profile.name());
                    let mut options = self.config.options(profile);
                    options.mode = RetrievalMode::Lexical;
                    if !self.engines.contains_key(&key) {
                        self.engines
                            .insert(key.clone(), Engine::new(&dir, None, options.clone())?);
                    }
                    let engine = self.engines.get_mut(&key).unwrap();
                    let (result, stats) = if let Some(selection) = selection {
                        engine.inspect(
                            &dir,
                            &spec.path,
                            &selection,
                            budget,
                            spec.expected_source_hash.as_deref(),
                        )?
                    } else {
                        engine.read_slice(
                            &dir,
                            &spec.path,
                            spec.range()?,
                            budget,
                            spec.expected_source_hash.as_deref(),
                        )?
                    };
                    aggregate.source_cache_hits += stats.source_cache_hits;
                    aggregate.resident_source_hits += stats.resident_source_hits;
                    aggregate.source_bytes_read += stats.source_bytes_read;
                    aggregate.retained_bytes = stats.retained_bytes;
                    self.diagnostics = Some(serde_json::to_value(&aggregate)?);
                    Ok(result)
                });
            }
            _ => anyhow::bail!("Unknown tool: {name}"),
        };
        Ok(serde_json::from_slice(&raw)?)
    }
}

fn has_source_selector(args: &Value) -> bool {
    ["within", "body"].iter().any(|key| args.get(key).is_some())
        || args
            .get("requests")
            .and_then(Value::as_array)
            .is_some_and(|items| items.iter().any(has_source_selector))
}

fn tool_definitions() -> Vec<Value> {
    let dir = json!({"type":"string","description":"Location; defaults to the server location"});
    let limit = json!({"type":"integer","minimum":1,"maximum":10000});
    let view = json!({"type":"string","enum":["json","numbered"],"description":"Optional compact numbered source view; structuredContent remains machine readable"});
    let context = json!({"type":"integer","minimum":0,"maximum":1000});
    vec![
        json!({"name":"search","description":"Find source by concept or keywords. evidence=functions adds bounded alternatives and source-grounded symbol extents without changing file rank. First match preserves the original excerpt. Expand through read; verify alternatives before editing.","inputSchema":{"type":"object","required":["query"],"additionalProperties":false,"properties":{"query":{"type":"string"},"dir":dir,"profile":{"type":"string","enum":["code","documents"]},"mode":{"type":"string","enum":["lexical","semantic","hybrid"]},"evidence":{"type":"string","enum":["none","passages","functions"]},"limit":limit,"context":context,"view":view}}}),
        json!({"name":"grep","description":"Find an exact identifier, text, or regular expression.","inputSchema":{"type":"object","required":["pattern"],"additionalProperties":false,"properties":{"pattern":{"type":"string"},"dir":dir,"fixed":{"type":"boolean"},"ignore_case":{"type":"boolean"},"limit":limit,"context":context,"view":view}}}),
        json!({"name":"read","description":"Read exact source from a known path. Use inclusive start/end or start/lines, or within for an exact function name (optionally Owner::name). Ambiguous names return coordinates instead of choosing. Optional body skips a leading Python docstring; the default preserves documentation. Batch 1..8 known regions with requests and optional ids. max_bytes defaults to 6000, at most 24000, shared fairly across a batch. Pass expected_source_hash to reject stale coordinates. Follow next_start_line or next_character_offset after truncation. No model is needed.","inputSchema":crate::source_read::schema(dir, view)}),
    ]
}
