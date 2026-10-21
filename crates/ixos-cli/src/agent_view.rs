//! Optional compact source views; structured MCP content retains exact coordinates.
use serde_json::Value;
use std::collections::{BTreeMap, BTreeSet};
use std::fmt::Write;

fn lines(out: &mut String, first: usize, text: &str) {
    for (i, line) in text.split('\n').enumerate() {
        let _ = writeln!(out, "{} |{}", first + i, line);
    }
}
fn snippet(out: &mut String, path: &str, s: &Value) -> Option<()> {
    let a = s["start_line"].as_u64()? as usize;
    let z = s["end_line"].as_u64()?;
    writeln!(out, "{path}:L{a}-L{z}").ok()?;
    lines(out, a, s["text"].as_str()?);
    Some(())
}

/// No source, score, match or metadata is discarded. Over-budget views fall back
/// to the original JSON so a display experiment cannot silently remove evidence.
pub fn render(tool: &str, value: &Value, budget: usize) -> Option<String> {
    let mut out = String::new();
    if tool == "read" {
        let s = value.get("snippet")?;
        let path = s["path"].as_str()?;
        if let Some(selection) = value.get("selection") {
            if selection["status"] != "selected" {
                return None;
            }
            let symbol = selection.get("symbol")?;
            writeln!(
                out,
                "Function {} L{}-L{} (definition extent)",
                symbol[0].as_str()?,
                symbol[1],
                symbol[2]
            )
            .ok()?;
            writeln!(
                out,
                "Selected source L{}-L{}",
                selection["requested_lines"][0], selection["requested_lines"][1]
            )
            .ok()?;
        }
        snippet(&mut out, path, s)?;
        if value["truncated"].as_bool()? {
            if let Some(end) = value
                .get("selection")
                .and_then(|selection| selection["requested_lines"][1].as_u64())
            {
                writeln!(out,"Budget shortened this read. Continue: read(path={path:?}, start={}, end={end})",s["end_line"].as_u64()?+1).ok()?;
            } else {
                writeln!(
                    out,
                    "Budget shortened this read. Continue: read(path={path:?}, start={}, lines=40)",
                    s["end_line"].as_u64()? + 1
                )
                .ok()?;
            }
        }
        writeln!(out, "Total source lines: {}", value["total_lines"]).ok()?;
        writeln!(out, "Source version: {}", value["source_hash"].as_str()?).ok()?;
    } else if tool == "grep" {
        // A literal search often returns overlapping context for adjacent hits.
        // Collapse only already-returned exact source lines; never invent hits.
        let mut files: BTreeMap<String, (BTreeMap<usize, String>, BTreeSet<usize>)> =
            BTreeMap::new();
        for row in value["results"].as_array()? {
            let path = row["path"].as_str()?;
            let (source, hits) = files.entry(path.to_owned()).or_default();
            hits.insert(row["line"].as_u64()? as usize);
            let s = &row["snippet"];
            let start = s["start_line"].as_u64()? as usize;
            for (i, line) in s["text"].as_str()?.split('\n').enumerate() {
                if source.get(&(start + i)).is_some_and(|old| old != line) {
                    return None;
                }
                source.insert(start + i, line.to_owned());
            }
        }
        for (path, (source, hits)) in files {
            writeln!(
                out,
                "{path} — hits {}",
                hits.iter()
                    .map(|n| format!("L{n}"))
                    .collect::<Vec<_>>()
                    .join(", ")
            )
            .ok()?;
            let mut previous = None;
            for (number, line) in source {
                if previous.is_some_and(|n| number > n + 1) {
                    out.push_str("...\n");
                }
                writeln!(out, "{number} |{line}").ok()?;
                previous = Some(number);
            }
        }
    } else if tool == "search" {
        for (i, row) in value["results"].as_array()?.iter().enumerate() {
            let path = row["path"].as_str()?;
            write!(out, "{}. {path}", i + 1).ok()?;
            if let Some(score) = row.get("score") {
                write!(out, " score={score}").ok()?;
            }
            out.push('\n');
            if row.get("snippet_omitted").is_some() {
                return None;
            }
            if let Some(hash) = row.get("source_hash") {
                writeln!(out, "Source version: {}", hash.as_str()?).ok()?;
            }
            if let Some(s) = row.get("snippet") {
                snippet(&mut out, path, s)?;
            }
            for (j, m) in row
                .get("matches")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
                .enumerate()
            {
                let a = m["lines"][0].as_u64()? as usize;
                let z = m["lines"][1].as_u64()?;
                writeln!(
                    out,
                    "  {} L{a}-L{z}",
                    if j == 0 { "Primary" } else { "Alternative" }
                )
                .ok()?;
                if let Some(sym) = m.get("symbol") {
                    writeln!(
                        out,
                        "  Function {} L{}-L{} (extent; body below may be partial)",
                        sym[0].as_str()?,
                        sym[1],
                        sym[2]
                    )
                    .ok()?;
                }
                if let Some(scope) = m.get("scope") {
                    writeln!(out, "  Enclosing L{} |{}", scope[0], scope[1].as_str()?).ok()?;
                }
                lines(&mut out, a, m["text"].as_str()?);
            }
        }
    } else {
        return None;
    }
    (out.len() < budget).then_some(out)
}

