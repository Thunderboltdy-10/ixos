//! MCP stdio transport with the three local source tools.
use crate::args::Location;
use ixos_core::{
    config::{Config, Profile},
    engine::{Engine, RetrievalMode},
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
                    json!({"protocolVersion":protocol,"capabilities":{"tools":{}},"serverInfo":{"name":"ixos","version":env!("CARGO_PKG_VERSION")}}),
                )
            }
            "ping" => Ok(json!({})),
            "tools/list" if initialized => Ok(json!({"tools":tool_definitions()})),
            "tools/call" if initialized => {
                match server.call(
                    value["params"]["name"].as_str().unwrap_or(""),
                    value["params"]["arguments"].clone(),
                ) {
                    Ok(result) => Ok(
                        json!({"content":[{"type":"text","text":serde_json::to_string(&result)?}],"structuredContent":result,"isError":false}),
                    ),
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
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct ReadArgs {
    path: PathBuf,
    dir: Option<PathBuf>,
    start: Option<usize>,
    lines: Option<usize>,
    characters: Option<usize>,
    #[serde(default)]
    character_offset: usize,
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
    fn call(&mut self, name: &str, args: Value) -> anyhow::Result<Value> {
        let raw = match name {
            "search" => {
                let args: Search = serde_json::from_value(args)?;
                let dir = self.dir(args.dir)?;
                let profile = args.profile.unwrap_or(self.profile);
                let mut options = self.config.options(profile);
                options.mode = args.mode.unwrap_or(RetrievalMode::Hybrid);
                options.limit = args.limit.unwrap_or(options.limit);
                options.context = args.context.unwrap_or(options.context);
                let key = format!(
                    "{}:{}:{:?}:{}:{}",
                    dir.display(),
                    profile.name(),
                    options.mode,
                    options.limit,
                    options.context
                );
                if !self.engines.contains_key(&key) {
                    let model = self.config.model_path(profile, self.model_path.clone());
                    self.engines
                        .insert(key.clone(), Engine::new(&dir, Some(&model), options)?);
                }
                self.engines.get_mut(&key).unwrap().search(&args.query)?.0
            }
            "grep" => {
                let args: Grep = serde_json::from_value(args)?;
                tools::grep(
                    &self.dir(args.dir)?,
                    &args.pattern,
                    args.fixed,
                    args.ignore_case,
                    args.context.unwrap_or(self.config.context),
                    args.limit.unwrap_or(self.config.limit),
                    6000,
                )?
                .0
            }
            "read" => {
                let args: ReadArgs = serde_json::from_value(args)?;
                tools::read_range(
                    &self.dir(args.dir)?,
                    &args.path,
                    args.start.unwrap_or(1),
                    args.lines.unwrap_or(40),
                    args.characters,
                    args.character_offset,
                    6000,
                )?
            }
            _ => anyhow::bail!("Unknown tool: {name}"),
        };
        Ok(serde_json::from_slice(&raw)?)
    }
}

fn tool_definitions() -> Vec<Value> {
    let dir = json!({"type":"string","description":"Location; defaults to the server location"});
    let limit = json!({"type":"integer","minimum":1,"maximum":10000});
    let context = json!({"type":"integer","minimum":0,"maximum":1000});
    vec![
        json!({"name":"search","description":"Find files by concept or keywords; then read the useful result.","inputSchema":{"type":"object","required":["query"],"additionalProperties":false,"properties":{"query":{"type":"string"},"dir":dir,"profile":{"type":"string","enum":["code","documents"]},"mode":{"type":"string","enum":["lexical","semantic","hybrid"]},"limit":limit,"context":context}}}),
        json!({"name":"grep","description":"Find an exact identifier, text, or regular expression.","inputSchema":{"type":"object","required":["pattern"],"additionalProperties":false,"properties":{"pattern":{"type":"string"},"dir":dir,"fixed":{"type":"boolean"},"ignore_case":{"type":"boolean"},"limit":limit,"context":context}}}),
        json!({"name":"read","description":"Read source lines from a known path, including extracted documents.","inputSchema":{"type":"object","required":["path"],"additionalProperties":false,"properties":{"path":{"type":"string"},"dir":dir,"start":{"type":"integer","minimum":1},"lines":{"type":"integer","minimum":1,"maximum":10000},"characters":{"type":"integer","minimum":1,"maximum":1000000},"character_offset":{"type":"integer","minimum":0}}}}),
    ]
}
