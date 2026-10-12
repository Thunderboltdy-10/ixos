//! Explicit displayed source views, kept separate from query/topic history.
//! Text is bounded in RAM; vectors are created only when feedback selects a view.
use super::*;

const MAX_RESPONSES: usize = 16;
const MAX_VIEWS: usize = 16;
const MAX_STORED_BYTES: usize = 8192;

struct InspectedView {
    path: String,
    source_hash: [u8; 32],
    text: String,
    vector: Option<Vec<f32>>,
}

pub(super) struct Inspection {
    id: String,
    turn: u64,
    views: BTreeMap<usize, InspectedView>,
}

#[derive(Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InspectionStats {
    pub responses: usize,
    pub stored_views: usize,
    pub stored_text_bytes: usize,
    pub feedback_views: usize,
    pub views_embedded: usize,
    pub embed_ms: f64,
}

#[derive(Default)]
pub(super) struct Inspections(VecDeque<Inspection>);

impl Inspection {
    /// Capture only complete displayed text and its hash from the same read.
    /// Skipped views retain their original response indices; never renumber them.
    pub fn prepare(
        id: String,
        turn: u64,
        value: &serde_json::Value,
        hashes: &HashMap<String, [u8; 32]>,
    ) -> Self {
        let mut views = BTreeMap::new();
        let mut bytes = id.len();
        let entries: Vec<_> = if let Some(rows) = value["results"].as_array() {
            rows.iter().map(|row| &row["view"]).collect()
        } else if value.get("view").is_some() {
            vec![&value["view"]]
        } else {
            vec![&value["slice"]]
        };
        for (index, view) in entries.into_iter().enumerate() {
            if views.len() == MAX_VIEWS {
                break;
            }
            let (Some(path), Some(text)) = (view["path"].as_str(), view["text"].as_str()) else {
                continue;
            };
            let Some(hash) = hashes.get(path) else {
                continue;
            };
            let cost = path.len() + text.len() + 96;
            if text.trim().is_empty() || cost > MAX_STORED_BYTES.saturating_sub(bytes) {
                continue;
            }
            bytes += cost;
            views.insert(
                index,
                InspectedView {
                    path: path.to_owned(),
                    source_hash: *hash,
                    text: text.to_owned(),
                    vector: None,
                },
            );
        }
        Self { id, turn, views }
    }

    pub fn indices(&self) -> Vec<usize> {
        self.views.keys().copied().collect()
    }
}

impl Inspections {
    pub fn clear(&mut self) {
        self.0.clear();
    }
    pub fn remove(&mut self, id: &str) {
        self.0.retain(|entry| entry.id != id);
    }
    pub fn prune(&mut self, turn: u64) {
        self.0.retain(|entry| turn.saturating_sub(entry.turn) <= 4);
    }
    pub fn insert(&mut self, entry: Inspection) {
        self.remove(&entry.id);
        self.prune(entry.turn);
        self.0.push_back(entry);
        while self.0.len() > MAX_RESPONSES {
            self.0.pop_front();
        }
    }

    pub fn stats(&self) -> Option<InspectionStats> {
        if self.0.is_empty() {
            return None;
        }
        Some(InspectionStats {
            responses: self.0.len(),
            stored_views: self.0.iter().map(|entry| entry.views.len()).sum(),
            stored_text_bytes: self
                .0
                .iter()
                .flat_map(|entry| entry.views.values())
                .map(|view| view.text.len())
                .sum(),
            ..Default::default()
        })
    }

