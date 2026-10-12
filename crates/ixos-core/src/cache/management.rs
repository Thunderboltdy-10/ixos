//! Cache removal names only Ixos metadata and database entries.
use super::*;
use crate::discover::search_walk;
use serde::Serialize;
use std::collections::{HashMap, HashSet};
use std::path::PathBuf;

#[cfg(windows)]
const NAMES: &[&str] = &[":ixos", ":ixos_document_v1", ":ixos_embed", ":ixos_rank"];
#[cfg(unix)]
const NAMES: &[&str] = &[
    "user.ixos",
    "user.ixos.document-v1",
    "user.ixos.embed",
    "user.ixos.rank",
];

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CacheStats {
    pub files_with_records: usize,
    pub record_bytes: u64,
    pub native_records: usize,
    pub fallback_entries: usize,
    pub old_records: usize,
}

struct Fallback {
    env: Env,
    db: Database<Bytes, Bytes>,
    rows: HashMap<Vec<u8>, (usize, bool)>,
    selected: HashSet<Vec<u8>>,
}

impl Fallback {
    fn open(directory: &Path, old: bool) -> anyhow::Result<Option<Self>> {
        if let Ok(metadata) = std::fs::symlink_metadata(directory) {
            anyhow::ensure!(
                metadata.is_dir() && !metadata.file_type().is_symlink(),
                "Cache directory must not be a symlink"
            );
        }
        if !directory.join("data.mdb").is_file() {
            return Ok(None);
        }
        anyhow::ensure!(
            !std::fs::symlink_metadata(directory.join("data.mdb"))?
                .file_type()
                .is_symlink(),
            "Cache database must not be a symlink"
        );
        // The same options as the engine allow inspection while it is resident.
        let env = unsafe {
            EnvOpenOptions::new()
                .map_size(64 * 1024 * 1024)
                .max_dbs(1)
                .open(directory)?
        };
        let txn = env.read_txn()?;
        let Some(db) = env.open_database::<Bytes, Bytes>(&txn, Some("documents"))? else {
            return Ok(None);
        };
        let rows = db
            .iter(&txn)?
            .map(|row| {
                row.map(|(key, value)| {
                    (
                        key.to_vec(),
                        (value.len(), old || !value.starts_with(b"IXOS\x01")),
                    )
                })
            })
            .collect::<Result<_, _>>()?;
        drop(txn);
        Ok(Some(Self {
            env,
            db,
            rows,
            selected: HashSet::new(),
        }))
    }
    fn select(&mut self, key: &[u8], stats: &mut CacheStats) -> bool {
        if let Some(&(size, old)) = self.rows.get(key) {
            if self.selected.insert(key.to_vec()) {
                stats.fallback_entries += 1;
                stats.record_bytes += size as u64;
                stats.old_records += usize::from(old);
            }
            true
        } else {
            false
        }
    }
    fn clear(&self) -> anyhow::Result<()> {
        let mut txn = self.env.write_txn()?;
        for key in &self.selected {
            self.db.delete(&mut txn, key)?;
        }
        txn.commit()?;
        Ok(())
    }
}

/// `yes` is false for both inspection and a clear dry run. `all` also selects
/// orphaned application-cache entries whose original files no longer exist.
pub fn manage(locations: &[PathBuf], all: bool, yes: bool) -> anyhow::Result<CacheStats> {
    let directory = dirs::cache_dir()
        .ok_or_else(|| anyhow::anyhow!("No application cache directory"))?
        .join("ixos");
    manage_at(locations, &directory, all, yes)
}

fn manage_at(
    locations: &[PathBuf],
    directory: &Path,
    all: bool,
    yes: bool,
) -> anyhow::Result<CacheStats> {
    let mut databases = Vec::new();
    for (name, old) in [("records", false), ("documents-v1", true)] {
        if let Some(database) = Fallback::open(&directory.join(name), old)? {
            databases.push(database);
        }
    }
    let mut stats = CacheStats::default();
    let mut visited = HashSet::new();
    for location in locations {
        let metadata = std::fs::symlink_metadata(location)?;
        anyhow::ensure!(
            metadata.is_dir() && !metadata.file_type().is_symlink(),
            "Location must be a directory, not a symlink"
        );
        let root = location.canonicalize()?;
        for entry in search_walk(&root, true, true, false, None).build() {
            let entry = entry?;
            if !entry.file_type().is_some_and(|kind| kind.is_file()) {
                continue;
            }
            let path = entry.path();
            if !visited.insert(path.to_owned()) || crate::cloud::should_skip_cloud_file(path) {
                continue;
            }
            let mut present = false;
            for (index, name) in NAMES.iter().enumerate() {
                if let Some((size, old)) = native_info(path, name)? {
                    present = true;
                    stats.native_records += 1;
                    stats.record_bytes += size;
                    stats.old_records += usize::from(index > 0 || old);
                    if yes {
                        native_remove_named(path, name)?;
                    }
                }
            }
            let key = DocumentCache::path_key(path);
            for database in &mut databases {
                present |= database.select(&key, &mut stats);
            }
            stats.files_with_records += usize::from(present);
        }
    }
    if all {
        for database in &mut databases {
            let keys = database.rows.keys().cloned().collect::<Vec<_>>();
            for key in keys {
                database.select(&key, &mut stats);
            }
        }
    }
    if yes {
        for database in &databases {
            database.clear()?;
        }
    }
    Ok(stats)
}

