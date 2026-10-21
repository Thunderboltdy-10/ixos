//! Exact source selection with a bounded, source-versioned resident cache.
use crate::{engine::Document, evidence, source::Stamp, tools};
use serde::Serialize;
use serde_json::{json, Value};
use std::{
    collections::HashMap,
    path::{Path, PathBuf},
    sync::Arc,
    time::SystemTime,
};

#[derive(Clone, Debug, Default)]
pub struct Selection {
    pub start: Option<usize>,
    pub end: Option<usize>,
    pub lines: Option<usize>,
    pub within: Option<String>,
    pub body: bool,
}
/// Inclusive line/character range with the conventional read semantics.
pub struct SourceRange {
    pub start: usize,
    pub count: usize,
    pub characters: Option<usize>,
    pub character_offset: usize,
}
#[derive(Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Stats {
    pub source_cache_hits: usize,
    pub resident_source_hits: usize,
    pub source_bytes_read: usize,
    pub retained_bytes: usize,
}
struct Entry {
    doc: Arc<Document>,
    stamp: Option<Stamp>,
    observed: SystemTime,
    used: u64,
}
#[derive(Default)]
pub(crate) struct State {
    sources: HashMap<PathBuf, Entry>,
    clock: u64,
}
impl State {
    pub(crate) fn retained(&self) -> usize {
        self.sources.capacity() * 2 * (std::mem::size_of::<(PathBuf, Entry)>() + 1)
            + self
                .sources
                .iter()
                .map(|(path, e)| path.capacity() + document_bytes(&e.doc))
                .sum::<usize>()
    }
    fn trim(&mut self) {
        while self.sources.len() > 16 || self.retained() > 4 * 1024 * 1024 {
            let Some(key) = self
                .sources
                .iter()
                .min_by_key(|(_, e)| e.used)
                .map(|(k, _)| k.clone())
            else {
                break;
            };
            self.sources.remove(&key);
        }
    }
    pub(crate) fn source(
        &mut self,
        root: &Path,
        path: &Path,
        stats: &mut Stats,
    ) -> anyhow::Result<Arc<Document>> {
        // Ignore rules and canonical identity are checked on every request.
        let resolved = tools::resolve_source(root, path)?;
        let stamp = Stamp::read(&resolved).ok();
        self.clock += 1;
        if let Some(entry) = self.sources.get_mut(&resolved) {
            if stamp
                .as_ref()
                .zip(entry.stamp.as_ref())
                .is_some_and(|(a, b)| a.reusable(b, entry.observed))
            {
                entry.used = self.clock;
                stats.source_cache_hits += 1;
                let doc = entry.doc.clone();
                stats.retained_bytes = self.retained();
                return Ok(doc);
            }
        }
        self.sources.remove(&resolved);
        let doc = Arc::new(tools::load_source_for_inspection(root, path)?);
        stats.source_bytes_read += stamp.as_ref().map_or(doc.text.len(), |s| s.size as usize);
        anyhow::ensure!(
            stamp == Stamp::read(&resolved).ok(),
            "Source changed while reading; retry"
        );
        if document_bytes(&doc) + resolved.capacity() <= 4 * 1024 * 1024 {
            self.sources.insert(
                resolved,
                Entry {
                    doc: doc.clone(),
                    stamp,
                    observed: SystemTime::now(),
                    used: self.clock,
                },
            );
            self.trim();
        }
        stats.retained_bytes = self.retained();
        Ok(doc)
    }
    pub(crate) fn select(
        &self,
        doc: &Document,
        source_path: &str,
        evidence: &mut evidence::State,
        selection: &Selection,
        budget: usize,
    ) -> anyhow::Result<Value> {
        let total = doc.lines.len();
        let mut lo = selection.start.unwrap_or(1);
        let mut hi = selection.end.unwrap_or_else(|| {
            selection
                .lines
                .map_or(total, |n| lo.saturating_add(n.saturating_sub(1)).min(total))
        });
        anyhow::ensure!(
            lo > 0
                && lo <= hi
                && hi <= total
                && (selection.end.is_none() || selection.lines.is_none())
                && selection.lines != Some(0),
            "Invalid selection range"
        );
        anyhow::ensure!(
            !selection.body || selection.within.is_some(),
            "body requires an exact within function"
        );
        let mut identity = None;
        if let Some(name) = &selection.within {
            anyhow::ensure!(!name.is_empty() && name.len() <= 384, "Invalid symbol name");
            let parts: Vec<_> = name.split("::").flat_map(|p| p.split('.')).collect();
            anyhow::ensure!(
                parts.len() <= 2 && parts.iter().all(|part| !part.is_empty()),
                "Only a symbol name or an immediate owner-qualified name is supported"
            );
            let units = evidence.units(source_path, doc, &mut evidence::Stats::default());
            let matches: Vec<_> = units
                .iter()
                .filter(|u| {
                    u.line <= hi
                        && u.end >= lo
                        && u.name == *parts.last().unwrap()
                        && (parts.len() == 1 || u.owner.as_deref() == Some(parts[0]))
                })
                .collect();
            if matches.len() != 1 {
                let out = json!({"path":doc.path,"source_hash":hex::encode(doc.source_hash),"total_lines":total,"selection":{"status":if matches.is_empty(){"not_found"}else{"ambiguous"},"candidate_count":matches.len(),"candidates":matches.iter().take(8).map(|u|json!({"symbol":[u.name,u.line,u.end],"scope":u.scope})).collect::<Vec<_>>()}});
                anyhow::ensure!(
                    serde_json::to_vec(&out)?.len() <= budget,
                    "Ambiguity metadata exceeds output budget; increase max_bytes"
                );
                return Ok(out);
            }
            let unit = matches[0];
            lo = lo.max(unit.line);
            hi = hi.min(unit.end);
            if selection.body {
                lo=lo.max(unit.body_start.ok_or_else(||anyhow::anyhow!("No implementation body was identified; use the definition or an exact range"))?);
            }
            anyhow::ensure!(
                lo <= hi,
                "Selected range does not intersect the implementation body"
            );
            identity = Some(json!([unit.name, unit.line, unit.end]));
        }
        let metadata = json!({"status":"selected","scope":[lo,hi],"requested_lines":[lo,hi],"symbol":identity});
        let overhead = serde_json::to_vec(&metadata)?.len() + 96;
        anyhow::ensure!(
            budget > overhead + 256,
            "Selection metadata exceeds budget; increase max_bytes or reduce batch size"
        );
        let mut out: Value = serde_json::from_slice(&tools::read_filled(
            doc,
            lo,
            (hi - lo + 1).min(10000),
            None,
            0,
            budget - overhead,
        )?)?;
        if out["snippet"]["end_line"].as_u64().unwrap_or(0) < hi as u64 {
            out["truncated"] = json!(true);
            out["next_start_line"] = json!(out["snippet"]["end_line"].as_u64().unwrap() + 1);
        }
        out["selection"] = metadata;
        anyhow::ensure!(
            serde_json::to_vec(&out)?.len() <= budget,
            "Selection exceeds output budget"
        );
        Ok(out)
    }
}
fn document_bytes(doc: &Document) -> usize {
    std::mem::size_of::<Document>()
        + 2 * std::mem::size_of::<usize>()
        + doc.path.capacity()
        + doc.text.capacity()
        + doc.lines.capacity() * std::mem::size_of::<String>()
        + doc.lines.iter().map(String::capacity).sum::<usize>()
        + doc.terms.capacity() * 2 * (std::mem::size_of::<(String, usize)>() + 1)
        + doc.terms.keys().map(String::capacity).sum::<usize>()
        + doc.passages.capacity() * std::mem::size_of::<crate::record::Passage>()
        + doc
            .passages
            .iter()
            .map(|p| p.vector.capacity() * std::mem::size_of::<f32>())
            .sum::<usize>()
}

