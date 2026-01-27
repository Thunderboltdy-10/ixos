//! P8: FSTD (Topology Distillation) re-ranking prior.
//!
//! Implements a lightweight directory topology embedding with a tiny MLP adapter.
//! The adapter predicts a topology coordinate from a query embedding; candidates
//! are re-ranked by distance to their directory's topology coordinate.

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::Arc;

const DEFAULT_TOPO_DIM: usize = 8;
const DEFAULT_HIDDEN_DIM: usize = 128;
const DEFAULT_WEIGHT: f32 = 0.08;
const DEFAULT_QUALITY_THRESHOLD: f32 = 0.55;

const GENERIC_DIR_NAMES: [&str; 10] = [
    "downloads",
    "new folder",
    "new folder (2)",
    "untitled",
    "temp",
    "tmp",
    "misc",
    "miscellaneous",
    "documents",
    "desktop",
];

#[derive(Debug, Clone)]
pub struct FstdConfig {
    pub topo_dim: usize,
    pub hidden_dim: usize,
    pub weight: f32,
    pub quality_threshold: f32,
}

impl Default for FstdConfig {
    fn default() -> Self {
        Self {
            topo_dim: DEFAULT_TOPO_DIM,
            hidden_dim: DEFAULT_HIDDEN_DIM,
            weight: DEFAULT_WEIGHT,
            quality_threshold: DEFAULT_QUALITY_THRESHOLD,
        }
    }
}

#[derive(Debug, Clone)]
pub struct DirectoryTopology {
    _root: PathBuf,
    anchors: Vec<DirNode>,
    coords: HashMap<PathBuf, Vec<f32>>,
    quality_score: f32,
    max_distance: f32,
}

#[derive(Debug, Clone)]
struct DirNode {
    path: PathBuf,
    components: Vec<String>,
}

impl DirectoryTopology {
    pub fn build(root: &Path, files: &[PathBuf], config: &FstdConfig) -> Option<Self> {
        let mut directories: HashSet<PathBuf> = HashSet::new();
        for path in files {
            if let Some(parent) = path.parent() {
                directories.insert(parent.to_path_buf());
            }
        }

        if directories.is_empty() {
            return None;
        }

        let nodes: Vec<DirNode> = directories
            .iter()
            .map(|dir| DirNode {
                path: dir.clone(),
                components: path_components(dir),
            })
            .collect();

        let anchors = select_anchors(&nodes, config.topo_dim);
        if anchors.is_empty() {
            return None;
        }

        let max_distance = estimate_max_distance(&nodes, &anchors).max(1.0);
        let coords = build_coordinates(&nodes, &anchors, max_distance);
        let quality_score = structure_quality_score(&nodes, root);

        Some(Self {
            _root: root.to_path_buf(),
            anchors,
            coords,
            quality_score,
            max_distance,
        })
    }

    pub fn quality_score(&self) -> f32 {
        self.quality_score
    }

    pub fn coordinate_for_path(&self, path: &Path) -> Option<&Vec<f32>> {
        path.parent()
            .and_then(|dir| self.coords.get(dir))
            .or_else(|| self.coords.get(path))
    }

    pub fn anchor_count(&self) -> usize {
        self.anchors.len()
    }

