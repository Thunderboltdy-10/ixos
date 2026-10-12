//! P2.1: Path/Filename Engine
//!
//! In-memory index of path tokens for instant scoring without disk I/O.
//! Uses BM25-inspired scoring for relevance ranking.

use super::scorer::{CandidateSource, ScoredCandidate};
use ignore::WalkBuilder;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

/// Dependency/cache directories skipped regardless of .gitignore settings.
/// `build` is intentionally absent: it can be a source module (e.g. Clap).
/// Generated build outputs should be excluded by the repository's ignore rules.
pub const HARDCODED_SKIP_DIRS: &[&str] = &[
    "node_modules",
    ".next",
    "vendor",
    "target",
    "dist",
    "__pycache__",
    ".git",
    ".svn",
    ".hg",
    ".idea",
    ".vscode",
    "venv",
    ".venv",
    ".cargo",
    ".rustup",
    "bower_components",
    ".cache",
    ".npm",
    ".yarn",
    ".pnpm",
    "coverage",
    ".nyc_output",
    ".tox",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
];

/// One discovery contract for lexical, semantic and cache-warmup searches.
pub fn search_walk(
    root: &Path,
    skip_hidden: bool,
    respect_gitignore: bool,
    follow_symlinks: bool,
    max_file_size: Option<u64>,
) -> WalkBuilder {
    let mut builder = WalkBuilder::new(root);
    // Outside Git, honor ordinary folder .gitignore files. Inside Git, use the
    // nearest repository boundary: require_git(false) also reads ignores above
    // a nested Git root, which can prune unrelated imported repositories.
    let inside_git = root
        .ancestors()
        .any(|ancestor| ancestor.join(".git").exists());
    builder
        .hidden(skip_hidden)
        .git_ignore(respect_gitignore)
        .git_global(respect_gitignore)
        .git_exclude(respect_gitignore)
        .require_git(inside_git)
        .follow_links(follow_symlinks)
        .max_filesize(max_file_size);
    builder.filter_entry(|entry| {
        entry.depth() == 0
            || !entry.file_type().is_some_and(|kind| kind.is_dir())
            || !entry.file_name().to_str().is_some_and(|name| {
                HARDCODED_SKIP_DIRS.contains(&name)
                    || name == "env" && entry.path().join("pyvenv.cfg").is_file()
            })
    });
    builder
}

/// In-memory index of path tokens for instant scoring
pub struct PathIndex {
    /// All indexed path entries
    entries: Vec<PathEntry>,
    /// Inverted index: token -> entry indices (for fast lookup)
    token_index: HashMap<String, Vec<usize>>,
    /// Path -> entry position, avoiding a corpus scan for each candidate's metadata.
    path_positions: HashMap<PathBuf, usize>,
    /// Total number of documents (for IDF calculation)
    doc_count: usize,
}

/// Entry for a single file path
#[derive(Debug, Clone)]
struct PathEntry {
    /// Full path to the file
    path: PathBuf,
    /// Tokenized path segments (lowercase)
    path_tokens: Vec<String>,
    /// Tokenized filename (lowercase, without extension)
    filename_tokens: Vec<String>,
    /// File extension (lowercase)
    extension: Option<String>,
    /// File metadata
    metadata: PathMetadata,
}

/// Cached metadata for a path
#[derive(Debug, Clone)]
pub struct PathMetadata {
    /// Modification time
    pub mtime: SystemTime,
    /// File size in bytes
    pub size_bytes: u64,
}

impl Default for PathMetadata {
    fn default() -> Self {
        Self {
            mtime: SystemTime::UNIX_EPOCH,
            size_bytes: 0,
        }
    }
}

/// Configuration for path index
#[derive(Debug, Clone)]
pub struct PathIndexConfig {
    /// Extensions to include (empty = all)
    pub include_extensions: Vec<String>,
    /// Extensions to exclude
    pub exclude_extensions: Vec<String>,
    /// Maximum file size to index (in bytes)
    pub max_file_size: u64,
    /// Whether to follow symlinks
    pub follow_symlinks: bool,
    /// Skip hidden files/directories
    pub skip_hidden: bool,
    /// Whether to respect .gitignore files
    pub respect_gitignore: bool,
}

