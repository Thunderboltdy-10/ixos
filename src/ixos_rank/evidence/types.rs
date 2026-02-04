//! Evidence Types (P6)
//!
//! Core types for the evidence engine.

use serde::{Deserialize, Serialize};

/// Type of evidence that contributed to a match
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum EvidenceType {
    /// Lexical keyword match
    Lexical,
    /// Semantic similarity match
    Semantic,
    /// Ask Mode trusted snippet
    AskModeTrust,
    /// Path/filename match
    PathMatch,
    /// Directory context (hot folder, related files)
    DirectoryContext,
    /// Temporal recency boost
    Temporal,
    /// User behavior pattern
    Behavioral,
    /// Project context (detected project root)
    ProjectContext,
}

/// Detected project type based on marker files
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum ProjectType {
    /// Git repository (.git directory)
    Git,
    /// Rust project (Cargo.toml)
    Rust,
    /// Node.js project (package.json)
    Node,
    /// Python project (pyproject.toml or setup.py)
    Python,
    /// Go project (go.mod)
    Go,
    /// Java/Maven project (pom.xml)
    Maven,
    /// Java/Gradle project (build.gradle)
    Gradle,
    /// .NET project (*.csproj or *.sln)
    DotNet,
    /// Unknown project type
    Other(String),
}

/// Detected project context for a file
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectContext {
    /// Project root directory
    pub root: std::path::PathBuf,
    /// Detected project type
    pub project_type: ProjectType,
    /// Depth from project root (0 = at root)
    pub depth_from_root: usize,
    /// Project name (from manifest if available)
    pub project_name: Option<String>,
}

/// Evidence piece explaining why a result matched
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum Evidence {
    /// Lexical keyword match evidence
    Lexical {
        /// Matched terms
        terms: Vec<String>,
        /// Snippet showing the match
        snippet: String,
        /// Line numbers where matches occurred
        line_numbers: Vec<usize>,
        /// Term frequency score
        tf_score: f32,
    },

    /// Semantic similarity evidence
    Semantic {
        /// Cosine similarity score
        similarity: f32,
        /// Best matching chunk/passage
        best_chunk: String,
        /// Chunk position in file (byte offset)
        chunk_offset: usize,
        /// Semantic concepts identified
        concepts: Vec<String>,
    },

    /// Ask Mode trusted snippet evidence
    AskModeTrust {
        /// Anchor coverage ratio (0-1)
        anchor_coverage: f32,
        /// Anchors matched in the trusted snippet
        matched_anchors: Vec<String>,
        /// Human-readable reason for trust
        why_matched: String,
    },

    /// Path/filename match evidence
    PathMatch {
        /// Matched tokens from path
        tokens: Vec<String>,
        /// Which parts matched (filename, parent, grandparent)
        matched_parts: Vec<PathPart>,
        /// BM25-ish score for path
        path_score: f32,
    },

    /// Directory context evidence
    DirectoryContext {
        /// Whether this directory is "hot" (frequently accessed)
        is_hot: bool,
        /// Similarity to directory centroid
        centroid_similarity: f32,
        /// Number of related files in same directory
        related_file_count: usize,
        /// Directory semantic theme (if detected)
        directory_theme: Option<String>,
    },

    /// Temporal recency evidence
    Temporal {
        /// Recency boost factor
        recency_boost: f32,
        /// Time since last modification
        age_seconds: u64,
        /// Whether recently created
        recently_created: bool,
    },

    /// Behavioral evidence (user patterns)
    Behavioral {
        /// Access frequency score
        access_score: f32,
        /// Whether part of recent search results
        in_recent_results: bool,
        /// Co-occurrence with other results
        co_occurrence_score: f32,
    },

    /// Project context evidence
    Project {
        /// Detected project type
        project_type: ProjectType,
        /// Depth from project root
        depth_from_root: usize,
        /// Project name (if detected)
        project_name: Option<String>,
        /// Locality boost (files in same project get boosted)
        locality_boost: f32,
    },
}

/// Part of a file path that matched
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum PathPart {
    /// Filename without extension
    Filename,
    /// File extension
    Extension,
    /// Parent directory name
    Parent,
    /// Grandparent directory name
    Grandparent,
    /// Full path substring
    PathSubstring,
}

/// Tag for UI display of evidence
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvidenceTag {
    /// Tag type for styling
    pub tag_type: EvidenceType,
    /// Short label (e.g., "Keywords: X,Y")
    pub label: String,
    /// Detailed tooltip text
    pub tooltip: String,
    /// Confidence/strength (0-1)
    pub strength: f32,
    /// Color hint for UI (optional)
    pub color: Option<String>,
}

