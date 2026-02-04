//! Explanation Generation (P6)
//!
//! Generates human-readable explanations and UI tags from evidence.

use super::types::{Evidence, EvidenceTag, EvidenceType, PathPart};

/// Generate a human-readable explanation from evidence
pub fn explain_evidence(evidence: &[Evidence], score: f32) -> String {
    if evidence.is_empty() {
        return format!(
            "Score: {:.0}% (no detailed evidence available)",
            score * 100.0
        );
    }

    let mut parts = Vec::new();

    // Group and summarize each evidence type
    for e in evidence {
        match e {
            Evidence::Lexical {
                terms, tf_score, ..
            } => {
                if *tf_score > 0.7 {
                    parts.push(format!("Strong keyword match: {}", terms.join(", ")));
                } else if *tf_score > 0.4 {
                    parts.push(format!("Contains: {}", terms.join(", ")));
                } else {
                    parts.push(format!("Mentions: {}", terms.join(", ")));
                }
            }
            Evidence::Semantic {
                similarity,
                concepts,
                ..
            } => {
                let pct = (*similarity * 100.0) as u32;
                if !concepts.is_empty() {
                    parts.push(format!(
                        "{}% semantic similarity ({})",
                        pct,
                        concepts.join(", ")
                    ));
                } else if *similarity > 0.8 {
                    parts.push(format!("High semantic similarity ({}%)", pct));
                } else if *similarity > 0.6 {
                    parts.push(format!("Good semantic match ({}%)", pct));
                } else {
                    parts.push(format!("Semantic similarity: {}%", pct));
                }
            }
            Evidence::AskModeTrust {
                anchor_coverage,
                matched_anchors,
                ..
            } => {
                if matched_anchors.is_empty() {
                    parts.push("Trusted snippet".to_string());
                } else {
                    parts.push(format!(
                        "Trusted snippet (anchors: {})",
                        matched_anchors.join(", ")
                    ));
                }
                if *anchor_coverage > 0.0 {
                    parts.push(format!("Anchor coverage: {:.0}%", anchor_coverage * 100.0));
                }
            }
            Evidence::PathMatch {
                tokens,
                matched_parts,
                ..
            } => {
                let parts_desc: Vec<&str> = matched_parts
                    .iter()
                    .map(|p| match p {
                        PathPart::Filename => "filename",
                        PathPart::Extension => "extension",
                        PathPart::Parent => "folder",
                        PathPart::Grandparent => "parent folder",
                        PathPart::PathSubstring => "path",
                    })
                    .collect();

                if tokens.len() > 2 {
                    parts.push(format!(
                        "Path matches: {} in {}",
                        tokens.join(", "),
                        parts_desc.join("/")
                    ));
                } else {
                    parts.push(format!("Path contains: {}", tokens.join(", ")));
                }
            }
            Evidence::DirectoryContext {
                is_hot,
                centroid_similarity,
                directory_theme,
                ..
            } => {
                if *is_hot {
                    parts.push("Located in frequently accessed folder".to_string());
                }
                if *centroid_similarity > 0.7 {
                    if let Some(theme) = directory_theme {
                        parts.push(format!("Folder theme: {}", theme));
                    } else {
                        parts.push("Related to other files in folder".to_string());
                    }
                }
            }
            Evidence::Temporal {
                age_seconds,
                recently_created,
                ..
            } => {
                if *recently_created {
                    parts.push("Recently created".to_string());
                } else if *age_seconds < 3600 {
                    parts.push("Modified within the last hour".to_string());
                } else if *age_seconds < 86400 {
                    parts.push("Modified today".to_string());
                } else if *age_seconds < 604800 {
                    parts.push("Modified this week".to_string());
                }
            }
            Evidence::Behavioral {
                in_recent_results,
                access_score,
                ..
            } => {
                if *in_recent_results {
                    parts.push("Previously found in your searches".to_string());
                } else if *access_score > 0.7 {
                    parts.push("Frequently accessed file".to_string());
                }
            }
            Evidence::Project {
                project_type,
                project_name,
                ..
            } => {
                let type_str = match project_type {
                    super::types::ProjectType::Git => "Git",
                    super::types::ProjectType::Rust => "Rust",
                    super::types::ProjectType::Node => "Node.js",
                    super::types::ProjectType::Python => "Python",
                    super::types::ProjectType::Go => "Go",
                    super::types::ProjectType::Maven => "Maven",
                    super::types::ProjectType::Gradle => "Gradle",
                    super::types::ProjectType::DotNet => ".NET",
                    super::types::ProjectType::Other(s) => s.as_str(),
                };
                if let Some(name) = project_name {
                    parts.push(format!("In {} project: {}", type_str, name));
                } else {
                    parts.push(format!("In {} project", type_str));
                }
            }
        }
    }

    if parts.is_empty() {
        return format!("Score: {:.0}%", score * 100.0);
    }

    parts.join(" | ")
}

/// Generate a short explanation (for compact display)
pub fn explain_short(evidence: &[Evidence]) -> String {
    if evidence.is_empty() {
        return String::new();
    }

    // Find the strongest evidence
    let strongest = evidence.iter().max_by(|a, b| {
        a.contribution_score()
            .partial_cmp(&b.contribution_score())
            .unwrap()
    });

    match strongest {
        Some(e) => e.summary(),
        None => String::new(),
    }
}