impl Default for PathIndexConfig {
    fn default() -> Self {
        Self {
            include_extensions: vec![
                "txt", "md", "json", "yaml", "yml", "toml", "rs", "py", "js", "ts", "tsx", "jsx",
                "swift", "kt", "cs", "sql", "ipynb", "rst", "tex", "html", "css", "java", "go",
                "c", "cpp", "h", "hpp", "rb", "php", "sh", "bat", "ps1", "xml", "csv", "log",
                "conf", "cfg", "ini", "pdf", "docx", "xlsx", "xls", "pptx", "ppt", "rtf",
            ]
            .into_iter()
            .map(String::from)
            .collect(),
            exclude_extensions: vec!["exe", "dll", "so", "dylib", "bin", "o", "obj"]
                .into_iter()
                .map(String::from)
                .collect(),
            max_file_size: 100 * 1024 * 1024, // 100MB
            follow_symlinks: false,
            skip_hidden: true,
            respect_gitignore: true, // Respect .gitignore by default for privacy
        }
    }
}

impl PathIndex {
    /// Build a fresh path/metadata snapshot from the ignore-aware directory walk.
    pub fn build_from_walk(root: &Path, config: &PathIndexConfig) -> Self {
        let mut entries = Vec::new();
        let mut token_index: HashMap<String, Vec<usize>> = HashMap::new();

        Self::collect_paths(root, &mut entries, config);

        // Build inverted index
        for (idx, entry) in entries.iter().enumerate() {
            // Index filename tokens (most important)
            for token in &entry.filename_tokens {
                token_index.entry(token.clone()).or_default().push(idx);
            }
            // Index path tokens
            for token in &entry.path_tokens {
                token_index.entry(token.clone()).or_default().push(idx);
            }
            // Index extension
            if let Some(ext) = &entry.extension {
                token_index.entry(ext.clone()).or_default().push(idx);
            }
        }

        let doc_count = entries.len();
        let path_positions = entries
            .iter()
            .enumerate()
            .map(|(i, entry)| (entry.path.clone(), i))
            .collect();
        Self {
            entries,
            token_index,
            path_positions,
            doc_count,
        }
    }

    /// Check if a path component matches any hardcoded skip directory
    fn should_skip_path(path: &Path) -> bool {
        for component in path.components() {
            if let std::path::Component::Normal(name) = component {
                let name_str = name.to_string_lossy();
                if HARDCODED_SKIP_DIRS.contains(&name_str.as_ref()) {
                    return true;
                }
            }
        }
        false
    }

    /// Path collection with filtering using WalkBuilder (respects .gitignore)
    fn collect_paths(dir: &Path, entries: &mut Vec<PathEntry>, config: &PathIndexConfig) {
        // Use WalkBuilder for proper .gitignore support (consistent with ripgrep_funnel.rs)
        let builder = search_walk(
            dir,
            config.skip_hidden,
            config.respect_gitignore,
            config.follow_symlinks,
            Some(config.max_file_size),
        );

        let walker = builder.build();

        for result in walker {
            let entry = match result {
                Ok(e) => e,
                Err(_) => continue,
            };

            let path = entry.path();

            // Skip directories
            if path.is_dir() {
                continue;
            }

            // Double-check path doesn't contain skipped directories (for nested paths)
            if Self::should_skip_path(path.strip_prefix(dir).unwrap_or(path)) {
                continue;
            }

            // Must be a file
            if !entry.file_type().is_some_and(|kind| kind.is_file()) {
                continue;
            }

            // Check extension filter
            if let Some(ext) = path.extension() {
                let ext_lower = ext.to_string_lossy().to_lowercase();

                // Skip excluded extensions
                if config.exclude_extensions.contains(&ext_lower) {
                    continue;
                }

                // Check included extensions if list is not empty
                if !config.include_extensions.is_empty()
                    && !config.include_extensions.contains(&ext_lower)
                {
                    continue;
                }
            } else {
                // No extension - skip if include list is specified
                if !config.include_extensions.is_empty() {
                    continue;
                }
            }

            // Get metadata
            let metadata = entry
                .metadata()
                .ok()
                .map(|m| PathMetadata {
                    mtime: m.modified().unwrap_or(SystemTime::UNIX_EPOCH),
                    size_bytes: m.len(),
                })
                .unwrap_or_default();

            // Tokenize the path and add to entries
            let path_entry = Self::create_entry(path.to_path_buf(), metadata);
            entries.push(path_entry);
        }
    }

    /// Create a path entry with tokenization
    fn create_entry(path: PathBuf, metadata: PathMetadata) -> PathEntry {
        // Tokenize path segments
        let path_tokens: Vec<String> = path
            .components()
            .filter_map(|c| {
                let s = c.as_os_str().to_string_lossy();
                if s.len() > 1 {
                    Some(Self::tokenize_segment(&s))
                } else {
                    None
                }
            })
            .flatten()
            .collect();

        // Tokenize filename
        let filename_tokens = path
            .file_stem()
            .map(|s| Self::tokenize_segment(&s.to_string_lossy()))
            .unwrap_or_default();

        // Get extension
        let extension = path.extension().map(|e| e.to_string_lossy().to_lowercase());

        PathEntry {
            path,
            path_tokens,
            filename_tokens,
            extension,
            metadata,
        }
    }