impl std::fmt::Display for EvidenceTag {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.label)
    }
}

impl Evidence {
    /// Get the primary type of this evidence
    pub fn evidence_type(&self) -> EvidenceType {
        match self {
            Evidence::Lexical { .. } => EvidenceType::Lexical,
            Evidence::Semantic { .. } => EvidenceType::Semantic,
            Evidence::AskModeTrust { .. } => EvidenceType::AskModeTrust,
            Evidence::PathMatch { .. } => EvidenceType::PathMatch,
            Evidence::DirectoryContext { .. } => EvidenceType::DirectoryContext,
            Evidence::Temporal { .. } => EvidenceType::Temporal,
            Evidence::Behavioral { .. } => EvidenceType::Behavioral,
            Evidence::Project { .. } => EvidenceType::ProjectContext,
        }
    }

    /// Get the contribution score of this evidence
    pub fn contribution_score(&self) -> f32 {
        match self {
            Evidence::Lexical { tf_score, .. } => *tf_score,
            Evidence::Semantic { similarity, .. } => *similarity,
            Evidence::AskModeTrust {
                anchor_coverage, ..
            } => *anchor_coverage,
            Evidence::PathMatch { path_score, .. } => *path_score,
            Evidence::DirectoryContext {
                centroid_similarity,
                is_hot,
                ..
            } => {
                let hot_bonus = if *is_hot { 0.2 } else { 0.0 };
                *centroid_similarity + hot_bonus
            }
            Evidence::Temporal { recency_boost, .. } => *recency_boost,
            Evidence::Behavioral { access_score, .. } => *access_score,
            Evidence::Project { locality_boost, .. } => *locality_boost,
        }
    }

    /// Get a short summary of this evidence
    pub fn summary(&self) -> String {
        match self {
            Evidence::Lexical { terms, .. } => {
                if terms.len() <= 3 {
                    format!("Keywords: {}", terms.join(", "))
                } else {
                    format!(
                        "Keywords: {}, +{} more",
                        terms[..3].join(", "),
                        terms.len() - 3
                    )
                }
            }
            Evidence::Semantic { similarity, .. } => {
                format!("Semantic: {:.0}%", similarity * 100.0)
            }
            Evidence::AskModeTrust {
                matched_anchors, ..
            } => {
                if matched_anchors.is_empty() {
                    "Trusted snippet".into()
                } else {
                    format!("Trusted: {}", matched_anchors.join(", "))
                }
            }
            Evidence::PathMatch { tokens, .. } => {
                format!("Path: {}", tokens.join("/"))
            }
            Evidence::DirectoryContext { is_hot, .. } => {
                if *is_hot {
                    "Hot folder".into()
                } else {
                    "Related context".into()
                }
            }
            Evidence::Temporal {
                recently_created, ..
            } => {
                if *recently_created {
                    "Recently created".into()
                } else {
                    "Recently modified".into()
                }
            }
            Evidence::Behavioral {
                in_recent_results, ..
            } => {
                if *in_recent_results {
                    "Previously viewed".into()
                } else {
                    "Frequently accessed".into()
                }
            }
            Evidence::Project {
                project_type,
                project_name,
                ..
            } => {
                let type_str = match project_type {
                    ProjectType::Git => "Git",
                    ProjectType::Rust => "Rust",
                    ProjectType::Node => "Node.js",
                    ProjectType::Python => "Python",
                    ProjectType::Go => "Go",
                    ProjectType::Maven => "Maven",
                    ProjectType::Gradle => "Gradle",
                    ProjectType::DotNet => ".NET",
                    ProjectType::Other(s) => s.as_str(),
                };
                if let Some(name) = project_name {
                    format!("{} project: {}", type_str, name)
                } else {
                    format!("{} project", type_str)
                }
            }
        }
    }
}

impl EvidenceTag {
    /// Create a lexical evidence tag
    pub fn lexical(terms: &[String], strength: f32) -> Self {
        let label = if terms.len() <= 2 {
            format!("Keywords: {}", terms.join(", "))
        } else {
            format!("{} keywords", terms.len())
        };
        Self {
            tag_type: EvidenceType::Lexical,
            label,
            tooltip: format!("Matched terms: {}", terms.join(", ")),
            strength,
            color: Some("#2dd4bf".into()), // teal
        }
    }

    /// Create a semantic evidence tag
    pub fn semantic(similarity: f32) -> Self {
        Self {
            tag_type: EvidenceType::Semantic,
            label: format!("Semantic: {:.0}%", similarity * 100.0),
            tooltip: format!("Content meaning similarity: {:.1}%", similarity * 100.0),
            strength: similarity,
            color: Some("#38bdf8".into()), // cyan
        }
    }

