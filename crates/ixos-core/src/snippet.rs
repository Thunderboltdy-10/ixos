//! Query-time passage selection. Persistent document records stay unchanged.
use crate::{
    cache::quantize,
    engine::{dot, tokens, Document},
    model::Model,
    record,
};
use serde::Serialize;
use std::collections::{BTreeMap, BTreeSet, HashMap};
use std::time::Instant;

#[derive(Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Stats {
    pub candidate_passages: usize,
    pub extra_passages_embedded: usize,
    pub extra_embed_ms: f64,
    pub selection_ms: f64,
}

pub(crate) struct Selection {
    pub anchor: usize,
}

struct Candidate {
    passage: record::Passage,
    weight: f64,
    anchor: usize,
}

// Stable unique-term order avoids HashSet-dependent floating-point ties.
pub(crate) fn line_weight(line: &str, idfs: &HashMap<String, f32>) -> f64 {
    tokens(line)
        .into_iter()
        .collect::<BTreeSet<_>>()
        .iter()
        .map(|term| f64::from(idfs.get(term).copied().unwrap_or(0.0)))
        .sum()
}

fn local_anchor(text: &str, start_line: usize, idfs: &HashMap<String, f32>) -> (f64, usize) {
    let mut best = (0.0, start_line);
    for (offset, line) in text.split_terminator('\n').enumerate() {
        let weight = line_weight(line, idfs);
        if weight > best.0 {
            best = (weight, start_line + offset);
        }
    }
    best
}

// A byte-bounded passage may start/end inside a long alphanumeric run.
// Discard those edge fragments for lexical scoring; they are not source words.
// This conservatively drops a split camel-case run too. Embedding input and
// quoted source remain the original complete passage/physical lines.
fn lexical_text<'a>(text: &'a str, passage: &record::Passage) -> &'a str {
    let part = &text[passage.start_byte..passage.end_byte];
    let mut start = 0;
    let mut end = part.len();
    if passage.start_byte > 0
        && text[..passage.start_byte]
            .chars()
            .next_back()
            .is_some_and(char::is_alphanumeric)
        && part.chars().next().is_some_and(char::is_alphanumeric)
    {
        start = part
            .char_indices()
            .find(|(_, c)| !c.is_alphanumeric())
            .map_or(part.len(), |(i, _)| i);
    }
    if passage.end_byte < text.len()
        && part.chars().next_back().is_some_and(char::is_alphanumeric)
        && text[passage.end_byte..]
            .chars()
            .next()
            .is_some_and(char::is_alphanumeric)
    {
        end = part
            .char_indices()
            .rev()
            .find(|(_, c)| !c.is_alphanumeric())
            .map_or(0, |(i, c)| i + c.len_utf8());
    }
    &part[start.min(end)..end]
}

fn candidates(document: &Document, idfs: &HashMap<String, f32>) -> Vec<Candidate> {
    let mut selected = BTreeMap::new();
    for passage in &document.passages {
        selected.insert((passage.start_byte, passage.end_byte), passage.clone());
    }
    let mut lexical: Vec<_> = record::chunks(&document.text)
        .into_iter()
        .filter_map(|passage| {
            let (weight, _) = local_anchor(
                lexical_text(&document.text, &passage),
                passage.start_line,
                idfs,
            );
            (weight > 0.0).then_some((weight, passage))
        })
        .collect();
    lexical.sort_by(|a, b| {
        b.0.total_cmp(&a.0)
            .then_with(|| a.1.start_byte.cmp(&b.1.start_byte))
    });
    for (_, passage) in lexical.into_iter().take(8) {
        selected
            .entry((passage.start_byte, passage.end_byte))
            .or_insert(passage);
    }
    selected
        .into_values()
        .map(|passage| {
            let (weight, anchor) = local_anchor(
                lexical_text(&document.text, &passage),
                passage.start_line,
                idfs,
            );
            Candidate {
                passage,
                weight,
                anchor,
            }
        })
        .collect()
}

