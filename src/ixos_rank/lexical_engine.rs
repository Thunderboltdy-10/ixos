//! Lexical (keyword-based) search engine
//!
//! Provides simple keyword matching for the first phase of hybrid search.
//! Uses rayon for parallel file loading and search processing.
//!
//! ## Engines
//!
//! - [`StubLexicalEngine`]: Simple in-memory keyword matching for testing
//! - [`RipgrepLexicalEngine`]: SIMD-accelerated search using ripgrep internals

use std::num::NonZeroUsize;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::LazyLock;

use async_trait::async_trait;
use grep_regex::RegexMatcherBuilder;
use grep_searcher::{Searcher, SearcherBuilder, Sink, SinkMatch};
use ignore::WalkBuilder;
use parking_lot::Mutex;
use rayon::prelude::*;
use regex::Regex;
use std::time::Duration;

use super::types::{LexicalMatch, SearchError};

static REGEX_CACHE: LazyLock<Mutex<lru::LruCache<String, Regex>>> = LazyLock::new(|| {
    Mutex::new(lru::LruCache::new(
        NonZeroUsize::new(512).expect("regex cache size"),
    ))
});

fn get_cached_regex(pattern: &str) -> Option<Regex> {
    let mut cache = REGEX_CACHE.lock();
    if let Some(re) = cache.get(pattern) {
        return Some(re.clone());
    }

    if let Ok(re) = Regex::new(pattern) {
        cache.put(pattern.to_string(), re.clone());
        return Some(re);
    }

    None
}

/// Trait for lexical search engines
#[async_trait]
pub trait LexicalEngine: Send + Sync {
    /// Search for files matching the query
    ///
    /// Returns files ranked by keyword relevance.
    async fn search(&self, query: &str, limit: usize) -> Result<Vec<LexicalMatch>, SearchError>;

    /// Optional total file count for reporting/streaming stats
    fn indexed_file_count(&self) -> Option<usize> {
        None
    }

    async fn search_with_batches(
        &self,
        query: &str,
        limit: usize,
        batch_size: usize,
        _batch_timeout: Duration,
        mut on_batch: Option<Box<dyn FnMut(Vec<LexicalMatch>, bool) + Send>>,
    ) -> Result<Vec<LexicalMatch>, SearchError> {
        let results = self.search(query, limit).await?;
        if let Some(ref mut handler) = on_batch {
            if results.is_empty() {
                handler(Vec::new(), true);
            } else {
                let mut batch = Vec::new();
                for (index, result) in results.iter().enumerate() {
                    batch.push(result.clone());
                    if batch.len() >= batch_size || index + 1 == results.len() {
                        handler(batch.clone(), index + 1 == results.len());
                        batch.clear();
                    }
                }
            }
        }
        Ok(results)
    }
}

/// Simple stub lexical engine for testing
///
/// Performs case-insensitive word boundary matching on files.
/// Uses lazy loading with LRU cache for better performance.
pub struct StubLexicalEngine {
    /// File paths to search (lazy loading - content not preloaded)
    file_paths: Vec<PathBuf>,
    /// LRU cache for file content (500 files max)
    content_cache: parking_lot::Mutex<lru::LruCache<PathBuf, String>>,
    /// Minimum relevance score threshold (0.0-1.0)
    min_score_threshold: f32,
}

impl StubLexicalEngine {
    /// Create an empty stub engine with default threshold (0.3)
    pub fn new() -> Self {
        Self {
            file_paths: Vec::new(),
            content_cache: parking_lot::Mutex::new(lru::LruCache::new(
                std::num::NonZeroUsize::new(500).unwrap(),
            )),
            min_score_threshold: 0.3,
        }
    }

    /// Set the minimum score threshold (0.0 to 1.0)
    pub fn set_min_score_threshold(&mut self, threshold: f32) {
        self.min_score_threshold = threshold.clamp(0.0, 1.0);
    }

    /// Load files from a directory using lazy loading (paths only)
    pub fn load_from_directory(dir: &Path) -> Result<Self, SearchError> {
        let start = std::time::Instant::now();

        // Collect all file paths (fast: 10-50ms for 1000 files)
        let mut paths = Vec::new();
        Self::collect_paths(dir, &mut paths)?;

        tracing::debug!(
            "Collected {} file paths from {:?} in {:?} (lazy loading)",
            paths.len(),
            dir,
            start.elapsed()
        );

        Ok(Self {
            file_paths: paths,
            content_cache: parking_lot::Mutex::new(lru::LruCache::new(
                std::num::NonZeroUsize::new(500).unwrap(),
            )),
            min_score_threshold: 0.3,
        })
    }

    /// Load file content with caching
    fn load_file_content(&self, path: &Path) -> Result<String, SearchError> {
        // Check cache first
        {
            let mut cache = self.content_cache.lock();
            if let Some(content) = cache.get(path) {
                return Ok(content.clone());
            }
        }

        // Load from disk
        let content = std::fs::read_to_string(path).map_err(SearchError::Io)?;

        // Store in cache
        {
            let mut cache = self.content_cache.lock();
            cache.put(path.to_path_buf(), content.clone());
        }

        Ok(content)
    }

