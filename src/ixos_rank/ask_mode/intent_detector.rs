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

const TEMPLATE_EMBED_DIM: usize = 128;
const ASK_SIMILARITY_THRESHOLD: f32 = 0.52;

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
    "where can i find meeting notes",
    "how do i install this",
    "why are search results different",
    "compare these two reports",
    "summarize this folder activity",
    "explain how this works",
    "list files related to onboarding",
];

impl IntentDetector {
    pub fn new() -> Self {
        Self
    }

    pub fn detect_intent(&self, query: &str) -> Option<QueryIntent> {
        let normalized = normalize_text(query);
        let tokens: Vec<&str> = normalized.split_whitespace().collect();
        if tokens.is_empty() {
            return None;
        }

        let prefix = &tokens[..tokens.len().min(3)];
        let matches = |candidates: &[&str], max_distance: usize| {
            prefix
                .iter()
                .any(|token| fuzzy_equals_any(token, candidates, max_distance))
        };

        if matches(&["who", "whos"], 1) {
            return Some(QueryIntent::WhoQuestion);
        }
        if matches(&["when"], 1) {
            return Some(QueryIntent::WhenQuestion);
        }
        if matches(&["where", "wheres"], 1) {
            return Some(QueryIntent::WhereQuestion);
        }
        if matches(&["what", "whats", "which"], 1) {
            return Some(QueryIntent::WhatQuestion);
        }
        if matches(&["how", "hows"], 1) {
            return Some(QueryIntent::HowQuestion);
        }
        if matches(&["why", "whys"], 1) {
            return Some(QueryIntent::WhyQuestion);
        }
        if matches(&["find", "locate", "list", "compare"], 1) {
            return Some(QueryIntent::FindRequest);
        }
        if matches(&["show", "summarize", "explain"], 1) {
            return Some(QueryIntent::ShowRequest);
        }

        None
    }

    /// Determine if Ask Mode should activate for a query.
    ///
    /// Fast path:
    /// - explicit question marker (`?`)
    /// - direct question/request prefixes with typo tolerance
    ///
    /// Secondary path:
    /// - character n-gram embedding similarity against question templates
    pub fn should_activate_ask_mode(&self, query: &str) -> bool {
        let trimmed = query.trim();
        if trimmed.is_empty() {
            return false;
        }

        let lower = trimmed.to_lowercase();
        if lower.contains('?') || self.detect_intent(trimmed).is_some() {
            return true;
        }

        if lower.starts_with("can you ")
            || lower.starts_with("could you ")
            || lower.starts_with("please ")
            || lower.starts_with("i need to know ")
            || lower.starts_with("help me find ")
        {
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
    let normalized = normalize_text(text);
    let mut vector = vec![0.0_f32; TEMPLATE_EMBED_DIM];

    for trigram in char_ngrams(&normalized, 3) {
        let idx = stable_hash(&trigram) % TEMPLATE_EMBED_DIM;
        vector[idx] += 1.0;
    }

    for token in normalized.split_whitespace() {
        let idx = stable_hash(token) % TEMPLATE_EMBED_DIM;
        vector[idx] += 0.5;
    }

    normalize_l2(&mut vector);
    vector
}

fn char_ngrams(input: &str, n: usize) -> Vec<String> {
    if input.is_empty() || n == 0 {
        return Vec::new();
    }

    let padded = format!(" {} ", input);
    let chars: Vec<char> = padded.chars().collect();
    if chars.len() < n {
        return vec![padded];
    }

    (0..=chars.len() - n)
        .map(|idx| chars[idx..idx + n].iter().collect())
        .collect()
}

fn normalize_text(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    let mut prev_space = false;
    for ch in text.chars() {
        let normalized = if ch.is_ascii_alphanumeric() {
            ch.to_ascii_lowercase()
        } else {
            ' '
        };
        if normalized == ' ' {
            if prev_space {
                continue;
            }
            prev_space = true;
            out.push(' ');
        } else {
            prev_space = false;
            out.push(normalized);
        }
    }
    out.trim().to_string()
}

fn stable_hash(text: &str) -> usize {
    let mut hash: usize = 2166136261;
    for b in text.as_bytes() {
        hash ^= *b as usize;
        hash = hash.wrapping_mul(16777619);
    }
    hash
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

fn fuzzy_equals_any(token: &str, candidates: &[&str], max_distance: usize) -> bool {
    candidates
        .iter()
        .any(|candidate| levenshtein_distance(token, candidate) <= max_distance)
}

fn levenshtein_distance(a: &str, b: &str) -> usize {
    if a == b {
        return 0;
    }
    if a.is_empty() {
        return b.chars().count();
    }
    if b.is_empty() {
        return a.chars().count();
    }

    let b_chars: Vec<char> = b.chars().collect();
    let mut prev: Vec<usize> = (0..=b_chars.len()).collect();
    let mut curr = vec![0_usize; b_chars.len() + 1];

    for (i, a_ch) in a.chars().enumerate() {
        curr[0] = i + 1;
        for (j, b_ch) in b_chars.iter().enumerate() {
            let cost = if a_ch == *b_ch { 0 } else { 1 };
            curr[j + 1] = (prev[j + 1] + 1).min(curr[j] + 1).min(prev[j] + cost);
        }
        std::mem::swap(&mut prev, &mut curr);
    }

    prev[b_chars.len()]
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