    pub fn max_distance(&self) -> f32 {
        self.max_distance
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FstdAdapter {
    pub input_dim: usize,
    pub hidden_dim: usize,
    pub output_dim: usize,
    pub weights1: Vec<f32>,
    pub bias1: Vec<f32>,
    pub weights2: Vec<f32>,
    pub bias2: Vec<f32>,
}

impl FstdAdapter {
    pub fn load_from_path(path: &Path) -> Result<Self, String> {
        let content = std::fs::read_to_string(path).map_err(|e| e.to_string())?;
        let adapter: Self = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        adapter.validate().map_err(|e| e.to_string())?;
        Ok(adapter)
    }

    pub fn save_to_path(&self, path: &Path) -> Result<(), String> {
        let content = serde_json::to_string_pretty(self).map_err(|e| e.to_string())?;
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        std::fs::write(path, content).map_err(|e| e.to_string())
    }

    pub fn predict(&self, input: &[f32]) -> Option<Vec<f32>> {
        if input.len() != self.input_dim {
            return None;
        }
        if self.weights1.len() != self.hidden_dim * self.input_dim {
            return None;
        }
        if self.weights2.len() != self.output_dim * self.hidden_dim {
            return None;
        }

        let mut hidden = vec![0.0_f32; self.hidden_dim];
        for h in 0..self.hidden_dim {
            let mut acc = self.bias1.get(h).copied().unwrap_or(0.0);
            let w_offset = h * self.input_dim;
            for i in 0..self.input_dim {
                acc += self.weights1[w_offset + i] * input[i];
            }
            hidden[h] = acc.max(0.0);
        }

        let mut output = vec![0.0_f32; self.output_dim];
        for o in 0..self.output_dim {
            let mut acc = self.bias2.get(o).copied().unwrap_or(0.0);
            let w_offset = o * self.hidden_dim;
            for h in 0..self.hidden_dim {
                acc += self.weights2[w_offset + h] * hidden[h];
            }
            output[o] = acc;
        }

        Some(output)
    }

    pub fn validate(&self) -> Result<(), &'static str> {
        if self.weights1.len() != self.hidden_dim * self.input_dim {
            return Err("weights1 shape mismatch");
        }
        if self.bias1.len() != self.hidden_dim {
            return Err("bias1 shape mismatch");
        }
        if self.weights2.len() != self.output_dim * self.hidden_dim {
            return Err("weights2 shape mismatch");
        }
        if self.bias2.len() != self.output_dim {
            return Err("bias2 shape mismatch");
        }
        Ok(())
    }
}

#[derive(Debug, Clone)]
pub struct FstdState {
    pub config: FstdConfig,
    pub adapter: Option<Arc<FstdAdapter>>,
    pub topology: Option<Arc<DirectoryTopology>>,
    pub enabled: bool,
}

impl FstdState {
    pub fn new(config: FstdConfig) -> Self {
        Self {
            config,
            adapter: None,
            topology: None,
            enabled: false,
        }
    }

    pub fn load_default_adapter(&mut self) {
        let paths = default_adapter_paths();
        for path in paths {
            if let Ok(adapter) = FstdAdapter::load_from_path(&path) {
                self.adapter = Some(Arc::new(adapter));
                break;
            }
        }
    }

    pub fn update_topology(&mut self, root: &Path, files: &[PathBuf]) {
        self.topology = DirectoryTopology::build(root, files, &self.config).map(Arc::new);
        self.refresh_enabled();
    }

    pub fn refresh_enabled(&mut self) {
        let quality = self
            .topology
            .as_ref()
            .map(|topo| topo.quality_score())
            .unwrap_or(0.0);
        let adapter_ok = self.adapter.is_some();
        self.enabled = adapter_ok && quality >= self.config.quality_threshold;
    }

