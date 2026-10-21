//! Validated source selectors and fair, bounded MCP source reads.
use serde::Deserialize;
use serde_json::{json, Value};
use std::{
    collections::HashSet,
    path::{Path, PathBuf},
};

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct ReadSpec {
    pub path: PathBuf,
    pub id: Option<String>,
    pub start: Option<usize>,
    pub lines: Option<usize>,
    pub end: Option<usize>,
    pub expected_source_hash: Option<String>,
    pub characters: Option<usize>,
    #[serde(default)]
    pub character_offset: usize,
    pub within: Option<String>,
    pub body: Option<bool>,
}

impl ReadSpec {
    pub fn range(&self) -> anyhow::Result<ixos_core::inspect::SourceRange> {
        anyhow::ensure!(
            self.end.is_none() || self.lines.is_none(),
            "Choose end or lines, not both"
        );
        let start = self.start.unwrap_or(1);
        let count = match self.end {
            Some(end) => end
                .checked_sub(start)
                .and_then(|x| x.checked_add(1))
                .ok_or_else(|| anyhow::anyhow!("End must be at least start"))?,
            None => self.lines.unwrap_or(40),
        };
        Ok(ixos_core::inspect::SourceRange {
            start,
            count,
            characters: self.characters,
            character_offset: self.character_offset,
        })
    }
    pub fn selection(&self) -> anyhow::Result<ixos_core::inspect::Selection> {
        anyhow::ensure!(
            self.characters.is_none() && self.character_offset == 0,
            "Character paging requires a conventional range, not source selection"
        );
        anyhow::ensure!(
            self.end.is_none() || self.lines.is_none(),
            "Choose end or lines, not both"
        );
        anyhow::ensure!(
            cfg!(feature = "evidence-functions"),
            "This build has no function selection support; use exact ranges"
        );
        anyhow::ensure!(
            self.body.is_none() || self.within.is_some(),
            "body requires an exact within function"
        );
        Ok(ixos_core::inspect::Selection {
            start: self.start,
            end: self.end,
            lines: self.lines,
            within: self.within.clone(),
            body: self.body.unwrap_or(false),
        })
    }
    pub fn has_symbol_selector(&self) -> bool {
        self.within.is_some() || self.body.is_some()
    }
    pub fn read(&self, root: &Path, budget: usize) -> anyhow::Result<Value> {
        anyhow::ensure!(
            self.id
                .as_ref()
                .is_none_or(|id| !id.is_empty() && id.len() <= 128),
            "Invalid request id"
        );
        let range = self.range()?;
        let raw = ixos_core::tools::read_range(
            root,
            &self.path,
            range.start,
            range.count,
            range.characters,
            range.character_offset,
            budget,
        )?;
        let value: Value = serde_json::from_slice(&raw)?;
        if let Some(expected) = &self.expected_source_hash {
            anyhow::ensure!(
                value["source_hash"].as_str() == Some(expected.as_str()),
                "Source changed; discard old coordinates and inspect the current source"
            );
        }
        Ok(value)
    }
}

/// `dir` and `view` are transport-level globals, removed by the caller.
pub(crate) fn execute(root: &Path, args: Value) -> anyhow::Result<Value> {
    execute_with(root, args, |spec, budget| spec.read(root, budget))
}