    /// Create an Ask Mode trust tag
    pub fn ask_mode_trust(matched_anchors: &[String], strength: f32) -> Self {
        let label = if matched_anchors.is_empty() {
            "Trusted snippet".into()
        } else if matched_anchors.len() <= 2 {
            format!("Anchors: {}", matched_anchors.join(", "))
        } else {
            format!("Anchors: {}+", matched_anchors.len())
        };
        Self {
            tag_type: EvidenceType::AskModeTrust,
            label,
            tooltip: format!(
                "Trusted snippet matched anchors: {}",
                matched_anchors.join(", ")
            ),
            strength,
            color: Some("#f59e0b".into()), // amber
        }
    }

    /// Create a path match tag
    pub fn path_match(parts: &[PathPart]) -> Self {
        let parts_str: Vec<&str> = parts
            .iter()
            .map(|p| match p {
                PathPart::Filename => "filename",
                PathPart::Extension => "extension",
                PathPart::Parent => "folder",
                PathPart::Grandparent => "parent folder",
                PathPart::PathSubstring => "path",
            })
            .collect();
        Self {
            tag_type: EvidenceType::PathMatch,
            label: format!("Path: {}", parts_str.join(", ")),
            tooltip: format!("Path components matched: {}", parts_str.join(", ")),
            strength: 0.5,
            color: Some("#a78bfa".into()), // purple
        }
    }

    /// Create a hot folder tag
    pub fn hot_folder() -> Self {
        Self {
            tag_type: EvidenceType::DirectoryContext,
            label: "Hot folder".into(),
            tooltip: "This folder contains frequently accessed files".into(),
            strength: 0.7,
            color: Some("#fb923c".into()), // orange
        }
    }

    /// Create a recency tag
    pub fn recent(age_seconds: u64) -> Self {
        let label = if age_seconds < 3600 {
            "Recently modified".into()
        } else if age_seconds < 86400 {
            "Modified today".into()
        } else {
            "Modified this week".into()
        };
        Self {
            tag_type: EvidenceType::Temporal,
            label,
            tooltip: format!("Last modified {} ago", humanize_duration(age_seconds)),
            strength: 0.3,
            color: Some("#4ade80".into()), // green
        }
    }

    /// Create a project context tag
    pub fn project(project_type: &ProjectType, project_name: Option<&str>) -> Self {
        let type_str = match project_type {
            ProjectType::Git => "Git",
            ProjectType::Rust => "Rust",
            ProjectType::Node => "Node.js",
            ProjectType::Python => "Python",
            ProjectType::Go => "Go",
            ProjectType::Maven => "Maven",
            ProjectType::Gradle => "Gradle",
            ProjectType::DotNet => ".NET",
            ProjectType::Other(s) => s.as_str(),
        };
        let label = if let Some(name) = project_name {
            format!("{}: {}", type_str, name)
        } else {
            format!("{} project", type_str)
        };
        Self {
            tag_type: EvidenceType::ProjectContext,
            label,
            tooltip: format!("File is part of a {} project", type_str),
            strength: 0.4,
            color: Some("#f472b6".into()), // pink
        }
    }
}

/// Detect the project root for a given file path
///
/// Walks up the directory tree looking for project markers like:
/// - .git (Git repository)
/// - Cargo.toml (Rust project)
/// - package.json (Node.js project)
/// - pyproject.toml or setup.py (Python project)
/// - go.mod (Go project)
/// - pom.xml (Maven project)
/// - build.gradle (Gradle project)
/// - *.csproj or *.sln (.NET project)
pub fn detect_project_root(path: &std::path::Path) -> Option<ProjectContext> {
    use std::path::Path;

    // Markers and their corresponding project types
    let markers: &[(&str, ProjectType, bool)] = &[
        (".git", ProjectType::Git, true),         // is_dir = true
        ("Cargo.toml", ProjectType::Rust, false), // is_dir = false
        ("package.json", ProjectType::Node, false),
        ("pyproject.toml", ProjectType::Python, false),
        ("setup.py", ProjectType::Python, false),
        ("go.mod", ProjectType::Go, false),
        ("pom.xml", ProjectType::Maven, false),
        ("build.gradle", ProjectType::Gradle, false),
        ("build.gradle.kts", ProjectType::Gradle, false),
    ];

    let mut current = path.parent()?;
    let mut depth = 0usize;

    // Walk up to 20 directories max
    for _ in 0..20 {
        for (marker, project_type, is_dir) in markers {
            let marker_path = current.join(marker);
            let exists = if *is_dir {
                marker_path.is_dir()
            } else {
                marker_path.is_file()
            };

            if exists {
                // Try to extract project name
                let project_name = extract_project_name(current, project_type);

                return Some(ProjectContext {
                    root: current.to_path_buf(),
                    project_type: project_type.clone(),
                    depth_from_root: depth,
                    project_name,
                });
            }
        }

        // Check for .NET projects (*.csproj or *.sln)
        if let Ok(entries) = std::fs::read_dir(current) {
            for entry in entries.flatten() {
                let name = entry.file_name();
                let name_str = name.to_string_lossy();
                if name_str.ends_with(".csproj") || name_str.ends_with(".sln") {
                    let project_name = Path::new(&*name_str)
                        .file_stem()
                        .map(|s| s.to_string_lossy().to_string());

                    return Some(ProjectContext {
                        root: current.to_path_buf(),
                        project_type: ProjectType::DotNet,
                        depth_from_root: depth,
                        project_name,
                    });
                }
            }
        }

        current = current.parent()?;
        depth += 1;
    }

    None
}

