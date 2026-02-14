//! Query preprocessing for lexical funnel (P4.2)
//!
//! Adds lightweight typo correction and synonym expansion before candidate
//! generation. Operators and extensions are preserved.

use std::collections::{HashMap, HashSet};
use std::num::NonZeroUsize;

use lru::LruCache;

use crate::ixos_rank::ask_mode::{
    AnchorExtractor, AnchorTerm, IntentDetector, QueryIntent, QueryMode, TimeIntent,
};

#[derive(Debug, Clone)]
pub struct QueryPreprocessConfig {
    /// Maximum synonyms to add per term.
    pub max_synonyms_per_term: usize,
    /// LRU cache size for processed queries.
    pub cache_size: usize,
}

impl Default for QueryPreprocessConfig {
    fn default() -> Self {
        Self {
            max_synonyms_per_term: 2,
            cache_size: 256,
        }
    }
}

#[derive(Debug, Clone)]
pub struct ProcessedQuery {
    pub original: String,
    pub corrected_query: String,
    pub expanded_query: String,
    pub semantic_query: String,
    pub terms: Vec<String>,
    pub expanded_terms: Vec<String>,
    pub semantic_terms: Vec<String>,
    pub applied_corrections: bool,
    pub applied_expansions: bool,
    pub question_rewritten: bool,
    pub mode: QueryMode,
    pub anchor_terms: Vec<AnchorTerm>,
    pub detected_intent: Option<QueryIntent>,
    pub time_intent: Option<TimeIntent>,
}

#[derive(Debug)]
pub struct QueryPreprocessor {
    config: QueryPreprocessConfig,
    cache: LruCache<String, ProcessedQuery>,
    anchor_extractor: AnchorExtractor,
    intent_detector: IntentDetector,
}

impl QueryPreprocessor {
    pub fn new(config: QueryPreprocessConfig) -> Self {
        let cache_size = NonZeroUsize::new(config.cache_size.max(1)).expect("cache size");
        Self {
            config,
            cache: LruCache::new(cache_size),
            anchor_extractor: AnchorExtractor::with_corpus_defaults(),
            intent_detector: IntentDetector::new(),
        }
    }

    pub fn with_defaults() -> Self {
        Self::new(QueryPreprocessConfig::default())
    }