/// Generate UI tags from evidence
pub fn generate_tags_from_evidence(evidence: &[Evidence]) -> Vec<EvidenceTag> {
    let mut tags = Vec::new();

    for e in evidence {
        match e {
            Evidence::Lexical {
                terms, tf_score, ..
            } => {
                if *tf_score > 0.3 {
                    tags.push(EvidenceTag::lexical(terms, *tf_score));
                }
            }
            Evidence::Semantic { similarity, .. } => {
                if *similarity > 0.5 {
                    tags.push(EvidenceTag::semantic(*similarity));
                }
            }
            Evidence::AskModeTrust {
                anchor_coverage,
                matched_anchors,
                ..
            } => {
                if *anchor_coverage > 0.0 {
                    tags.push(EvidenceTag::ask_mode_trust(
                        matched_anchors,
                        *anchor_coverage,
                    ));
                }
            }
            Evidence::PathMatch { matched_parts, .. } => {
                if !matched_parts.is_empty() {
                    tags.push(EvidenceTag::path_match(matched_parts));
                }
            }
            Evidence::DirectoryContext { is_hot, .. } => {
                if *is_hot {
                    tags.push(EvidenceTag::hot_folder());
                }
            }
            Evidence::Temporal { age_seconds, .. } => {
                if *age_seconds < 604800 {
                    // Within a week
                    tags.push(EvidenceTag::recent(*age_seconds));
                }
            }
            Evidence::Behavioral {
                in_recent_results, ..
            } => {
                if *in_recent_results {
                    tags.push(EvidenceTag {
                        tag_type: EvidenceType::Behavioral,
                        label: "Viewed".into(),
                        tooltip: "You've viewed this file recently".into(),
                        strength: 0.3,
                        color: Some("#94a3b8".into()),
                    });
                }
            }
            Evidence::Project {
                project_type,
                project_name,
                locality_boost,
                ..
            } => {
                if *locality_boost > 0.2 {
                    tags.push(EvidenceTag::project(project_type, project_name.as_deref()));
                }
            }
        }
    }

    // Sort tags by strength (strongest first)
    tags.sort_by(|a, b| b.strength.partial_cmp(&a.strength).unwrap());

    // Limit to top 4 tags for clean UI
    tags.truncate(4);

    tags
}

/// Convenience function for external use
pub fn explain(evidence: &[Evidence], score: f32) -> String {
    explain_evidence(evidence, score)
}

/// Generate tags (convenience wrapper)
pub fn generate_tags(evidence: &[Evidence]) -> Vec<EvidenceTag> {
    generate_tags_from_evidence(evidence)
}