    /// Collect all valid file paths from a directory
    fn collect_paths(dir: &Path, paths: &mut Vec<PathBuf>) -> Result<(), SearchError> {
        let entries = std::fs::read_dir(dir).map_err(SearchError::Io)?;

        for entry in entries {
            let entry = entry.map_err(SearchError::Io)?;
            let path = entry.path();

            if path.is_dir() {
                Self::collect_paths(&path, paths)?;
            } else if path.is_file() {
                // Only include text files
                if let Some(ext) = path.extension() {
                    let ext = ext.to_string_lossy().to_lowercase();
                    if matches!(
                        ext.as_str(),
                        "txt" | "md" | "json" | "rs" | "toml" | "yaml" | "yml" | "py" | "js" | "ts"
                    ) {
                        paths.push(path);
                    }
                }
            }
        }

        Ok(())
    }

    /// Add a file to the index
    pub fn add_file(&mut self, path: PathBuf, content: String) {
        // Store in cache
        self.content_cache.lock().put(path.clone(), content);
        self.file_paths.push(path);
    }

    /// Get the number of indexed files
    pub fn file_count(&self) -> usize {
        self.file_paths.len()
    }

    /// Extract query terms from a query string
    fn extract_terms(query: &str) -> Vec<String> {
        query
            .split_whitespace()
            .map(|s| s.to_lowercase())
            .filter(|s| s.len() > 1) // Skip single characters
            .collect()
    }

    /// Check if a term matches with word boundaries (prevents "Rope" matching "Europe")
    fn is_word_match(content: &str, term: &str) -> bool {
        let pattern = format!(r"(?i)\b{}\b", regex::escape(term));
        get_cached_regex(&pattern)
            .map(|re| re.is_match(content))
            .unwrap_or(false)
    }

    /// Check if a term is a substring match (without word boundaries)
    fn is_substring_match(content: &str, term: &str) -> bool {
        content.to_lowercase().contains(&term.to_lowercase())
    }

    /// Calculate a simple relevance score with word boundary matching
    fn calculate_score(path: &Path, content: &str, terms: &[String]) -> (f32, usize) {
        let filename = path
            .file_name()
            .map(|s| s.to_string_lossy().to_lowercase())
            .unwrap_or_default();

        let mut matched_terms = 0;
        let mut word_matches = 0;
        let mut substring_matches = 0;
        let mut filename_matches = 0;

        for term in terms {
            let term_str = term.as_str();

            // Check for word boundary matches (full words)
            let is_word = Self::is_word_match(content, term_str);

            // Check for substring matches (partial words - heavily penalized)
            let is_substring = !is_word && Self::is_substring_match(content, term_str);

            // Check filename matches (significantly boost score)
            let fn_count = filename.matches(term_str).count();

            if is_word || is_substring || fn_count > 0 {
                matched_terms += 1;

                if is_word {
                    // Full word match: score += 1.0
                    word_matches += content.to_lowercase().matches(term_str).count();
                } else if is_substring {
                    // Substring only match: score += 0.2 (80% penalty)
                    substring_matches += 1;
                }

                filename_matches += fn_count;
            }
        }

        // Score based on term coverage and match quality
        let coverage = if terms.is_empty() {
            0.0
        } else {
            matched_terms as f32 / terms.len() as f32
        };

        // Word matches get full credit, substring matches get 20%
        let match_score = (word_matches as f32) + (substring_matches as f32 * 0.2);
        let frequency_bonus = match_score.ln_1p() / 10.0;

        // Huge bonus for filename matches - if you search for the file name, it should be top
        let filename_bonus = (filename_matches as f32) * 2.0;

        // Final score calculation
        let raw_score = coverage + frequency_bonus + filename_bonus;

        (raw_score.min(10.0), matched_terms) // Cap score but allow >1.0 for strong matches
    }

    /// Extract a snippet around the first match
    fn extract_snippet(content: &str, terms: &[String], max_len: usize) -> String {
        let lower_content = content.to_lowercase();

        // Find first match position
        let mut first_match_pos = None;
        for term in terms {
            if let Some(pos) = lower_content.find(term.as_str()) {
                if first_match_pos.is_none() || pos < first_match_pos.unwrap() {
                    first_match_pos = Some(pos);
                }
            }
        }

        match first_match_pos {
            Some(pos) => {
                // Calculate desired byte positions
                let start_byte = pos.saturating_sub(50);
                let end_byte = (pos + 100).min(content.len());

                // Adjust to valid UTF-8 char boundaries
                let start = Self::floor_char_boundary(content, start_byte);
                let end = Self::ceil_char_boundary(content, end_byte);

                let snippet = &content[start..end];
                let snippet = snippet.trim();

                // Truncate by characters, not bytes, to avoid splitting multi-byte chars
                if snippet.chars().count() > max_len {
                    let truncated: String = snippet.chars().take(max_len).collect();
                    format!("{}...", truncated)
                } else {
                    snippet.to_string()
                }
            }
            None => {
                // No match found, return beginning
                let snippet: String = content.chars().take(max_len).collect();
                snippet.trim().to_string()
            }
        }
    }

    /// Find the largest byte index that is also a valid char boundary at or before `index`.
    /// Equivalent to unstable `str::floor_char_boundary`.
    fn floor_char_boundary(s: &str, index: usize) -> usize {
        if index >= s.len() {
            return s.len();
        }
        // Find the start of the character at or before `index`
        let mut i = index;
        while i > 0 && !s.is_char_boundary(i) {
            i -= 1;
        }
        i
    }

