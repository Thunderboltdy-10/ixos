//! Measured local retrieval: full-source lexical evidence, bounded semantic
//! representatives and explicit session feedback. Historical desktop pipeline
//! remains available while this engine is validated through the same evaluator.
pub mod cache;
pub mod commands;
pub mod record;
pub mod typo;
use crate::ixos_embed::{EmbeddingModel, Model2VecEmbedder};
use crate::ixos_rank::candidate_generator::path_engine::search_walk;
use crate::security::crypto::sha256;
use rayon::prelude::*;
use record::{representatives, unit, Passage, Representation};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashMap, HashSet, VecDeque};
use std::io::Read;
use std::path::{Path, PathBuf};
use std::time::Instant;

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, clap::ValueEnum, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum RetrievalMode {
    Legacy,
    Lexical,
    Semantic,
    #[default]
    Hybrid,
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, clap::ValueEnum, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum SessionPolicy {
    #[default]
    Off,
    Related,
    Feedback,
    Combined,
    /// Experimental bounded lexical topic context alongside semantic/feedback.
    Context,
}

#[derive(Clone, Debug)]
pub struct Options {
    pub mode: RetrievalMode,
    pub representation: Representation,
    pub persist: bool,
    pub limit: usize,
    pub context: usize,
    pub output_bytes: usize,
    pub semantic_floor: f32,
    pub session: SessionPolicy,
    pub max_file_bytes: usize,
    pub max_corpus_bytes: usize,
    pub explain: bool,
    pub io_workers: usize,
    pub typo_correction: bool,
}
impl Default for Options {
    fn default() -> Self {
        Self {
            mode: RetrievalMode::Hybrid,
            representation: Representation::IntroUniform,
            persist: true,
            limit: 10,
            context: 2,
            output_bytes: 12000,
            semantic_floor: 0.25,
            session: SessionPolicy::Off,
            max_file_bytes: 16 * 1024 * 1024,
            max_corpus_bytes: 256 * 1024 * 1024,
            explain: false,
            io_workers: 1,
            typo_correction: false,
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
    pub memory_cache_hits: usize,
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
    pub feedback_consumed: bool,
    pub drift_reset: bool,
    pub session_entries: usize,
    pub literal_guard: bool,
    pub io_workers: usize,
    pub io_batch_wall_ms: f64,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub query_corrections: Vec<typo::Correction>,
    pub contextual_lexical: bool,
    pub representation: Option<Representation>,
    pub model_fingerprint: Option<String>,
    pub tokenizer_settings: Option<serde_json::Value>,
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
pub struct View {
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
    pub semantic_score: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lexical_score: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub view: Option<View>,
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    pub evidence_omitted: bool,
}
#[derive(Serialize)]
pub struct Output {
    pub results: Vec<ResultRow>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Feedback {
    pub query_id: String,
    #[serde(default)]
    pub accepted: Vec<FeedbackReference>,
    #[serde(default)]
    pub rejected: Vec<FeedbackReference>,
}
#[derive(Clone, Debug, Deserialize)]
#[serde(untagged)]
pub enum FeedbackReference {
    Path(String),
    Index(usize),
}
struct Prior {
    id: String,
    query: Vec<f32>,
    topic: Vec<f32>,
    topic_query: String,
    turn: u64,
    documents: HashMap<String, ([u8; 32], Vec<f32>)>,
    paths: Vec<String>,
}

pub struct Engine {
    root: PathBuf,
    model: Option<Model2VecEmbedder>,
    options: Options,
    cache: Option<cache::DocumentCache>,
    documents: BTreeMap<String, Document>,
    history: VecDeque<Prior>,
    turn: u64,
    io_pool: rayon::ThreadPool,
}

impl Engine {
    pub fn new(root: &Path, model_path: Option<&Path>, options: Options) -> anyhow::Result<Self> {
        anyhow::ensure!(
            options.mode != RetrievalMode::Legacy,
            "Legacy retrieval uses the historical pipeline"
        );
        anyhow::ensure!(
            options.limit > 0
                && options.limit <= 10000
                && (1..=8).contains(&options.io_workers)
                && options.output_bytes >= 15
                && options.context <= 1000
                && options.semantic_floor.is_finite()
                && (0.0..=1.0).contains(&options.semantic_floor),
            "Invalid retrieval limits/threshold"
        );
        let root = root.canonicalize()?;
        anyhow::ensure!(root.is_dir(), "Search root must be a directory");
        let model = if options.mode == RetrievalMode::Lexical {
            None
        } else {
            Some(Model2VecEmbedder::from_path(model_path.ok_or_else(
                || anyhow::anyhow!("Semantic/hybrid retrieval requires --model-path"),
            )?)?)
        };
        let cache = if options.persist {
            model.as_ref().map(|model| {
                let mut recipe = format!(
                    "ixos:document-v1:physical-lf:extract-v1:1800chars:{:?}:all-tokens:int8",
                    options.representation
                )
                .into_bytes();
                recipe.extend_from_slice(&model.fingerprint());
                cache::DocumentCache::new(sha256(&recipe))
            })
        } else {
            None
        };
        let io_pool = rayon::ThreadPoolBuilder::new()
            .num_threads(options.io_workers)
            .build()?;
        Ok(Self {
            root,
            model,
            options,
            cache,
            documents: BTreeMap::new(),
            history: VecDeque::new(),
            turn: 0,
            io_pool,
        })
    }
    pub fn reset(&mut self) {
        self.history.clear();
        self.turn = 0;
    }
    pub fn refresh(&mut self) -> anyhow::Result<Stats> {
        let began = Instant::now();
        let mut stats = Stats {
            representation: Some(self.options.representation),
            model_fingerprint: self.model.as_ref().map(|m| hex::encode(m.fingerprint())),
            tokenizer_settings: self.model.as_ref().map(|m| m.tokenizer_settings().clone()),
            io_workers: self.options.io_workers,
            ..Default::default()
        };
        let mut alive = HashSet::new();
        let mut pending = Vec::new();
        let mut corpus_bytes = 0usize;
        let mut entries = Vec::new();
        for entry in search_walk(&self.root, true, true, false, None).build() {
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
            stats.discovered_files += 1;
            let path = entry.path();
            if crate::storage::cloud_detection::should_skip_cloud_file(path) {
                stats.skipped_files += 1;
                continue;
            }
            entries.push(entry);
        }
        // Bounded batches retain at most eight raw source buffers.
        for batch in entries.chunks(self.options.io_workers.min(8)) {
            let io_batch = Instant::now();
            let loaded = self.io_pool.install(|| {
                batch
                    .par_iter()
                    .map(|entry| {
                        let mut bytes = Vec::new();
                        let start = Instant::now();
                        let result = std::fs::File::open(entry.path()).and_then(|file| {
                            file.take((self.options.max_file_bytes + 1) as u64)
                                .read_to_end(&mut bytes)
                        });
                        let io_ms = start.elapsed().as_secs_f64() * 1000.0;
                        let start = Instant::now();
                        let relative = entry
                            .path()
                            .strip_prefix(&self.root)
                            .unwrap()
                            .to_string_lossy()
                            .replace('\\', "/");
                        let native =
                            if self.cache.is_some() && !self.documents.contains_key(&relative) {
                                cache::prefetch(entry.path())
                            } else {
                                None
                            };
                        let cache_ms = start.elapsed().as_secs_f64() * 1000.0;
                        (entry, result, bytes, io_ms, native, cache_ms)
                    })
                    .collect::<Vec<_>>()
            });
            stats.io_batch_wall_ms += io_batch.elapsed().as_secs_f64() * 1000.0;
            for (entry, loaded, bytes, io_ms, native, cache_ms) in loaded {
                let path = entry.path();
                stats.source_bytes_read += bytes.len() as u64;
                stats.io_read_ms += io_ms;
                stats.cache_read_ms += cache_ms;
                if loaded.is_err() || bytes.len() > self.options.max_file_bytes {
                    stats.skipped_files += 1;
                    continue;
                }
                corpus_bytes += bytes.len();
                anyhow::ensure!(
                corpus_bytes <= self.options.max_corpus_bytes,
                "Corpus exceeds in-memory source budget; narrow --dir (no silent partial search)"
            );
                let relative = path
                    .strip_prefix(&self.root)?
                    .to_string_lossy()
                    .replace('\\', "/");
                let hash_started = Instant::now();
                let raw_hash = sha256(&bytes);
                stats.source_hash_ms += hash_started.elapsed().as_secs_f64() * 1000.0;
                if self.documents.get(&relative).is_some_and(|document| {
                    document.raw_hash == raw_hash
                        && (self.model.is_none()
                            || !document.passages.is_empty()
                                && document.passages.iter().all(|p| {
                                    p.vector.len() == self.model.as_ref().unwrap().dimensions()
                                }))
                }) {
                    alive.insert(relative);
                    stats.memory_cache_hits += 1;
                    continue;
                }
                let extraction_started = Instant::now();
                let extracted = crate::parsers::extract_text_from_bytes(
                    path,
                    &bytes,
                    self.options.max_file_bytes + 1,
                );
                stats.extraction_ms += extraction_started.elapsed().as_secs_f64() * 1000.0;
                let text = match extracted {
                    Some(text) => normalize_text(&text),
                    None => {
                        stats.skipped_files += 1;
                        continue;
                    }
                };
                if text.trim().is_empty() || text.chars().count() > self.options.max_file_bytes {
                    stats.skipped_files += 1;
                    continue;
                }
                let relative = path
                    .strip_prefix(&self.root)?
                    .to_string_lossy()
                    .replace('\\', "/");
                let hash_started = Instant::now();
                let mut identity = raw_hash.to_vec();
                identity.extend_from_slice(&sha256(text.as_bytes()));
                let source_hash = sha256(&identity);
                stats.source_hash_ms += hash_started.elapsed().as_secs_f64() * 1000.0;
                alive.insert(relative.clone());
                if self.documents.get(&relative).is_some_and(|document| {
                    document.source_hash == source_hash
                        && (self.model.is_none()
                            || !document.passages.is_empty()
                                && document.passages.iter().all(|p| {
                                    p.vector.len() == self.model.as_ref().unwrap().dimensions()
                                }))
                }) {
                    stats.memory_cache_hits += 1;
                    continue;
                }
                let mut counts = HashMap::new();
                let lexical_started = Instant::now();
                for term in tokens(&format!("{text} {relative} {relative}")) {
                    *counts.entry(term).or_insert(0) += 1;
                }
                let length = counts.values().sum();
                let lines = text.split('\n').map(str::to_owned).collect();
                stats.lexical_prepare_ms += lexical_started.elapsed().as_secs_f64() * 1000.0;
                let mut passages = Vec::new();
                if self.model.is_some() {
                    let cache_started = Instant::now();
                    let cached = self
                        .cache
                        .as_mut()
                        .and_then(|cache| cache.get_prefetched(path, &source_hash, native));
                    stats.cache_read_ms += cache_started.elapsed().as_secs_f64() * 1000.0;
                    if let Some((cached, backend)) = cached {
                        // Validate locators against the actual extracted snapshot too.
                        if cached.iter().all(|p| {
                            p.end_byte <= text.len()
                                && text.is_char_boundary(p.start_byte)
                                && text.is_char_boundary(p.end_byte)
                                && p.end_line <= text.split('\n').count()
                                && p.vector.len() == self.model.as_ref().unwrap().dimensions()
                        }) {
                            passages = cached;
                            if backend == "native" {
                                stats.native_cache_hits += 1;
                            } else {
                                stats.application_cache_hits += 1;
                            }
                        }
                    }
                    if passages.is_empty() {
                        passages = representatives(&text, self.options.representation);
                        pending.push(relative.clone());
                    }
                }
                self.documents.insert(
                    relative,
                    Document {
                        path: path.to_owned(),
                        source_hash,
                        raw_hash,
                        text,
                        lines,
                        terms: counts,
                        length,
                        passages,
                    },
                );
            }
        }
        self.documents.retain(|path, document| {
            if alive.contains(path) {
                true
            } else {
                if let Some(cache) = &mut self.cache {
                    cache.remove_fallback(&document.path);
                }
                false
            }
        });
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
                for ((path, index), mut vector) in targets.iter().zip(vectors) {
                    quantize(&mut vector);
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
            }
            stats.document_embed_ms = (embedding_started.elapsed().as_secs_f64() * 1000.0
                - stats.cache_write_ms)
                .max(0.0);
        }
        stats.searchable_files = self.documents.len();
        stats.refresh_ms = began.elapsed().as_secs_f64() * 1000.0;
        Ok(stats)
    }
    pub fn search(
        &mut self,
        query: &str,
        id: &str,
        feedback: Option<&Feedback>,
    ) -> anyhow::Result<(Vec<u8>, Stats)> {
        anyhow::ensure!(
            !query.trim().is_empty() && query.len() <= 65536 && id.len() <= 256,
            "Empty/oversized query or id"
        );
        let started = Instant::now();
        let mut stats = self.refresh()?;
        let (corrected, corrections) = if self.options.typo_correction {
            let vocabulary = self
                .documents
                .values()
                .flat_map(|d| d.terms.keys().cloned())
                .collect();
            typo::correct(query, &vocabulary)
        } else {
            (query.to_owned(), Vec::new())
        };
        stats.query_corrections = corrections;
        let query = corrected.as_str();
        let began = Instant::now();
        let mut query_vector = if let Some(model) = &self.model {
            model
                .embed_batch_with_limit(&[query.to_owned()], None)?
                .remove(0)
        } else {
            Vec::new()
        };
        stats.query_embed_ms = began.elapsed().as_secs_f64() * 1000.0;
        let original = query_vector.clone();
        let continuation = is_continuation(query)
            || self.options.session == SessionPolicy::Context
                && tokens(query)
                    .iter()
                    .any(|t| ["it", "its", "they", "them", "their"].contains(&t.as_str()))
                && query_terms(query).len() <= 12;
        let mut topic = original.clone();
        if self.options.session != SessionPolicy::Off && !query_vector.is_empty() {
            if self
                .history
                .back()
                .is_some_and(|p| !continuation && dot(&original, &p.query) < 0.2)
            {
                self.history.clear();
                stats.drift_reset = true;
            }
            if matches!(
                self.options.session,
                SessionPolicy::Related | SessionPolicy::Combined | SessionPolicy::Context
            ) {
                if let Some(previous) = self.history.back() {
                    add(
                        &mut query_vector,
                        &previous.topic,
                        if continuation { 0.35 } else { 0.12 },
                    );
                }
            }
            if matches!(
                self.options.session,
                SessionPolicy::Feedback | SessionPolicy::Combined | SessionPolicy::Context
            ) {
                if let Some(feedback) = feedback {
                    if let Some(prior) = self.history.iter().find(|prior| {
                        prior.id == feedback.query_id
                            && self.turn.saturating_sub(prior.turn) <= 4
                            && (continuation || dot(&original, &prior.query) >= 0.2)
                    }) {
                        for (paths, weight) in
                            [(&feedback.accepted, 0.15), (&feedback.rejected, -0.07)]
                        {
                            let mut centroid = vec![0.0; original.len()];
                            let mut count = 0;
                            for path in paths
                                .iter()
                                .filter_map(|reference| match reference {
                                    FeedbackReference::Path(path) => Some(path.as_str()),
                                    FeedbackReference::Index(index) => {
                                        prior.paths.get(*index).map(String::as_str)
                                    }
                                })
                                .collect::<HashSet<_>>()
                            {
                                if let Some((hash, vector)) = prior.documents.get(path) {
                                    if self
                                        .documents
                                        .get(path)
                                        .is_some_and(|doc| &doc.source_hash == hash)
                                    {
                                        add(&mut centroid, vector, 1.0);
                                        count += 1;
                                    }
                                }
                            }
                            if count > 0 {
                                unit(&mut centroid);
                                add(&mut query_vector, &centroid, weight);
                                stats.feedback_consumed = true;
                            }
                        }
                    }
                }
            }
            unit(&mut query_vector);
            if continuation {
                if let Some(previous) = self.history.back() {
                    topic = previous.topic.clone();
                }
            }
        }
        let wanted = query_terms(query);
        let topic_query = if continuation {
            self.history
                .back()
                .map(|p| p.topic_query.as_str())
                .unwrap_or(query)
        } else {
            query
        }
        .to_owned();
        let mut contextual = HashMap::new();
        if continuation
            && self.options.session == SessionPolicy::Context
            && self.options.mode == RetrievalMode::Hybrid
        {
            if let Some(prior) = self.history.back() {
                let terms = query_terms(&prior.topic_query);
                let average = self.documents.values().map(|d| d.length).sum::<usize>() as f32
                    / self.documents.len().max(1) as f32;
                for term in terms {
                    let df = self
                        .documents
                        .values()
                        .filter(|doc| doc.terms.contains_key(&term))
                        .count() as f32;
                    let idf = (1.0 + (self.documents.len() as f32 - df + 0.5) / (df + 0.5)).ln();
                    for (path, doc) in &self.documents {
                        let count = *doc.terms.get(&term).unwrap_or(&0) as f32;
                        *contextual.entry(path.clone()).or_insert(0.0) += idf * count * 2.2
                            / (count + 1.2 * (0.25 + 0.75 * doc.length as f32 / average.max(1.0)));
                    }
                }
            }
        }
        let max_context = contextual.values().copied().fold(0.0, f32::max).max(1e-12);
        stats.contextual_lexical = !contextual.is_empty();
        let idfs: HashMap<_, _> = wanted
            .iter()
            .map(|term| {
                let df = self
                    .documents
                    .values()
                    .filter(|doc| doc.terms.contains_key(term))
                    .count() as f32;
                (
                    term.clone(),
                    (1.0 + (self.documents.len() as f32 - df + 0.5) / (df + 0.5)).ln(),
                )
            })
            .collect();
        let average = self.documents.values().map(|d| d.length).sum::<usize>() as f32
            / (self.documents.len().max(1) as f32);
        let mut scores = Vec::new();
        for (path, document) in &self.documents {
            let lexical = wanted
                .iter()
                .map(|term| {
                    let count = *document.terms.get(term).unwrap_or(&0) as f32;
                    idfs[term] * count * 2.2
                        / (count + 1.2 * (0.25 + 0.75 * document.length as f32 / average.max(1.0)))
                })
                .sum::<f32>();
            let (best, semantic) = document
                .passages
                .iter()
                .enumerate()
                .map(|(i, p)| (i, dot(&query_vector, &p.vector)))
                .max_by(|a, b| a.1.total_cmp(&b.1).then_with(|| b.0.cmp(&a.0)))
                .unwrap_or((0, 0.0));
            stats.vectors_scored += document.passages.len();
            if lexical > 0.0 {
                stats.lexical_candidates += 1;
            }
            if semantic > self.options.semantic_floor {
                stats.semantic_candidates += 1;
            }
            scores.push((path.clone(), lexical, semantic, best));
        }
        let max_lexical = scores.iter().map(|r| r.1).fold(0.0, f32::max).max(1e-12);
        let mut lex_order: Vec<_> = scores.iter().filter(|r| r.1 > 0.0).collect();
        lex_order.sort_by(|a, b| b.1.total_cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
        let mut sem_order: Vec<_> = scores
            .iter()
            .filter(|r| r.2 > self.options.semantic_floor)
            .collect();
        sem_order.sort_by(|a, b| b.2.total_cmp(&a.2).then_with(|| a.0.cmp(&b.0)));
        let mut candidates: HashSet<_> = lex_order
            .into_iter()
            .take(100)
            .chain(sem_order.into_iter().take(100))
            .map(|r| r.0.clone())
            .collect();
        let mut context_order: Vec<_> = contextual.iter().filter(|(_, v)| **v > 0.0).collect();
        context_order.sort_by(|a, b| b.1.total_cmp(a.1).then_with(|| a.0.cmp(b.0)));
        candidates.extend(
            context_order
                .into_iter()
                .take(100)
                .map(|(path, _)| path.clone()),
        );
        let guarded = is_identifier(query);
        stats.literal_guard = guarded;
        let literal = query.trim().to_lowercase();
        let mut ranked: Vec<_> = scores
            .into_iter()
            .filter(|(path, lexical, semantic, _)| {
                let eligible = match self.options.mode {
                    RetrievalMode::Lexical => *lexical > 0.0,
                    RetrievalMode::Semantic => *semantic > self.options.semantic_floor,
                    _ => candidates.contains(path),
                };
                eligible
                    && (!guarded
                        || path.to_lowercase().contains(&literal)
                        || self.documents[path].text.to_lowercase().contains(&literal))
            })
            .map(|(path, lexical, semantic, best)| {
                let score = match self.options.mode {
                    RetrievalMode::Lexical => lexical,
                    RetrievalMode::Semantic => semantic,
                    _ => {
                        0.5 * semantic.max(0.0)
                            + 0.5 * lexical / max_lexical
                            + 0.15 * contextual.get(&path).copied().unwrap_or(0.0) / max_context
                    }
                };
                (path, score, lexical, semantic, best)
            })
            .collect();
        ranked.sort_by(|a, b| b.1.total_cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
        let mut rows = commands::BoundedRows::new(self.options.output_bytes);
        let mut returned = HashMap::new();
        let mut returned_paths = Vec::new();
        for (path, score, lexical, semantic, best) in ranked.into_iter().take(self.options.limit) {
            let document = &self.documents[&path];
            let mut anchor = 0;
            let mut weight = 0.0;
            for (i, line) in document.lines.iter().enumerate() {
                let value = tokens(line)
                    .into_iter()
                    .collect::<HashSet<_>>()
                    .iter()
                    .map(|t| idfs.get(t).copied().unwrap_or(0.0))
                    .sum::<f32>();
                if value > weight {
                    weight = value;
                    anchor = i;
                }
            }
            if weight == 0.0 && !document.passages.is_empty() {
                anchor = document.passages[best].start_line - 1;
            }
            let mut row = ResultRow {
                path: path.clone(),
                score,
                semantic_score: self.options.explain.then_some(semantic),
                lexical_score: self.options.explain.then_some(lexical),
                view: Some(view_at(
                    &path,
                    &document.lines,
                    anchor + 1,
                    self.options.context,
                )),
                evidence_omitted: false,
            };
            if !rows.fits(&row)? {
                row.view = Some(view_at(&path, &document.lines, anchor + 1, 0));
            }
            if !rows.fits(&row)? {
                row.view = None;
                row.evidence_omitted = true;
            }
            if !rows.push(&row)? {
                break;
            }
            returned_paths.push(path.clone());
            if let Some(passage) = document.passages.get(best) {
                returned.insert(path, (document.source_hash, passage.vector.clone()));
            }
        }
        let result_count = rows.len();
        let raw = rows.finish();
        if self.options.session != SessionPolicy::Off {
            self.history.retain(|prior| prior.id != id);
            self.history.push_back(Prior {
                id: id.to_owned(),
                query: original,
                topic,
                topic_query,
                documents: returned,
                paths: returned_paths,
                turn: self.turn,
            });
            self.turn += 1;
            while self.history.len() > 16 {
                self.history.pop_front();
            }
        }
        stats.session_entries = self.history.len();
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
fn is_identifier(query: &str) -> bool {
    let query = query.trim();
    !query.contains(' ')
        && (query.chars().any(|c| "_:/\\".contains(c))
            || query.chars().skip(1).any(char::is_uppercase)
                && query.chars().any(char::is_lowercase))
}
fn is_continuation(query: &str) -> bool {
    let pronouns: HashSet<_> = [
        "it", "its", "they", "them", "their", "that", "this", "those",
    ]
    .into_iter()
    .collect();
    tokens(query).iter().any(|t| pronouns.contains(t.as_str()))
        && query_terms(query)
            .iter()
            .filter(|t| !pronouns.contains(t.as_str()))
            .count()
            <= 3
}
fn dot(left: &[f32], right: &[f32]) -> f32 {
    left.iter().zip(right).map(|(a, b)| a * b).sum()
}
fn add(left: &mut [f32], right: &[f32], weight: f32) {
    for (a, b) in left.iter_mut().zip(right) {
        *a += weight * b;
    }
}
fn quantize(vector: &mut [f32]) {
    let maximum = vector.iter().map(|v| v.abs()).fold(0.0f32, f32::max);
    if maximum > 0.0 {
        let scale = maximum / 127.0;
        for value in vector.iter_mut() {
            *value = (*value / scale).round().clamp(-127.0, 127.0) * scale;
        }
        unit(vector);
    }
}
pub fn view_at(path: &str, lines: &[String], anchor: usize, context: usize) -> View {
    let anchor = anchor.clamp(1, lines.len().max(1));
    let start = anchor.saturating_sub(context).max(1);
    let end = anchor.saturating_add(context).min(lines.len());
    View {
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
    fn full_source_lexical_freshness_ignores_and_budget() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join(".gitignore"), "ignored.txt\n").unwrap();
        std::fs::write(dir.path().join("ignored.txt"), "needle").unwrap();
        let path = dir.path().join("source.txt");
        std::fs::write(
            &path,
            format!("{}\nneedle LateWitness\n", "filler\n".repeat(10000)),
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
        let (raw, stats) = engine.search("LateWitness", "one", None).unwrap();
        let value: serde_json::Value = serde_json::from_slice(&raw).unwrap();
        assert_eq!(stats.searchable_files, 1);
        assert_eq!(value["results"][0]["view"]["start_line"], 10000);
        assert!(raw.len() <= 12000);
        std::fs::write(&path, "changed").unwrap();
        let (raw, _) = engine.search("LateWitness", "two", None).unwrap();
        assert_eq!(
            serde_json::from_slice::<serde_json::Value>(&raw).unwrap()["results"]
                .as_array()
                .unwrap()
                .len(),
            0
        );
    }
}