    pub fn score_for_path(&self, query_embedding: &[f32], path: &Path) -> Option<f32> {
        if !self.enabled {
            return None;
        }
        let adapter = self.adapter.as_ref()?;
        let topo = self.topology.as_ref()?;

        if adapter.output_dim != topo.anchor_count() {
            return None;
        }

        let query_coord = adapter.predict(query_embedding)?;
        let dir_coord = topo.coordinate_for_path(path)?;
        if query_coord.len() != dir_coord.len() {
            return None;
        }

        let mut dist = 0.0_f32;
        for (a, b) in query_coord.iter().zip(dir_coord.iter()) {
            let delta = a - b;
            dist += delta * delta;
        }
        dist = dist.sqrt();
        let norm = (query_coord.len() as f32).sqrt().max(1.0);
        let score = (1.0 - dist / norm).clamp(0.0, 1.0);
        Some(score * self.config.weight)
    }
}

fn default_adapter_paths() -> Vec<PathBuf> {
    let mut paths = Vec::new();
    if let Ok(env_path) = std::env::var("IXOS_FSTD_ADAPTER") {
        paths.push(PathBuf::from(env_path));
    }
    if let Ok(cwd) = std::env::current_dir() {
        paths.push(cwd.join("models").join("fstd").join("adapter.json"));
    }
    if let Some(data_dir) = dirs::data_dir() {
        paths.push(data_dir.join("ixos").join("fstd").join("adapter.json"));
    }
    if let Some(config_dir) = dirs::config_dir() {
        paths.push(config_dir.join("ixos").join("fstd").join("adapter.json"));
    }
    paths
}

fn path_components(path: &Path) -> Vec<String> {
    path.components()
        .filter_map(|c| c.as_os_str().to_str())
        .map(|s| s.to_lowercase())
        .collect()
}

fn select_anchors(nodes: &[DirNode], topo_dim: usize) -> Vec<DirNode> {
    if nodes.is_empty() {
        return Vec::new();
    }
    let mut candidates = nodes.to_vec();
    candidates.sort_by_key(|n| std::cmp::Reverse(n.components.len()));
    let mut anchors = Vec::new();
    let mut seen = HashSet::new();
    for node in candidates {
        if anchors.len() >= topo_dim {
            break;
        }
        if seen.insert(node.path.clone()) {
            anchors.push(node);
        }
    }
    anchors
}

fn estimate_max_distance(nodes: &[DirNode], anchors: &[DirNode]) -> f32 {
    let mut max_distance = 0;
    for node in nodes {
        for anchor in anchors {
            let distance = tree_distance(node, anchor);
            if distance > max_distance {
                max_distance = distance;
            }
        }
    }
    max_distance as f32
}

fn build_coordinates(
    nodes: &[DirNode],
    anchors: &[DirNode],
    max_distance: f32,
) -> HashMap<PathBuf, Vec<f32>> {
    let mut coords = HashMap::new();
    for node in nodes {
        let mut vector = Vec::with_capacity(anchors.len());
        for anchor in anchors {
            let dist = tree_distance(node, anchor) as f32;
            vector.push((dist / max_distance).clamp(0.0, 1.0));
        }
        coords.insert(node.path.clone(), vector);
    }
    coords
}

fn tree_distance(a: &DirNode, b: &DirNode) -> usize {
    let depth_a = a.components.len();
    let depth_b = b.components.len();
    let mut common = 0usize;
    for (a_part, b_part) in a.components.iter().zip(b.components.iter()) {
        if a_part == b_part {
            common += 1;
        } else {
            break;
        }
    }
    depth_a + depth_b - 2 * common
}

fn structure_quality_score(nodes: &[DirNode], root: &Path) -> f32 {
    if nodes.is_empty() {
        return 0.0;
    }

    let mut depth_sum = 0.0_f32;
    let mut max_depth = 0usize;
    let mut name_counts: HashMap<String, usize> = HashMap::new();
    let mut generic_hits = 0usize;

    for node in nodes {
        let depth = node
            .components
            .len()
            .saturating_sub(root.components().count());
        depth_sum += depth as f32;
        max_depth = max_depth.max(depth);
        if let Some(name) = node.components.last() {
            *name_counts.entry(name.clone()).or_insert(0) += 1;
            if GENERIC_DIR_NAMES.contains(&name.as_str()) {
                generic_hits += 1;
            }
        }
    }

    let avg_depth = depth_sum / nodes.len() as f32;
    let depth_score = (avg_depth / 4.0).clamp(0.0, 1.0);
    let max_depth_score = (max_depth as f32 / 6.0).clamp(0.0, 1.0);
    let unique_ratio = name_counts.len() as f32 / nodes.len() as f32;
    let reuse_ratio = 1.0 - unique_ratio;
    let generic_ratio = generic_hits as f32 / nodes.len() as f32;

    let depth_component = 0.35 * depth_score + 0.15 * max_depth_score;
    let naming_component = 0.35 * unique_ratio + 0.15 * reuse_ratio;
    let penalty = 0.35 * generic_ratio;

    (depth_component + naming_component - penalty).clamp(0.0, 1.0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_adapter_validation() {
        let adapter = FstdAdapter {
            input_dim: 4,
            hidden_dim: 2,
            output_dim: 3,
            weights1: vec![0.0; 8],
            bias1: vec![0.0; 2],
            weights2: vec![0.0; 6],
            bias2: vec![0.0; 3],
        };
        assert!(adapter.validate().is_ok());
        let output = adapter.predict(&[0.1, 0.2, 0.3, 0.4]);
        assert!(output.is_some());
        assert_eq!(output.unwrap().len(), 3);
    }

    #[test]
    fn test_topology_build() {
        let temp = TempDir::new().unwrap();
        let root = temp.path();
        std::fs::create_dir_all(root.join("alpha").join("reports")).unwrap();
        std::fs::create_dir_all(root.join("beta").join("notes")).unwrap();
        std::fs::write(root.join("alpha").join("reports").join("a.txt"), "a").unwrap();
        std::fs::write(root.join("beta").join("notes").join("b.txt"), "b").unwrap();

        let files = vec![
            root.join("alpha").join("reports").join("a.txt"),
            root.join("beta").join("notes").join("b.txt"),
        ];
        let topo = DirectoryTopology::build(root, &files, &FstdConfig::default());
        assert!(topo.is_some());
        let topo = topo.unwrap();
        assert!(topo.quality_score() > 0.0);
        assert!(topo.coordinate_for_path(&files[0]).is_some());
    }
}