#[cfg(test)]
mod tests {
    use super::*;
    fn write_old(path: &Path, text: &str) {
        std::fs::write(path, text).unwrap();
        std::fs::OpenOptions::new()
            .write(true)
            .open(path)
            .unwrap()
            .set_times(
                std::fs::FileTimes::new()
                    .set_modified(SystemTime::now() - std::time::Duration::from_secs(60)),
            )
            .unwrap();
    }
    #[test]
    fn source_cache_is_bounded_and_rechecks_restored_mtime_and_ignore_rules() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("source.rs");
        let old = SystemTime::now() - std::time::Duration::from_secs(60);
        let write = |text: &str| {
            std::fs::write(&path, text).unwrap();
            std::fs::OpenOptions::new()
                .write(true)
                .open(&path)
                .unwrap()
                .set_times(std::fs::FileTimes::new().set_modified(old))
                .unwrap();
        };
        write("fn before() {}\n");
        let mut state = State::default();
        let mut stats = Stats::default();
        let first = state
            .source(dir.path(), Path::new("source.rs"), &mut stats)
            .unwrap();
        let warm = state
            .source(dir.path(), Path::new("source.rs"), &mut stats)
            .unwrap();
        assert!(Arc::ptr_eq(&first, &warm));
        assert_eq!(stats.source_cache_hits, 1);
        std::thread::sleep(std::time::Duration::from_millis(5));
        write("fn edited() {}\n");
        let edited = state
            .source(dir.path(), Path::new("source.rs"), &mut stats)
            .unwrap();
        assert_ne!(edited.source_hash, first.source_hash);
        assert_eq!(stats.source_cache_hits, 1);
        std::fs::write(dir.path().join(".gitignore"), "source.rs\n").unwrap();
        assert!(state
            .source(dir.path(), Path::new("source.rs"), &mut stats)
            .is_err());
        assert!(state.retained() <= 4 * 1024 * 1024);
    }
    #[test]
    fn line_allocations_count_toward_cache_admission() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("blank.rs");
        write_old(&path, &format!("fn start() {{}}\n{}", "\n".repeat(200_000)));
        let mut state = State::default();
        let mut stats = Stats::default();
        let source = state
            .source(dir.path(), Path::new("blank.rs"), &mut stats)
            .unwrap();
        assert!(document_bytes(&source) > 4 * 1024 * 1024);
        assert!(state.sources.is_empty());
        write_old(&path, &format!("fn start() {{}}\n{}", "\n".repeat(10_000)));
        state
            .source(dir.path(), Path::new("blank.rs"), &mut stats)
            .unwrap();
        assert_eq!(state.sources.len(), 1);
        assert!(stats.retained_bytes > source.text.len());
        write_old(&path, &format!("fn start() {{}}\n{}", "\n".repeat(500_000)));
        assert!(state
            .source(dir.path(), Path::new("blank.rs"), &mut stats)
            .err()
            .unwrap()
            .to_string()
            .contains("500000 extracted lines"));
    }
    #[cfg(feature = "evidence-functions")]
    #[test]
    fn qualified_symbols_use_the_parsed_owner_and_report_ambiguity() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(
            dir.path().join("source.rs"),
            "impl<T: Foo> Bar<T> {\n    fn run(&self) {}\n}\nimpl Baz {\n    fn run(&self) {}\n}\n",
        )
        .unwrap();
        let doc = tools::load_source(dir.path(), Path::new("source.rs")).unwrap();
        let mut evidence = evidence::State::default();
        for (within, status) in [
            ("Foo::run", "not_found"),
            ("Bar::run", "selected"),
            ("Bar.run", "selected"),
            ("run", "ambiguous"),
        ] {
            let output = State::default()
                .select(
                    &doc,
                    "source.rs",
                    &mut evidence,
                    &Selection {
                        within: Some(within.into()),
                        ..Default::default()
                    },
                    6000,
                )
                .unwrap();
            assert_eq!(output["selection"]["status"], status);
            if status == "selected" {
                assert_eq!(output["snippet"]["text"], "    fn run(&self) {}");
            }
        }
        assert!(State::default()
            .select(
                &doc,
                "source.rs",
                &mut evidence,
                &Selection {
                    within: Some("Outer::Bar::run".into()),
                    ..Default::default()
                },
                6000
            )
            .is_err());
    }
}
