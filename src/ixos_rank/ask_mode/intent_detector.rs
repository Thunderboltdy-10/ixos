use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::sync::OnceLock;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum QueryIntent {
    WhoQuestion,
    WhenQuestion,
    WhereQuestion,
    WhatQuestion,
    HowQuestion,
    WhyQuestion,
    FindRequest,
    ShowRequest,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TimeIntent {
    Recent,
    Specific(String),
    Before(String),
    After(String),
}

#[derive(Debug, Default)]
pub struct IntentDetector;

const TEMPLATE_EMBED_DIM: usize = 64;
const ASK_SIMILARITY_THRESHOLD: f32 = 0.65;

const ASK_TEMPLATES: &[&str] = &[
    "what is the main config file",
    "where is the auth token handled",
    "who wrote the release workflow",
    "when was this changed",
    "how does search ranking work",
    "why is ask mode slow",
    "find the settings for cache mode",
    "show me where deep search is implemented",
    "which file defines model ids",
    "what changed in ci",
];

impl IntentDetector {
    pub fn new() -> Self {
        Self
    }

    pub fn detect_intent(&self, query: &str) -> Option<QueryIntent> {
        let lower = query.trim().to_lowercase();
        if lower.starts_with("who ") || lower.starts_with("who's ") {
            return Some(QueryIntent::WhoQuestion);
        }
        if lower.starts_with("when ") || lower.starts_with("when was ") {
            return Some(QueryIntent::WhenQuestion);
        }
        if lower.starts_with("where ") || lower.starts_with("where is ") {
            return Some(QueryIntent::WhereQuestion);
        }
        if lower.starts_with("what ") || lower.starts_with("what is ") {
            return Some(QueryIntent::WhatQuestion);
        }
        if lower.starts_with("how ") || lower.starts_with("how to ") {
            return Some(QueryIntent::HowQuestion);
        }
        if lower.starts_with("why ") || lower.starts_with("why is ") {
            return Some(QueryIntent::WhyQuestion);
        }
        if lower.starts_with("find ") || lower.starts_with("find my ") {
            return Some(QueryIntent::FindRequest);
        }
        if lower.starts_with("show ") || lower.starts_with("show me ") {
            return Some(QueryIntent::ShowRequest);
        }
        None
    }

    /// Determine if Ask Mode should activate for a query.
    ///
    /// Fast path:
    /// - explicit question marker (`?`)
    /// - direct question/request prefixes
    ///
    /// Secondary path:
    /// - lightweight embedding similarity against question templates
    pub fn should_activate_ask_mode(&self, query: &str) -> bool {
        let trimmed = query.trim();
        if trimmed.is_empty() {
            return false;
        }

        let lower = trimmed.to_lowercase();
        if lower.contains('?') || self.detect_intent(trimmed).is_some() {
            return true;
        }

        let query_emb = template_embed(trimmed);
        ask_template_embeddings()
            .iter()
            .any(|template| cosine_similarity(&query_emb, template) >= ASK_SIMILARITY_THRESHOLD)
    }

    pub fn detect_time_intent(&self, query: &str) -> Option<TimeIntent> {
        let lower = query.trim().to_lowercase();
        if lower.starts_with("when ")
            || lower.starts_with("when was ")
            || lower.starts_with("when were ")
        {
            return Some(TimeIntent::Recent);
        }
        let recent_terms = [
            "today",
            "yesterday",
            "last week",
            "last month",
            "last year",
            "recent",
            "recently",
            "latest",
            "newest",
        ];
        if recent_terms.iter().any(|term| lower.contains(term)) {
            return Some(TimeIntent::Recent);
        }

        if let Some(value) = extract_prefixed_value(&lower, "before") {
            return Some(TimeIntent::Before(value));
        }
        if let Some(value) = extract_prefixed_value(&lower, "after") {
            return Some(TimeIntent::After(value));
        }

        if let Some(year) = extract_year(&lower) {
            return Some(TimeIntent::Specific(year));
        }

        if let Some(month) = extract_month(&lower) {
            return Some(TimeIntent::Specific(month));
        }

        None
    }
}

fn ask_template_embeddings() -> &'static Vec<Vec<f32>> {
    static EMBEDDINGS: OnceLock<Vec<Vec<f32>>> = OnceLock::new();
    EMBEDDINGS.get_or_init(|| ASK_TEMPLATES.iter().map(|t| template_embed(t)).collect())
}

fn template_embed(text: &str) -> Vec<f32> {
    let mut vector = vec![0.0_f32; TEMPLATE_EMBED_DIM];
    for token in tokenize(text) {
        let mut hasher = DefaultHasher::new();
        token.hash(&mut hasher);
        let idx = (hasher.finish() as usize) % TEMPLATE_EMBED_DIM;
        vector[idx] += 1.0;
    }
    normalize_l2(&mut vector);
    vector
}

fn tokenize(text: &str) -> impl Iterator<Item = String> + '_ {
    text.split(|c: char| !c.is_ascii_alphanumeric())
        .filter(|t| !t.is_empty())
        .map(|t| t.to_lowercase())
}

fn normalize_l2(vector: &mut [f32]) {
    let norm = vector.iter().map(|v| v * v).sum::<f32>().sqrt();
    if norm <= f32::EPSILON {
        return;
    }
    for value in vector {
        *value /= norm;
    }
}

fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() {
        return 0.0;
    }
    a.iter().zip(b.iter()).map(|(x, y)| x * y).sum::<f32>()
}

fn extract_prefixed_value(haystack: &str, prefix: &str) -> Option<String> {
    let pattern = format!("{} ", prefix);
    if let Some(idx) = haystack.find(&pattern) {
        let rest = haystack[idx + pattern.len()..].trim();
        if rest.is_empty() {
            return None;
        }
        let value = rest.split_whitespace().next().unwrap_or(rest);
        return Some(value.to_string());
    }
    None
}

fn extract_year(haystack: &str) -> Option<String> {
    for token in haystack.split_whitespace() {
        if token.len() == 4 && token.chars().all(|c| c.is_ascii_digit()) {
            return Some(token.to_string());
        }
    }
    None
}

fn extract_month(haystack: &str) -> Option<String> {
    let months = [
        "january",
        "february",
        "march",
        "april",
        "may",
        "june",
        "july",
        "august",
        "september",
        "october",
        "november",
        "december",
    ];

    for month in months {
        if haystack.contains(month) {
            return Some(month.to_string());
        }
    }

    None
}