    pub fn apply(
        &mut self,
        feedback: &Feedback,
        documents: &BTreeMap<String, Document>,
        model: &Model,
        query: &mut [f32],
    ) -> anyhow::Result<Option<InspectionStats>> {
        let Some(entry) = self
            .0
            .iter_mut()
            .find(|entry| entry.id == feedback.query_id)
        else {
            return Ok(None);
        };
        let resolve = |references: &[FeedbackReference]| -> BTreeSet<usize> {
            references
                .iter()
                .filter_map(|reference| match reference {
                    FeedbackReference::Index(index) => {
                        entry.views.contains_key(index).then_some(*index)
                    }
                    // A path identifies the first remembered displayed view of that file.
                    FeedbackReference::Path(path) => entry
                        .views
                        .iter()
                        .find(|(_, view)| &view.path == path)
                        .map(|(index, _)| *index),
                })
                .filter(|index| {
                    let view = &entry.views[index];
                    documents
                        .get(&view.path)
                        .is_some_and(|doc| doc.source_hash == view.source_hash)
                })
                .collect()
        };
        let accepted = resolve(&feedback.accepted);
        let rejected = resolve(&feedback.rejected);
        let missing: Vec<_> = accepted
            .union(&rejected)
            .copied()
            .filter(|index| entry.views[index].vector.is_none())
            .collect();
        let started = Instant::now();
        let texts: Vec<_> = missing
            .iter()
            .map(|index| entry.views[index].text.clone())
            .collect();
        if !texts.is_empty() {
            let vectors = model.embed_batch_with_limit(&texts, None)?;
            for (index, vector) in missing.iter().zip(vectors) {
                entry.views.get_mut(index).unwrap().vector = Some(vector);
            }
        }
        let embed_ms = started.elapsed().as_secs_f64() * 1000.0;
        for (indices, weight) in [(&accepted, 0.15), (&rejected, -0.07)] {
            if !indices.is_empty() {
                let mut centroid = vec![0.0; query.len()];
                for index in indices {
                    add(
                        &mut centroid,
                        entry.views[index].vector.as_ref().unwrap(),
                        1.0,
                    );
                }
                unit(&mut centroid);
                add(query, &centroid, weight);
            }
        }
        let mut stats = self.stats().unwrap();
        stats.feedback_views = accepted.union(&rejected).count();
        stats.views_embedded = missing.len();
        stats.embed_ms = embed_ms;
        Ok(Some(stats))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn retains_complete_displayed_views_without_renumbering_or_unbounded_text() {
        let hashes = HashMap::from([("a".to_owned(), [1; 32])]);
        let value = json!({"results":[{"path":"a","evidence_omitted":true},
            {"view":{"path":"a","text":"x".repeat(9000)}},
            {"view":{"path":"a","text":"é\ncomplete line"}},
            {"view":{"path":"unhashed","text":"unseen"}}]});
        let entry = Inspection::prepare("g".to_owned(), 0, &value, &hashes);
        assert_eq!(entry.indices(), vec![2]);
        assert_eq!(entry.views[&2].text, "é\ncomplete line");
        assert!(entry.views[&2].vector.is_none());
        let value = json!({"slice":{"path":"a","text":"字"}});
        assert_eq!(
            Inspection::prepare("r".to_owned(), 0, &value, &hashes).indices(),
            vec![0]
        );
    }

    #[test]
    fn history_replaces_ids_bounds_responses_and_expires_on_search_turns() {
        let mut history = Inspections::default();
        let value = serde_json::json!({"view":{"path":"a","text":"complete"}});
        let hashes = HashMap::from([("a".to_owned(), [1; 32])]);
        for index in 0..20 {
            history.insert(Inspection::prepare(index.to_string(), 0, &value, &hashes));
        }
        assert_eq!(history.stats().unwrap().responses, 16);
        history.insert(Inspection::prepare("19".to_owned(), 0, &value, &hashes));
        assert_eq!(history.stats().unwrap().responses, 16);
        history.prune(4);
        assert_eq!(history.stats().unwrap().stored_views, 16);
        history.prune(5);
        assert!(history.stats().is_none());
        history.insert(Inspection::prepare("new".to_owned(), 5, &value, &hashes));
        history.clear();
        assert!(history.stats().is_none());
    }
}