#[cfg(windows)]
fn native_info(path: &Path, name: &str) -> std::io::Result<Option<(u64, bool)>> {
    let _primary = crate::metadata_windows::open_primary(path)?;
    let mut stream = path.as_os_str().to_owned();
    stream.push(name);
    let file = match std::fs::File::open(stream) {
        Ok(file) => file,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(error) if matches!(error.raw_os_error(), Some(50 | 123)) => return Ok(None),
        Err(error) => return Err(error),
    };
    let size = file.metadata()?.len();
    let mut header = Vec::new();
    file.take(5).read_to_end(&mut header)?;
    Ok(Some((size, header != b"IXOS\x01")))
}
#[cfg(unix)]
fn native_info(path: &Path, name: &str) -> std::io::Result<Option<(u64, bool)>> {
    match xattr::get(path, name) {
        Ok(data) => Ok(data.map(|data| (data.len() as u64, !data.starts_with(b"IXOS\x01")))),
        Err(error) if error.kind() == std::io::ErrorKind::Unsupported => Ok(None),
        Err(error) => Err(error),
    }
}
#[cfg(windows)]
fn native_remove_named(path: &Path, name: &str) -> std::io::Result<()> {
    crate::metadata_windows::remove_metadata_stream(path, name)
}
#[cfg(unix)]
fn native_remove_named(path: &Path, name: &str) -> std::io::Result<()> {
    xattr::remove(path, name)
}

#[cfg(test)]
mod tests {
    use super::*;
    fn write_named(path: &Path, name: &str, data: &[u8]) {
        #[cfg(windows)]
        crate::metadata_windows::write_metadata_stream(path, name, data).unwrap();
        #[cfg(unix)]
        xattr::set(path, name, data).unwrap();
    }
    #[test]
    fn clear_preserves_primary_timestamps_and_unrelated_metadata() {
        let root = tempfile::tempdir().unwrap();
        let cache = tempfile::tempdir().unwrap();
        let path = root.path().join("source.txt");
        std::fs::write(&path, "primary source").unwrap();
        let modified = std::fs::metadata(&path).unwrap().modified().unwrap();
        #[cfg(windows)]
        let unrelated = ":personal";
        #[cfg(unix)]
        let unrelated = "user.personal";
        write_named(&path, unrelated, b"keep");
        for name in NAMES {
            write_named(&path, name, b"IXOS\x01data");
        }
        let locations = [root.path().to_owned()];
        let dry = manage_at(&locations, cache.path(), false, false).unwrap();
        assert_eq!(dry.files_with_records, 1);
        assert_eq!(dry.native_records, 4);
        assert_eq!(dry.old_records, 3);
        assert_eq!(dry.record_bytes, 36);
        assert!(native_info(&path, NAMES[0]).unwrap().is_some());
        assert_eq!(
            manage_at(&locations, cache.path(), false, true).unwrap(),
            dry
        );
        assert_eq!(
            manage_at(&locations, cache.path(), false, false).unwrap(),
            CacheStats::default()
        );
        assert_eq!(native_info(&path, unrelated).unwrap().unwrap().0, 4);
        assert_eq!(std::fs::read(&path).unwrap(), b"primary source");
        assert_eq!(
            std::fs::metadata(&path).unwrap().modified().unwrap(),
            modified
        );
    }
    #[test]
    fn fallback_clear_selects_location_and_all_includes_orphans() {
        let root = tempfile::tempdir().unwrap();
        let cache = tempfile::tempdir().unwrap();
        let source = root.path().join("source.txt");
        std::fs::write(&source, "source").unwrap();
        let source = source.canonicalize().unwrap();
        let directory = cache.path().join("records");
        std::fs::create_dir(&directory).unwrap();
        let env = unsafe {
            EnvOpenOptions::new()
                .map_size(64 * 1024 * 1024)
                .max_dbs(1)
                .open(&directory)
                .unwrap()
        };
        let mut txn = env.write_txn().unwrap();
        let db = env
            .create_database::<Bytes, Bytes>(&mut txn, Some("documents"))
            .unwrap();
        db.put(&mut txn, &DocumentCache::path_key(&source), b"IXOS\x01data")
            .unwrap();
        db.put(&mut txn, &[123; 32], b"old data").unwrap();
        txn.commit().unwrap();
        let locations = [root.path().to_owned()];
        let dry = manage_at(&locations, cache.path(), false, false).unwrap();
        assert_eq!(dry.fallback_entries, 1);
        assert_eq!(dry.record_bytes, 9);
        assert_eq!(
            manage_at(&locations, cache.path(), false, true).unwrap(),
            dry
        );
        assert_eq!(db.len(&env.read_txn().unwrap()).unwrap(), 1);
        let all = manage_at(&[], cache.path(), true, false).unwrap();
        assert_eq!(all.fallback_entries, 1);
        assert_eq!(all.old_records, 1);
        assert_eq!(manage_at(&[], cache.path(), true, true).unwrap(), all);
        assert_eq!(db.len(&env.read_txn().unwrap()).unwrap(), 0);
        assert_eq!(std::fs::read(&source).unwrap(), b"source");
    }
    #[cfg(unix)]
    #[test]
    fn clearing_never_follows_file_or_directory_symlinks() {
        let root = tempfile::tempdir().unwrap();
        let outside = tempfile::tempdir().unwrap();
        let cache = tempfile::tempdir().unwrap();
        let source = outside.path().join("source.txt");
        std::fs::write(&source, "outside").unwrap();
        write_named(&source, NAMES[0], b"IXOS\x01data");
        std::os::unix::fs::symlink(&source, root.path().join("file.txt")).unwrap();
        std::os::unix::fs::symlink(outside.path(), root.path().join("folder")).unwrap();
        assert_eq!(
            manage_at(&[root.path().to_owned()], cache.path(), false, true).unwrap(),
            CacheStats::default()
        );
        assert!(native_info(&source, NAMES[0]).unwrap().is_some());
        assert!(manage_at(&[root.path().join("folder")], cache.path(), false, true).is_err());
    }
}
