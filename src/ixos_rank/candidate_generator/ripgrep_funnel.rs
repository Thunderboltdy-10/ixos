//! P2.2: Ripgrep Funnel
//!
//! Streaming ripgrep search with hard caps and timeout.
//! Produces candidates as they're found, with strict limits.

use super::path_engine::HARDCODED_SKIP_DIRS;
use super::scorer::{MatchContext, ScoredCandidate};
use grep_regex::RegexMatcher;
use grep_searcher::{sinks::UTF8, Searcher};
use ignore::WalkBuilder;
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

/// Hard limits for ripgrep funnel (non-negotiable)
pub const RIPGREP_MAX_HITS: usize = 5000;
pub const RIPGREP_TIMEOUT_MS: u64 = 300;

/// Configuration for ripgrep funnel
#[derive(Debug, Clone)]
pub struct RipgrepFunnelConfig {
    /// Maximum file hits before stopping
    pub max_hits: usize,
    /// Timeout for entire ripgrep phase (milliseconds)
    pub timeout_ms: u64,
    /// Maximum file size to search
    pub max_file_size: u64,
    /// Number of threads for parallel search
    pub thread_count: usize,
    /// Whether to respect .gitignore
    pub respect_gitignore: bool,
    /// Whether to skip hidden files
    pub skip_hidden: bool,
    /// Extensions to include (empty = all text files)
    pub include_extensions: Vec<String>,
    /// Extensions to exclude
    pub exclude_extensions: Vec<String>,
}

impl Default for RipgrepFunnelConfig {
    fn default() -> Self {
        Self {
            max_hits: RIPGREP_MAX_HITS,
            timeout_ms: RIPGREP_TIMEOUT_MS,
            max_file_size: 10 * 1024 * 1024, // 10MB
            thread_count: num_cpus::get().min(4),
            respect_gitignore: true,
            skip_hidden: true,
            include_extensions: vec![
                "txt", "md", "json", "yaml", "yml", "toml", "rs", "py", "js", "ts", "html", "css",
                "java", "go", "c", "cpp", "h", "hpp", "rb", "php", "sh", "xml", "csv", "log",
                "pdf", "docx", "xlsx", "xls", "pptx", "ppt", "rtf",
            ]
            .into_iter()
            .map(String::from)
            .collect(),
            exclude_extensions: vec!["exe", "dll", "so", "dylib", "bin"]
                .into_iter()
                .map(String::from)
                .collect(),
        }
    }
}

/// Statistics from ripgrep search
#[derive(Debug, Clone, Default)]
pub struct RipgrepStats {
    /// Number of files scanned
    pub files_scanned: usize,
    /// Number of hits found
    pub hits_found: usize,
    /// How the search terminated
    pub terminated_by: TerminationReason,
    /// Duration in milliseconds
    pub duration_ms: u64,
}

/// Reason for search termination
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub enum TerminationReason {
    /// Search completed normally
    #[default]
    Complete,
    /// Reached max hits limit
    MaxHitsReached,
    /// Timeout exceeded
    Timeout,
    /// Cancelled by caller
    Cancelled,
}

/// Ripgrep-based content search funnel
pub struct RipgrepFunnel {
    root_dir: PathBuf,
    config: RipgrepFunnelConfig,
    /// Pre-computed file list (optional, for optimization)
    /// When set, skips directory walking and uses this list directly
    cached_file_list: Option<Vec<PathBuf>>,
}

impl RipgrepFunnel {
    /// Create a new ripgrep funnel for a directory
    pub fn new(root_dir: PathBuf, config: RipgrepFunnelConfig) -> Self {
        Self {
            root_dir,
            config,
            cached_file_list: None,
        }
    }

    /// Create with default config
    pub fn with_defaults(root_dir: PathBuf) -> Self {
        Self::new(root_dir, RipgrepFunnelConfig::default())
    }

    /// Set pre-computed file list for optimized searching (P5 optimization)
    ///
    /// When set, `search_capped` will skip directory walking and iterate
    /// directly over this list. This can significantly reduce search latency
    /// when the file list is already known (e.g., from PathIndex).
    pub fn set_cached_file_list(&mut self, files: Vec<PathBuf>) {
        self.cached_file_list = Some(files);
    }

    /// Clear the cached file list
    pub fn clear_cached_file_list(&mut self) {
        self.cached_file_list = None;
    }

