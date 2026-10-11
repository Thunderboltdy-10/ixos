//! CLI and bounded JSONL contracts shared by agents and ordinary terminal use.
use super::*;
use grep_regex::RegexMatcherBuilder;
use grep_searcher::{sinks::UTF8, SearcherBuilder};
use serde::Deserialize;
use serde_json::json;
use std::io::{self, BufRead, Write};

fn json_bytes(value: &serde_json::Value) -> anyhow::Result<Vec<u8>> {
    let mut raw = serde_json::to_vec(value)?;
    raw.push(b'\n');
    Ok(raw)
}

/// Serialize each retained row once, without repeatedly copying earlier rows.
pub(super) struct BoundedRows {
    raw: Vec<u8>,
    budget: usize,
    count: usize,
}
impl BoundedRows {
    pub fn new(budget: usize) -> Self {
        Self {
            raw: b"{\"results\":[".to_vec(),
            budget,
            count: 0,
        }
    }
    pub fn len(&self) -> usize {
        self.count
    }
    pub fn fits(&self, row: &impl Serialize) -> anyhow::Result<bool> {
        Ok(
            self.raw.len() + usize::from(self.count > 0) + serde_json::to_vec(row)?.len() + 3
                <= self.budget,
        )
    }
    pub fn push(&mut self, row: &impl Serialize) -> anyhow::Result<bool> {
        let bytes = serde_json::to_vec(row)?;
        if self.raw.len() + usize::from(self.count > 0) + bytes.len() + 3 > self.budget {
            return Ok(false);
        }
        if self.count > 0 {
            self.raw.push(b',');
        }
        self.raw.extend(bytes);
        self.count += 1;
        Ok(true)
    }
    pub fn finish(mut self) -> Vec<u8> {
        self.raw.extend_from_slice(b"]}\n");
        self.raw
    }
}

pub fn read(
    root: &Path,
    path: &Path,
    start: usize,
    count: usize,
    budget: usize,
) -> anyhow::Result<Vec<u8>> {
    read_range(root, path, start, count, None, 0, budget)
}

pub fn read_range(
    root: &Path,
    path: &Path,
    start: usize,
    count: usize,
    characters: Option<usize>,
    character_offset: usize,
    budget: usize,
) -> anyhow::Result<Vec<u8>> {
    anyhow::ensure!(
        start > 0 && count > 0 && count <= 10000 && budget >= 128,
        "Invalid source range/budget"
    );
    let root = root.canonicalize()?;
    anyhow::ensure!(root.is_dir(), "Read root must be a directory");
    let requested = if path.is_absolute() {
        path.to_owned()
    } else {
        root.join(path)
    };
    let resolved = requested.canonicalize()?;
    anyhow::ensure!(
        resolved.starts_with(&root)
            && resolved.is_file()
            && !std::fs::symlink_metadata(&requested)?
                .file_type()
                .is_symlink(),
        "Read path must be an ordinary file inside --dir"
    );
    anyhow::ensure!(
        search_walk(&root, true, true, false, None)
            .build()
            .filter_map(Result::ok)
            .any(|entry| entry.path().canonicalize().ok().as_ref() == Some(&resolved)),
        "Read path is excluded by the traversal/ignore rules"
    );
    let mut bytes = Vec::new();
    std::fs::File::open(&resolved)?
        .take((16 * 1024 * 1024 + 1) as u64)
        .read_to_end(&mut bytes)?;
    anyhow::ensure!(
        bytes.len() <= 16 * 1024 * 1024,
        "Read source exceeds 16 MiB limit"
    );
    let text = crate::parsers::extract_text_from_bytes(&resolved, &bytes, 16 * 1024 * 1024 + 1)
        .ok_or_else(|| anyhow::anyhow!("Source has no supported extractable text"))?;
    let text = normalize_text(&text);
    anyhow::ensure!(
        text.chars().count() <= 16 * 1024 * 1024,
        "Extracted source exceeds text limit"
    );
    let lines: Vec<_> = text.split('\n').map(str::to_owned).collect();
    anyhow::ensure!(
        start <= lines.len(),
        "Requested line is past the end of the source"
    );
    let relative = resolved
        .strip_prefix(&root)?
        .to_string_lossy()
        .replace('\\', "/");
    let mut end = start.saturating_add(count - 1).min(lines.len());
    let mut identity = sha256(&bytes).to_vec();
    identity.extend_from_slice(&sha256(text.as_bytes()));
    if let Some(characters) = characters {
        anyhow::ensure!(
            characters > 0 && characters <= 1000000,
            "Invalid character count"
        );
        let range = lines[start - 1..end].join("\n");
        let offsets: Vec<_> = range
            .char_indices()
            .map(|(byte, _)| byte)
            .chain(std::iter::once(range.len()))
            .collect();
        anyhow::ensure!(
            character_offset < offsets.len() - 1,
            "Character offset is past the requested range"
        );
        let begin = offsets[character_offset];
        let mut finish = character_offset
            .saturating_add(characters)
            .min(offsets.len() - 1);
        let base = lines[..start - 1]
            .iter()
            .map(|line| line.len() + 1)
            .sum::<usize>();
        loop {
            let raw = json_bytes(
                &json!({"slice":{"path":relative,"coordinate_space":"extracted-text-utf8","start_byte":base+begin,"end_byte":base+offsets[finish],"text":&range[begin..offsets[finish]]},"total_lines":lines.len(),"source_hash":hex::encode(sha256(&identity)),"next_character_offset":finish,"truncated":finish<offsets.len()-1}),
            )?;
            if raw.len() <= budget {
                return Ok(raw);
            }
            anyhow::ensure!(
                finish > character_offset + 1,
                "Output budget cannot hold a character slice"
            );
            finish = character_offset + (finish - character_offset) / 2;
        }
    }
    anyhow::ensure!(
        character_offset == 0,
        "--character-offset requires --characters"
    );
    loop {
        let raw = json_bytes(
            &json!({"view":View {path:relative.clone(),start_line:start,end_line:end,text:lines[start-1..end].join("\n")},"total_lines":lines.len(),"source_hash":hex::encode(sha256(&identity)),"truncated":end<start.saturating_add(count-1).min(lines.len())}),
        )?;
        if raw.len() <= budget {
            return Ok(raw);
        }
        anyhow::ensure!(
            end > start,
            "Output budget cannot hold the requested source line; use --characters or increase the budget"
        );
        end = start + (end - start) / 2;
    }
}