    pub fn preprocess(&mut self, query: &str) -> ProcessedQuery {
        let trimmed = query.trim();
        if trimmed.is_empty() {
            return ProcessedQuery {
                original: query.to_string(),
                corrected_query: String::new(),
                expanded_query: String::new(),
                semantic_query: String::new(),
                terms: Vec::new(),
                expanded_terms: Vec::new(),
                semantic_terms: Vec::new(),
                applied_corrections: false,
                applied_expansions: false,
                question_rewritten: false,
                mode: QueryMode::Keyword,
                anchor_terms: Vec::new(),
                detected_intent: None,
                time_intent: None,
            };
        }

        if let Some(cached) = self.cache.get(trimmed) {
            return cached.clone();
        }

        let tokens = tokenize_query(trimmed);
        let typo_map = typo_map();
        let synonym_map = synonym_map();
        let stop_words = stop_words();
        let question_stop_words = question_stop_words();
        let is_question = self.intent_detector.should_activate_ask_mode(trimmed);
        let has_ext_operator = tokens
            .iter()
            .any(|t| t.kind == TokenKind::Operator && t.raw.to_lowercase().starts_with("ext:"));
        let ext_hints = if is_question && !has_ext_operator {
            detect_ext_hints(trimmed)
        } else {
            Vec::new()
        };

        let mut corrected_tokens: Vec<String> = Vec::new();
        let mut expanded_tokens: Vec<String> = Vec::new();
        let mut terms: Vec<String> = Vec::new();
        let mut expanded_terms: Vec<String> = Vec::new();
        let mut semantic_terms: Vec<String> = Vec::new();
        let mut applied_corrections = false;
        let mut applied_expansions = false;
        let mut question_rewritten = false;

        let mut skip_next_as_value = false;

        for token in tokens {
            if skip_next_as_value {
                corrected_tokens.push(token.raw.clone());
                expanded_tokens.push(token.raw.clone());
                skip_next_as_value = false;
                continue;
            }

            if token.kind == TokenKind::Quoted || token.kind == TokenKind::Operator {
                corrected_tokens.push(token.raw.clone());
                expanded_tokens.push(token.raw.clone());
                if token.kind == TokenKind::Operator && token.operator_has_empty_value {
                    skip_next_as_value = true;
                }
                if token.kind == TokenKind::Quoted {
                    let inner = token.raw.trim_matches('"').trim().to_string();
                    if !inner.is_empty() {
                        semantic_terms.push(inner);
                    }
                }
                continue;
            }

            let raw_lower = token.raw.to_lowercase();
            let mut term = if looks_like_extension(&raw_lower) {
                raw_lower
            } else {
                strip_punctuation(&raw_lower)
            };
            if term.is_empty() {
                continue;
            }

            if is_question && question_stop_words.contains(term.as_str()) {
                question_rewritten = true;
                continue;
            }

            if should_skip_transform(&term) {
                corrected_tokens.push(token.raw.clone());
                expanded_tokens.push(token.raw.clone());
                semantic_terms.push(term.clone());
                continue;
            }

            if let Some(corrected) = typo_map.get(term.as_str()) {
                if corrected != &term {
                    term = corrected.to_string();
                    applied_corrections = true;
                }
            }

            let mut synonyms: Vec<String> = Vec::new();
            if should_expand(&term, &stop_words) {
                if let Some(candidates) = synonym_map.get(term.as_str()) {
                    for synonym in candidates.iter().take(self.config.max_synonyms_per_term) {
                        if synonym != &term {
                            synonyms.push(synonym.to_string());
                        }
                    }
                }
            }

            if !synonyms.is_empty() {
                applied_expansions = true;
            }

            corrected_tokens.push(term.clone());
            expanded_tokens.push(term.clone());

            terms.push(term.clone());
            expanded_terms.push(term.clone());
            semantic_terms.push(term.clone());

            for synonym in synonyms {
                expanded_tokens.push(synonym.clone());
                expanded_terms.push(synonym);
            }
        }

        if !ext_hints.is_empty() {
            question_rewritten = true;
            for ext in ext_hints {
                let op = format!("ext:{}", ext);
                corrected_tokens.push(op.clone());
                expanded_tokens.push(op);
            }
        }

        let corrected_query = corrected_tokens.join(" ");
        let expanded_query = expanded_tokens.join(" ");
        let semantic_query = semantic_terms.join(" ");

        let mode = if is_question {
            QueryMode::Ask
        } else {
            QueryMode::Keyword
        };
        let mut anchor_candidates = terms.clone();
        for phrase in semantic_terms.iter().filter(|t| t.contains(" ")) {
            anchor_candidates.push(phrase.clone());
        }
        let anchor_terms = self.anchor_extractor.extract(&anchor_candidates);
        let detected_intent = self.intent_detector.detect_intent(trimmed);
        let time_intent = self.intent_detector.detect_time_intent(trimmed);

        let processed = ProcessedQuery {
            original: trimmed.to_string(),
            corrected_query,
            expanded_query,
            semantic_query,
            terms,
            expanded_terms,
            semantic_terms,
            applied_corrections,
            applied_expansions,
            question_rewritten,
            mode,
            anchor_terms,
            detected_intent,
            time_intent,
        };

        self.cache.put(trimmed.to_string(), processed.clone());
        processed
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum TokenKind {
    Term,
    Quoted,
    Operator,
}

#[derive(Debug, Clone)]
struct Token {
    raw: String,
    kind: TokenKind,
    operator_has_empty_value: bool,
}

fn tokenize_query(query: &str) -> Vec<Token> {
    let mut tokens = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;

    for ch in query.chars() {
        if ch == '"' {
            in_quotes = !in_quotes;
            current.push(ch);
            continue;
        }

        if ch.is_whitespace() && !in_quotes {
            if !current.is_empty() {
                tokens.push(token_from_raw(&current));
                current.clear();
            }
            continue;
        }

        current.push(ch);
    }

    if !current.is_empty() {
        tokens.push(token_from_raw(&current));
    }

    tokens
}

fn token_from_raw(raw: &str) -> Token {
    if raw.starts_with('"') && raw.ends_with('"') && raw.len() >= 2 {
        return Token {
            raw: raw.to_string(),
            kind: TokenKind::Quoted,
            operator_has_empty_value: false,
        };
    }

    if let Some((prefix, value)) = raw.split_once(':') {
        let lower = prefix.to_lowercase();
        if matches!(lower.as_str(), "ext" | "before" | "after") {
            return Token {
                raw: raw.to_string(),
                kind: TokenKind::Operator,
                operator_has_empty_value: value.is_empty(),
            };
        }
    }

    Token {
        raw: raw.to_string(),
        kind: TokenKind::Term,
        operator_has_empty_value: false,
    }
}

fn should_skip_transform(term: &str) -> bool {
    if term.contains(':') || term.contains('\\') || term.contains('/') {
        return true;
    }

    if term.starts_with('.') && term.len() <= 6 {
        return true;
    }

    if term.contains('.') {
        return true;
    }

    false
}

fn should_expand(term: &str, stop_words: &HashSet<&'static str>) -> bool {
    if term.len() < 3 {
        return false;
    }
    if term.chars().any(|c| c.is_ascii_digit()) {
        return false;
    }
    if stop_words.contains(term) {
        return false;
    }
    true
}

fn stop_words() -> HashSet<&'static str> {
    [
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
        "from", "as", "is", "was", "are", "were", "be", "been", "being", "have", "has", "had",
        "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "can",
    ]
    .into_iter()
    .collect()
}

fn question_stop_words() -> HashSet<&'static str> {
    [
        "what",
        "where",
        "when",
        "who",
        "why",
        "how",
        "which",
        "show",
        "find",
        "locate",
        "open",
        "search",
        "searching",
        "look",
        "looking",
        "need",
        "want",
        "tell",
        "give",
        "get",
        "me",
        "my",
        "your",
        "our",
        "their",
        "this",
        "that",
        "these",
        "those",
        "please",
        "could",
        "would",
        "should",
        "can",
        "do",
        "does",
        "did",
        "is",
        "are",
        "was",
        "were",
        "be",
        "been",
        "being",
        "have",
        "has",
        "had",
        "about",
        "from",
        "to",
        "for",
    ]
    .into_iter()
    .collect()
}