    /// Find the smallest byte index that is also a valid char boundary at or after `index`.
    /// Equivalent to unstable `str::ceil_char_boundary`.
    fn ceil_char_boundary(s: &str, index: usize) -> usize {
        if index >= s.len() {
            return s.len();
        }
        // Find the end of the character at or after `index`
        let mut i = index;
        while i < s.len() && !s.is_char_boundary(i) {
            i += 1;
        }
        i
    }
}

impl Default for StubLexicalEngine {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl LexicalEngine for StubLexicalEngine {
    async fn search(&self, query: &str, limit: usize) -> Result<Vec<LexicalMatch>, SearchError> {
        let terms = Self::extract_terms(query);

        if terms.is_empty() {
            return Ok(Vec::new());
        }

        let start = std::time::Instant::now();

        // Use parallel search with lazy loading for large file sets
        let mut matches: Vec<LexicalMatch> = if self.file_paths.len() > 100 {
            // Parallel search for large file sets with lazy loading
            self.file_paths
                .par_iter()
                .filter_map(|path| {
                    // Load file content on-demand
                    let content = self.load_file_content(path).ok()?;
                    let (score, matched_terms) = Self::calculate_score(path, &content, &terms);

                    // Apply minimum score threshold
                    if matched_terms > 0 && score >= self.min_score_threshold {
                        let snippet = Self::extract_snippet(&content, &terms, 200);
                        Some(LexicalMatch::new(
                            path.clone(),
                            score,
                            snippet,
                            matched_terms,
                            terms.len(),
                        ))
                    } else {
                        None
                    }
                })
                .collect()
        } else {
            // Sequential search for small file sets (avoid rayon overhead)
            self.file_paths
                .iter()
                .filter_map(|path| {
                    // Load file content on-demand
                    let content = self.load_file_content(path).ok()?;
                    let (score, matched_terms) = Self::calculate_score(path, &content, &terms);

                    // Apply minimum score threshold
                    if matched_terms > 0 && score >= self.min_score_threshold {
                        let snippet = Self::extract_snippet(&content, &terms, 200);
                        Some(LexicalMatch::new(
                            path.clone(),
                            score,
                            snippet,
                            matched_terms,
                            terms.len(),
                        ))
                    } else {
                        None
                    }
                })
                .collect()
        };

        // Sort by score descending
        matches.sort_by(|a, b| {
            b.score
                .partial_cmp(&a.score)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        // Limit results
        matches.truncate(limit);

        tracing::trace!(
            "Lexical search for '{}' found {} matches in {:?} (lazy loading)",
            query,
            matches.len(),
            start.elapsed()
        );

        Ok(matches)
    }

    fn indexed_file_count(&self) -> Option<usize> {
        Some(self.file_paths.len())
    }
}

/// Configuration for RipgrepLexicalEngine
#[derive(Debug, Clone)]
pub struct RipgrepConfig {
    /// Maximum file size to search (in bytes). Files larger than this are skipped.
    /// Default: 10MB
    pub max_file_size: u64,
    /// Whether to respect .gitignore files
    /// Default: true
    pub respect_gitignore: bool,
    /// Whether to skip hidden files and directories
    /// Default: true
    pub skip_hidden: bool,
    /// Whether to follow symlinks
    /// Default: false
    pub follow_symlinks: bool,
    /// Maximum number of candidates to return for semantic reranking
    /// Default: 1000
    pub max_candidates: usize,
    /// Number of parallel threads for searching (0 = auto-detect based on CPU cores)
    /// Default: 0
    pub thread_count: usize,
    /// Additional file type extensions to include (e.g., ["txt", "md", "rs"])
    /// Empty means include all text files
    pub include_extensions: Vec<String>,
    /// File type extensions to exclude (e.g., ["exe", "dll"])
    pub exclude_extensions: Vec<String>,
}

impl Default for RipgrepConfig {
    fn default() -> Self {
        Self {
            max_file_size: 10 * 1024 * 1024, // 10MB
            respect_gitignore: true,
            skip_hidden: true,
            follow_symlinks: false,
            max_candidates: 1000,
            thread_count: 0, // auto-detect
            include_extensions: Vec::new(),
            exclude_extensions: vec![
                "exe".to_string(),
                "dll".to_string(),
                "so".to_string(),
                "dylib".to_string(),
                "bin".to_string(),
                "obj".to_string(),
                "o".to_string(),
                "a".to_string(),
                "lib".to_string(),
                "png".to_string(),
                "jpg".to_string(),
                "jpeg".to_string(),
                "gif".to_string(),
                "bmp".to_string(),
                "ico".to_string(),
                "svg".to_string(),
                "woff".to_string(),
                "woff2".to_string(),
                "ttf".to_string(),
                "eot".to_string(),
                "mp3".to_string(),
                "mp4".to_string(),
                "avi".to_string(),
                "mov".to_string(),
                "wav".to_string(),
                "zip".to_string(),
                "tar".to_string(),
                "gz".to_string(),
                "rar".to_string(),
                "7z".to_string(),
                "pdf".to_string(),
                "doc".to_string(),
                "docx".to_string(),
                "xls".to_string(),
                "xlsx".to_string(),
                "ppt".to_string(),
                "pptx".to_string(),
            ],
        }
    }
}

impl RipgrepConfig {
    /// Create a new config with default settings
    pub fn new() -> Self {
        Self::default()
    }

    /// Set maximum file size (builder pattern)
    pub fn with_max_file_size(mut self, size: u64) -> Self {
        self.max_file_size = size;
        self
    }

    /// Set whether to respect .gitignore (builder pattern)
    pub fn with_respect_gitignore(mut self, respect: bool) -> Self {
        self.respect_gitignore = respect;
        self
    }

    /// Set whether to skip hidden files (builder pattern)
    pub fn with_skip_hidden(mut self, skip: bool) -> Self {
        self.skip_hidden = skip;
        self
    }

    /// Set maximum candidates to return (builder pattern)
    pub fn with_max_candidates(mut self, max: usize) -> Self {
        self.max_candidates = max;
        self
    }

    /// Set thread count (builder pattern)
    pub fn with_thread_count(mut self, count: usize) -> Self {
        self.thread_count = count;
        self
    }

    /// Set file extensions to include (builder pattern)
    pub fn with_include_extensions(mut self, exts: Vec<String>) -> Self {
        self.include_extensions = exts;
        self
    }
}

/// High-performance lexical search engine using ripgrep internals
///
/// Uses SIMD-accelerated pattern matching via grep-regex and respects
/// .gitignore files via the `ignore` crate. Designed for speculative
/// lexical pre-filtering before semantic search.
///
/// ## Features
///
/// - **SIMD Acceleration**: Uses ripgrep's optimized regex engine
/// - **Gitignore Support**: Automatically skips node_modules, target, .git, etc.
/// - **Parallel Search**: Uses `WalkBuilder::build_parallel()` for multi-threaded traversal
/// - **Binary Detection**: Skips binary files automatically
/// - **Size Limits**: Configurable max file size (default: 10MB)
///
/// ## Example
///
/// ```rust,no_run
/// use ixos_protocol::ixos_rank::{RipgrepLexicalEngine, RipgrepConfig, LexicalEngine};
///
/// #[tokio::main]
/// async fn main() {
///     let config = RipgrepConfig::default()
///         .with_max_file_size(5 * 1024 * 1024)  // 5MB
///         .with_max_candidates(500);
///
///     let engine = RipgrepLexicalEngine::new("/path/to/search", config).unwrap();
///     let results = engine.search("quarterly report", 100).await.unwrap();
///
///     for result in results {
///         println!("{}: {:.2}", result.path.display(), result.score);
///     }
/// }
/// ```
pub struct RipgrepLexicalEngine {
    /// Root directory to search
    root_dir: PathBuf,
    /// Configuration options
    config: RipgrepConfig,
}

impl RipgrepLexicalEngine {
    /// Create a new RipgrepLexicalEngine for the given directory
    pub fn new<P: AsRef<Path>>(root_dir: P, config: RipgrepConfig) -> Result<Self, SearchError> {
        let root = root_dir.as_ref().to_path_buf();

        if !root.exists() {
            return Err(SearchError::Io(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                format!("Directory not found: {}", root.display()),
            )));
        }

        if !root.is_dir() {
            return Err(SearchError::Io(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                format!("Path is not a directory: {}", root.display()),
            )));
        }

        Ok(Self {
            root_dir: root,
            config,
        })
    }

