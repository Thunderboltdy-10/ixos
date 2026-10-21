//! Bounded source evidence added after file ranking. The original excerpt remains first.
use crate::{
    cache::quantize,
    engine::{dot, Document},
    model::Model,
    snippet::Selection,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    collections::{BTreeMap, BTreeSet, HashMap},
    sync::Arc,
    time::Instant,
};
#[cfg(feature = "evidence-functions")]
use tree_sitter::Parser;

mod functions;

/// Source evidence depth, independent of file-ranking mode.
/// None retains the original single-snippet response shape.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, clap::ValueEnum, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum EvidenceMode {
    #[default]
    None,
    Passages,
    Functions,
}
impl EvidenceMode {
    fn functions(self) -> bool {
        self == Self::Functions
    }
}
#[derive(Default, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Stats {
    pub parser_init_ms: f64,
    pub parse_ms: f64,
    pub locate_ms: f64,
    pub representation_ms: f64,
    pub embedding_ms: f64,
    pub scoring_ms: f64,
    pub excerpt_ms: f64,
    pub serialization_ms: f64,
    pub total_ms: f64,
    pub parsed_files: usize,
    pub parse_cache_hits: usize,
    pub units_seen: usize,
    pub units_eligible: usize,
    pub vectors_embedded: usize,
    pub vector_cache_hits: usize,
    pub fallbacks: usize,
    pub retained_bytes: usize,
    pub cache_evictions: usize,
}
#[derive(Clone, Debug)]
pub(crate) struct Unit {
    pub(crate) line: usize,
    pub(crate) end: usize,
    pub(crate) name: String,
    pub(crate) scope: Option<(usize, String)>,
    pub(crate) owner: Option<String>,
    pub(crate) body_start: Option<usize>,
}
struct Entry {
    version: [u8; 32],
    units: Arc<Vec<Unit>>,
    vectors: HashMap<usize, Vec<f32>>,
    used: u64,
    bytes: usize,
}
#[derive(Default)]
pub(crate) struct State {
    pub mode: EvidenceMode,
    #[cfg(feature = "evidence-functions")]
    parsers: HashMap<String, Parser>,
    entries: HashMap<String, Entry>,
    clock: u64,
}
const MAX_FILES: usize = 3;
const CACHE_BYTES: usize = 4 * 1024 * 1024;
const MAX_PARSE_BYTES: usize = 1024 * 1024;
fn ms(t: Instant) -> f64 {
    t.elapsed().as_secs_f64() * 1000.0
}
fn stop(s: &str) -> bool {
    "the a an how where when what which does do is are and or in on with of to for it its that this be can without".split_whitespace().any(|w|s==w)
}
// Deterministic ASCII camel-case terms for short local evidence windows.
fn terms(s: &str) -> BTreeSet<String> {
    let mut out = BTreeSet::new();
    let mut word = String::new();
    let mut prev = ' ';
    for c in s.chars() {
        if c.is_ascii_uppercase() && prev.is_ascii_lowercase() && !word.is_empty() {
            out.insert(std::mem::take(&mut word));
        }
        let original = c;
        let c = c.to_ascii_lowercase();
        if c.is_ascii_lowercase() || c.is_ascii_digit() && !word.is_empty() {
            word.push(c)
        } else if !word.is_empty() {
            out.insert(std::mem::take(&mut word));
        }
        prev = original;
    }
    if !word.is_empty() {
        out.insert(word);
    }
    out
}
fn query_terms(s: &str) -> BTreeSet<String> {
    terms(s).into_iter().filter(|s| !stop(s)).collect()
}
fn lexical(s: &str, w: &BTreeSet<String>) -> usize {
    terms(s).intersection(w).count()
}
fn comment_line(s: &str) -> bool {
    let s = s.trim_start();
    s.is_empty() || ["//", "#", "/*", "*", "@"].iter().any(|p| s.starts_with(p))
}
fn comment_gap(lines: &[String]) -> bool {
    let mut block = false;
    for line in lines {
        let mut s = line.trim();
        loop {
            if block {
                if let Some(end) = s.find("*/") {
                    s = s[end + 2..].trim();
                    block = false;
                } else {
                    break;
                }
            }
            if s.starts_with("/*") {
                s = &s[2..];
                block = true;
                continue;
            }
            if s.is_empty() || s.starts_with("//") || s.starts_with('#') || s.starts_with('@') {
                break;
            }
            return false;
        }
    }
    !block
}
fn associated(anchor: usize, units: &[Unit], lines: &[String]) -> Option<usize> {
    if let Some((i, _)) = units
        .iter()
        .enumerate()
        .filter(|(_, u)| {
            anchor < u.line && u.line <= anchor + 20 && comment_gap(&lines[anchor - 1..u.line - 1])
        })
        .min_by_key(|(_, u)| u.line)
    {
        return Some(i);
    }
    units
        .iter()
        .enumerate()
        .filter(|(_, u)| u.line <= anchor && anchor <= u.end)
        .max_by_key(|(_, u)| u.line)
        .map(|(i, _)| i)
}
fn metadata(m: &mut Value, u: &Unit) {
    m["symbol"] = json!([u.name, u.line, u.end]);
    if let Some((a, s)) = &u.scope {
        m["scope"] = json!([a, s]);
    }
}
fn extent(m: &Value) -> (usize, usize) {
    (
        m["lines"][0].as_u64().unwrap() as usize,
        m["lines"][1].as_u64().unwrap() as usize,
    )
}
fn source_window(doc: &Document, a: usize, z: usize) -> Value {
    json!({"lines":[a,z],"text":doc.lines[a-1..z].join("\n")})
}
fn encode(v: &Value) -> anyhow::Result<Vec<u8>> {
    let mut out = serde_json::to_vec(v)?;
    out.push(b'\n');
    Ok(out)
}
fn append_chars(out: &mut String, s: &str, left: &mut usize) {
    if *left == 0 {
        return;
    }
    let end = s.char_indices().nth(*left).map_or(s.len(), |(i, _)| i);
    *left -= s[..end].chars().count();
    out.push_str(&s[..end]);
}
fn prefix_start(doc: &Document, u: &Unit) -> usize {
    let mut start = u.line;
    for previous in (u.line.saturating_sub(8).max(1)..u.line).rev() {
        if comment_line(&doc.lines[previous - 1]) {
            start = previous;
        } else {
            break;
        }
    }
    start
}
fn representation(doc: &Document, u: &Unit) -> String {
    let start = prefix_start(doc, u);
    let mut out = String::with_capacity(2000);
    let mut left = 1800;
    append_chars(&mut out, u.scope.as_ref().map_or("", |(_, s)| s), &mut left);
    append_chars(&mut out, "\n", &mut left);
    for (range_index, (a, z)) in [(start, u.end.min(u.line + 4)), (u.line, u.end)]
        .into_iter()
        .enumerate()
    {
        for i in a..=z {
            if left == 0 {
                break;
            }
            if i > a {
                append_chars(&mut out, "\n", &mut left);
            }
            append_chars(&mut out, &doc.lines[i - 1], &mut left);
        }
        if range_index == 0 {
            append_chars(&mut out, "\n", &mut left);
        }
    }
    out
}