pub(crate) fn execute_with(
    _root: &Path,
    mut args: Value,
    mut read: impl FnMut(&ReadSpec, usize) -> anyhow::Result<Value>,
) -> anyhow::Result<Value> {
    let object = args
        .as_object_mut()
        .ok_or_else(|| anyhow::anyhow!("Read arguments must be an object"))?;
    let budget = match object.remove("max_bytes") {
        Some(value) => value
            .as_u64()
            .filter(|n| (128..=24000).contains(n))
            .ok_or_else(|| anyhow::anyhow!("max_bytes must be an integer from 128 to 24000"))?
            as usize,
        None => 6000,
    };
    let Some(requests) = object.remove("requests") else {
        anyhow::ensure!(
            !object.contains_key("id"),
            "id is only supported inside requests"
        );
        return read(&serde_json::from_value::<ReadSpec>(args)?, budget);
    };
    anyhow::ensure!(
        object.is_empty(),
        "requests cannot be combined with top-level selectors or unknown fields"
    );
    let requests = requests
        .as_array()
        .filter(|r| !r.is_empty() && r.len() <= 8)
        .ok_or_else(|| anyhow::anyhow!("requests must contain 1 to 8 source selectors"))?;
    let mut ids = HashSet::new();
    for request in requests {
        if let Some(id) = request.get("id") {
            let id = id
                .as_str()
                .filter(|id| !id.is_empty() && id.len() <= 128)
                .ok_or_else(|| {
                    anyhow::anyhow!(
                        "Request id must be a nonempty string of at most 128 UTF-8 bytes"
                    )
                })?;
            anyhow::ensure!(ids.insert(id), "Duplicate request id: {id}");
        }
    }
    // Account for the exact outer JSON framing and each optional id before
    // dividing the available bytes. No earlier item can spend a later share.
    let framing = serde_json::to_vec(&json!({"results":vec![json!({}); requests.len()]}))?.len()
        - requests.len() * 2;
    let available = budget
        .checked_sub(framing)
        .ok_or_else(|| anyhow::anyhow!("Batch budget is too small"))?;
    let share = available / requests.len();
    let mut results = Vec::with_capacity(requests.len());
    for (index, request) in requests.iter().enumerate() {
        let row_budget = share + usize::from(index < available % requests.len());
        let id = request.get("id");
        let id_cost = match id {
            Some(id) => serde_json::to_vec(&json!({"id":id}))?.len() - 1,
            None => 0,
        };
        anyhow::ensure!(
            row_budget >= id_cost + 128,
            "Batch budget is too small for every request; increase max_bytes or reduce requests"
        );
        let item_budget = row_budget - id_cost;
        let result = serde_json::from_value::<ReadSpec>(request.clone())
            .map_err(anyhow::Error::from)
            .and_then(|spec| read(&spec, item_budget));
        let mut row = match result {
            Ok(value) => value,
            Err(error) => {
                let mut message: String = error.to_string().chars().take(item_budget).collect();
                while serde_json::to_vec(&json!({"error":message}))?.len() > item_budget {
                    message.pop();
                }
                json!({"error":message})
            }
        };
        if let Some(id) = id {
            row["id"] = id.clone();
        }
        results.push(row);
    }
    Ok(json!({"results":results}))
}

pub(crate) fn schema(dir: Value, view: Value) -> Value {
    let selectors = json!({"path":{"type":"string"},"start":{"type":"integer","minimum":1},"lines":{"type":"integer","minimum":1,"maximum":10000},"end":{"type":"integer","minimum":1},"expected_source_hash":{"type":"string"},"characters":{"type":"integer","minimum":1,"maximum":1000000},"character_offset":{"type":"integer","minimum":0},"within":{"type":"string","minLength":1,"maxLength":384,"description":"Exact function name or immediate Owner::name, at most 384 UTF-8 bytes; ambiguous names return source coordinates"},"body":{"type":"boolean","description":"With within, restrict to the parsed implementation body; documentation is retained by default"}});
    let exclusions: Vec<_> = selectors
        .as_object()
        .unwrap()
        .keys()
        .map(|key| json!({"required":[key]}))
        .collect();
    let constraints = json!([{"not":{"required":["end","lines"]}},{"if":{"required":["body"]},"then":{"required":["within"]}}]);
    let mut item = selectors.clone();
    item["id"] = json!({"type":"string","minLength":1,"maxLength":128,"description":"Unique optional identifier; at most 128 UTF-8 bytes"});
    let mut properties = selectors;
    properties["dir"] = dir;
    properties["view"] = view;
    properties["max_bytes"] =
        json!({"type":"integer","minimum":128,"maximum":24000,"default":6000});
    properties["requests"] = json!({"type":"array","minItems":1,"maxItems":8,"items":{"type":"object","required":["path"],"additionalProperties":false,"properties":item,"allOf":constraints}});
    json!({"type":"object","additionalProperties":false,"properties":properties,"oneOf":[{"required":["path"],"not":{"required":["requests"]}},{"required":["requests"],"not":{"anyOf":exclusions}}],"allOf":constraints})
}