pub fn grep(
    root: &Path,
    pattern: &str,
    fixed: bool,
    ignore_case: bool,
    context: usize,
    limit: usize,
    budget: usize,
) -> anyhow::Result<(Vec<u8>, serde_json::Value)> {
    anyhow::ensure!(
        !pattern.is_empty()
            && pattern.len() <= 65536
            && context <= 1000
            && limit > 0
            && limit <= 10000
            && budget >= 15,
        "Invalid grep request/budget"
    );
    let began = Instant::now();
    let root = root.canonicalize()?;
    anyhow::ensure!(root.is_dir(), "Grep root must be a directory");
    let pattern = if fixed {
        regex::escape(pattern)
    } else {
        pattern.to_owned()
    };
    let matcher = RegexMatcherBuilder::new()
        .case_insensitive(ignore_case)
        .build(&pattern)?;
    let mut rows = BoundedRows::new(budget);
    let mut output_full = false;
    let mut searched = 0;
    let mut skipped = 0;
    let mut matches = 0;
    let mut entries: Vec<_> = search_walk(&root, true, true, false, None)
        .build()
        .filter_map(Result::ok)
        .filter(|entry| entry.file_type().is_some_and(|kind| kind.is_file()))
        .collect();
    entries.sort_by(|a, b| a.path().cmp(b.path()));
    for entry in entries {
        if crate::storage::cloud_detection::should_skip_cloud_file(entry.path()) {
            skipped += 1;
            continue;
        }
        let mut bytes = Vec::new();
        if std::fs::File::open(entry.path())
            .and_then(|file| {
                file.take((16 * 1024 * 1024 + 1) as u64)
                    .read_to_end(&mut bytes)
            })
            .is_err()
            || bytes.len() > 16 * 1024 * 1024
        {
            skipped += 1;
            continue;
        }
        let text =
            match crate::parsers::extract_text_from_bytes(entry.path(), &bytes, 16 * 1024 * 1024) {
                Some(text) => normalize_text(&text),
                None => {
                    skipped += 1;
                    continue;
                }
            };
        searched += 1;
        let mut matching = Vec::new();
        // Bound retained match coordinates; grep scans all eligible sources but
        // never emits an unbounded list or loads any embedding model.
        SearcherBuilder::new()
            .line_number(true)
            .build()
            .search_slice(
                &matcher,
                text.as_bytes(),
                UTF8(|line_number, _| {
                    matches += 1;
                    if matching.len() < limit {
                        matching.push(line_number as usize);
                    }
                    Ok(true)
                }),
            )?;
        let path = entry
            .path()
            .strip_prefix(&root)?
            .to_string_lossy()
            .replace('\\', "/");
        let lines: Vec<_> = text.split('\n').map(str::to_owned).collect();
        for line in matching {
            if rows.len() < limit && !output_full {
                let mut row =
                    json!({"path":path,"line":line,"view":view_at(&path,&lines,line,context)});
                if !rows.fits(&row)? {
                    row["view"] = json!(view_at(&path, &lines, line, 0));
                }
                if !rows.fits(&row)? {
                    row.as_object_mut().unwrap().remove("view");
                    row["evidence_omitted"] = json!(true);
                }
                output_full = !rows.push(&row)?;
            }
        }
    }
    let retained = rows.len();
    let raw = rows.finish();
    Ok((
        raw,
        json!({"filesSearched":searched,"skippedFiles":skipped,"matchingLines":matches,"returnedResults":retained,"truncated":matches>retained,"requestMs":began.elapsed().as_secs_f64()*1000.0,"modelLoaded":false}),
    ))
}

