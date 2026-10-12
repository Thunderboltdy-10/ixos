//! Searches complete source text and compact semantic records.
use crate::cache::quantize;
use crate::config::Profile;
use crate::model::Model;
use crate::source::Stamp;
use crate::{cache, record, snippet, tools, typo};
use crate::{digest::sha256, discover::search_walk};
use rayon::prelude::*;
use record::{representatives, Passage};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashMap, HashSet};
use std::io::Read;
use std::path::{Path, PathBuf};
use std::time::{Instant, SystemTime};

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, clap::ValueEnum, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum RetrievalMode {
    Lexical,
    Semantic,
    #[default]
    Hybrid,
}

#[derive(Clone, Debug)]
pub struct Options {
    pub mode: RetrievalMode,
    pub profile: Profile,
    pub persist: bool,
    pub limit: usize,
    pub context: usize,
    pub output_bytes: usize,
    pub max_file_bytes: usize,
    pub max_corpus_bytes: usize,
}
impl Default for Options {
    fn default() -> Self {
        Self {
            mode: RetrievalMode::Hybrid,
            profile: Profile::Code,
            persist: true,
            limit: 10,
            context: 2,
            output_bytes: 12000,
            max_file_bytes: 16 * 1024 * 1024,
            max_corpus_bytes: 256 * 1024 * 1024,
        }
    }
}

#[derive(Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Stats {
    pub discovered_files: usize,
    pub searchable_files: usize,
    pub skipped_files: usize,
    pub source_bytes_read: u64,
    pub source_text_bytes: u64,
    pub memory_cache_hits: usize,
    pub metadata_cache_hits: usize,
    pub native_cache_hits: usize,
    pub application_cache_hits: usize,
    pub cache_writes: usize,
    pub cache_write_errors: usize,
    pub passages_embedded: usize,
    pub vectors_scored: usize,
    pub lexical_candidates: usize,
    pub semantic_candidates: usize,
    pub returned_results: usize,
    pub output_bytes: usize,
    pub refresh_ms: f64,
    pub io_read_ms: f64,
    pub extraction_ms: f64,
    pub source_hash_ms: f64,
    pub lexical_prepare_ms: f64,
    pub cache_read_ms: f64,
    pub document_embed_ms: f64,
    pub cache_write_ms: f64,
    pub query_embed_ms: f64,
    pub query_ms: f64,
    pub request_ms: f64,
    pub literal_guard: bool,
    pub io_batch_wall_ms: f64,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub query_corrections: Vec<typo::Correction>,
    pub profile: Option<Profile>,
    pub model_fingerprint: Option<String>,
    pub tokenizer_settings: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub snippet: Option<snippet::Stats>,
}

pub struct Document {
    pub path: PathBuf,
    pub source_hash: [u8; 32],
    pub raw_hash: [u8; 32],
    pub text: String,
    pub lines: Vec<String>,
    pub terms: HashMap<String, usize>,
    pub length: usize,
    pub passages: Vec<Passage>,
}

#[derive(Clone, Debug, Serialize)]
pub struct Snippet {
    pub path: String,
    pub start_line: usize,
    pub end_line: usize,
    pub text: String,
}
#[derive(Clone, Debug, Serialize)]
pub struct ResultRow {
    pub path: String,
    pub score: f32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub snippet: Option<Snippet>,
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    pub snippet_omitted: bool,
}
#[derive(Serialize)]
pub struct Output {
    pub results: Vec<ResultRow>,
}

#[derive(Default)]
struct LoadedSource {
    relative: String,
    stamp: Option<Stamp>,
    observed: Option<SystemTime>,
    reused: bool,
    metadata_hit: bool,
    document: Option<Document>,
    native: Option<Vec<u8>>,
    stats: Stats,
}

pub struct Engine {
    roots: Vec<PathBuf>,
    model: Option<Model>,
    options: Options,
    cache: Option<cache::DocumentCache>,
    documents: BTreeMap<String, Document>,
    io_pool: rayon::ThreadPool,
    observations: HashMap<String, (Stamp, SystemTime)>,
    term_documents: HashMap<String, usize>,
    total_terms: usize,
}