    /// Tokenize a path segment into searchable tokens
    fn tokenize_segment(segment: &str) -> Vec<String> {
        let lower = segment.to_lowercase();

        // Split on common delimiters
        let mut tokens: Vec<String> = lower
            .split(|c: char| c == '_' || c == '-' || c == '.' || c == ' ' || !c.is_alphanumeric())
            .filter(|s| s.len() >= 2) // Skip very short tokens
            .map(String::from)
            .collect();

        // Also add the full segment as a token (for exact matches)
        if lower.len() >= 2 {
            tokens.push(lower);
        }

        tokens
    }

    /// Score all paths against query (instant: no disk I/O)
    /// Returns top N candidates sorted by BM25-ish score
    pub fn score(&self, query: &str, limit: usize) -> Vec<ScoredCandidate> {
        if self.entries.is_empty() {
            return Vec::new();
        }

        let query_terms = Self::tokenize_query(query);
        if query_terms.is_empty() {
            return Vec::new();
        }

        // Calculate IDF for each query term
        let idfs: Vec<f32> = query_terms
            .iter()
            .map(|term| self.calculate_idf(term))
            .collect();

        // Score each entry
        let mut scored: Vec<(usize, f32)> = self
            .entries
            .iter()
            .enumerate()
            .map(|(idx, entry)| {
                let score = self.calculate_bm25_score(entry, &query_terms, &idfs);
                (idx, score)
            })
            .filter(|(_, score)| *score > 0.0)
            .collect();

        // Sort by score descending
        scored.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

        // Take top N and convert to ScoredCandidate
        scored
            .into_iter()
            .take(limit)
            .map(|(idx, score)| {
                let entry = &self.entries[idx];
                let mut candidate = ScoredCandidate::from_path_match(entry.path.clone(), score);
                candidate.source = CandidateSource::PathMatch;
                candidate
            })
            .collect()
    }

    /// Tokenize query into search terms
    fn tokenize_query(query: &str) -> Vec<String> {
        query
            .to_lowercase()
            .split(|c: char| !c.is_alphanumeric())
            .filter(|s| s.len() >= 2)
            .map(String::from)
            .collect()
    }

    /// Calculate IDF (Inverse Document Frequency) for a term
    fn calculate_idf(&self, term: &str) -> f32 {
        let doc_freq = self.token_index.get(term).map(|v| v.len()).unwrap_or(0);
        if doc_freq == 0 {
            return 0.0;
        }

        // BM25 IDF formula
        let n = self.doc_count as f32;
        let df = doc_freq as f32;
        ((n - df + 0.5) / (df + 0.5) + 1.0).ln()
    }

    /// Calculate BM25-inspired score for an entry
    fn calculate_bm25_score(&self, entry: &PathEntry, query_terms: &[String], idfs: &[f32]) -> f32 {
        // BM25 parameters
        const K1: f32 = 1.2;
        const B: f32 = 0.75;

        // Filename weight multiplier (filenames are more important than path)
        const FILENAME_BOOST: f32 = 3.0;
        const EXACT_MATCH_BOOST: f32 = 2.0;

        let mut score = 0.0;

        for (term, idf) in query_terms.iter().zip(idfs.iter()) {
            if *idf <= 0.0 {
                continue;
            }

            // Check filename tokens (highest priority)
            let filename_tf = entry
                .filename_tokens
                .iter()
                .filter(|t| t.contains(term) || term.contains(t.as_str()))
                .count() as f32;

            // Check path tokens
            let path_tf = entry
                .path_tokens
                .iter()
                .filter(|t| t.contains(term) || term.contains(t.as_str()))
                .count() as f32;

            // Calculate term frequency with boosts
            let tf = filename_tf * FILENAME_BOOST + path_tf;

            // Exact match bonus
            let exact_bonus = if entry.filename_tokens.iter().any(|t| t == term) {
                EXACT_MATCH_BOOST
            } else {
                1.0
            };

            // BM25 term score (simplified)
            let doc_len = (entry.filename_tokens.len() + entry.path_tokens.len()) as f32;
            let avg_len = 10.0; // Approximate average

            let numerator = tf * (K1 + 1.0);
            let denominator = tf + K1 * (1.0 - B + B * (doc_len / avg_len));

            score += idf * (numerator / denominator) * exact_bonus;
        }

        // Normalize to [0, 1] range (approximately)
        (score / (query_terms.len() as f32 * 5.0)).min(1.0)
    }