pub(crate) fn select(
    documents: &BTreeMap<String, Document>,
    paths: &[String],
    query: &[f32],
    idfs: &HashMap<String, f32>,
    model: &Model,
) -> anyhow::Result<(HashMap<String, Selection>, Stats)> {
    let started = Instant::now();
    let mut stats = Stats::default();
    let mut files = Vec::new();
    let mut inputs = Vec::new();
    let mut locations = Vec::new();
    for path in paths {
        let document = &documents[path];
        let parts = candidates(document, idfs);
        anyhow::ensure!(parts.len() <= 16, "Evidence passage ceiling exceeded");
        for (index, part) in parts.iter().enumerate() {
            if part.passage.vector.is_empty() {
                inputs
                    .push(document.text[part.passage.start_byte..part.passage.end_byte].to_owned());
                locations.push((files.len(), index));
            }
        }
        stats.candidate_passages += parts.len();
        files.push((path.clone(), parts));
    }
    stats.extra_passages_embedded = inputs.len();
    let embedding_started = Instant::now();
    for (batch, destinations) in inputs.chunks(64).zip(locations.chunks(64)) {
        let vectors = model.embed_batch_with_limit(batch, None)?;
        anyhow::ensure!(
            vectors.len() == destinations.len(),
            "Evidence inference dropped a passage"
        );
        for (mut vector, &(file, part)) in vectors.into_iter().zip(destinations) {
            // Same precision as document records in both JIT and cached search.
            quantize(&mut vector);
            files[file].1[part].passage.vector = vector;
        }
    }
    stats.extra_embed_ms = embedding_started.elapsed().as_secs_f64() * 1000.0;
    let mut selections = HashMap::new();
    for (path, parts) in files {
        let maximum = documents[&path]
            .lines
            .iter()
            .map(|line| line_weight(line, idfs))
            .fold(0.0, f64::max)
            .max(1e-12);
        let mut winner: Option<(f64, Candidate)> = None;
        for part in parts {
            let score = 0.5 * f64::from(dot(query, &part.passage.vector).max(0.0))
                + 0.5 * part.weight / maximum;
            if winner.as_ref().is_none_or(|(best, _)| score > *best) {
                winner = Some((score, part));
            }
        }
        if let Some((_, part)) = winner {
            selections.insert(
                path,
                Selection {
                    anchor: part.anchor,
                },
            );
        }
    }
    stats.selection_ms = started.elapsed().as_secs_f64() * 1000.0;
    Ok((selections, stats))
}

#[cfg(test)]
mod tests {
    use super::*;
    fn document(text: String) -> Document {
        Document {
            path: "source.rs".into(),
            source_hash: [0; 32],
            raw_hash: [0; 32],
            lines: text.split('\n').map(str::to_owned).collect(),
            terms: HashMap::new(),
            length: 0,
            passages: record::representatives(&text, crate::config::Profile::Code),
            text,
        }
    }
    #[test]
    fn bounded_union_reuses_stored_vectors_and_reaches_late_lexical_topic() {
        let mut doc = document(format!(
            "{}\nneedle\n{}",
            "blank\n".repeat(13000),
            "blank\n".repeat(6000)
        ));
        for passage in &mut doc.passages {
            passage.vector = vec![1.0, 0.0];
        }
        let selected = candidates(&doc, &HashMap::from([("needle".into(), 1.0)]));
        assert!(selected.len() <= 16);
        assert_eq!(
            selected
                .iter()
                .filter(|p| !p.passage.vector.is_empty())
                .count(),
            8
        );
        assert!(selected.iter().any(|p| p.anchor == 13002 && p.weight > 0.0));
    }
    #[test]
    fn partial_line_does_not_inherit_evidence_outside_its_bytes() {
        let doc = document(format!("{}needle", "x".repeat(3600)));
        let selected = candidates(&doc, &HashMap::from([("needle".into(), 1.0)]));
        assert!(selected.iter().all(|part| part.weight == 0.0));
        let doc = document(format!("{}needlelongword", ";".repeat(1798)));
        let selected = candidates(&doc, &HashMap::from([("ne".into(), 1.0)]));
        assert!(selected.iter().all(|part| part.weight == 0.0));
        assert_eq!(
            local_anchor(
                "absent\nneedle\nneedle",
                4,
                &HashMap::from([("needle".into(), 1.0)])
            ),
            (1.0, 5)
        );
    }
}
