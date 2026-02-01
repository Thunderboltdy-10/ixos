use std::collections::{HashMap, HashSet};

use chrono::{Duration, Utc};
use regex::Regex;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct AskModePlusInput {
    pub query: String,
    pub anchors: Option<Vec<String>>,
    pub passages: Option<Vec<String>>,
}

#[derive(Debug, Serialize)]
pub struct Entity {
    pub kind: String,
    pub value: String,
}

#[derive(Debug, Serialize)]
pub struct AskModePlusResult {
    pub normalized_query: String,
    pub entities: Vec<Entity>,
    pub normalized_time: Option<String>,
    pub expanded_anchors: Vec<String>,
}

pub fn run(input: &AskModePlusInput) -> AskModePlusResult {
    let normalized_query = input.query.trim().to_string();
    let entities = extract_entities(&normalized_query);
    let normalized_time = normalize_time(&normalized_query);
    let expanded_anchors = expand_anchors(input.anchors.as_deref().unwrap_or(&[]));

    AskModePlusResult {
        normalized_query,
        entities,
        normalized_time,
        expanded_anchors,
    }
}

fn extract_entities(query: &str) -> Vec<Entity> {
    let mut entities = Vec::new();

    let number_re = Regex::new(r"\b\d+(?:\.\d+)?\b").unwrap();
    for cap in number_re.captures_iter(query) {
        if let Some(value) = cap.get(0) {
            entities.push(Entity {
                kind: "number".into(),
                value: value.as_str().to_string(),
            });
        }
    }

    for token in query.split_whitespace() {
        let trimmed = token.trim_matches(|c: char| !c.is_alphanumeric());
        if trimmed.len() >= 2 && trimmed.chars().next().unwrap_or('a').is_uppercase() {
            entities.push(Entity {
                kind: "proper".into(),
                value: trimmed.to_string(),
            });
        }
    }

    entities
}

fn normalize_time(query: &str) -> Option<String> {
    let lower = query.to_lowercase();
    let today = Utc::now().date_naive();

    if lower.contains("today") {
        return Some(today.to_string());
    }
    if lower.contains("yesterday") {
        return Some((today - Duration::days(1)).to_string());
    }
    if lower.contains("last week") {
        return Some((today - Duration::days(7)).to_string());
    }
    if lower.contains("last month") {
        return Some((today - Duration::days(30)).to_string());
    }

    None
}

fn expand_anchors(anchors: &[String]) -> Vec<String> {
    let mut map: HashMap<&str, &[&str]> = HashMap::new();
    map.insert("meeting", &["sync", "standup", "call"]);
    map.insert("invoice", &["bill", "statement"]);
    map.insert("contract", &["agreement", "deal"]);

    let mut expanded: Vec<String> = Vec::new();
    let mut seen = HashSet::new();

    for anchor in anchors {
        let lower = anchor.to_lowercase();
        if seen.insert(lower.clone()) {
            expanded.push(lower.clone());
        }
        if let Some(values) = map.get(lower.as_str()) {
            for value in *values {
                if seen.insert(value.to_string()) {
                    expanded.push(value.to_string());
                }
            }
        }
    }

    expanded
}
