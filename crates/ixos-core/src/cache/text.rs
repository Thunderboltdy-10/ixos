//! Extracted PDF and Office text, kept in cached mode so the next launch does not
//! parse them again. Named by content, so renamed and moved files still find theirs.
use crate::digest::sha256;
use std::collections::HashSet;
use std::io::Write;
use std::path::{Path, PathBuf};

/// Change this when a parser update should re-extract existing files.
const VERSION: &[u8] = b"ixos-text-1";

/// One directory per search location, so a location's text can be cleared with it.
pub(crate) fn directory(cache: &Path, root: &Path) -> PathBuf {
    let root = sha256(root.as_os_str().as_encoded_bytes());
    cache.join("text").join(hex::encode(root))
}

fn name(raw_hash: &[u8; 32]) -> String {
    hex::encode(sha256(&[VERSION, raw_hash.as_slice()].concat()))
}

/// `None` when this content was never parsed; `Some(None)` when it holds no text.
pub(crate) fn load(directory: &Path, raw_hash: &[u8; 32]) -> Option<Option<String>> {
    let bytes = std::fs::read(directory.join(name(raw_hash))).ok()?;
    if bytes.is_empty() {
        return Some(None);
    }
    Some(Some(String::from_utf8(bytes).ok()?))
}

/// A failed write only means parsing again next time.
pub(crate) fn save(directory: &Path, raw_hash: &[u8; 32], text: Option<&str>) {
    let saved = std::fs::create_dir_all(directory).and_then(|()| {
        let mut file = tempfile::NamedTempFile::new_in(directory)?;
        file.write_all(text.unwrap_or_default().as_bytes())?;
        file.persist(directory.join(name(raw_hash)))?;
        Ok(())
    });
    if let Err(error) = saved {
        tracing::warn!("Could not keep extracted text: {error}");
    }
}

/// Drops the text of content that no longer exists in this location.
pub(crate) fn prune(directory: &Path, keep: &HashSet<[u8; 32]>) {
    let Ok(entries) = std::fs::read_dir(directory) else {
        return;
    };
    let keep: HashSet<String> = keep.iter().map(name).collect();
    for entry in entries.flatten() {
        if !keep.contains(entry.file_name().to_string_lossy().as_ref()) {
            let _ = std::fs::remove_file(entry.path());
        }
    }
}

/// Bytes held for one location.
pub(crate) fn size(directory: &Path) -> u64 {
    std::fs::read_dir(directory).map_or(0, |entries| {
        entries
            .flatten()
            .filter_map(|entry| entry.metadata().ok())
            .map(|metadata| metadata.len())
            .sum()
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn keeps_text_and_the_absence_of_text_until_pruned() {
        let dir = tempfile::tempdir().unwrap();
        let (with, without) = ([1u8; 32], [2u8; 32]);
        assert_eq!(load(dir.path(), &with), None);
        save(dir.path(), &with, Some("kept"));
        save(dir.path(), &without, None);
        assert_eq!(load(dir.path(), &with), Some(Some("kept".into())));
        assert_eq!(load(dir.path(), &without), Some(None));
        prune(dir.path(), &HashSet::from([without]));
        assert_eq!(load(dir.path(), &with), None);
        assert_eq!(load(dir.path(), &without), Some(None));
    }
}