    /// Create with default configuration
    pub fn with_defaults<P: AsRef<Path>>(root_dir: P) -> Result<Self, SearchError> {
        Self::new(root_dir, RipgrepConfig::default())
    }

    /// Get the root directory
    pub fn root_dir(&self) -> &Path {
        &self.root_dir
    }

    /// Get the current configuration
    pub fn config(&self) -> &RipgrepConfig {
        &self.config
    }

    /// Build a regex pattern from query terms with word boundaries
    ///
    /// Creates an alternation pattern: `\b(term1|term2|term3)\b`
    fn build_pattern(query: &str) -> Option<String> {
        let terms: Vec<&str> = query
            .split_whitespace()
            .filter(|s| s.len() > 1) // Skip single characters
            .collect();

        if terms.is_empty() {
            return None;
        }

        // Escape special regex characters and join with alternation
        let escaped: Vec<String> = terms.iter().map(|t| regex::escape(t)).collect();

        // Pattern with word boundaries
        Some(format!(r"\b({})\b", escaped.join("|")))
    }

    /// Extract query terms (lowercase)
    fn extract_terms(query: &str) -> Vec<String> {
        query
            .split_whitespace()
            .map(|s| s.to_lowercase())
            .filter(|s| s.len() > 1)
            .collect()
    }

    /// Check if a file extension should be excluded
    fn should_exclude_extension(&self, path: &Path) -> bool {
        if let Some(ext) = path.extension() {
            let ext_lower = ext.to_string_lossy().to_lowercase();

            // If include list is specified, only include those
            if !self.config.include_extensions.is_empty() {
                return !self
                    .config
                    .include_extensions
                    .iter()
                    .any(|e| e.to_lowercase() == ext_lower);
            }

            // Otherwise check exclude list
            self.config
                .exclude_extensions
                .iter()
                .any(|e| e.to_lowercase() == ext_lower)
        } else {
            false // No extension, don't exclude
        }
    }