    /// Get number of indexed paths
    pub fn len(&self) -> usize {
        self.entries.len()
    }

    /// Check if index is empty
    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }

    /// Get paths matching a specific term (for debugging)
    pub fn paths_matching_term(&self, term: &str) -> Vec<&Path> {
        let term_lower = term.to_lowercase();
        self.token_index
            .get(&term_lower)
            .map(|indices| {
                indices
                    .iter()
                    .map(|&idx| self.entries[idx].path.as_path())
                    .collect()
            })
            .unwrap_or_default()
    }

    /// Get metadata for a path (if indexed)
    pub fn get_metadata(&self, path: &Path) -> Option<&PathMetadata> {
        self.path_positions
            .get(path)
            .map(|i| &self.entries[*i].metadata)
    }

    /// Get all indexed file paths (P5 optimization)
    ///
    /// Returns a vector of all file paths in the index.
    /// Useful for passing to RipgrepFunnel to skip directory walking.
    pub fn get_file_paths(&self) -> Vec<PathBuf> {
        self.entries.iter().map(|e| e.path.clone()).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn setup_test_dir() -> TempDir {
        let temp = TempDir::new().unwrap();
        let root = temp.path();

        // Create test structure
        std::fs::create_dir_all(root.join("documents/reports")).unwrap();
        std::fs::create_dir_all(root.join("projects/quarterly")).unwrap();

        std::fs::write(root.join("documents/reports/q1_report.txt"), "test").unwrap();
        std::fs::write(root.join("documents/reports/q2_report.md"), "test").unwrap();
        std::fs::write(root.join("projects/quarterly/analysis.txt"), "test").unwrap();
        std::fs::write(root.join("readme.md"), "test").unwrap();

        temp
    }

    #[test]
    fn test_build_index() {
        let temp = setup_test_dir();
        let config = PathIndexConfig::default();
        let index = PathIndex::build_from_walk(temp.path(), &config);

        assert_eq!(index.len(), 4);
    }

    #[test]
    fn test_score_by_filename() {
        let temp = setup_test_dir();
        let config = PathIndexConfig::default();
        let index = PathIndex::build_from_walk(temp.path(), &config);

        let results = index.score("report", 10);

        // Should find q1_report and q2_report with higher scores
        assert!(results.len() >= 2);
        assert!(results
            .iter()
            .any(|c| c.path.to_string_lossy().contains("report")));
    }

    #[test]
    fn test_score_by_path() {
        let temp = setup_test_dir();
        let config = PathIndexConfig::default();
        let index = PathIndex::build_from_walk(temp.path(), &config);

        let results = index.score("quarterly", 10);

        // Should find files in quarterly folder
        assert!(!results.is_empty());
        assert!(results
            .iter()
            .any(|c| c.path.to_string_lossy().contains("quarterly")));
    }

    #[test]
    fn test_tokenize_segment() {
        let tokens = PathIndex::tokenize_segment("my_project-v2.0");
        assert!(tokens.contains(&"my".to_string()));
        assert!(tokens.contains(&"project".to_string()));
        assert!(tokens.contains(&"v2".to_string()));
    }

    #[test]
    fn test_empty_query() {
        let temp = setup_test_dir();
        let config = PathIndexConfig::default();
        let index = PathIndex::build_from_walk(temp.path(), &config);

        let results = index.score("", 10);
        assert!(results.is_empty());
    }

    #[test]
    fn test_respects_gitignore() {
        let temp = TempDir::new().unwrap();
        let root = temp.path();

        // Create test structure
        std::fs::create_dir_all(root.join("src")).unwrap();
        std::fs::write(root.join("src/main.rs"), "fn main() {}").unwrap();
        std::fs::write(root.join("src/secret.rs"), "// secret code").unwrap();
        std::fs::write(root.join("public.txt"), "public content").unwrap();

        // Create .gitignore that excludes secret.rs
        std::fs::write(root.join(".gitignore"), "src/secret.rs\n").unwrap();

        // Test with gitignore enabled (default)
        let config = PathIndexConfig::default();
        let index = PathIndex::build_from_walk(root, &config);

        // Should not find secret.rs
        let paths: Vec<String> = index
            .entries
            .iter()
            .map(|e| e.path.to_string_lossy().to_string())
            .collect();

        assert!(
            !paths.iter().any(|p| p.contains("secret.rs")),
            "secret.rs should be excluded by .gitignore"
        );
        assert!(
            paths.iter().any(|p| p.contains("main.rs")),
            "main.rs should be included"
        );
        assert!(
            paths.iter().any(|p| p.contains("public.txt")),
            "public.txt should be included"
        );

        // Test with gitignore disabled
        let mut config_no_gitignore = PathIndexConfig::default();
        config_no_gitignore.respect_gitignore = false;
        let index_no_gitignore = PathIndex::build_from_walk(root, &config_no_gitignore);

        let paths_no_gitignore: Vec<String> = index_no_gitignore
            .entries
            .iter()
            .map(|e| e.path.to_string_lossy().to_string())
            .collect();

        // With gitignore disabled, secret.rs should be found
        assert!(
            paths_no_gitignore.iter().any(|p| p.contains("secret.rs")),
            "secret.rs should be included when gitignore is disabled"
        );
    }

    #[test]
    fn test_hardcoded_skip_dirs_does_not_exclude_dot_env_file_name() {
        assert!(
            !HARDCODED_SKIP_DIRS.contains(&".env"),
            ".env must not be hard-skipped; users often store searchable config there"
        );
    }

    #[test]
    fn build_source_module_is_visible_while_ignored_outputs_stay_excluded() {
        let temp = TempDir::new().unwrap();
        let root = temp.path();
        std::fs::create_dir_all(root.join("src/build/app")).unwrap();
        std::fs::create_dir_all(root.join("build")).unwrap();
        std::fs::create_dir_all(root.join("node_modules/library")).unwrap();
        std::fs::write(
            root.join("src/build/app/mod.rs"),
            "fn propagate_version() {}",
        )
        .unwrap();
        std::fs::write(root.join("build/generated.rs"), "generated output").unwrap();
        std::fs::write(root.join("node_modules/library/code.js"), "dependency").unwrap();
        std::fs::write(root.join(".gitignore"), "/build/\n").unwrap();

        let walked: Vec<_> = search_walk(root, true, true, false, None)
            .build()
            .filter_map(Result::ok)
            .filter(|entry| entry.file_type().is_some_and(|kind| kind.is_file()))
            .map(|entry| entry.path().strip_prefix(root).unwrap().to_path_buf())
            .collect();
        assert_eq!(walked, vec![PathBuf::from("src/build/app/mod.rs")]);
        let index = PathIndex::build_from_walk(root, &PathIndexConfig::default());
        assert_eq!(index.entries.len(), 1);
        assert_eq!(index.entries[0].path, root.join("src/build/app/mod.rs"));
    }

    #[test]
    fn nested_repository_does_not_inherit_outer_gitignore() {
        let temp = TempDir::new().unwrap();
        let host = temp.path();
        std::fs::create_dir(host.join(".git")).unwrap();
        std::fs::write(host.join(".gitignore"), "build/\n").unwrap();
        let nested = host.join("foreign");
        std::fs::create_dir_all(nested.join(".git")).unwrap();
        let corpus = nested.join("corpus");
        std::fs::create_dir_all(corpus.join("src/build")).unwrap();
        std::fs::write(corpus.join("src/build/module.rs"), "source").unwrap();
        std::fs::write(corpus.join("ignored.rs"), "ignored").unwrap();
        std::fs::write(nested.join(".gitignore"), "ignored.rs\n").unwrap();
        let walked: Vec<_> = search_walk(&corpus, true, true, false, None)
            .build()
            .filter_map(Result::ok)
            .filter(|entry| entry.file_type().is_some_and(|kind| kind.is_file()))
            .map(|entry| entry.path().strip_prefix(&corpus).unwrap().to_path_buf())
            .collect();
        assert_eq!(walked, vec![PathBuf::from("src/build/module.rs")]);
    }

    #[test]
    fn env_source_folder_is_searchable_but_virtual_environment_is_pruned() {
        let temp = TempDir::new().unwrap();
        std::fs::create_dir(temp.path().join("env")).unwrap();
        std::fs::write(temp.path().join("env/source.rs"), "source implementation").unwrap();
        let visible = || {
            search_walk(temp.path(), true, true, false, None)
                .build()
                .filter_map(Result::ok)
                .filter(|e| e.file_type().is_some_and(|t| t.is_file()))
                .count()
        };
        assert_eq!(visible(), 1);
        std::fs::write(temp.path().join("env/pyvenv.cfg"), "home=python").unwrap();
        assert_eq!(visible(), 0);
    }
}