impl Engine {
    pub fn new(root: &Path, model_path: Option<&Path>, options: Options) -> anyhow::Result<Self> {
        Self::new_locations(&[root.to_owned()], model_path, options)
    }
    pub fn new_locations(
        locations: &[PathBuf],
        model_path: Option<&Path>,
        options: Options,
    ) -> anyhow::Result<Self> {
        anyhow::ensure!(
            options.limit > 0
                && options.limit <= 10000
                && options.output_bytes >= 15
                && options.context <= 1000,
            "Invalid retrieval limits/threshold"
        );
        anyhow::ensure!(!locations.is_empty(), "Choose a search location");
        let mut roots = locations
            .iter()
            .map(|path| path.canonicalize())
            .collect::<std::io::Result<Vec<_>>>()?;
        roots.sort();
        roots.dedup();
        anyhow::ensure!(
            roots.iter().all(|root| root.is_dir()),
            "Each location must be a directory"
        );
        let model = if options.mode == RetrievalMode::Lexical {
            None
        } else {
            Some(Model::load(model_path.ok_or_else(|| {
                anyhow::anyhow!("Semantic/hybrid retrieval requires --model-path")
            })?)?)
        };
        let cache = if options.persist {
            model.as_ref().map(|model| {
                let mut model_fingerprint = b"ixos-record".to_vec();
                model_fingerprint.push(1);
                model_fingerprint.push(options.profile as u8);
                model_fingerprint.extend_from_slice(&model.fingerprint());
                cache::DocumentCache::new(sha256(&model_fingerprint))
            })
        } else {
            None
        };
        let io_pool = rayon::ThreadPoolBuilder::new().num_threads(4).build()?;
        Ok(Self {
            roots,
            model,
            options,
            cache,
            documents: BTreeMap::new(),
            io_pool,
            observations: HashMap::new(),
            term_documents: HashMap::new(),
            total_terms: 0,
        })
    }
    pub fn refresh(&mut self) -> anyhow::Result<Stats> {
        let began = Instant::now();
        let mut stats = Stats {
            profile: Some(self.options.profile),
            model_fingerprint: self.model.as_ref().map(|m| hex::encode(m.fingerprint())),
            tokenizer_settings: self.model.as_ref().map(|m| m.tokenizer_settings().clone()),
            ..Default::default()
        };
        let mut alive = HashSet::new();
        let mut pending = Vec::new();
        let mut corpus_bytes = 0usize;
        let mut entries = Vec::new();
        let mut discovered = HashSet::new();
        for entry in self
            .roots
            .iter()
            .flat_map(|root| search_walk(root, true, true, false, None).build())
        {
            let entry = match entry {
                Ok(entry) => entry,
                Err(_) => {
                    stats.skipped_files += 1;
                    continue;
                }
            };
            if !entry.file_type().is_some_and(|kind| kind.is_file()) {
                continue;
            }
            if !discovered.insert(entry.path().to_owned()) {
                continue;
            }
            stats.discovered_files += 1;
            if crate::cloud::should_skip_cloud_file(entry.path()) {
                stats.skipped_files += 1;
                continue;
            }
            entries.push(entry);
        }
        // Four buffers bound transient raw input while extraction and tokenization
        // run in parallel. Unchanged resident sources never allocate a buffer.
        for batch in entries.chunks(4) {
            let io_batch = Instant::now();
            let loaded = self.io_pool.install(|| {
                batch
                    .par_iter()
                    .map(|entry| {
                        let path = entry.path();
                        let display = if self.roots.len() == 1 {
                            path.strip_prefix(&self.roots[0]).unwrap()
                        } else {
                            path
                        };
                        let relative = display.to_string_lossy().replace('\\', "/");
                        let mut loaded = LoadedSource {
                            relative,
                            stamp: Stamp::read(path).ok(),
                            observed: Some(SystemTime::now()),
                            ..Default::default()
                        };
                        let reusable = self.documents.contains_key(&loaded.relative);
                        if reusable
                            && loaded.stamp.as_ref().is_some_and(|stamp| {
                                self.observations.get(&loaded.relative).is_some_and(
                                    |(previous, observed)| stamp.reusable(previous, *observed),
                                )
                            })
                        {
                            loaded.reused = true;
                            loaded.metadata_hit = true;
                            return loaded;
                        }
                        let mut bytes = Vec::new();
                        let started = Instant::now();
                        let read = std::fs::File::open(path).and_then(|file| {
                            file.take((self.options.max_file_bytes + 1) as u64)
                                .read_to_end(&mut bytes)
                        });
                        loaded.stats.io_read_ms = started.elapsed().as_secs_f64() * 1000.0;
                        loaded.stats.source_bytes_read = bytes.len() as u64;
                        if loaded.stamp != Stamp::read(path).ok() {
                            loaded.stamp = None;
                        }
                        if read.is_err() || bytes.len() > self.options.max_file_bytes {
                            return loaded;
                        }
                        let started = Instant::now();
                        let raw_hash = sha256(&bytes);
                        loaded.stats.source_hash_ms = started.elapsed().as_secs_f64() * 1000.0;
                        if reusable && self.documents[&loaded.relative].raw_hash == raw_hash {
                            loaded.reused = true;
                            return loaded;
                        }
                        let started = Instant::now();
                        let extracted = crate::extract::extract_text_from_bytes(
                            path,
                            &bytes,
                            self.options.max_file_bytes + 1,
                        );
                        loaded.stats.extraction_ms = started.elapsed().as_secs_f64() * 1000.0;
                        let Some(text) = extracted.map(|text| normalize_text(&text)) else {
                            return loaded;
                        };
                        if text.trim().is_empty() || text.len() > self.options.max_file_bytes {
                            return loaded;
                        }
                        let started = Instant::now();
                        let mut identity = raw_hash.to_vec();
                        identity.extend_from_slice(&sha256(text.as_bytes()));
                        let source_hash = sha256(&identity);
                        loaded.stats.source_hash_ms += started.elapsed().as_secs_f64() * 1000.0;
                        let started = Instant::now();
                        let mut terms = HashMap::new();
                        for term in
                            tokens(&format!("{text} {} {}", loaded.relative, loaded.relative))
                        {
                            *terms.entry(term).or_insert(0) += 1;
                        }
                        let length = terms.values().sum();
                        let lines = text.split('\n').map(str::to_owned).collect();
                        loaded.stats.lexical_prepare_ms = started.elapsed().as_secs_f64() * 1000.0;
                        if self.cache.is_some() && self.options.mode != RetrievalMode::Lexical {
                            let started = Instant::now();
                            loaded.native = cache::prefetch(path);
                            loaded.stats.cache_read_ms = started.elapsed().as_secs_f64() * 1000.0;
                        }
                        loaded.document = Some(Document {
                            path: path.to_owned(),
                            source_hash,
                            raw_hash,
                            text,
                            lines,
                            terms,
                            length,
                            passages: Vec::new(),
                        });
                        loaded
                    })
                    .collect::<Vec<_>>()
            });
            stats.io_batch_wall_ms += io_batch.elapsed().as_secs_f64() * 1000.0;
            for mut loaded in loaded {
                stats.source_bytes_read += loaded.stats.source_bytes_read;
                stats.io_read_ms += loaded.stats.io_read_ms;
                stats.source_hash_ms += loaded.stats.source_hash_ms;
                stats.extraction_ms += loaded.stats.extraction_ms;
                stats.lexical_prepare_ms += loaded.stats.lexical_prepare_ms;
                stats.cache_read_ms += loaded.stats.cache_read_ms;
                if !loaded.reused && loaded.document.is_none() {
                    stats.skipped_files += 1;
                    continue;
                }
                let text_bytes = loaded
                    .document
                    .as_ref()
                    .unwrap_or_else(|| &self.documents[&loaded.relative])
                    .text
                    .len();
                corpus_bytes += text_bytes;
                anyhow::ensure!(
                    corpus_bytes <= self.options.max_corpus_bytes,
                    "Location exceeds the 256 MiB source text budget; choose a smaller location"
                );
                alive.insert(loaded.relative.clone());
                if let Some(stamp) = loaded.stamp {
                    self.observations
                        .insert(loaded.relative.clone(), (stamp, loaded.observed.unwrap()));
                } else {
                    self.observations.remove(&loaded.relative);
                }
                if loaded.reused {
                    stats.memory_cache_hits += 1;
                    stats.metadata_cache_hits += usize::from(loaded.metadata_hit);
                } else {
                    let document = loaded.document.take().unwrap();
                    if let Some(previous) = self.documents.remove(&loaded.relative) {
                        self.remove_terms(&previous);
                    }
                    self.add_terms(&document);
                    self.documents.insert(loaded.relative.clone(), document);
                }
                if let Some(model) = self
                    .model
                    .as_ref()
                    .filter(|_| self.options.mode != RetrievalMode::Lexical)
                {
                    let document = self.documents.get_mut(&loaded.relative).unwrap();
                    if document.passages.is_empty()
                        || document
                            .passages
                            .iter()
                            .any(|p| p.vector.len() != model.dimensions())
                    {
                        let started = Instant::now();
                        let native = if loaded.reused && self.cache.is_some() {
                            cache::prefetch(&document.path)
                        } else {
                            loaded.native
                        };
                        let cached = self.cache.as_mut().and_then(|cache| {
                            cache.get_prefetched(&document.path, &document.source_hash, native)
                        });
                        stats.cache_read_ms += started.elapsed().as_secs_f64() * 1000.0;
                        document.passages.clear();
                        if let Some((rows, backend)) = cached {
                            if rows.iter().all(|p| {
                                p.end_byte <= document.text.len()
                                    && document.text.is_char_boundary(p.start_byte)
                                    && document.text.is_char_boundary(p.end_byte)
                                    && p.end_line <= document.lines.len()
                                    && p.vector.len() == model.dimensions()
                            }) {
                                document.passages = rows;
                                if backend == "native" {
                                    stats.native_cache_hits += 1;
                                } else {
                                    stats.application_cache_hits += 1;
                                }
                            }
                        }
                        if document.passages.is_empty() {
                            document.passages =
                                representatives(&document.text, self.options.profile);
                            pending.push(loaded.relative.clone());
                        }
                    }
                }
            }
        }
        let deleted = self
            .documents
            .keys()
            .filter(|path| !alive.contains(*path))
            .cloned()
            .collect::<Vec<_>>();
        for path in deleted {
            let document = self.documents.remove(&path).unwrap();
            self.remove_terms(&document);
            self.observations.remove(&path);
            if let Some(cache) = &mut self.cache {
                cache.remove_fallback(&document.path);
            }
        }
        // Batch bounded selected passages rather than silently limiting files.
        if let Some(model) = &self.model {
            let embedding_started = Instant::now();
            let mut locators = Vec::new();
            let mut inputs = Vec::new();
            for path in &pending {
                let document = &self.documents[path];
                for (i, passage) in document.passages.iter().enumerate() {
                    locators.push((path.clone(), i));
                    inputs.push(document.text[passage.start_byte..passage.end_byte].to_owned());
                }
            }
            for (batch, targets) in inputs.chunks(64).zip(locators.chunks(64)) {
                let vectors = model.embed_batch_with_limit(batch, None)?;
                stats.passages_embedded += vectors.len();
                for ((path, index), vector) in targets.iter().zip(vectors) {
                    self.documents.get_mut(path).unwrap().passages[*index].vector = vector;
                }
            }
            for path in pending {
                if let Some(cache) = &mut self.cache {
                    let cache_started = Instant::now();
                    let doc = &self.documents[&path];
                    match cache.set(&doc.path, &doc.source_hash, &doc.passages) {
                        Ok(_) => stats.cache_writes += 1,
                        Err(error) => {
                            stats.cache_write_errors += 1;
                            tracing::warn!("Document cache write failed: {error}");
                        }
                    }
                    stats.cache_write_ms += cache_started.elapsed().as_secs_f64() * 1000.0;
                }
                // Serialize original model rows once, then reproduce precisely
                // the same byte/scale decode for live JIT/resident vectors.
                // A failed write still receives the same bounded RAM precision.
                for passage in &mut self.documents.get_mut(&path).unwrap().passages {
                    quantize(&mut passage.vector);
                }
            }
            stats.document_embed_ms = (embedding_started.elapsed().as_secs_f64() * 1000.0
                - stats.cache_write_ms)
                .max(0.0);
        }
        stats.searchable_files = self.documents.len();
        stats.source_text_bytes = corpus_bytes as u64;
        stats.refresh_ms = began.elapsed().as_secs_f64() * 1000.0;
        Ok(stats)
    }
    pub fn source_stats(&self, root: &Path) -> (usize, u64) {
        let documents = self
            .documents
            .values()
            .filter(|document| document.path.starts_with(root));
        documents.fold((0, 0), |(count, bytes), document| {
            (count + 1, bytes + document.text.len() as u64)
        })
    }
    /// Result formatting and mode can change without discarding resident sources.
    pub fn configure_search(
        &mut self,
        mode: RetrievalMode,
        limit: usize,
        context: usize,
        model_path: Option<&Path>,
    ) -> anyhow::Result<()> {
        anyhow::ensure!(
            (1..=10000).contains(&limit) && context <= 1000,
            "Invalid search limits"
        );
        if mode != RetrievalMode::Lexical && self.model.is_none() {
            let model = Model::load(model_path.ok_or_else(|| {
                anyhow::anyhow!("Install a model for semantic or hybrid search")
            })?)?;
            if self.options.persist {
                let mut fingerprint = b"ixos-record".to_vec();
                fingerprint.push(1);
                fingerprint.push(self.options.profile as u8);
                fingerprint.extend_from_slice(&model.fingerprint());
                self.cache = Some(cache::DocumentCache::new(sha256(&fingerprint)));
            }
            self.model = Some(model);
        }
        self.options.mode = mode;
        self.options.limit = limit;
        self.options.context = context;
        Ok(())
    }
    fn add_terms(&mut self, document: &Document) {
        self.total_terms += document.length;
        for term in document.terms.keys() {
            *self.term_documents.entry(term.clone()).or_insert(0) += 1;
        }
    }
    fn remove_terms(&mut self, document: &Document) {
        self.total_terms -= document.length;
        for term in document.terms.keys() {
            let count = self.term_documents.get_mut(term).unwrap();
            *count -= 1;
            if *count == 0 {
                self.term_documents.remove(term);
            }
        }
    }
    pub fn search(&mut self, query: &str) -> anyhow::Result<(Vec<u8>, Stats)> {
        self.search_location(query, None)
    }
    /// Search a chosen location without duplicating the resident corpus or model.
    pub fn search_location(
        &mut self,
        query: &str,
        location: Option<&Path>,
    ) -> anyhow::Result<(Vec<u8>, Stats)> {
        let location = location.map(Path::canonicalize).transpose()?;
        anyhow::ensure!(
            location
                .as_ref()
                .is_none_or(|path| self.roots.contains(path)),
            "Location is not part of this engine"
        );
        anyhow::ensure!(
            !query.trim().is_empty() && query.len() <= 65536,
            "Empty or oversized query"
        );
        let started = Instant::now();
        let mut stats = self.refresh()?;
        let (corrected, corrections) = typo::correct(query, &self.term_documents);
        stats.query_corrections = corrections;
        let query = corrected.as_str();
        let began = Instant::now();
        let query_vector = if let Some(model) = self
            .model
            .as_ref()
            .filter(|_| self.options.mode != RetrievalMode::Lexical)
        {
            model
                .embed_batch_with_limit(&[query.to_owned()], None)?
                .remove(0)
        } else {
            Vec::new()
        };
        stats.query_embed_ms = began.elapsed().as_secs_f64() * 1000.0;
        let wanted = query_terms(query);
        let idfs: HashMap<_, _> = wanted
            .iter()
            .map(|term| {
                let df = self.term_documents.get(term).copied().unwrap_or(0) as f32;
                (
                    term.clone(),
                    (1.0 + (self.documents.len() as f32 - df + 0.5) / (df + 0.5)).ln(),
                )
            })
            .collect();
        let average = self.total_terms as f32 / (self.documents.len().max(1) as f32);
        let mut scores = Vec::new();
        for (path, document) in &self.documents {
            if location
                .as_ref()
                .is_some_and(|location| !document.path.starts_with(location))
            {
                continue;
            }
            let lexical = wanted
                .iter()
                .map(|term| {
                    let count = *document.terms.get(term).unwrap_or(&0) as f32;
                    idfs[term] * count * 2.2
                        / (count + 1.2 * (0.25 + 0.75 * document.length as f32 / average.max(1.0)))
                })
                .sum::<f32>();
            let (best, semantic) = if self.options.mode == RetrievalMode::Lexical {
                (0, 0.0)
            } else {
                stats.vectors_scored += document.passages.len();
                document
                    .passages
                    .iter()
                    .enumerate()
                    .map(|(i, p)| (i, dot(&query_vector, &p.vector)))
                    .max_by(|a, b| a.1.total_cmp(&b.1).then_with(|| b.0.cmp(&a.0)))
                    .unwrap_or((0, 0.0))
            };
            if lexical > 0.0 {
                stats.lexical_candidates += 1;
            }
            if semantic > 0.25 {
                stats.semantic_candidates += 1;
            }
            scores.push((path.clone(), lexical, semantic, best));
        }
        let max_lexical = scores.iter().map(|r| r.1).fold(0.0, f32::max).max(1e-12);
        let mut lex_order: Vec<_> = scores.iter().filter(|r| r.1 > 0.0).collect();
        lex_order.sort_by(|a, b| b.1.total_cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
        let mut sem_order: Vec<_> = scores.iter().filter(|r| r.2 > 0.25).collect();
        sem_order.sort_by(|a, b| b.2.total_cmp(&a.2).then_with(|| a.0.cmp(&b.0)));
        let candidates: HashSet<_> = lex_order
            .into_iter()
            .take(100)
            .chain(sem_order.into_iter().take(100))
            .map(|r| r.0.clone())
            .collect();
        let literal = identifier_literal(query).map(str::to_lowercase);
        stats.literal_guard = literal.is_some();
        let mut ranked: Vec<_> = scores
            .into_iter()
            .filter(|(path, lexical, semantic, _)| {
                let eligible = match self.options.mode {
                    RetrievalMode::Lexical => *lexical > 0.0,
                    RetrievalMode::Semantic => *semantic > 0.25,
                    _ => candidates.contains(path),
                };
                eligible
                    && literal.as_ref().is_none_or(|literal| {
                        path.to_lowercase().contains(literal)
                            || self.documents[path].text.to_lowercase().contains(literal)
                    })
            })
            .map(|(path, lexical, semantic, best)| {
                let score = match self.options.mode {
                    RetrievalMode::Lexical => lexical,
                    RetrievalMode::Semantic => semantic,
                    _ => 0.5 * semantic.max(0.0) + 0.5 * lexical / max_lexical,
                };
                (path, score, lexical, semantic, best)
            })
            .collect();
        ranked.sort_by(|a, b| b.1.total_cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
        let selections = if self.model.is_some() && self.options.mode != RetrievalMode::Lexical {
            let paths = ranked
                .iter()
                .take(self.options.limit)
                .map(|row| row.0.clone())
                .collect::<Vec<_>>();
            let (selected, diagnostics) = snippet::select(
                &self.documents,
                &paths,
                &query_vector,
                &idfs,
                self.model
                    .as_ref()
                    .ok_or_else(|| anyhow::anyhow!("Snippet model is unavailable"))?,
            )?;
            stats.snippet = Some(diagnostics);
            selected
        } else {
            HashMap::new()
        };
        let mut rows = tools::BoundedRows::new(self.options.output_bytes);
        for (path, score, _lexical, _semantic, best) in ranked.into_iter().take(self.options.limit)
        {
            let document = &self.documents[&path];
            let display_path = if self.roots.len() == 1 {
                path.clone()
            } else {
                document.path.to_string_lossy().into_owned()
            };
            let mut anchor = 0;
            let mut weight = 0.0;
            if let Some(selection) = selections.get(&path) {
                anchor = selection.anchor - 1;
            } else {
                for (i, line) in document.lines.iter().enumerate() {
                    let value = snippet::line_weight(line, &idfs);
                    if value > weight {
                        weight = value;
                        anchor = i;
                    }
                }
                if weight == 0.0 && !document.passages.is_empty() {
                    anchor = document.passages[best].start_line - 1;
                }
            }
            let mut row = ResultRow {
                path: display_path.clone(),
                score,
                snippet: Some(snippet_at(
                    &display_path,
                    &document.lines,
                    anchor + 1,
                    self.options.context,
                )),
                snippet_omitted: false,
            };
            if !rows.fits(&row)? {
                row.snippet = Some(snippet_at(&display_path, &document.lines, anchor + 1, 0));
            }
            if !rows.fits(&row)? {
                row.snippet = None;
                row.snippet_omitted = true;
            }
            if !rows.push(&row)? {
                break;
            }
        }
        let result_count = rows.len();
        let raw = rows.finish();
        stats.returned_results = result_count;
        stats.output_bytes = raw.len();
        stats.query_ms = began.elapsed().as_secs_f64() * 1000.0;
        stats.request_ms = started.elapsed().as_secs_f64() * 1000.0;
        Ok((raw, stats))
    }
}

pub fn normalize_text(text: &str) -> String {
    let normalized = text.replace("\r\n", "\n");
    normalized
        .strip_suffix('\n')
        .unwrap_or(&normalized)
        .to_owned()
}
pub fn tokens(text: &str) -> Vec<String> {
    let mut expanded = String::new();
    let mut previous = None;
    for c in text.chars() {
        if c.is_ascii_uppercase()
            && previous.is_some_and(|p: char| p.is_ascii_lowercase() || p.is_ascii_digit())
        {
            expanded.push(' ');
        }
        for lower in c.to_lowercase() {
            expanded.push(lower);
        }
        previous = Some(c);
    }
    expanded
        .split(|c: char| !c.is_alphanumeric())
        .filter(|t| !t.is_empty())
        .map(str::to_owned)
        .collect()
}
pub fn query_terms(query: &str) -> Vec<String> {
    const STOP:&str="a an and are as at be by can does for from how i in is it of on or that the this to was what when where which who why with would";
    let stops: HashSet<_> = STOP.split_whitespace().collect();
    let mut seen = HashSet::new();
    tokens(query)
        .into_iter()
        .filter(|t| t.chars().count() >= 2 && !stops.contains(t.as_str()) && seen.insert(t.clone()))
        .collect()
}
fn identifier_literal(query: &str) -> Option<&str> {
    let trimmed = query.trim();
    // Shell quotes disappear before invocation, but JSON can carry them literally.
    // Treat one matching outer pair as identifier notation; exact punctuation is grep's job.
    let query = trimmed
        .strip_prefix('"')
        .and_then(|value| value.strip_suffix('"'))
        .or_else(|| {
            trimmed
                .strip_prefix('\'')
                .and_then(|value| value.strip_suffix('\''))
        })
        .unwrap_or(trimmed)
        .trim();
    (!query.chars().any(char::is_whitespace)
        && (query.chars().any(|c| "_:/\\".contains(c))
            || query.chars().skip(1).any(char::is_uppercase)
                && query.chars().any(char::is_lowercase)))
    .then_some(query)
}
pub(crate) fn dot(left: &[f32], right: &[f32]) -> f32 {
    left.iter().zip(right).map(|(a, b)| a * b).sum()
}
pub fn snippet_at(path: &str, lines: &[String], anchor: usize, context: usize) -> Snippet {
    let anchor = anchor.clamp(1, lines.len().max(1));
    let start = anchor.saturating_sub(context).max(1);
    let end = anchor.saturating_add(context).min(lines.len());
    Snippet {
        path: path.to_owned(),
        start_line: start,
        end_line: end,
        text: lines[start - 1..end].join("\n"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn multiple_locations_share_ranking_and_do_not_duplicate_nested_files() {
        let root = tempfile::tempdir().unwrap();
        let a = root.path().join("a");
        let b = root.path().join("b");
        std::fs::create_dir(&a).unwrap();
        std::fs::create_dir(&b).unwrap();
        std::fs::write(a.join("source.txt"), "alpha alpha common").unwrap();
        std::fs::write(b.join("source.txt"), "alpha common").unwrap();
        let options = Options {
            mode: RetrievalMode::Lexical,
            persist: false,
            ..Default::default()
        };
        let mut engine =
            Engine::new_locations(&[a.clone(), b.clone()], None, options.clone()).unwrap();
        let (raw, stats) = engine.search("alpha").unwrap();
        assert_eq!(stats.searchable_files, 2);
        let rows: serde_json::Value = serde_json::from_slice(&raw).unwrap();
        assert!(rows["results"][0]["path"]
            .as_str()
            .unwrap()
            .replace('\\', "/")
            .ends_with("a/source.txt"));
        assert!(Path::new(rows["results"][0]["path"].as_str().unwrap()).is_file());
        let (scoped, stats) = engine.search_location("alpha", Some(&a)).unwrap();
        let scoped: serde_json::Value = serde_json::from_slice(&scoped).unwrap();
        assert_eq!(stats.searchable_files, 2);
        assert_eq!(scoped["results"].as_array().unwrap().len(), 1);
        assert!(Path::new(scoped["results"][0]["path"].as_str().unwrap())
            .starts_with(a.canonicalize().unwrap()));
        assert!(engine.search_location("alpha", Some(root.path())).is_err());
        assert!(
            rows["results"][0]["score"].as_f64().unwrap()
                > rows["results"][1]["score"].as_f64().unwrap()
        );
        assert_eq!(engine.source_stats(&a.canonicalize().unwrap()).0, 1);
        let mut overlapping =
            Engine::new_locations(&[root.path().to_owned(), a], None, options).unwrap();
        assert_eq!(overlapping.search("alpha").unwrap().0, raw);
    }

    #[test]
    fn lexical_results_precede_embeddings_and_reuse_parsed_text() {
        let model = crate::model::test_model();
        let root = tempfile::tempdir().unwrap();
        std::fs::write(root.path().join("source.txt"), "hello world").unwrap();
        let options = Options {
            mode: RetrievalMode::Lexical,
            persist: false,
            ..Default::default()
        };
        let mut engine = Engine::new(root.path(), Some(model.path()), options).unwrap();
        let (_, lexical) = engine.search("world").unwrap();
        assert_eq!(lexical.passages_embedded, 0);
        engine
            .configure_search(RetrievalMode::Hybrid, 10, 2, Some(model.path()))
            .unwrap();
        let (hybrid, stats) = engine.search("world").unwrap();
        assert_eq!(stats.lexical_prepare_ms, 0.0);
        assert!(stats.passages_embedded > 0);
        let mut fresh = Engine::new(
            root.path(),
            Some(model.path()),
            Options {
                persist: false,
                ..Default::default()
            },
        )
        .unwrap();
        assert_eq!(hybrid, fresh.search("world").unwrap().0);
        engine
            .configure_search(RetrievalMode::Lexical, 10, 2, None)
            .unwrap();
        std::fs::write(root.path().join("source.txt"), "hello hello").unwrap();
        let (_, lexical) = engine.search("hello").unwrap();
        assert_eq!(lexical.passages_embedded, 0);
        engine
            .configure_search(RetrievalMode::Hybrid, 10, 2, Some(model.path()))
            .unwrap();
        let (_, hybrid) = engine.search("hello").unwrap();
        assert_eq!(hybrid.lexical_prepare_ms, 0.0);
        assert!(hybrid.passages_embedded > 0);
    }

    #[test]
    fn native_ephemeral_and_resident_results_match_and_edits_refresh() {
        let model = crate::model::test_model();
        let root = tempfile::tempdir().unwrap();
        let source = root.path().join("source 中.rs");
        let text = format!("hello\n{}\nworld\n", "ordinary notes 中😀\n".repeat(2400));
        std::fs::write(&source, &text).unwrap();
        std::fs::write(root.path().join(".gitignore"), "ignored.txt\n").unwrap();
        std::fs::write(root.path().join("ignored.txt"), "world").unwrap();
        let modified = std::fs::metadata(&source).unwrap().modified().unwrap();
        let options = Options {
            limit: 5,
            output_bytes: 6000,
            ..Default::default()
        };
        let mut fresh = Engine::new(root.path(), Some(model.path()), options.clone()).unwrap();
        let (first, first_stats) = fresh.search("world").unwrap();
        assert_eq!(first_stats.searchable_files, 1);
        assert_eq!(first_stats.cache_writes, 1);
        assert_eq!(first_stats.passages_embedded, 8);
        let (resident, resident_stats) = fresh.search("world").unwrap();
        assert_eq!(first, resident);
        assert_eq!(resident_stats.memory_cache_hits, 1);
        let mut cached = Engine::new(root.path(), Some(model.path()), options.clone()).unwrap();
        let (disk, disk_stats) = cached.search("world").unwrap();
        assert_eq!(first, disk);
        assert_eq!(
            disk_stats.native_cache_hits + disk_stats.application_cache_hits,
            1
        );
        assert_eq!(disk_stats.passages_embedded, 0);
        let mut ephemeral = Engine::new(
            root.path(),
            Some(model.path()),
            Options {
                persist: false,
                ..options
            },
        )
        .unwrap();
        assert_eq!(first, ephemeral.search("world").unwrap().0);
        assert_eq!(std::fs::read(&source).unwrap(), text.as_bytes());
        assert_eq!(
            std::fs::metadata(&source).unwrap().modified().unwrap(),
            modified
        );
        std::fs::write(&source, text.replace("world", "hello")).unwrap();
        let (_, stats) = fresh.search("hello").unwrap();
        assert_eq!(stats.passages_embedded, 8);
        let moved = root.path().join("moved 中.rs");
        std::fs::rename(&source, &moved).unwrap();
        let (_, stats) = fresh.search("hello").unwrap();
        assert_eq!(stats.passages_embedded, 0);
        std::fs::remove_file(&moved).unwrap();
        let (raw, stats) = fresh.search("hello").unwrap();
        assert_eq!(stats.searchable_files, 0);
        assert!(
            serde_json::from_slice::<serde_json::Value>(&raw).unwrap()["results"]
                .as_array()
                .unwrap()
                .is_empty()
        );
    }
    #[test]
    fn identifier_notation_uses_matching_quotes_and_all_whitespace() {
        for query in ["raw_hash", "\"raw_hash\"", "'raw_hash'", "  ' raw_hash '  "] {
            assert_eq!(identifier_literal(query), Some("raw_hash"));
        }
        for query in [
            "raw_hash cache_key",
            "raw_hash\tcache_key",
            "raw_hash\ncache_key",
            "raw_hash\u{2003}cache_key",
        ] {
            assert_eq!(identifier_literal(query), None);
        }
        assert_eq!(identifier_literal("\"raw_hash'"), Some("\"raw_hash'"));
        assert_eq!(identifier_literal("\"ordinary phrase\""), None);
    }

    #[test]
    fn quoted_identifiers_and_multiline_queries_retrieve_implementations() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(
            dir.path().join("implementation.rs"),
            "fn raw_hash() {}\nfn cache_key() {}\n",
        )
        .unwrap();
        std::fs::write(
            dir.path().join("literal.rs"),
            "const FIELD: &str = \"raw_hash\";\n",
        )
        .unwrap();
        let mut engine = Engine::new(
            dir.path(),
            None,
            Options {
                mode: RetrievalMode::Lexical,
                persist: false,
                ..Default::default()
            },
        )
        .unwrap();
        let (bare, _) = engine.search("raw_hash").unwrap();
        for query in ["\"raw_hash\"", "'raw_hash'"] {
            let (quoted, stats) = engine.search(query).unwrap();
            assert_eq!(quoted, bare);
            assert!(stats.literal_guard);
        }
        for query in [
            "raw_hash cache_key",
            "raw_hash\tcache_key",
            "raw_hash\ncache_key",
        ] {
            let (raw, stats) = engine.search(query).unwrap();
            let value: serde_json::Value = serde_json::from_slice(&raw).unwrap();
            assert_eq!(value["results"][0]["path"], "implementation.rs");
            assert!(!stats.literal_guard);
        }
    }

    #[test]
    fn equal_lexical_evidence_always_uses_earliest_line() {
        let dir = tempfile::tempdir().unwrap();
        let words = ["alpha", "beta", "gamma", "delta", "epsilon", "zeta"];
        let text = (0..200)
            .map(|i| {
                format!(
                    "{} {} stamp{i}",
                    words[i % 6..].join(" "),
                    words[..i % 6].join(" ")
                )
            })
            .collect::<Vec<_>>()
            .join("\n");
        std::fs::write(dir.path().join("main.txt"), text).unwrap();
        for i in 0..6 {
            std::fs::write(
                dir.path().join(format!("background{i}.txt")),
                words[..=i].join(" "),
            )
            .unwrap();
        }
        let mut engine = Engine::new(
            dir.path(),
            None,
            Options {
                mode: RetrievalMode::Lexical,
                persist: false,
                context: 0,
                ..Default::default()
            },
        )
        .unwrap();
        for _ in 0..20 {
            let (raw, _) = engine.search(&words.join(" ")).unwrap();
            let value: serde_json::Value = serde_json::from_slice(&raw).unwrap();
            let row = value["results"]
                .as_array()
                .unwrap()
                .iter()
                .find(|row| row["path"] == "main.txt")
                .unwrap();
            assert_eq!(row["snippet"]["start_line"], 1);
        }
    }
    #[test]
    fn resident_metadata_reuse_and_incremental_terms_match_fresh_search() {
        let dir = tempfile::tempdir().unwrap();
        let source = dir.path().join("source.txt");
        std::fs::write(&source, "dependency alpha alpha").unwrap();
        let old = SystemTime::now() - std::time::Duration::from_secs(10);
        std::fs::OpenOptions::new()
            .write(true)
            .open(&source)
            .unwrap()
            .set_times(std::fs::FileTimes::new().set_modified(old))
            .unwrap();
        let options = Options {
            mode: RetrievalMode::Lexical,
            persist: false,
            ..Default::default()
        };
        let mut resident = Engine::new(dir.path(), None, options.clone()).unwrap();
        let first = resident.search("alpha").unwrap().0;
        let (again, stats) = resident.search("alpha").unwrap();
        assert_eq!(first, again);
        assert_eq!(stats.metadata_cache_hits, 1);
        assert_eq!(stats.source_bytes_read, 0);
        assert_eq!(stats.source_hash_ms, 0.0);

        // A same-size recent edit needs hashing even if its timestamp is restored.
        std::fs::write(&source, "dependency bravo bravo").unwrap();
        resident.search("bravo").unwrap();
        let recent = std::fs::metadata(&source).unwrap().modified().unwrap();
        std::fs::write(&source, "dependency gamma gamma").unwrap();
        std::fs::OpenOptions::new()
            .write(true)
            .open(&source)
            .unwrap()
            .set_times(std::fs::FileTimes::new().set_modified(recent))
            .unwrap();
        let (changed, stats) = resident.search("gamma").unwrap();
        assert!(stats.source_bytes_read > 0);
        let mut fresh = Engine::new(dir.path(), None, options.clone()).unwrap();
        assert_eq!(changed, fresh.search("gamma").unwrap().0);

        std::fs::write(dir.path().join("new.txt"), "gamma dependency").unwrap();
        let updated = resident.search("gamma").unwrap().0;
        let mut fresh = Engine::new(dir.path(), None, options.clone()).unwrap();
        assert_eq!(updated, fresh.search("gamma").unwrap().0);
        std::fs::write(dir.path().join(".gitignore"), "source.txt\n").unwrap();
        let reduced = resident.search("gamma").unwrap().0;
        let mut fresh = Engine::new(dir.path(), None, options.clone()).unwrap();
        assert_eq!(reduced, fresh.search("gamma").unwrap().0);
        std::fs::remove_file(dir.path().join("new.txt")).unwrap();
        resident.refresh().unwrap();
        assert!(resident.term_documents.is_empty());
        assert_eq!(resident.total_terms, 0);
    }

    #[test]
    fn full_source_lexical_freshness_ignores_and_budget() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join(".gitignore"), "ignored.txt\n").unwrap();
        std::fs::write(dir.path().join("ignored.txt"), "needle").unwrap();
        let path = dir.path().join("source.txt");
        std::fs::write(
            &path,
            format!("{}\nneedle LateMarker\n", "filler\n".repeat(10000)),
        )
        .unwrap();
        let mut engine = Engine::new(
            dir.path(),
            None,
            Options {
                mode: RetrievalMode::Lexical,
                persist: false,
                ..Default::default()
            },
        )
        .unwrap();
        let (raw, stats) = engine.search("LateMarker").unwrap();
        let value: serde_json::Value = serde_json::from_slice(&raw).unwrap();
        assert_eq!(stats.searchable_files, 1);
        assert_eq!(value["results"][0]["snippet"]["start_line"], 10000);
        assert!(raw.len() <= 12000);
        std::fs::write(&path, "changed").unwrap();
        let (raw, _) = engine.search("LateMarker").unwrap();
        assert_eq!(
            serde_json::from_slice::<serde_json::Value>(&raw).unwrap()["results"]
                .as_array()
                .unwrap()
                .len(),
            0
        );
    }
}