fn detect_ext_hints(query: &str) -> Vec<&'static str> {
    let lower = query.to_lowercase();
    let mut exts = Vec::new();

    if lower.contains("pdf") {
        exts.push("pdf");
    }
    if lower.contains("word doc") || lower.contains("docx") || lower.contains("document") {
        exts.push("docx");
    }
    if lower.contains("excel") || lower.contains("spreadsheet") || lower.contains("xlsx") {
        exts.push("xlsx");
    }
    if lower.contains("csv") {
        exts.push("csv");
    }
    if lower.contains("powerpoint") || lower.contains("presentation") || lower.contains("slides") {
        exts.push("pptx");
    }

    exts.sort();
    exts.dedup();
    exts
}

fn strip_punctuation(term: &str) -> String {
    term.trim_matches(|c: char| {
        matches!(
            c,
            '?' | '!' | '.' | ',' | ';' | ':' | '"' | '\'' | '(' | ')' | '[' | ']' | '{' | '}'
        )
    })
    .to_string()
}

fn looks_like_extension(term: &str) -> bool {
    if !term.starts_with('.') || term.len() > 6 {
        return false;
    }
    term.chars().skip(1).all(|c| c.is_ascii_alphanumeric())
}

fn typo_map() -> HashMap<&'static str, &'static str> {
    [
        ("seach", "search"),
        ("serach", "search"),
        ("reprot", "report"),
        ("teh", "the"),
        ("recieve", "receive"),
        ("adress", "address"),
        ("enviroment", "environment"),
        ("dependecy", "dependency"),
        ("confg", "config"),
        ("intial", "initial"),
        ("defualt", "default"),
        ("querry", "query"),
        ("modle", "model"),
        ("embarass", "embarrass"),
        ("thier", "their"),
        ("occured", "occurred"),
    ]
    .into_iter()
    .collect()
}