pub fn print_human(raw: &[u8]) -> anyhow::Result<()> {
    let payload: serde_json::Value = serde_json::from_slice(raw)?;
    let mut stdout = io::stdout().lock();
    for row in payload["results"]
        .as_array()
        .ok_or_else(|| anyhow::anyhow!("Missing results"))?
    {
        let path = row["path"].as_str().unwrap_or("");
        if row.get("view").is_none() {
            writeln!(stdout, "{path}: evidence omitted by output budget")?;
            continue;
        }
        let start = row["view"]["start_line"].as_u64().unwrap_or(1);
        for (i, line) in row["view"]["text"]
            .as_str()
            .unwrap_or("")
            .split('\n')
            .enumerate()
        {
            writeln!(stdout, "{path}:{}:{line}", start + i as u64)?;
        }
    }
    Ok(())
}

#[derive(Deserialize)]
#[serde(tag = "op", rename_all = "kebab-case", deny_unknown_fields)]
enum Request {
    Search {
        id: String,
        query: String,
        #[serde(default)]
        feedback: Option<Feedback>,
        #[serde(default)]
        stats: bool,
    },
    Reset {
        id: String,
    },
    Read {
        id: String,
        path: PathBuf,
        #[serde(default = "one")]
        start: usize,
        #[serde(default = "eighty")]
        lines: usize,
        #[serde(default)]
        characters: Option<usize>,
        #[serde(default)]
        character_offset: usize,
    },
    Grep {
        id: String,
        pattern: String,
        #[serde(default)]
        fixed: bool,
        #[serde(default)]
        ignore_case: bool,
        #[serde(default)]
        stats: bool,
    },
}
fn one() -> usize {
    1
}
fn eighty() -> usize {
    80
}

pub fn serve(root: &Path, model_path: Option<&Path>, options: Options) -> anyhow::Result<()> {
    serve_with_diagnostics(root, model_path, options, false)
}