/// Format evidence for CLI display
pub fn format_for_cli(evidence: &[Evidence], score: f32) -> String {
    let mut lines = Vec::new();

    lines.push(format!("  Score: {:.1}%", score * 100.0));

    for e in evidence {
        match e {
            Evidence::Lexical {
                terms,
                snippet,
                line_numbers,
                tf_score,
            } => {
                lines.push(format!(
                    "  [Lexical] Terms: {} (TF: {:.2})",
                    terms.join(", "),
                    tf_score
                ));
                if !snippet.is_empty() {
                    let short_snippet = if snippet.len() > 60 {
                        format!("{}...", &snippet[..60])
                    } else {
                        snippet.clone()
                    };
                    lines.push(format!("           Snippet: \"{}\"", short_snippet));
                }
                if !line_numbers.is_empty() {
                    lines.push(format!("           Lines: {:?}", line_numbers));
                }
            }
            Evidence::Semantic {
                similarity,
                best_chunk,
                concepts,
                ..
            } => {
                lines.push(format!(
                    "  [Semantic] Similarity: {:.1}%",
                    similarity * 100.0
                ));
                if !concepts.is_empty() {
                    lines.push(format!("            Concepts: {}", concepts.join(", ")));
                }
                if !best_chunk.is_empty() {
                    let short = if best_chunk.len() > 60 {
                        format!("{}...", &best_chunk[..60])
                    } else {
                        best_chunk.clone()
                    };
                    lines.push(format!("            Best match: \"{}\"", short));
                }
            }
            Evidence::AskModeTrust {
                anchor_coverage,
                matched_anchors,
                why_matched,
            } => {
                lines.push(format!(
                    "  [AskMode] Anchors: {} (coverage: {:.0}%)",
                    if matched_anchors.is_empty() {
                        "none".into()
                    } else {
                        matched_anchors.join(", ")
                    },
                    anchor_coverage * 100.0
                ));
                if !why_matched.is_empty() {
                    lines.push(format!("            {}", why_matched));
                }
            }
            Evidence::PathMatch {
                tokens,
                matched_parts,
                path_score,
            } => {
                let parts_str: Vec<&str> = matched_parts
                    .iter()
                    .map(|p| match p {
                        PathPart::Filename => "filename",
                        PathPart::Extension => "ext",
                        PathPart::Parent => "parent",
                        PathPart::Grandparent => "grandparent",
                        PathPart::PathSubstring => "path",
                    })
                    .collect();
                lines.push(format!(
                    "  [Path] Tokens: {} in {} (score: {:.2})",
                    tokens.join(", "),
                    parts_str.join("/"),
                    path_score
                ));
            }
            Evidence::DirectoryContext {
                is_hot,
                centroid_similarity,
                directory_theme,
                ..
            } => {
                let mut parts = Vec::new();
                if *is_hot {
                    parts.push("hot folder".to_string());
                }
                if *centroid_similarity > 0.5 {
                    parts.push(format!("centroid sim: {:.1}%", centroid_similarity * 100.0));
                }
                if let Some(theme) = directory_theme {
                    parts.push(theme.clone());
                }
                if !parts.is_empty() {
                    lines.push(format!("  [Directory] {}", parts.join(", ")));
                }
            }
            Evidence::Temporal {
                age_seconds,
                recently_created,
                recency_boost,
            } => {
                let age_str = humanize_age(*age_seconds);
                let created = if *recently_created {
                    " (recently created)"
                } else {
                    ""
                };
                lines.push(format!(
                    "  [Temporal] Age: {}{} (boost: {:.2})",
                    age_str, created, recency_boost
                ));
            }
            Evidence::Behavioral {
                in_recent_results,
                access_score,
                co_occurrence_score,
            } => {
                let mut parts = Vec::new();
                if *in_recent_results {
                    parts.push("in recent results".to_string());
                }
                if *access_score > 0.3 {
                    parts.push(format!("access: {:.2}", access_score));
                }
                if *co_occurrence_score > 0.3 {
                    parts.push(format!("co-occur: {:.2}", co_occurrence_score));
                }
                if !parts.is_empty() {
                    lines.push(format!("  [Behavior] {}", parts.join(", ")));
                }
            }
            Evidence::Project {
                project_type,
                project_name,
                depth_from_root,
                locality_boost,
            } => {
                let type_str = match project_type {
                    super::types::ProjectType::Git => "Git",
                    super::types::ProjectType::Rust => "Rust",
                    super::types::ProjectType::Node => "Node.js",
                    super::types::ProjectType::Python => "Python",
                    super::types::ProjectType::Go => "Go",
                    super::types::ProjectType::Maven => "Maven",
                    super::types::ProjectType::Gradle => "Gradle",
                    super::types::ProjectType::DotNet => ".NET",
                    super::types::ProjectType::Other(s) => s.as_str(),
                };
                let name = project_name.as_deref().unwrap_or("unknown");
                lines.push(format!(
                    "  [Project] {}: {} (depth: {}, boost: {:.2})",
                    type_str, name, depth_from_root, locality_boost
                ));
            }
        }
    }

    lines.join("\n")
}

fn humanize_age(seconds: u64) -> String {
    if seconds < 60 {
        format!("{}s", seconds)
    } else if seconds < 3600 {
        format!("{}m", seconds / 60)
    } else if seconds < 86400 {
        format!("{}h", seconds / 3600)
    } else {
        format!("{}d", seconds / 86400)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_explain_lexical() {
        let evidence = vec![Evidence::Lexical {
            terms: vec!["test".into(), "query".into()],
            snippet: "test content".into(),
            line_numbers: vec![1, 5],
            tf_score: 0.8,
        }];

        let explanation = explain_evidence(&evidence, 0.85);
        assert!(explanation.contains("test"));
        assert!(explanation.contains("query"));
    }

    #[test]
    fn test_explain_semantic() {
        let evidence = vec![Evidence::Semantic {
            similarity: 0.85,
            best_chunk: "semantic content".into(),
            chunk_offset: 0,
            concepts: vec!["AI".into()],
        }];

        let explanation = explain_evidence(&evidence, 0.85);
        assert!(explanation.contains("85%"));
        assert!(explanation.contains("AI"));
    }

    #[test]
    fn test_generate_tags() {
        let evidence = vec![
            Evidence::Lexical {
                terms: vec!["test".into()],
                snippet: "".into(),
                line_numbers: vec![],
                tf_score: 0.7,
            },
            Evidence::Semantic {
                similarity: 0.8,
                best_chunk: "".into(),
                chunk_offset: 0,
                concepts: vec![],
            },
        ];

        let tags = generate_tags_from_evidence(&evidence);
        assert!(tags.len() >= 2);
    }

    #[test]
    fn test_explain_short() {
        let evidence = vec![Evidence::Semantic {
            similarity: 0.9,
            best_chunk: "".into(),
            chunk_offset: 0,
            concepts: vec![],
        }];

        let short = explain_short(&evidence);
        assert!(short.contains("90%"));
    }

    #[test]
    fn test_format_for_cli() {
        let evidence = vec![Evidence::Lexical {
            terms: vec!["test".into()],
            snippet: "test snippet".into(),
            line_numbers: vec![1],
            tf_score: 0.6,
        }];

        let cli = format_for_cli(&evidence, 0.75);
        assert!(cli.contains("[Lexical]"));
        assert!(cli.contains("Score: 75"));
    }
}