    /// Extract a snippet around the match
    fn extract_snippet(content: &str, terms: &[String], max_len: usize) -> String {
        let lower_content = content.to_lowercase();

        // Find first match position
        let mut first_match_pos = None;
        for term in terms {
            if let Some(pos) = lower_content.find(term.as_str()) {
                if first_match_pos.is_none() || pos < first_match_pos.unwrap() {
                    first_match_pos = Some(pos);
                }
            }
        }

        match first_match_pos {
            Some(pos) => {
                let start_byte = pos.saturating_sub(50);
                let end_byte = (pos + 100).min(content.len());

                // Adjust to valid UTF-8 char boundaries
                let start = Self::floor_char_boundary(content, start_byte);
                let end = Self::ceil_char_boundary(content, end_byte);

                let snippet = &content[start..end];
                let snippet = snippet.trim();

                if snippet.chars().count() > max_len {
                    let truncated: String = snippet.chars().take(max_len).collect();
                    format!("{}...", truncated)
                } else {
                    snippet.to_string()
                }
            }
            None => {
                let snippet: String = content.chars().take(max_len).collect();
                snippet.trim().to_string()
            }
        }
    }

    /// Find floor char boundary (same as StubLexicalEngine)
    fn floor_char_boundary(s: &str, index: usize) -> usize {
        if index >= s.len() {
            return s.len();
        }
        let mut i = index;
        while i > 0 && !s.is_char_boundary(i) {
            i -= 1;
        }
        i
    }

    /// Find ceil char boundary (same as StubLexicalEngine)
    fn ceil_char_boundary(s: &str, index: usize) -> usize {
        if index >= s.len() {
            return s.len();
        }
        let mut i = index;
        while i < s.len() && !s.is_char_boundary(i) {
            i += 1;
        }
        i
    }

    /// Search a single file and return match info
    fn search_file(
        &self,
        path: &Path,
        matcher: &grep_regex::RegexMatcher,
        terms: &[String],
    ) -> Option<RipgrepFileMatch> {
        // Skip files that are too large
        if let Ok(metadata) = path.metadata() {
            if metadata.len() > self.config.max_file_size {
                return None;
            }
        }

        // Skip excluded extensions
        if self.should_exclude_extension(path) {
            return None;
        }

        // Create a searcher with binary detection
        let mut searcher = SearcherBuilder::new()
            .binary_detection(grep_searcher::BinaryDetection::quit(0x00))
            .build();

        // Collect matches
        let mut sink = MatchSink::new(terms.len());

        // Search the file
        if searcher.search_path(matcher, path, &mut sink).is_ok() && sink.match_count > 0 {
            // Read file content for snippet extraction
            let content = std::fs::read_to_string(path).ok()?;
            let snippet = Self::extract_snippet(&content, terms, 200);

            // Calculate score based on match count and coverage
            let filename = path
                .file_name()
                .map(|s| s.to_string_lossy().to_lowercase())
                .unwrap_or_default();

            // Count filename matches
            let filename_matches: usize = terms
                .iter()
                .filter(|t| filename.contains(t.as_str()))
                .count();

            // Score calculation:
            // - Base: term coverage (matched_terms / total_terms)
            // - Bonus: log(1 + match_count) / 10 for frequency
            // - Bonus: 2.0 per filename match
            let term_coverage = sink.matched_terms.len() as f32 / terms.len().max(1) as f32;
            let frequency_bonus = (sink.match_count as f32).ln_1p() / 10.0;
            let filename_bonus = filename_matches as f32 * 2.0;
            let score = (term_coverage + frequency_bonus + filename_bonus).min(10.0);

            Some(RipgrepFileMatch {
                path: path.to_path_buf(),
                score,
                snippet,
                matched_terms: sink.matched_terms.len(),
                total_terms: terms.len(),
                match_count: sink.match_count,
            })
        } else {
            None
        }
    }
}

/// Internal struct for file match results
struct RipgrepFileMatch {
    path: PathBuf,
    score: f32,
    snippet: String,
    matched_terms: usize,
    total_terms: usize,
    #[allow(dead_code)]
    match_count: usize,
}

/// Sink for collecting match information from grep-searcher
struct MatchSink {
    /// Number of matches found
    match_count: usize,
    /// Set of term indices that matched (for tracking coverage)
    matched_terms: std::collections::HashSet<usize>,
    /// Total number of terms
    term_count: usize,
}

impl MatchSink {
    fn new(term_count: usize) -> Self {
        Self {
            match_count: 0,
            matched_terms: std::collections::HashSet::new(),
            term_count,
        }
    }
}

impl Sink for MatchSink {
    type Error = std::io::Error;