fn synonym_map() -> HashMap<&'static str, Vec<&'static str>> {
    let mut map: HashMap<&'static str, Vec<&'static str>> = HashMap::new();
    map.insert("doc", vec!["document"]);
    map.insert("docs", vec!["documentation"]);
    map.insert("readme", vec!["overview", "guide"]);
    map.insert("report", vec!["summary", "analysis"]);
    map.insert("todo", vec!["task", "issue"]);
    map.insert("bug", vec!["issue", "defect"]);
    map.insert("config", vec!["configuration", "settings"]);
    map.insert("setup", vec!["install", "configure"]);
    map.insert("init", vec!["initialize", "bootstrap"]);
    map.insert("auth", vec!["authentication", "login"]);
    map.insert("api", vec!["interface", "endpoint"]);
    map
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_typo_correction() {
        let mut pre = QueryPreprocessor::with_defaults();
        let processed = pre.preprocess("seach report");
        assert!(processed.corrected_query.contains("search"));
        assert!(processed.applied_corrections);
    }

    #[test]
    fn test_synonym_expansion() {
        let mut pre = QueryPreprocessor::with_defaults();
        let processed = pre.preprocess("doc report");
        assert!(processed.expanded_query.contains("document"));
        assert!(processed.expanded_query.contains("summary"));
        assert!(processed.applied_expansions);
    }

    #[test]
    fn test_operators_preserved() {
        let mut pre = QueryPreprocessor::with_defaults();
        let processed = pre.preprocess("ext:rs before:2024-01-01 report");
        assert!(processed.corrected_query.contains("ext:rs"));
        assert!(processed.corrected_query.contains("before:2024-01-01"));
    }

    #[test]
    fn test_extension_not_expanded() {
        let mut pre = QueryPreprocessor::with_defaults();
        let processed = pre.preprocess("report .rs");
        assert_eq!(processed.corrected_query, "report .rs");
    }

    #[test]
    fn test_quotes_respected() {
        let mut pre = QueryPreprocessor::with_defaults();
        let processed = pre.preprocess("\"project plan\" report");
        assert!(processed.corrected_query.contains("\"project plan\""));
        assert!(processed.expanded_query.contains("\"project plan\""));
    }

    #[test]
    fn test_token_boundaries_preserved() {
        let mut pre = QueryPreprocessor::with_defaults();
        let processed = pre.preprocess("foo_bar baz");
        assert_eq!(processed.corrected_query, "foo_bar baz");
    }

    #[test]
    fn test_question_rewrite_strips_fillers() {
        let mut pre = QueryPreprocessor::with_defaults();
        let processed = pre.preprocess("Where is my 2023 tax return?");
        assert!(processed.corrected_query.contains("2023"));
        assert!(processed.corrected_query.contains("tax"));
        assert!(!processed.corrected_query.contains("where"));
        assert!(processed.question_rewritten);
        assert!(processed.semantic_query.contains("tax"));
    }

    #[test]
    fn test_question_rewrite_adds_ext_hint() {
        let mut pre = QueryPreprocessor::with_defaults();
        let processed = pre.preprocess("Find my PDF invoice");
        assert!(processed.expanded_query.contains("ext:pdf"));
        assert!(processed.question_rewritten);
    }
    #[test]
    fn test_anchor_filters_common_words() {
        let mut pre = QueryPreprocessor::with_defaults();
        let processed = pre.preprocess("The Financial Times");
        assert!(processed.anchor_terms.iter().all(|a| a.term != "the"));
        assert!(processed.anchor_terms.iter().any(|a| a.term == "financial"));
    }

    #[test]
    fn test_meeting_query_finds_meeting_notes() {
        let mut pre = QueryPreprocessor::with_defaults();
        let processed = pre.preprocess("when was the meeting?");
        assert_eq!(processed.mode, QueryMode::Ask);
        assert!(processed.anchor_terms.iter().any(|a| a.term == "meeting"));
        assert!(processed.time_intent.is_some());
    }
}