    /// Search with hard cap, returning all candidates at once
    ///
    /// P5 optimization: When `cached_file_list` is set, skips directory walking
    /// and uses the pre-computed file list for faster searching.
    pub fn search_capped(&self, query: &str) -> (Vec<ScoredCandidate>, RipgrepStats) {
        let start = Instant::now();
        let deadline = start + Duration::from_millis(self.config.timeout_ms);

        // Build regex pattern from query
        let pattern = Self::build_pattern(query);

        // Early return for empty pattern (no valid search terms)
        if pattern.is_empty() {
            return (Vec::new(), RipgrepStats::default());
        }

        let matcher = match RegexMatcher::new_line_matcher(&pattern) {
            Ok(m) => m,
            Err(_) => return (Vec::new(), RipgrepStats::default()),
        };

        // Track state
        let hit_count = Arc::new(AtomicUsize::new(0));
        let file_count = Arc::new(AtomicUsize::new(0));
        let _cancelled = Arc::new(AtomicBool::new(false));

        let mut candidates: Vec<ScoredCandidate> = Vec::new();
        let mut seen_paths: HashSet<PathBuf> = HashSet::new();

        // P5 optimization: Use cached file list if available, otherwise walk directory
        if let Some(ref file_list) = self.cached_file_list {
            // Fast path: iterate over pre-computed file list
            for path in file_list {
                // Check timeout
                if Instant::now() > deadline {
                    return (
                        candidates,
                        RipgrepStats {
                            files_scanned: file_count.load(Ordering::Relaxed),
                            hits_found: hit_count.load(Ordering::Relaxed),
                            terminated_by: TerminationReason::Timeout,
                            duration_ms: start.elapsed().as_millis() as u64,
                        },
                    );
                }

                // Check hit limit
                if hit_count.load(Ordering::Relaxed) >= self.config.max_hits {
                    return (
                        candidates,
                        RipgrepStats {
                            files_scanned: file_count.load(Ordering::Relaxed),
                            hits_found: hit_count.load(Ordering::Relaxed),
                            terminated_by: TerminationReason::MaxHitsReached,
                            duration_ms: start.elapsed().as_millis() as u64,
                        },
                    );
                }

                // Files in cached list are already filtered
                file_count.fetch_add(1, Ordering::Relaxed);

                if let Some(candidate) = self.search_file(path, &matcher, &hit_count) {
                    if !seen_paths.contains(path) {
                        seen_paths.insert(path.clone());
                        candidates.push(candidate);
                    }
                }
            }
        } else {
            // Fallback: walk directory (original implementation)
            let mut builder = WalkBuilder::new(&self.root_dir);
            builder
                .hidden(!self.config.skip_hidden)
                .git_ignore(self.config.respect_gitignore)
                .follow_links(false)
                .max_filesize(Some(self.config.max_file_size))
                .threads(self.config.thread_count);

            // Add filter to skip hardcoded directories
            let root = self.root_dir.clone();
            builder.filter_entry(move |entry| {
                let path = entry.path();
                // Allow the root directory through
                if path == root {
                    return true;
                }
                // Skip hardcoded directories
                if let Some(name) = path.file_name() {
                    let name_str = name.to_string_lossy();
                    if HARDCODED_SKIP_DIRS.contains(&name_str.as_ref()) {
                        return false;
                    }
                }
                true
            });

            let walker = builder.build();

            for entry in walker.flatten() {
                // Check timeout
                if Instant::now() > deadline {
                    return (
                        candidates,
                        RipgrepStats {
                            files_scanned: file_count.load(Ordering::Relaxed),
                            hits_found: hit_count.load(Ordering::Relaxed),
                            terminated_by: TerminationReason::Timeout,
                            duration_ms: start.elapsed().as_millis() as u64,
                        },
                    );
                }

                // Check hit limit
                if hit_count.load(Ordering::Relaxed) >= self.config.max_hits {
                    return (
                        candidates,
                        RipgrepStats {
                            files_scanned: file_count.load(Ordering::Relaxed),
                            hits_found: hit_count.load(Ordering::Relaxed),
                            terminated_by: TerminationReason::MaxHitsReached,
                            duration_ms: start.elapsed().as_millis() as u64,
                        },
                    );
                }

                let path = entry.path();

                // Skip directories
                if path.is_dir() {
                    continue;
                }

                // Check extension
                if !self.should_search_file(path) {
                    continue;
                }

                // Search the file
                file_count.fetch_add(1, Ordering::Relaxed);

                if let Some(candidate) = self.search_file(path, &matcher, &hit_count) {
                    if !seen_paths.contains(path) {
                        seen_paths.insert(path.to_path_buf());
                        candidates.push(candidate);
                    }
                }
            }
        }

        // Sort by score
        candidates.sort_by(|a, b| {
            b.combined_score
                .partial_cmp(&a.combined_score)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        (
            candidates,
            RipgrepStats {
                files_scanned: file_count.load(Ordering::Relaxed),
                hits_found: hit_count.load(Ordering::Relaxed),
                terminated_by: TerminationReason::Complete,
                duration_ms: start.elapsed().as_millis() as u64,
            },
        )
    }

    /// Search with streaming batches for early UI feedback
    pub fn search_streaming<F>(
        &self,
        query: &str,
        batch_size: usize,
        batch_interval_ms: u64,
        mut on_batch: F,
    ) -> (Vec<ScoredCandidate>, RipgrepStats)
    where
        F: FnMut(Vec<ScoredCandidate>, bool),
    {
        let start = Instant::now();
        let deadline = start + Duration::from_millis(self.config.timeout_ms);
        let mut last_flush = Instant::now();

        let pattern = Self::build_pattern(query);
        if pattern.is_empty() {
            return (Vec::new(), RipgrepStats::default());
        }

        let matcher = match RegexMatcher::new_line_matcher(&pattern) {
            Ok(m) => m,
            Err(_) => return (Vec::new(), RipgrepStats::default()),
        };

        let hit_count = Arc::new(AtomicUsize::new(0));
        let file_count = Arc::new(AtomicUsize::new(0));
        let _cancelled = Arc::new(AtomicBool::new(false));

        let mut candidates: Vec<ScoredCandidate> = Vec::new();
        let mut batch: Vec<ScoredCandidate> = Vec::new();
        let mut seen_paths: HashSet<PathBuf> = HashSet::new();

        let flush_batch = |batch: &mut Vec<ScoredCandidate>,
                           last_flush: &mut Instant,
                           is_final: bool,
                           on_batch: &mut F| {
            if batch.is_empty() {
                return;
            }
            let outgoing = std::mem::take(batch);
            on_batch(outgoing, is_final);
            *last_flush = Instant::now();
        };

        let mut builder = WalkBuilder::new(&self.root_dir);
        builder
            .hidden(!self.config.skip_hidden)
            .git_ignore(self.config.respect_gitignore)
            .follow_links(false)
            .max_filesize(Some(self.config.max_file_size))
            .threads(self.config.thread_count);

        // Add filter to skip hardcoded directories
        let root = self.root_dir.clone();
        builder.filter_entry(move |entry| {
            let path = entry.path();
            // Allow the root directory through
            if path == root {
                return true;
            }
            // Skip hardcoded directories
            if let Some(name) = path.file_name() {
                let name_str = name.to_string_lossy();
                if HARDCODED_SKIP_DIRS.contains(&name_str.as_ref()) {
                    return false;
                }
            }
            true
        });

        let walker = builder.build();

        for entry in walker.flatten() {
            if Instant::now() > deadline {
                flush_batch(&mut batch, &mut last_flush, true, &mut on_batch);
                return (
                    candidates,
                    RipgrepStats {
                        files_scanned: file_count.load(Ordering::Relaxed),
                        hits_found: hit_count.load(Ordering::Relaxed),
                        terminated_by: TerminationReason::Timeout,
                        duration_ms: start.elapsed().as_millis() as u64,
                    },
                );
            }

            if hit_count.load(Ordering::Relaxed) >= self.config.max_hits {
                flush_batch(&mut batch, &mut last_flush, true, &mut on_batch);
                return (
                    candidates,
                    RipgrepStats {
                        files_scanned: file_count.load(Ordering::Relaxed),
                        hits_found: hit_count.load(Ordering::Relaxed),
                        terminated_by: TerminationReason::MaxHitsReached,
                        duration_ms: start.elapsed().as_millis() as u64,
                    },
                );
            }

            let path = entry.path();
            if path.is_dir() {
                continue;
            }

            if !self.should_search_file(path) {
                continue;
            }

            file_count.fetch_add(1, Ordering::Relaxed);

            if let Some(candidate) = self.search_file(path, &matcher, &hit_count) {
                if !seen_paths.contains(path) {
                    seen_paths.insert(path.to_path_buf());
                    candidates.push(candidate.clone());
                    batch.push(candidate);
                }
            }

            let should_flush = batch.len() >= batch_size
                || last_flush.elapsed() >= Duration::from_millis(batch_interval_ms);
            if should_flush {
                flush_batch(&mut batch, &mut last_flush, false, &mut on_batch);
            }
        }

        candidates.sort_by(|a, b| {
            b.combined_score
                .partial_cmp(&a.combined_score)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        flush_batch(&mut batch, &mut last_flush, true, &mut on_batch);

        (
            candidates,
            RipgrepStats {
                files_scanned: file_count.load(Ordering::Relaxed),
                hits_found: hit_count.load(Ordering::Relaxed),
                terminated_by: TerminationReason::Complete,
                duration_ms: start.elapsed().as_millis() as u64,
            },
        )
    }

    /// Check if a file should be searched based on extension
    fn should_search_file(&self, path: &Path) -> bool {
        let ext = match path.extension() {
            Some(e) => e.to_string_lossy().to_lowercase(),
            None => return false,
        };

        // Check excluded extensions
        if self.config.exclude_extensions.contains(&ext) {
            return false;
        }

        // Check included extensions if list is not empty
        if !self.config.include_extensions.is_empty() {
            return self.config.include_extensions.contains(&ext);
        }

        true
    }

    /// Search a single file and return candidate if matches found
    fn search_file(
        &self,
        path: &Path,
        matcher: &RegexMatcher,
        hit_count: &AtomicUsize,
    ) -> Option<ScoredCandidate> {
        let mut match_lines: Vec<usize> = Vec::new();
        let mut match_count = 0usize;
        let mut snippet: Option<String> = None;

        let mut searcher = Searcher::new();

        let result = searcher.search_path(
            matcher,
            path,
            UTF8(|line_num, line| {
                match_lines.push(line_num as usize);
                match_count += 1;

                // Capture first match as snippet
                if snippet.is_none() && line.len() <= 200 {
                    snippet = Some(line.trim().to_string());
                }

                // Stop searching this file if we have enough matches
                Ok(match_count < 100)
            }),
        );

        if result.is_err() || match_count == 0 {
            return None;
        }

        hit_count.fetch_add(1, Ordering::Relaxed);

        // Calculate score based on match count and coverage
        let score = Self::calculate_lexical_score(match_count, &match_lines);

        let context = MatchContext {
            line_numbers: match_lines,
            match_count,
            snippet,
        };

        Some(ScoredCandidate::from_ripgrep_hit(
            path.to_path_buf(),
            score,
            Some(context),
        ))
    }

    /// Build regex pattern from query terms
    fn build_pattern(query: &str) -> String {
        let terms: Vec<&str> = query.split_whitespace().filter(|s| s.len() >= 2).collect();

        if terms.is_empty() {
            return String::new();
        }

        // Create pattern that matches any of the terms (case insensitive)
        let escaped_terms: Vec<String> = terms.iter().map(|t| regex::escape(t)).collect();

        format!("(?i)({})", escaped_terms.join("|"))
    }

    /// Calculate lexical score based on match count and distribution
    fn calculate_lexical_score(match_count: usize, _line_numbers: &[usize]) -> f32 {
        // Base score from match count (logarithmic to prevent huge scores)
        let count_score = (1.0 + match_count as f32).ln() / 5.0;

        // Cap at 1.0
        count_score.min(1.0)
    }
}

/// Get number of CPUs (fallback-safe)
mod num_cpus {
    pub fn get() -> usize {
        std::thread::available_parallelism()
            .map(|n| n.get())
            .unwrap_or(4)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn setup_test_dir() -> TempDir {
        let temp = TempDir::new().unwrap();
        let root = temp.path();

        std::fs::create_dir_all(root.join("docs")).unwrap();

        std::fs::write(
            root.join("docs/report.txt"),
            "This is a quarterly report.\nIt contains important data.\n",
        )
        .unwrap();
        std::fs::write(
            root.join("docs/notes.md"),
            "# Meeting Notes\nDiscussed quarterly targets.\n",
        )
        .unwrap();
        std::fs::write(root.join("readme.txt"), "Project readme file.\n").unwrap();

        temp
    }

    #[test]
    fn test_search_capped() {
        let temp = setup_test_dir();
        let funnel = RipgrepFunnel::with_defaults(temp.path().to_path_buf());

        let (candidates, stats) = funnel.search_capped("quarterly");

        assert!(!candidates.is_empty());
        assert_eq!(stats.terminated_by, TerminationReason::Complete);
        assert!(candidates
            .iter()
            .any(|c| c.path.to_string_lossy().contains("report")));
    }

    #[test]
    fn test_build_pattern() {
        let pattern = RipgrepFunnel::build_pattern("hello world");
        assert!(pattern.contains("hello"));
        assert!(pattern.contains("world"));
    }

    #[test]
    fn test_empty_query() {
        let temp = setup_test_dir();
        let funnel = RipgrepFunnel::with_defaults(temp.path().to_path_buf());

        let (candidates, _) = funnel.search_capped("");
        assert!(candidates.is_empty());
    }

    #[test]
    fn test_max_hits_limit() {
        let temp = TempDir::new().unwrap();
        let root = temp.path();

        // Create many files with the search term
        for i in 0..100 {
            std::fs::write(
                root.join(format!("file_{}.txt", i)),
                "test content with search term\n",
            )
            .unwrap();
        }

        let mut config = RipgrepFunnelConfig::default();
        config.max_hits = 10; // Low limit for testing

        let funnel = RipgrepFunnel::new(root.to_path_buf(), config);
        let (candidates, stats) = funnel.search_capped("search");

        assert!(candidates.len() <= 10);
        assert_eq!(stats.terminated_by, TerminationReason::MaxHitsReached);
    }
}