    fn matched(&mut self, _searcher: &Searcher, _mat: &SinkMatch<'_>) -> Result<bool, Self::Error> {
        self.match_count += 1;

        // For simplicity, mark all terms as potentially matched when we find any match
        // A more sophisticated implementation would parse the match to identify which term matched
        for i in 0..self.term_count {
            self.matched_terms.insert(i);
        }

        // Continue searching (return true to keep going)
        Ok(true)
    }
}

#[async_trait]
impl LexicalEngine for RipgrepLexicalEngine {
    async fn search(&self, query: &str, limit: usize) -> Result<Vec<LexicalMatch>, SearchError> {
        let start = std::time::Instant::now();

        // Build the regex pattern
        let pattern = match Self::build_pattern(query) {
            Some(p) => p,
            None => return Ok(Vec::new()),
        };

        let terms = Self::extract_terms(query);

        // Build the regex matcher with case-insensitive matching
        let matcher = RegexMatcherBuilder::new()
            .case_insensitive(true)
            .build(&pattern)
            .map_err(|e| SearchError::LexicalFailed(format!("Failed to build regex: {}", e)))?;

        // Build the directory walker
        let mut walk_builder = WalkBuilder::new(&self.root_dir);
        walk_builder
            .hidden(!self.config.skip_hidden)
            .git_ignore(self.config.respect_gitignore)
            .git_global(self.config.respect_gitignore)
            .git_exclude(self.config.respect_gitignore)
            .follow_links(self.config.follow_symlinks)
            .max_depth(None); // No depth limit

        if self.config.thread_count > 0 {
            walk_builder.threads(self.config.thread_count);
        }

        // Collect all file paths first (parallel walk)
        let file_paths: Vec<PathBuf> = walk_builder
            .build()
            .filter_map(|entry| {
                entry.ok().and_then(|e| {
                    let path = e.path();
                    if path.is_file() && !self.should_exclude_extension(path) {
                        Some(path.to_path_buf())
                    } else {
                        None
                    }
                })
            })
            .collect();

        tracing::debug!(
            "RipgrepLexicalEngine: collected {} file paths in {:?}",
            file_paths.len(),
            start.elapsed()
        );

        // Search files in parallel using rayon
        let search_start = std::time::Instant::now();
        let match_count = AtomicUsize::new(0);
        let max_candidates = self.config.max_candidates;

        let mut matches: Vec<LexicalMatch> = file_paths
            .par_iter()
            .filter_map(|path| {
                // Early exit if we have enough candidates
                if match_count.load(Ordering::Relaxed) >= max_candidates * 2 {
                    return None;
                }

                self.search_file(path, &matcher, &terms).map(|m| {
                    match_count.fetch_add(1, Ordering::Relaxed);
                    LexicalMatch::new(m.path, m.score, m.snippet, m.matched_terms, m.total_terms)
                })
            })
            .collect();

        // Sort by score descending
        matches.sort_by(|a, b| {
            b.score
                .partial_cmp(&a.score)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        // Limit results
        let effective_limit = limit.min(self.config.max_candidates);
        matches.truncate(effective_limit);

        tracing::debug!(
            "RipgrepLexicalEngine: search for '{}' found {} matches (searched {} files) in {:?}",
            query,
            matches.len(),
            file_paths.len(),
            search_start.elapsed()
        );

        tracing::trace!(
            "RipgrepLexicalEngine: total time for '{}': {:?}",
            query,
            start.elapsed()
        );

        Ok(matches)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_engine_with_files() -> StubLexicalEngine {
        let mut engine = StubLexicalEngine::new();
        engine.add_file(
            PathBuf::from("/test/doc1.txt"),
            "The quick brown fox jumps over the lazy dog".to_string(),
        );
        engine.add_file(
            PathBuf::from("/test/doc2.txt"),
            "A quick brown dog runs fast".to_string(),
        );
        engine.add_file(
            PathBuf::from("/test/doc3.txt"),
            "Something completely different".to_string(),
        );
        engine
    }

    #[test]
    fn test_extract_terms() {
        let terms = StubLexicalEngine::extract_terms("hello world");
        assert_eq!(terms, vec!["hello", "world"]);
    }

    #[test]
    fn test_extract_terms_filters_short() {
        let terms = StubLexicalEngine::extract_terms("I am a test");
        assert_eq!(terms, vec!["am", "test"]); // "I" and "a" filtered
    }

    #[test]
    fn test_calculate_score() {
        let content = "hello world hello";
        let path = PathBuf::from("test.txt");
        let terms = vec!["hello".to_string()];
        let (score, matches) = StubLexicalEngine::calculate_score(&path, content, &terms);
        assert!(score > 0.0);
        assert_eq!(matches, 1);
    }

    #[test]
    fn test_calculate_score_filename_match() {
        let content = "nothing matches here";
        let path = PathBuf::from("hello_world.txt");
        let terms = vec!["hello".to_string()];
        let (score, matches) = StubLexicalEngine::calculate_score(&path, content, &terms);
        // Should have a high score due to filename match
        assert!(score > 1.0);
        assert_eq!(matches, 1);
    }

    #[tokio::test]
    async fn test_search_finds_matches() {
        let engine = create_engine_with_files();
        let results = engine.search("quick brown", 10).await.unwrap();

        assert!(!results.is_empty());
        // Both doc1 and doc2 should match
        assert!(results.len() >= 2);
    }

    #[tokio::test]
    async fn test_search_no_matches() {
        let engine = create_engine_with_files();
        let results = engine.search("xyz123 nonexistent", 10).await.unwrap();

        assert!(results.is_empty());
    }

    #[tokio::test]
    async fn test_search_respects_limit() {
        let engine = create_engine_with_files();
        let results = engine.search("quick", 1).await.unwrap();

        assert_eq!(results.len(), 1);
    }

    #[tokio::test]
    async fn test_search_empty_query() {
        let engine = create_engine_with_files();
        let results = engine.search("", 10).await.unwrap();

        assert!(results.is_empty());
    }

    #[test]
    fn test_snippet_extraction() {
        let content = "This is some text with the word hello in it.";
        let terms = vec!["hello".to_string()];
        let snippet = StubLexicalEngine::extract_snippet(content, &terms, 100);

        assert!(snippet.contains("hello"));
    }

    #[test]
    fn test_file_count() {
        let engine = create_engine_with_files();
        assert_eq!(engine.file_count(), 3);
    }

    #[test]
    fn test_unicode_snippet_extraction() {
        // Test with curly quotes and em-dashes (multi-byte UTF-8 characters)
        let content = "For almost 30 centuries—from its unification around 3100 B.C. to its conquest by Alexander the Great in 332 B.C.—ancient Egypt was the preeminent civilization in the Mediterranean world. From the great 'pyramids' of the Old Kingdom through the military conquests of the New Kingdom, Egypt's majesty has long engrossed archaeologists.";
        let terms = vec!["egypt".to_string()];

        // This should NOT panic even with multi-byte characters
        let snippet = StubLexicalEngine::extract_snippet(content, &terms, 100);

        // Verify we got a valid snippet
        assert!(!snippet.is_empty());
    }

    #[test]
    fn test_floor_char_boundary() {
        let s = "Hello, 世界!"; // '世' starts at byte 7, '界' at byte 10
        assert_eq!(StubLexicalEngine::floor_char_boundary(s, 0), 0);
        assert_eq!(StubLexicalEngine::floor_char_boundary(s, 7), 7); // Valid boundary
        assert_eq!(StubLexicalEngine::floor_char_boundary(s, 8), 7); // Mid-char -> floor to 7
        assert_eq!(StubLexicalEngine::floor_char_boundary(s, 9), 7); // Mid-char -> floor to 7
        assert_eq!(StubLexicalEngine::floor_char_boundary(s, 10), 10); // Valid boundary
    }

    #[test]
    fn test_ceil_char_boundary() {
        let s = "Hello, 世界!"; // '世' starts at byte 7 ends at 10, '界' at byte 10 ends at 13
        assert_eq!(StubLexicalEngine::ceil_char_boundary(s, 0), 0);
        assert_eq!(StubLexicalEngine::ceil_char_boundary(s, 7), 7); // Valid boundary
        assert_eq!(StubLexicalEngine::ceil_char_boundary(s, 8), 10); // Mid-char -> ceil to 10
        assert_eq!(StubLexicalEngine::ceil_char_boundary(s, 9), 10); // Mid-char -> ceil to 10
        assert_eq!(StubLexicalEngine::ceil_char_boundary(s, 10), 10); // Valid boundary
    }

    #[tokio::test]
    async fn test_search_unicode_content() {
        let mut engine = StubLexicalEngine::new();
        engine.add_file(
            PathBuf::from("/test/unicode.txt"),
            "For almost 30 centuries—from its unification around 3100 B.C.—ancient Egypt was the preeminent civilization. From the great 'pyramids' of the Old Kingdom.".to_string(),
        );

        // This should NOT panic
        let results = engine.search("egypt", 10).await.unwrap();
        assert!(!results.is_empty());
        // Verify the snippet doesn't contain invalid UTF-8
        assert!(
            results[0].content_snippet.is_ascii() || results[0].content_snippet.chars().count() > 0
        );
    }

    // =====================================================
    // RipgrepLexicalEngine tests
    // =====================================================

    #[test]
    fn test_ripgrep_config_default() {
        let config = RipgrepConfig::default();
        assert_eq!(config.max_file_size, 10 * 1024 * 1024);
        assert!(config.respect_gitignore);
        assert!(config.skip_hidden);
        assert!(!config.follow_symlinks);
        assert_eq!(config.max_candidates, 1000);
        assert_eq!(config.thread_count, 0);
    }

    #[test]
    fn test_ripgrep_config_builder() {
        let config = RipgrepConfig::new()
            .with_max_file_size(5 * 1024 * 1024)
            .with_respect_gitignore(false)
            .with_skip_hidden(false)
            .with_max_candidates(500)
            .with_thread_count(4);

        assert_eq!(config.max_file_size, 5 * 1024 * 1024);
        assert!(!config.respect_gitignore);
        assert!(!config.skip_hidden);
        assert_eq!(config.max_candidates, 500);
        assert_eq!(config.thread_count, 4);
    }

    #[test]
    fn test_ripgrep_build_pattern() {
        // Single term
        let pattern = RipgrepLexicalEngine::build_pattern("hello");
        assert_eq!(pattern, Some(r"\b(hello)\b".to_string()));

        // Multiple terms
        let pattern = RipgrepLexicalEngine::build_pattern("hello world");
        assert_eq!(pattern, Some(r"\b(hello|world)\b".to_string()));

        // Empty query
        let pattern = RipgrepLexicalEngine::build_pattern("");
        assert_eq!(pattern, None);

        // Single char terms filtered
        let pattern = RipgrepLexicalEngine::build_pattern("a b c");
        assert_eq!(pattern, None);

        // Special regex chars escaped
        let pattern = RipgrepLexicalEngine::build_pattern("hello.world");
        assert_eq!(pattern, Some(r"\b(hello\.world)\b".to_string()));
    }

    #[test]
    fn test_ripgrep_extract_terms() {
        let terms = RipgrepLexicalEngine::extract_terms("Hello World");
        assert_eq!(terms, vec!["hello", "world"]);

        let terms = RipgrepLexicalEngine::extract_terms("I am test");
        assert_eq!(terms, vec!["am", "test"]); // "I" filtered
    }

    #[tokio::test]
    async fn test_ripgrep_engine_nonexistent_dir() {
        let result = RipgrepLexicalEngine::new("/nonexistent/path/12345", RipgrepConfig::default());
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_ripgrep_engine_empty_query() {
        let temp_dir = tempfile::tempdir().unwrap();
        let engine = RipgrepLexicalEngine::with_defaults(temp_dir.path()).unwrap();

        let results = engine.search("", 10).await.unwrap();
        assert!(results.is_empty());
    }

    #[tokio::test]
    async fn test_ripgrep_engine_search() {
        let temp_dir = tempfile::tempdir().unwrap();

        // Create test files
        std::fs::write(
            temp_dir.path().join("doc1.txt"),
            "The quick brown fox jumps over the lazy dog",
        )
        .unwrap();
        std::fs::write(
            temp_dir.path().join("doc2.txt"),
            "A quick brown dog runs fast",
        )
        .unwrap();
        std::fs::write(
            temp_dir.path().join("doc3.txt"),
            "Something completely different",
        )
        .unwrap();

        let engine = RipgrepLexicalEngine::with_defaults(temp_dir.path()).unwrap();
        let results = engine.search("quick brown", 10).await.unwrap();

        // Both doc1 and doc2 should match
        assert!(results.len() >= 2);

        // Results should contain paths with doc1 and doc2
        let paths: Vec<String> = results
            .iter()
            .map(|r| r.path.file_name().unwrap().to_string_lossy().to_string())
            .collect();
        assert!(paths.contains(&"doc1.txt".to_string()));
        assert!(paths.contains(&"doc2.txt".to_string()));
    }

    #[tokio::test]
    async fn test_ripgrep_engine_respects_limit() {
        let temp_dir = tempfile::tempdir().unwrap();

        // Create multiple matching files
        for i in 0..10 {
            std::fs::write(
                temp_dir.path().join(format!("doc{}.txt", i)),
                format!("This is test document {} with hello world", i),
            )
            .unwrap();
        }

        let engine = RipgrepLexicalEngine::with_defaults(temp_dir.path()).unwrap();
        let results = engine.search("hello world", 3).await.unwrap();

        assert_eq!(results.len(), 3);
    }

    #[tokio::test]
    async fn test_ripgrep_engine_skips_binary() {
        let temp_dir = tempfile::tempdir().unwrap();

        // Create a text file
        std::fs::write(temp_dir.path().join("text.txt"), "hello world text file").unwrap();

        // Create a binary file (with null bytes)
        let mut binary_content = b"hello world binary".to_vec();
        binary_content.push(0x00);
        binary_content.extend_from_slice(b"more content");
        std::fs::write(temp_dir.path().join("binary.dat"), binary_content).unwrap();

        let config = RipgrepConfig::default()
            .with_include_extensions(vec!["txt".to_string(), "dat".to_string()]);
        let engine = RipgrepLexicalEngine::new(temp_dir.path(), config).unwrap();
        let results = engine.search("hello world", 10).await.unwrap();

        // Should only find the text file (binary detection should skip the .dat file)
        assert_eq!(results.len(), 1);
        assert!(results[0]
            .path
            .file_name()
            .unwrap()
            .to_string_lossy()
            .contains("text"));
    }

    #[tokio::test]
    async fn test_ripgrep_engine_exclude_extensions() {
        let temp_dir = tempfile::tempdir().unwrap();

        std::fs::write(temp_dir.path().join("doc.txt"), "hello world in text").unwrap();
        std::fs::write(temp_dir.path().join("doc.md"), "hello world in markdown").unwrap();

        let mut config = RipgrepConfig::default();
        config.exclude_extensions.push("md".to_string());
        let engine = RipgrepLexicalEngine::new(temp_dir.path(), config).unwrap();
        let results = engine.search("hello world", 10).await.unwrap();

        assert_eq!(results.len(), 1);
        assert!(results[0].path.extension().unwrap() == "txt");
    }

    #[tokio::test]
    async fn test_ripgrep_engine_include_extensions() {
        let temp_dir = tempfile::tempdir().unwrap();

        std::fs::write(temp_dir.path().join("doc.txt"), "hello world in text").unwrap();
        std::fs::write(temp_dir.path().join("doc.md"), "hello world in markdown").unwrap();
        std::fs::write(temp_dir.path().join("doc.rs"), "// hello world in rust").unwrap();

        let config = RipgrepConfig::default().with_include_extensions(vec!["txt".to_string()]);
        let engine = RipgrepLexicalEngine::new(temp_dir.path(), config).unwrap();
        let results = engine.search("hello world", 10).await.unwrap();

        assert_eq!(results.len(), 1);
        assert!(results[0].path.extension().unwrap() == "txt");
    }

    #[tokio::test]
    async fn test_ripgrep_engine_filename_boost() {
        let temp_dir = tempfile::tempdir().unwrap();

        // File with matching content but no filename match
        std::fs::write(
            temp_dir.path().join("document.txt"),
            "hello world content here",
        )
        .unwrap();

        // File with matching content AND matching filename (should rank highest)
        std::fs::write(
            temp_dir.path().join("hello_world.txt"),
            "hello world in filename file",
        )
        .unwrap();

        let engine = RipgrepLexicalEngine::with_defaults(temp_dir.path()).unwrap();
        let results = engine.search("hello world", 10).await.unwrap();

        // Both files should match since both contain "hello" or "world"
        assert_eq!(results.len(), 2);
        // hello_world.txt should be first due to filename bonus
        assert!(results[0]
            .path
            .file_name()
            .unwrap()
            .to_string_lossy()
            .contains("hello"));
    }
}