fn unit_match(doc: &Document, u: &Unit, wanted: &BTreeSet<String>) -> Value {
    let mut anchor = u.line;
    let mut weight = 0;
    for (offset, line) in doc.lines[u.line - 1..u.end].iter().enumerate() {
        let w = lexical(line, wanted);
        if w > weight {
            weight = w;
            anchor = u.line + offset;
        }
    }
    let a = u.line.max(anchor.saturating_sub(2));
    let z = u.end.min(a + 4);
    let prefix = prefix_start(doc, u);
    let a = if u.line - prefix <= 4
        && z - prefix < 5
        && lexical(&doc.lines[prefix - 1..u.line - 1].join("\n"), wanted) > 0
    {
        prefix
    } else {
        a
    };
    let mut m = source_window(doc, a, z);
    metadata(&mut m, u);
    m
}

impl State {
    fn retained(&self) -> usize {
        self.entries.values().map(|e| e.bytes).sum()
    }
    fn trim(&mut self, s: &mut Stats) {
        while self.retained() > CACHE_BYTES || self.entries.len() > 32 {
            let key = self
                .entries
                .iter()
                .min_by_key(|(_, e)| e.used)
                .map(|(k, _)| k.clone())
                .unwrap();
            self.entries.remove(&key);
            s.cache_evictions += 1;
        }
    }
    pub(crate) fn units(&mut self, path: &str, doc: &Document, s: &mut Stats) -> Arc<Vec<Unit>> {
        self.clock += 1;

        if let Some(e) = self
            .entries
            .get_mut(path)
            .filter(|e| e.version == doc.source_hash)
        {
            e.used = self.clock;
            s.parse_cache_hits += 1;
            return e.units.clone();
        }

        if doc.text.len() > MAX_PARSE_BYTES {
            s.fallbacks += 1;
            return Arc::new(Vec::new());
        }
        let units = Arc::new(self.parse(path, doc, s));

        let bytes = path.len()
            + 128
            + units.capacity() * std::mem::size_of::<Unit>()
            + units
                .iter()
                .map(|u| {
                    u.name.capacity()
                        + u.owner.as_ref().map_or(0, String::capacity)
                        + u.scope.as_ref().map_or(0, |(_, s)| s.capacity())
                })
                .sum::<usize>();
        self.entries.insert(
            path.into(),
            Entry {
                version: doc.source_hash,
                units: units.clone(),
                vectors: HashMap::new(),
                used: self.clock,
                bytes,
            },
        );
        self.trim(s);

        units
    }
}

