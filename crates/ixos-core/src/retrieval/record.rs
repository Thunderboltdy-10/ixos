//! Query-independent representative passages. All input is chunked before the
//! bounded introduction/spaced selection; locators refer to extracted text.
use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, clap::ValueEnum, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Representation {
    #[default]
    IntroUniform,
    WholeTokenCentroid,
}

#[derive(Clone, Debug)]
pub struct Passage {
    pub start_byte: usize,
    pub end_byte: usize,
    pub start_line: usize,
    pub end_line: usize,
    pub vector: Vec<f32>,
}

pub fn chunks(text: &str) -> Vec<Passage> {
    let mut rows = Vec::new();
    let (mut start, mut line) = (0, 1);
    while start < text.len() {
        let rest = &text[start..];
        let mut end = rest
            .char_indices()
            .nth(1800)
            .map_or(text.len(), |(i, _)| start + i);
        if end < text.len() {
            let halfway = rest
                .char_indices()
                .nth(900)
                .map_or(start, |(i, _)| start + i);
            if let Some(offset) = text[halfway..end]
                .rfind('\n')
                .or_else(|| text[halfway..end].rfind(' '))
            {
                end = halfway + offset + 1;
            }
        }
        let part = &text[start..end];
        let breaks = part.bytes().filter(|b| *b == b'\n').count();
        rows.push(Passage {
            start_byte: start,
            end_byte: end,
            start_line: line,
            end_line: line + breaks - usize::from(part.ends_with('\n')),
            vector: Vec::new(),
        });
        line += breaks;
        start = end;
    }
    rows
}

fn round_even(numerator: usize, denominator: usize) -> usize {
    let base = numerator / denominator;
    let remainder = numerator % denominator;
    base + usize::from(remainder * 2 > denominator || remainder * 2 == denominator && base % 2 == 1)
}

pub fn representatives(text: &str, policy: Representation) -> Vec<Passage> {
    let parts = chunks(text);
    if parts.is_empty() {
        return parts;
    }
    if policy == Representation::WholeTokenCentroid {
        return vec![Passage {
            start_byte: 0,
            end_byte: text.len(),
            start_line: 1,
            end_line: text.split('\n').count(),
            vector: Vec::new(),
        }];
    }
    let budget = parts.len().min(if parts.len() <= 8 { 4 } else { 8 });
    if budget == 1 {
        return vec![parts[0].clone()];
    }
    (0..budget)
        .map(|i| parts[round_even(i * (parts.len() - 1), budget - 1)].clone())
        .collect()
}

pub fn unit(vector: &mut [f32]) {
    let norm = vector.iter().map(|v| v * v).sum::<f32>().sqrt();
    if norm > 0.0 {
        for v in vector {
            *v /= norm;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn unicode_full_coverage_and_late_anchor() {
        let text = format!("intro\n{}\nlate topic", "中😀\n".repeat(5000));
        let every = chunks(&text);
        assert_eq!(
            every
                .iter()
                .map(|p| &text[p.start_byte..p.end_byte])
                .collect::<String>(),
            text
        );
        assert!(every.iter().all(|p| p.end_line >= p.start_line));
        let selected = representatives(&text, Representation::IntroUniform);
        assert_eq!(selected.len(), 8);
        assert_eq!(selected[0].start_byte, 0);
        assert_eq!(selected.last().unwrap().end_byte, text.len());
    }
    #[test]
    fn centroid_includes_entire_source() {
        let text = "x\n".repeat(3000);
        let rows = representatives(&text, Representation::WholeTokenCentroid);
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].end_byte, text.len());
    }
}