pub fn serve_with_diagnostics(
    root: &Path,
    model_path: Option<&Path>,
    mut options: Options,
    quiet_stats: bool,
) -> anyhow::Result<()> {
    let budget = options.output_bytes;
    anyhow::ensure!(
        budget >= 512,
        "JSONL output budget must be at least 512 bytes"
    );
    options.output_bytes -= 300;
    let context = options.context;
    let limit = options.limit;
    let started = Instant::now();
    let mut engine = Engine::new(root, model_path, options)?;
    eprintln!(
        "{}",
        json!({"type":"ready","protocol":"ixos-jsonl-v1","modelLoadMs":started.elapsed().as_secs_f64()*1000.0})
    );
    let mut input = io::stdin().lock();
    let mut output = io::BufWriter::new(io::stdout().lock());
    loop {
        let mut data = Vec::new();
        let mut complete = false;
        while !complete {
            let buffer = input.fill_buf()?;
            if buffer.is_empty() {
                break;
            }
            let count = buffer
                .iter()
                .position(|b| *b == b'\n')
                .map(|i| {
                    complete = true;
                    i + 1
                })
                .unwrap_or(buffer.len());
            anyhow::ensure!(
                data.len() + count <= 1024 * 1024,
                "JSONL request exceeds 1 MiB"
            );
            data.extend_from_slice(&buffer[..count]);
            input.consume(count);
        }
        if data.is_empty() {
            break;
        }
        let outcome = (|| -> anyhow::Result<(String, serde_json::Value)> {
            let request: Request = serde_json::from_slice(&data)?;
            let id = match &request {
                Request::Search { id, .. }
                | Request::Reset { id }
                | Request::Read { id, .. }
                | Request::Grep { id, .. } => id,
            };
            anyhow::ensure!(!id.is_empty() && id.len() <= 256, "Invalid request id");
            match request {
                Request::Search {
                    id,
                    query,
                    feedback,
                    stats: requested_stats,
                } => {
                    let (raw, stats) = engine.search(&query, &id, feedback.as_ref())?;
                    let mut value: serde_json::Value = serde_json::from_slice(&raw)?;
                    value["id"] = json!(id);
                    if !quiet_stats || requested_stats {
                        eprintln!("{}", json!({"id":id,"type":"stats","diagnostics":stats}));
                    }
                    Ok((id, value))
                }
                Request::Reset { id } => {
                    engine.reset();
                    Ok((id, json!({"reset":true})))
                }
                Request::Read {
                    id,
                    path,
                    start,
                    lines,
                    characters,
                    character_offset,
                } => Ok((
                    id,
                    serde_json::from_slice(&read_range(
                        root,
                        &path,
                        start,
                        lines,
                        characters,
                        character_offset,
                        budget.saturating_sub(300),
                    )?)?,
                )),
                Request::Grep {
                    id,
                    pattern,
                    fixed,
                    ignore_case,
                    stats: requested_stats,
                } => {
                    let (raw, stats) = grep(
                        root,
                        &pattern,
                        fixed,
                        ignore_case,
                        context,
                        limit,
                        budget.saturating_sub(300),
                    )?;
                    if !quiet_stats || requested_stats {
                        eprintln!("{}", json!({"id":id,"type":"stats","diagnostics":stats}));
                    }
                    Ok((id, serde_json::from_slice(&raw)?))
                }
            }
        })();
        let value = match outcome {
            Ok((id, mut value)) => {
                value["id"] = json!(id);
                value
            }
            Err(error) => {
                let mut message = error.to_string();
                while json_bytes(&json!({"type":"error","message":message}))?.len() > budget {
                    message.pop();
                }
                json!({"type":"error","message":message})
            }
        };
        let raw = json_bytes(&value)?;
        // Outer id bytes count toward the same advertised budget.
        if raw.len() > budget {
            output.write_all(&json_bytes(
                &json!({"type":"error","message":"Response envelope exceeds output budget"}),
            )?)?;
        } else {
            output.write_all(&raw)?;
        }
        output.flush()?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn grep_and_read_keep_unicode_lines_and_respect_ignores() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(
            dir.path().join("a.txt"),
            "intro\n中\u{2028}😀 witness\nend\n",
        )
        .unwrap();
        std::fs::write(dir.path().join(".gitignore"), "hidden.txt\n").unwrap();
        std::fs::write(dir.path().join("hidden.txt"), "witness").unwrap();
        let (raw, stats) = grep(dir.path(), "witness", true, false, 0, 10, 1000).unwrap();
        let rows: serde_json::Value = serde_json::from_slice(&raw).unwrap();
        assert_eq!(rows["results"][0]["line"], 2);
        assert_eq!(stats["filesSearched"], 1);
        let raw = read(dir.path(), Path::new("a.txt"), 2, 1, 1000).unwrap();
        assert_eq!(
            serde_json::from_slice::<serde_json::Value>(&raw).unwrap()["view"]["text"],
            "中\u{2028}😀 witness"
        );
        assert!(read(dir.path(), Path::new("hidden.txt"), 1, 1, 1000).is_err());
        assert!(read(dir.path(), Path::new("a.txt"), 4, 1, 1000).is_err());
        assert!(grep(dir.path(), "[", false, false, 0, 10, 1000).is_err());
    }

    #[test]
    fn long_line_preserves_file_and_exact_unicode_slice() {
        let dir = tempfile::tempdir().unwrap();
        let text = format!("intro\n{} needle\nend\n", "中😀".repeat(2000));
        std::fs::write(dir.path().join("long.txt"), &text).unwrap();
        let (raw, _) = grep(dir.path(), "needle", true, false, 2, 10, 512).unwrap();
        let value: serde_json::Value = serde_json::from_slice(&raw).unwrap();
        assert_eq!(value["results"][0]["path"], "long.txt");
        assert_eq!(value["results"][0]["evidence_omitted"], true);
        assert!(value["results"][0].get("view").is_none());
        assert!(raw.len() <= 512);
        let raw = read_range(dir.path(), Path::new("long.txt"), 2, 1, Some(6), 1, 512).unwrap();
        let value: serde_json::Value = serde_json::from_slice(&raw).unwrap();
        let start = value["slice"]["start_byte"].as_u64().unwrap() as usize;
        let end = value["slice"]["end_byte"].as_u64().unwrap() as usize;
        assert_eq!(&text[start..end], value["slice"]["text"].as_str().unwrap());
        assert_eq!(value["slice"]["text"], "😀中😀中😀中");
        assert_eq!(value["next_character_offset"], 7);
        assert!(grep(
            &dir.path().join("long.txt"),
            "needle",
            true,
            false,
            0,
            10,
            512
        )
        .is_err());
        let mut engine = Engine::new(
            dir.path(),
            None,
            Options {
                mode: RetrievalMode::Lexical,
                output_bytes: 512,
                ..Default::default()
            },
        )
        .unwrap();
        let (raw, stats) = engine.search("needle", "test", None).unwrap();
        assert_eq!(stats.returned_results, 1);
        assert_eq!(
            serde_json::from_slice::<serde_json::Value>(&raw).unwrap()["results"][0]
                ["evidence_omitted"],
            true
        );
    }
}