struct Candidate {
    path: String,
    file: usize,
    index: usize,
    unit: Unit,
    representation: String,
    score: f32,
}

pub(crate) struct Request<'a> {
    pub raw: &'a [u8],
    pub docs: &'a BTreeMap<String, Document>,
    pub paths: &'a [String],
    pub selections: &'a HashMap<String, Selection>,
    pub query: &'a str,
    pub qvector: &'a [f32],
    pub model: &'a Model,
    pub budget: usize,
}

impl State {
    pub(crate) fn attach(&mut self, request: Request<'_>) -> anyhow::Result<(Vec<u8>, Stats)> {
        let Request {
            raw,
            docs,
            paths,
            selections,
            query,
            qvector,
            model,
            budget,
        } = request;
        let started = Instant::now();
        let mut s = Stats::default();
        self.entries
            .retain(|p, e| docs.get(p).is_some_and(|d| d.source_hash == e.version));
        let mut response: Value = serde_json::from_slice(raw)?;
        for row in response["results"].as_array_mut().unwrap() {
            if let Some(sn) = row.get("snippet").cloned() {
                row.as_object_mut().unwrap().remove("snippet");
                row["matches"] =
                    json!([{"lines":[sn["start_line"],sn["end_line"]],"text":sn["text"]}]);
            }
        }
        let wanted = query_terms(query);
        let mut all = vec![];
        let mut unit_sets = HashMap::new();
        if self.mode.functions() {
            for (file, path) in paths.iter().take(MAX_FILES).enumerate() {
                let Some(sel) = selections.get(path) else {
                    continue;
                };
                let doc = &docs[path];
                let units = self.units(path, doc, &mut s);
                if units.is_empty() {
                    continue;
                }
                unit_sets.insert(path.clone(), units.clone());
                let t = Instant::now();
                let mut local = vec![];
                for (index, u) in units.iter().enumerate() {
                    if !sel.candidates.iter().any(|c| {
                        c.start_line <= u.line && u.line <= c.end_line
                            || u.line <= c.anchor && c.anchor <= u.end
                    }) {
                        continue;
                    }
                    if local.len() == 256 {
                        break;
                    }
                    s.units_eligible += 1;
                    let hit = self
                        .entries
                        .get(path)
                        .is_some_and(|e| e.vectors.contains_key(&index));
                    let representation = if hit {
                        String::new()
                    } else {
                        representation(doc, u)
                    };
                    local.push(Candidate {
                        path: path.clone(),
                        file,
                        index,
                        unit: u.clone(),
                        representation,
                        score: 0.0,
                    });
                }

                all.extend(local);
                s.representation_ms += ms(t);
            }
        }
        let mut texts = vec![];
        let mut targets = vec![];
        for (i, c) in all.iter_mut().enumerate() {
            if let Some(v) = self
                .entries
                .get(&c.path)
                .and_then(|e| e.vectors.get(&c.index))
            {
                c.score = dot(qvector, v);
                s.vector_cache_hits += 1;
                continue;
            }

            texts.push(c.representation.clone());
            targets.push(i);
        }

        let t = Instant::now();
        for (batch, idxs) in texts.chunks(64).zip(targets.chunks(64)) {
            let vectors = model.embed_batch_with_limit(batch, None)?;
            s.vectors_embedded += vectors.len();
            for (mut v, &i) in vectors.into_iter().zip(idxs) {
                quantize(&mut v);
                all[i].score = dot(qvector, &v);

                if let Some(e) = self.entries.get_mut(&all[i].path) {
                    e.bytes += v.len() * 4 + 64;
                    e.vectors.insert(all[i].index, v);
                }
            }
        }
        s.embedding_ms += ms(t);

        let t = Instant::now();
        all.sort_by(|a, b| {
            a.file
                .cmp(&b.file)
                .then_with(|| b.score.total_cmp(&a.score))
                .then_with(|| a.unit.line.cmp(&b.unit.line))
        });
        s.scoring_ms += ms(t);
        let t = Instant::now();
        let result_len = response["results"].as_array().unwrap().len();
        if self.mode.functions() {
            for (file, path) in paths.iter().take(3).enumerate() {
                if file >= result_len {
                    break;
                }
                let doc = &docs[path];
                let mut seen = BTreeSet::new();
                if let Some(units) = unit_sets.get(path) {
                    if let Some(sel) = selections.get(path) {
                        if let Some(i) = associated(sel.anchor, units, &doc.lines) {
                            if response["results"][file].get("matches").is_some() {
                                metadata(&mut response["results"][file]["matches"][0], &units[i]);
                                seen.insert(units[i].line);
                            }
                        }
                    }
                }
                let ranked: Vec<_> = all.iter().filter(|c| c.file == file).collect();
                let best = ranked.first().map_or(0.0, |c| c.score);

                for c in ranked {
                    if seen.contains(&c.unit.line) || c.score < 0.25 || c.score < best - 0.10 {
                        continue;
                    }
                    let Some(matches) = response["results"][file]["matches"].as_array() else {
                        continue;
                    };
                    let proposed = unit_match(doc, &c.unit, &wanted);
                    let (a, z) = extent(&proposed);
                    if matches.iter().any(|m| {
                        let (i, j) = extent(m);
                        a.max(i) <= z.min(j)
                    }) {
                        continue;
                    }
                    response["results"][file]["matches"]
                        .as_array_mut()
                        .unwrap()
                        .push(proposed);
                    if encode(&response)?.len() > budget {
                        response["results"][file]["matches"]
                            .as_array_mut()
                            .unwrap()
                            .pop();
                        continue;
                    }
                    seen.insert(c.unit.line);
                    break;
                }
            }
        }
        // Existing passage alternatives, also the bounded fallback for unanalysed files.
        let only_passages = self.mode == EvidenceMode::Passages;
        let mut pending: Vec<Vec<Value>> = vec![vec![]; 3.min(result_len)];
        for (file, path) in paths.iter().take(3).enumerate() {
            if file >= pending.len() {
                break;
            }

            if !only_passages && unit_sets.get(path).is_some_and(|u| !u.is_empty()) {
                continue;
            }

            let Some(sel) = selections.get(path) else {
                continue;
            };
            let doc = &docs[path];
            let mut cs: Vec<_> = sel.candidates.iter().collect();
            cs.sort_by(|a, b| {
                b.score
                    .total_cmp(&a.score)
                    .then_with(|| a.start_byte.cmp(&b.start_byte))
            });
            let best = cs.first().map_or(0.0, |c| c.score);
            let mut seen = vec![sel.anchor];
            for c in cs {
                if c.score < best - 0.15 || seen.iter().any(|a| a.abs_diff(c.anchor) < 8) {
                    continue;
                }
                pending[file].push(source_window(
                    doc,
                    c.anchor.saturating_sub(2).max(1),
                    doc.lines.len().min(c.anchor + 2),
                ));
                seen.push(c.anchor);
                if pending[file].len() == 2 {
                    break;
                }
            }
        }
        for depth in 0..2 {
            for (file, alternatives) in pending.iter().enumerate() {
                if let Some(m) = alternatives.get(depth) {
                    if let Some(matches) = response["results"][file]
                        .get_mut("matches")
                        .and_then(Value::as_array_mut)
                    {
                        matches.push(m.clone());
                        if encode(&response)?.len() > budget {
                            response["results"][file]["matches"]
                                .as_array_mut()
                                .unwrap()
                                .pop();
                        }
                    }
                }
            }
        }
        s.excerpt_ms += ms(t);
        let t = Instant::now();
        if encode(&response)?.len() > budget {
            for file in (0..result_len).rev() {
                if let Some(matches) = response["results"][file]
                    .get_mut("matches")
                    .and_then(Value::as_array_mut)
                {
                    for m in matches {
                        m.as_object_mut().unwrap().remove("symbol");
                        m.as_object_mut().unwrap().remove("scope");
                    }
                }
                if encode(&response)?.len() <= budget {
                    break;
                }
            }
        }
        for (file, path) in paths.iter().take(result_len).enumerate() {
            response["results"][file]["source_hash"] = json!(hex::encode(docs[path].source_hash));
            if encode(&response)?.len() > budget {
                response["results"][file]
                    .as_object_mut()
                    .unwrap()
                    .remove("source_hash");
            }
        }
        let output = encode(&response)?;
        anyhow::ensure!(output.len() <= budget, "Evidence output exceeds budget");
        s.serialization_ms += ms(t);
        self.trim(&mut s);
        s.retained_bytes = self.retained();
        s.total_ms = ms(started);
        Ok((output, s))
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    fn doc(path: &str, text: &str) -> Document {
        Document {
            path: path.into(),
            source_hash: crate::digest::sha256(text.as_bytes()),
            raw_hash: crate::digest::sha256(text.as_bytes()),
            text: text.into(),
            lines: text.split('\n').map(str::to_owned).collect(),
            terms: HashMap::new(),
            length: 0,
            passages: vec![],
        }
    }
    #[test]
    fn ascii_terms_preserve_camel_boundaries_and_acronyms() {
        assert_eq!(
            terms("HTTPServer parseURL x_123field"),
            BTreeSet::from([
                "httpserver".into(),
                "parse".into(),
                "url".into(),
                "x".into(),
                "field".into()
            ])
        );
    }
    #[cfg(feature = "evidence-functions")]
    #[test]
    fn parser_ranges_and_scope_survive_unicode() {
        let d = doc(
            "a.rs",
            "// 中😀\nimpl Thing {\n fn café(&self) { let x = \"中😀\"; }\n}\n",
        );
        let mut state = State::default();
        let mut stats = Stats::default();
        let u = state.parse("a.rs", &d, &mut stats);
        assert_eq!(u.len(), 1);
        assert_eq!((u[0].line, u[0].end), (3, 3));
        assert_eq!(u[0].name, "café");
        assert_eq!(u[0].scope, Some((2, "impl Thing {".into())));
    }
    #[cfg(feature = "evidence-functions")]
    #[test]
    fn assigned_expressions_use_public_bindings_and_exact_source_extents() {
        for (path, text, expected) in [
            ("binding.js", "const publicName = function privateName(x) { return x; };\nvar other = function () {};\n", vec![("publicName",1,1),("other",2,2)]),
            ("assignment.js", "exports.timeouts = function (x) {\n return x;\n};\nRetryOperation.prototype.retry = function (err) {\n return err;\n};\nplain = function () {};\n", vec![("timeouts",1,3),("retry",4,6),("plain",7,7)]),
            ("typed.ts", "const pick: (x: number) => number = function (x: number): number { return x; };\n", vec![("pick",1,1)]),
            ("component.tsx", "const view = function () { return <span>ok</span>; };\n", vec![("view",1,1)]),
            ("unicode.js", "// café π\r\nexports.écho = function (π) {\r\n return π;\r\n};\r\n", vec![("écho",2,4)]),
        ] {
            let d=doc(path,text);
            let units=State::default().parse(path,&d,&mut Stats::default());
            assert_eq!(units.iter().map(|u|(u.name.as_str(),u.line,u.end)).collect::<Vec<_>>(),expected,"{path}");
            assert!(units.iter().all(|u|u.owner.is_none() && u.scope.is_none()));
            for u in units {
                assert!(u.line<=u.body_start.unwrap() && u.body_start.unwrap()<=u.end);
                assert!(d.lines[u.line-1..u.end].join("\n").contains("function"));
            }
        }
    }
    #[cfg(feature = "evidence-functions")]
    #[test]
    fn unbound_or_dynamic_function_expressions_do_not_invent_definitions() {
        let text = concat!(
            "consume(function callback() {});\n",
            "const object = { key: function internal() {} };\n",
            "object[dynamic] = function () {};\n",
            "object['literal'] = function () {};\n",
            "make().method = function () {};\n",
            "const {x} = function () {};\n",
            "function declared() { return 1; }\n",
            "const arrow = () => 2;\n",
            "class Box { run() { return 3; } }\n",
        );
        let units = State::default().parse(
            "negative.js",
            &doc("negative.js", text),
            &mut Stats::default(),
        );
        assert_eq!(
            units.iter().map(|u| u.name.as_str()).collect::<Vec<_>>(),
            ["declared", "arrow", "run"]
        );
    }
    #[cfg(feature = "evidence-functions")]
    #[test]
    fn assigned_functions_are_embedded_returned_and_refreshed_by_the_real_engine() {
        use crate::engine::{Engine, Options};
        let fixture = crate::model::test_model();
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("bound.js");
        let old = std::time::SystemTime::now() - std::time::Duration::from_secs(60);
        let write = |name: &str| {
            std::fs::write(
                &path,
                format!(
                    "exports.{name} = function (value) {{\n // hello world\n return value;\n}};\n"
                ),
            )
            .unwrap();
            std::fs::OpenOptions::new()
                .write(true)
                .open(&path)
                .unwrap()
                .set_times(std::fs::FileTimes::new().set_modified(old))
                .unwrap();
        };
        write("before");
        let mut engine = Engine::new(
            dir.path(),
            Some(fixture.path()),
            Options {
                persist: false,
                ..Default::default()
            },
        )
        .unwrap();
        engine.configure_evidence(EvidenceMode::Functions);
        let (raw, stats) = engine.search("hello world").unwrap();
        let first: Value = serde_json::from_slice(&raw).unwrap();
        assert_eq!(
            first["results"][0]["matches"][0]["symbol"],
            json!(["before", 1, 4])
        );
        let stats = stats.evidence.unwrap();
        assert!(stats.units_eligible > 0 && stats.vectors_embedded > 0);
        let (_, warm) = engine.search("hello world").unwrap();
        assert!(warm.evidence.unwrap().vector_cache_hits > 0);
        std::thread::sleep(std::time::Duration::from_millis(5));
        write("edited");
        let (raw, changed) = engine.search("hello world").unwrap();
        let next: Value = serde_json::from_slice(&raw).unwrap();
        assert_eq!(
            next["results"][0]["matches"][0]["symbol"],
            json!(["edited", 1, 4])
        );
        assert_ne!(
            first["results"][0]["source_hash"],
            next["results"][0]["source_hash"]
        );
        assert!(changed.evidence.unwrap().vectors_embedded > 0);
    }
    #[cfg(feature = "evidence-functions")]
    #[test]
    fn python_body_starts_after_only_the_leading_docstring() {
        let d = doc(
            "body.py",
            concat!(
                "def documented():\n",
                "    # before the documentation\n",
                "    \"\"\"Long documentation.\n",
                "    More documentation.\"\"\"\n",
                "    # implementation comment\n",
                "    return 1\n",
                "def only_documentation():\n",
                "    \"\"\"No implementation.\"\"\"\n",
                "    # no statement follows\n",
                "def concatenated():\n",
                "    'first' 'second'\n",
                "    pass\n",
                "def ordinary_string():\n",
                "    value = 1\n",
                "    'later string'\n",
                "def formatted():\n",
                "    f'{execute()}'\n",
                "def binary():\n",
                "    b'not documentation'\n",
            ),
        );
        let units = State::default().parse("body.py", &d, &mut Stats::default());
        let body = |name: &str| {
            units
                .iter()
                .find(|unit| unit.name == name)
                .unwrap()
                .body_start
        };
        assert_eq!(body("documented"), Some(6));
        assert_eq!(body("only_documentation"), None);
        assert_eq!(body("concatenated"), Some(12));
        assert_eq!(body("ordinary_string"), Some(14));
        assert_eq!(body("formatted"), Some(17));
        assert_eq!(body("binary"), Some(19));
        assert_eq!(units[0].line, 1);
        assert_eq!(units[0].end, 6);
    }

    #[cfg(feature = "evidence-functions")]
    #[test]
    fn rust_body_start_comes_from_the_actual_body_node() {
        let d = doc("body.rs", "fn implementation(\n    value: i32,\n)\n{\n    println!(\"{value}\");\n}\ntrait Declaration {\n    fn missing(&self);\n}\n");
        let units = State::default().parse("body.rs", &d, &mut Stats::default());
        assert_eq!(
            units
                .iter()
                .find(|unit| unit.name == "implementation")
                .unwrap()
                .body_start,
            Some(4)
        );
        if let Some(declaration) = units.iter().find(|unit| unit.name == "missing") {
            assert_eq!(declaration.body_start, None);
        }
    }

    #[cfg(feature = "evidence-functions")]
    #[test]
    fn required_grammar_adapters_find_real_declarations() {
        for (path, text, name) in [
            ("a.rs", "fn target() {}", "target"),
            ("a.py", "def target():\n    pass", "target"),
            ("a.ts", "function target() {}", "target"),
            ("a.tsx", "function target() { return <p/>; }", "target"),
            ("a.js", "function target() {}", "target"),
            ("a.go", "package main\nfunc target() {}", "target"),
            ("a.cpp", "int target() { return 0; }", "target"),
            ("a.c", "int target(void) { return 0; }", "target"),
            ("A.java", "class A { int target() { return 0; } }", "target"),
            ("A.cs", "class A { int target() { return 0; } }", "target"),
            ("a.rb", "def target\n  0\nend", "target"),
        ] {
            let mut state = State::default();
            let d = doc(path, text);
            let u = state.parse(path, &d, &mut Stats::default());
            assert!(u.iter().any(|u| u.name == name), "{path}: {u:?}");
        }
    }
    #[cfg(feature = "evidence-functions")]
    #[test]
    fn cached_locators_are_versioned_and_large_sources_fall_back() {
        let mut state = State {
            mode: EvidenceMode::Functions,
            ..Default::default()
        };
        let a = doc("a.rs", "fn alpha() {}");
        let b = doc("a.rs", "fn beta() {}");
        let mut stats = Stats::default();
        assert_eq!(state.units("a.rs", &a, &mut stats)[0].name, "alpha");
        assert_eq!(state.units("a.rs", &a, &mut stats)[0].name, "alpha");
        assert_eq!(stats.parse_cache_hits, 1);
        assert_eq!(state.units("a.rs", &b, &mut stats)[0].name, "beta");
        let huge = doc("huge.rs", &" ".repeat(MAX_PARSE_BYTES + 1));
        let mut big = Stats::default();
        assert!(state.units("huge.rs", &huge, &mut big).is_empty());
        assert_eq!(big.parsed_files, 0);
        assert_eq!(big.fallbacks, 1);
    }
    #[test]
    fn omitted_primary_never_becomes_a_null_match_array() {
        let fixture = crate::model::test_model();
        let model = Model::load(fixture.path()).unwrap();
        let mut state = State {
            mode: EvidenceMode::Passages,
            ..Default::default()
        };
        let raw = br#"{"results":[{"path":"a.rs","score":0.5,"snippet_omitted":true}]}"#;
        let docs = BTreeMap::from([("a.rs".into(), doc("a.rs", "fn target() {}"))]);
        let (out, _) = state
            .attach(Request {
                raw,
                docs: &docs,
                paths: &["a.rs".into()],
                selections: &HashMap::new(),
                query: "target",
                qvector: &[],
                model: &model,
                budget: 6000,
            })
            .unwrap();
        let p: Value = serde_json::from_slice(&out).unwrap();
        assert!(p["results"][0].get("matches").is_none());
    }
    #[test]
    fn representation_caps_unicode_without_constructing_full_bodies() {
        let d = doc("a.rs", &format!("fn f() {{\n{}\n}}", "中😀".repeat(100000)));
        let u = Unit {
            line: 1,
            end: 3,
            name: "f".into(),
            scope: None,
            owner: None,
            body_start: None,
        };
        let r = representation(&d, &u);
        assert_eq!(r.chars().count(), 1800);
        assert!(r.starts_with("\nfn f() {\n"));
    }
    #[cfg(feature = "evidence-functions")]
    #[test]
    fn malformed_source_is_bounded_and_all_returned_ranges_are_valid() {
        let mut state = State::default();
        let d = doc("a.rs", "fn okay() {}\nfn unfinished( {\n中😀");
        for u in state.parse("a.rs", &d, &mut Stats::default()) {
            assert!(u.line > 0 && u.end <= d.lines.len() && u.line <= u.end);
            assert!(d.lines[u.line - 1..u.end].join("\n").contains(&u.name));
        }
    }
    #[cfg(feature = "evidence-functions")]
    #[test]
    fn cpp_defaulted_special_members_are_not_implementation_units() {
        let mut state = State::default();
        let d = doc(
            "a.cpp",
            "struct A { ~A() = default; int target() { return 42; } };\n",
        );
        let units = state.parse("a.cpp", &d, &mut Stats::default());
        assert!(units.iter().any(|u| u.name == "target"));
        assert!(!units.iter().any(|u| u.name.contains('~')));
    }
    #[test]
    fn passage_alternatives_preserve_primary_file_order_and_budget() {
        let fixture = crate::model::test_model();
        let model = Model::load(fixture.path()).unwrap();
        let d = doc(
            "a.rs",
            &((1..=50)
                .map(|i| format!("// source line {i}"))
                .collect::<Vec<_>>()
                .join("\n")),
        );
        let docs = BTreeMap::from([("a.rs".into(), d)]);
        let raw=br#"{"results":[{"path":"a.rs","score":0.5,"snippet":{"path":"a.rs","start_line":1,"end_line":5,"text":"original documentation"}}]}"#;
        let selections = HashMap::from([(
            "a.rs".into(),
            Selection {
                anchor: 3,
                candidates: vec![
                    crate::snippet::Scored {
                        start_byte: 0,
                        start_line: 1,
                        end_line: 12,
                        anchor: 3,
                        score: 0.8,
                    },
                    crate::snippet::Scored {
                        start_byte: 100,
                        start_line: 20,
                        end_line: 40,
                        anchor: 30,
                        score: 0.75,
                    },
                ],
            },
        )]);
        let mut state = State {
            mode: EvidenceMode::Passages,
            ..Default::default()
        };
        let (out, _) = state
            .attach(Request {
                raw,
                docs: &docs,
                paths: &["a.rs".into()],
                selections: &selections,
                query: "source",
                qvector: &[],
                model: &model,
                budget: 6000,
            })
            .unwrap();
        let value: Value = serde_json::from_slice(&out).unwrap();
        let row = &value["results"][0];
        assert_eq!(row["path"], "a.rs");
        assert_eq!(row["score"], 0.5);
        assert_eq!(row["matches"][0]["text"], "original documentation");
        assert_eq!(row["matches"][1]["lines"], json!([28, 32]));
        assert_eq!(
            row["matches"][1]["text"],
            docs["a.rs"].lines[27..32].join("\n")
        );
        let small = raw.len() + 20;
        let (out, _) = state
            .attach(Request {
                raw,
                docs: &docs,
                paths: &["a.rs".into()],
                selections: &selections,
                query: "source",
                qvector: &[],
                model: &model,
                budget: small,
            })
            .unwrap();
        assert!(out.len() <= small);
        let limited: Value = serde_json::from_slice(&out).unwrap();
        assert_eq!(
            limited["results"][0]["matches"][0]["text"],
            "original documentation"
        );
    }
    #[cfg(feature = "evidence-functions")]
    #[test]
    fn locator_cache_evicts_old_sources_and_nested_units_are_distinct() {
        let mut state = State::default();
        let mut stats = Stats::default();
        let d = doc(
            "nested.py",
            "def outer():\n    def inner():\n        return 1\n    return inner()\n",
        );
        let units = state.units("nested.py", &d, &mut stats);
        assert_eq!(
            units.iter().map(|u| u.name.as_str()).collect::<Vec<_>>(),
            vec!["outer", "inner"]
        );
        for i in 0..40 {
            let p = format!("{i}.rs");
            state.units(&p, &doc(&p, "fn f() {}"), &mut stats);
        }
        assert!(state.entries.len() <= 32);
        assert!(state.retained() <= CACHE_BYTES);
        assert!(stats.cache_evictions > 0);
    }
}
