#[derive(Debug, Clone, PartialEq, Eq)]
pub enum QueryIntent {
    WhoQuestion,
    WhenQuestion,
    WhereQuestion,
    WhatQuestion,
    HowQuestion,
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
        if lower.starts_with("find ") || lower.starts_with("find my ") {
            return Some(QueryIntent::FindRequest);
        }
        if lower.starts_with("show ") || lower.starts_with("show me ") {
            return Some(QueryIntent::ShowRequest);
        }
        None
    }

    pub fn detect_time_intent(&self, query: &str) -> Option<TimeIntent> {
        let lower = query.trim().to_lowercase();
        if lower.starts_with("when ") || lower.starts_with("when was ") || lower.starts_with("when were ") {
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
        "january", "february", "march", "april", "may", "june", "july", "august",
        "september", "october", "november", "december",
    ];

    for month in months {
        if haystack.contains(month) {
            return Some(month.to_string());
        }
    }

    None
}
