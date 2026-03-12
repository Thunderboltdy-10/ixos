use super::{Workstream, WorkstreamManager};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

/// Lightweight graph used to show how workstreams relate to each other.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct WorkstreamGraph {
    pub focus_workstream_id: Option<String>,
    pub nodes: Vec<WorkstreamGraphNode>,
    pub edges: Vec<WorkstreamGraphEdge>,
}

/// Graph node representing one workstream.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkstreamGraphNode {
    pub id: String,
    pub name: String,
    pub last_active: u64,
    pub event_count: usize,
    pub is_pinned: bool,
    pub is_auto: bool,
}

/// Graph edge describing why two workstreams are related.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkstreamGraphEdge {
    pub source_id: String,
    pub target_id: String,
    pub weight: f32,
    pub shared_files: Vec<String>,
    pub shared_folders: Vec<String>,
    pub shared_query_count: u32,
    pub reason: String,
}

impl WorkstreamManager {
    /// Build a neighborhood graph around a workstream, or a recent graph when no focus is given.
    pub fn build_graph(&self, focus_id: Option<&str>, limit: usize) -> WorkstreamGraph {
        let limit = limit.max(1);
        let mut recent = self.list(Some(limit.saturating_mul(3)), Some(0));
        if let Some(focus_id) = focus_id {
            let has_focus = recent.iter().any(|workstream| workstream.id == focus_id);
            if !has_focus {
                if let Some(workstream) = self.get(focus_id) {
                    recent.push(workstream);
                }
            }
        }
        if recent.is_empty() {
            return WorkstreamGraph {
                focus_workstream_id: focus_id.map(ToOwned::to_owned),
                nodes: Vec::new(),
                edges: Vec::new(),
            };
        }

        let mut weighted_edges: Vec<(f32, &Workstream, &Workstream, WorkstreamGraphEdge)> =
            Vec::new();
        for i in 0..recent.len() {
            for j in (i + 1)..recent.len() {
                if let Some(edge) = build_edge(recent[i], recent[j]) {
                    weighted_edges.push((edge.weight, recent[i], recent[j], edge));
                }
            }
        }

        let selected_ids: HashSet<String> = if let Some(focus_id) = focus_id {
            let mut ids = HashSet::from([focus_id.to_string()]);
            weighted_edges.sort_by(|a, b| b.0.total_cmp(&a.0));
            for (_, left, right, _) in &weighted_edges {
                if left.id == focus_id || right.id == focus_id {
                    ids.insert(left.id.clone());
                    ids.insert(right.id.clone());
                    if ids.len() >= limit {
                        break;
                    }
                }
            }
            ids
        } else {
            recent
                .iter()
                .take(limit)
                .map(|workstream| workstream.id.clone())
                .collect()
        };

        let mut node_refs: Vec<&Workstream> = recent
            .iter()
            .filter(|workstream| selected_ids.contains(&workstream.id))
            .copied()
            .collect();
        if let Some(focus_id) = focus_id {
            node_refs.sort_by_key(|workstream| {
                (
                    workstream.id != focus_id,
                    std::cmp::Reverse(workstream.last_active),
                )
            });
        }
        let nodes: Vec<WorkstreamGraphNode> = node_refs
            .into_iter()
            .take(limit)
            .map(|workstream| WorkstreamGraphNode {
                id: workstream.id.clone(),
                name: workstream.name.clone(),
                last_active: workstream.last_active,
                event_count: workstream.event_count(),
                is_pinned: workstream.is_pinned,
                is_auto: workstream.is_auto,
            })
            .collect();

        let node_ids: HashSet<&str> = nodes.iter().map(|node| node.id.as_str()).collect();
        let mut edges: Vec<WorkstreamGraphEdge> = weighted_edges
            .into_iter()
            .map(|(_, _, _, edge)| edge)
            .filter(|edge| {
                node_ids.contains(edge.source_id.as_str())
                    && node_ids.contains(edge.target_id.as_str())
            })
            .collect();
        edges.sort_by(|a, b| b.weight.total_cmp(&a.weight));
        edges.truncate(limit.saturating_mul(2));

        WorkstreamGraph {
            focus_workstream_id: focus_id.map(ToOwned::to_owned),
            nodes,
            edges,
        }
    }
}

fn build_edge(left: &Workstream, right: &Workstream) -> Option<WorkstreamGraphEdge> {
    let shared_files = shared_ranked_labels(&left.top_files, &right.top_files, 3);
    let shared_folders = shared_ranked_labels(&left.top_folders, &right.top_folders, 3);
    let shared_query_count = shared_ranked_count(&left.top_queries, &right.top_queries);

    let time_gap_ms = left.last_active.abs_diff(right.last_active);
    let temporal_score = if time_gap_ms <= 6 * 60 * 60 * 1000 {
        0.35
    } else if time_gap_ms <= 24 * 60 * 60 * 1000 {
        0.2
    } else if time_gap_ms <= 72 * 60 * 60 * 1000 {
        0.1
    } else {
        0.0
    };
    let weight = shared_files.len() as f32 * 0.45
        + shared_folders.len() as f32 * 0.2
        + shared_query_count as f32 * 0.08
        + temporal_score;

    if weight < 0.25 {
        return None;
    }

    let reason = if !shared_files.is_empty() {
        format!("Shared files: {}", shared_files.join(", "))
    } else if !shared_folders.is_empty() {
        format!("Shared folders: {}", shared_folders.join(", "))
    } else if shared_query_count > 0 {
        format!("{} repeated query overlaps", shared_query_count)
    } else {
        "Recent adjacent sessions".to_string()
    };

    Some(WorkstreamGraphEdge {
        source_id: left.id.clone(),
        target_id: right.id.clone(),
        weight: weight.clamp(0.0, 1.0),
        shared_files,
        shared_folders,
        shared_query_count,
        reason,
    })
}

fn shared_ranked_labels(
    left: &[(String, u32)],
    right: &[(String, u32)],
    limit: usize,
) -> Vec<String> {
    let right_labels: HashSet<&str> = right.iter().map(|(label, _)| label.as_str()).collect();
    left.iter()
        .filter(|(label, _)| right_labels.contains(label.as_str()))
        .map(|(label, _)| label.clone())
        .take(limit)
        .collect()
}

fn shared_ranked_count(left: &[(String, u32)], right: &[(String, u32)]) -> u32 {
    let right_labels: HashSet<&str> = right.iter().map(|(label, _)| label.as_str()).collect();
    left.iter()
        .filter(|(label, _)| right_labels.contains(label.as_str()))
        .count() as u32
}
