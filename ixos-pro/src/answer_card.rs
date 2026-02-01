use regex::Regex;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct AnswerCard {
    pub answer: Option<String>,
    pub answer_type: String,
    pub confidence: f32,
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
