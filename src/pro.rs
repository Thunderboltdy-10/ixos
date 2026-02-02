//! Built-in Pro functionality that ships with the app.

use std::collections::{HashMap, HashSet};

use chrono::{Duration, Utc};
use regex::Regex;
use serde::{Deserialize, Serialize};

use crate::ixos_rank::ProcessedQuery;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AskModePlusResult {
    pub normalized_query: String,
    pub entities: Vec<ProEntity>,
    pub normalized_time: Option<String>,
    pub expanded_anchors: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProEntity {
    pub kind: String,
    pub value: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnswerCard {
    pub answer: Option<String>,
    pub answer_type: String,
    pub confidence: f32,
}

pub fn ask_mode_plus(query: &ProcessedQuery) -> AskModePlusResult {
    let normalized_query = query.original.trim().to_string();
    let anchors: Vec<String> = query.anchor_terms.iter().map(|a| a.term.clone()).collect();
    let entities = extract_entities(&normalized_query);
    let normalized_time = normalize_time(&normalized_query);
    let expanded_anchors = expand_anchors(&anchors);

    AskModePlusResult {
        normalized_query,
        entities,
        normalized_time,
        expanded_anchors,
    }
}

pub fn extract_answer_card(passage: &str, query: &str) -> AnswerCard {
    let date_re = Regex::new(r"\b\d{4}-\d{2}-\d{2}\b").unwrap();
    if let Some(cap) = date_re.captures(passage) {
        return AnswerCard {
            answer: cap.get(0).map(|m| m.as_str().to_string()),
            answer_type: "date".into(),
            confidence: 0.75,
        };
    }

    let number_re = Regex::new(r"\b\d+(?:\.\d+)?\b").unwrap();
    if let Some(cap) = number_re.captures(passage) {
        return AnswerCard {
            answer: cap.get(0).map(|m| m.as_str().to_string()),
            answer_type: "number".into(),
            confidence: 0.55,
        };
    }

    let first_sentence = passage
        .split_terminator(['.', '!', '?'])
        .next()
        .map(|s| s.trim())
        .filter(|s| !s.is_empty());

    AnswerCard {
        answer: first_sentence.map(|s| s.to_string()),
        answer_type: if query.to_lowercase().contains("who") {
            "entity".into()
        } else {
            "text".into()
        },
        confidence: 0.3,
    }
}

fn extract_entities(query: &str) -> Vec<ProEntity> {
    let mut entities = Vec::new();

    let number_re = Regex::new(r"\b\d+(?:\.\d+)?\b").unwrap();
    for cap in number_re.captures_iter(query) {
        if let Some(value) = cap.get(0) {
            entities.push(ProEntity {
                kind: "number".into(),
                value: value.as_str().to_string(),
            });
        }
    }

    for token in query.split_whitespace() {
        let trimmed = token.trim_matches(|c: char| !c.is_alphanumeric());
        if trimmed.len() >= 2 && trimmed.chars().next().unwrap_or('a').is_uppercase() {
            entities.push(ProEntity {
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
