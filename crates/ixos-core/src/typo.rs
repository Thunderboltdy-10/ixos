//! Conservative adjacent-transposition recovery from the live corpus vocabulary.
//! It never rewrites quotes, paths, numbers, identifiers or ambiguous candidates.
use serde::Serialize;
use std::collections::HashSet;

#[derive(Clone, Debug, Serialize)]
pub struct Correction {
    pub original: String,
    pub replacement: String,
}

pub fn correct(query: &str, vocabulary: &HashSet<String>) -> (String, Vec<Correction>) {
    let mut rewritten = String::new();
    let mut corrections = Vec::new();
    let mut quote = None;
    for piece in query.split_inclusive(char::is_whitespace) {
        let trim = piece.trim_end_matches(char::is_whitespace);
        let protected = quote.is_some() || trim.contains(['"', '`', '\'']);
        for c in trim.chars().filter(|c| ['"', '`', '\''].contains(c)) {
            if quote == Some(c) {
                quote = None;
            } else if quote.is_none() {
                quote = Some(c);
            }
        }
        if protected {
            rewritten.push_str(piece);
            continue;
        }
        let word = trim.trim_matches(|c: char| {
            c.is_ascii_punctuation() && !['_', ':', '/', '\\', '-', '.'].contains(&c)
        });
        if quote.is_some()
            || !(6..=32).contains(&word.len())
            || !word.bytes().all(|c| c.is_ascii_lowercase())
            || vocabulary.contains(word)
        {
            rewritten.push_str(piece);
            continue;
        }
        let mut candidates = HashSet::new();
        let mut letters = word.as_bytes().to_vec();
        for i in 0..letters.len() - 1 {
            letters.swap(i, i + 1);
            let candidate = String::from_utf8(letters.clone()).unwrap();
            if candidate != word && vocabulary.contains(&candidate) {
                candidates.insert(candidate);
            }
            letters.swap(i, i + 1);
        }
        if candidates.len() == 1 {
            let replacement = candidates.into_iter().next().unwrap();
            let offset = piece.find(word).unwrap();
            rewritten.push_str(&piece[..offset]);
            rewritten.push_str(&replacement);
            rewritten.push_str(&piece[offset + word.len()..]);
            corrections.push(Correction {
                original: word.to_owned(),
                replacement,
            });
        } else {
            rewritten.push_str(piece);
        }
    }
    (rewritten, corrections)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn unique_live_word_only_and_literals_are_preserved() {
        let vocabulary = ["dependency", "search", "abcdef", "bacdef", "abcdefg"]
            .into_iter()
            .map(str::to_owned)
            .collect();
        assert_eq!(
            correct("where is depnedency checked?", &vocabulary).0,
            "where is dependency checked?"
        );
        for original in [
            "dep_nedency",
            "Depnedency",
            "path/depnedency",
            "\"depnedency search\"",
            "`depnedency`",
            "'depnedency'",
            "'depnedency search'",
            "depnedency2",
            "depnedency.txt",
        ] {
            assert_eq!(correct(original, &vocabulary).0, original);
        }
        assert_eq!(correct("dependency", &vocabulary).1.len(), 0);
    }
}