/// Keep line-oriented reads consistently numbered by shrinking only their tail.
/// The structured response exposes the reduced extent and explicit truncation.
/// Character slices and a single oversized line retain the original JSON form.
pub fn fit_read(value: &mut Value, budget: usize) {
    loop {
        if render("read", value, budget).is_some() {
            break;
        }
        let Some(s) = value.get_mut("snippet") else {
            break;
        };
        let Some(text) = s["text"].as_str() else {
            break;
        };
        let Some(cut) = text.rfind('\n') else {
            break;
        };
        let shortened = text[..cut].to_owned();
        let Some(end) = s["end_line"].as_u64() else {
            break;
        };
        if end <= s["start_line"].as_u64().unwrap_or(end) {
            break;
        }
        s["text"] = shortened.into();
        s["end_line"] = (end - 1).into();
        value["truncated"] = true.into();
        value["next_start_line"] = end.into();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    #[test]
    fn numbering_preserves_every_source_character_and_marks_continuation() {
        let source = "  café 😀\n\treturn x;\n";
        let v = json!({"snippet":{"path":"a.rs","start_line":9,"end_line":11,"text":source},"source_hash":"abc","truncated":true});
        let text = render("read", &v, 6000).unwrap();
        assert!(text.contains("9 |  café 😀\n10 |\treturn x;\n11 |\n"));
        assert!(text.contains("start=12, lines=40"));
        assert_eq!(v["snippet"]["text"], source);
        assert!(render("read", &v, 10).is_none());
    }
    #[test]
    fn identity_is_separate_from_returned_source_and_scores_are_unrounded() {
        let v = json!({"results":[{"path":"a.py","score":0.123456789,"matches":[{"lines":[7,8],"text":" # docs\n # detail","symbol":["f",10,50],"scope":[1,"class C:"]}]}]});
        let text = render("search", &v, 6000).unwrap();
        assert!(text.contains("score=0.123456789"));
        assert!(text.contains("Function f L10-L50 (extent; body below may be partial)"));
        assert!(text.contains("7 | # docs\n8 | # detail"));
    }
    #[test]
    fn budgeted_read_remains_an_exact_prefix_and_marks_its_new_extent() {
        let source = (0..80)
            .map(|i| format!(" let line{i} = \"café\";"))
            .collect::<Vec<_>>()
            .join("\n");
        let mut v = json!({"snippet":{"path":"a.rs","start_line":1,"end_line":80,"text":source},"source_hash":"abc","truncated":false});
        fit_read(&mut v, 700);
        assert!(render("read", &v, 700).unwrap().len() < 700);
        assert_eq!(v["truncated"], true);
        assert!(source.starts_with(v["snippet"]["text"].as_str().unwrap()));
        assert_eq!(
            v["snippet"]["text"].as_str().unwrap().split('\n').count() as u64,
            v["snippet"]["end_line"].as_u64().unwrap()
        );
    }
    #[test]
    fn grep_groups_exact_overlapping_context_without_losing_hits() {
        let v = json!({"results":[
            {"path":"a.rs","line":3,"snippet":{"start_line":2,"end_line":4,"text":"two\nthree\nfour"}},
            {"path":"a.rs","line":4,"snippet":{"start_line":3,"end_line":5,"text":"three\nfour\nfive"}}
        ]});
        let text = render("grep", &v, 6000).unwrap();
        assert!(text.contains("hits L3, L4"));
        assert_eq!(text.matches("3 |three").count(), 1);
        assert!(text.contains("2 |two\n3 |three\n4 |four\n5 |five"));
    }
    #[test]
    fn selected_read_keeps_definition_and_requested_extent_separate_from_output() {
        let mut value = json!({"selection":{"status":"selected","symbol":["execute",10,200],"requested_lines":[20,80],"scope":[20,80]},"snippet":{"path":"a.py","start_line":20,"end_line":80,"text":(20..=80).map(|n|format!("    source_{n} = '中😀';")).collect::<Vec<_>>().join("\n")},"source_hash":"abc","total_lines":300,"truncated":false});
        fit_read(&mut value, 650);
        let rendered = render("read", &value, 650).unwrap();
        assert!(rendered.contains("Function execute L10-L200 (definition extent)"));
        assert!(rendered.contains("Selected source L20-L80"));
        assert!(rendered.contains("end=80)"));
        assert_eq!(value["selection"]["requested_lines"], json!([20, 80]));
        assert!(value["snippet"]["end_line"].as_u64().unwrap() < 80);
        assert!(value["snippet"]["text"]
            .as_str()
            .unwrap()
            .starts_with("    source_20 = '中😀';"));
    }
}