/// Extract project name from manifest files
fn extract_project_name(root: &std::path::Path, project_type: &ProjectType) -> Option<String> {
    match project_type {
        ProjectType::Rust => {
            // Read name from Cargo.toml
            let cargo_path = root.join("Cargo.toml");
            if let Ok(content) = std::fs::read_to_string(&cargo_path) {
                // Simple parsing - look for name = "..."
                for line in content.lines() {
                    let trimmed = line.trim();
                    if trimmed.starts_with("name") && trimmed.contains('=') {
                        if let Some(name) = trimmed.split('=').nth(1) {
                            let name = name.trim().trim_matches('"').trim_matches('\'');
                            if !name.is_empty() {
                                return Some(name.to_string());
                            }
                        }
                    }
                }
            }
        }
        ProjectType::Node => {
            // Read name from package.json
            let pkg_path = root.join("package.json");
            if let Ok(content) = std::fs::read_to_string(&pkg_path) {
                // Simple parsing - look for "name": "..."
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                    if let Some(name) = json.get("name").and_then(|n| n.as_str()) {
                        return Some(name.to_string());
                    }
                }
            }
        }
        ProjectType::Python => {
            // Read name from pyproject.toml
            let pyproj_path = root.join("pyproject.toml");
            if let Ok(content) = std::fs::read_to_string(&pyproj_path) {
                for line in content.lines() {
                    let trimmed = line.trim();
                    if trimmed.starts_with("name") && trimmed.contains('=') {
                        if let Some(name) = trimmed.split('=').nth(1) {
                            let name = name.trim().trim_matches('"').trim_matches('\'');
                            if !name.is_empty() {
                                return Some(name.to_string());
                            }
                        }
                    }
                }
            }
        }
        ProjectType::Go => {
            // Read module name from go.mod
            let gomod_path = root.join("go.mod");
            if let Ok(content) = std::fs::read_to_string(&gomod_path) {
                for line in content.lines() {
                    if line.starts_with("module ") {
                        let module = line.trim_start_matches("module ").trim();
                        // Extract last path component
                        if let Some(name) = module.rsplit('/').next() {
                            return Some(name.to_string());
                        }
                    }
                }
            }
        }
        _ => {}
    }

    // Fallback: use directory name
    root.file_name().map(|n| n.to_string_lossy().to_string())
}

/// Convert seconds to human-readable duration
fn humanize_duration(seconds: u64) -> String {
    if seconds < 60 {
        format!("{} seconds", seconds)
    } else if seconds < 3600 {
        format!("{} minutes", seconds / 60)
    } else if seconds < 86400 {
        format!("{} hours", seconds / 3600)
    } else {
        format!("{} days", seconds / 86400)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_evidence_type() {
        let evidence = Evidence::Lexical {
            terms: vec!["test".into()],
            snippet: "test content".into(),
            line_numbers: vec![1],
            tf_score: 0.8,
        };
        assert_eq!(evidence.evidence_type(), EvidenceType::Lexical);
    }

    #[test]
    fn test_evidence_summary() {
        let evidence = Evidence::Semantic {
            similarity: 0.85,
            best_chunk: "test chunk".into(),
            chunk_offset: 0,
            concepts: vec![],
        };
        assert!(evidence.summary().contains("85%"));
    }

    #[test]
    fn test_evidence_tag_creation() {
        let tag = EvidenceTag::semantic(0.9);
        assert_eq!(tag.tag_type, EvidenceType::Semantic);
        assert!(tag.label.contains("90%"));
    }
}
