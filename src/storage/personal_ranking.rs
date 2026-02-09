//! Personal ranking signals storage.
//!
//! Stores compact per-file personalization metadata:
//! - Windows NTFS ADS stream: `:ixos_rank`
//! - Unix xattr: `user.ixos.rank`
//! - Fallback bounded local store for unsupported filesystems

use std::collections::HashMap;
use std::num::NonZeroUsize;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;

use lru::LruCache;
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};

#[cfg(windows)]
use crate::storage::ads_windows::AdsCache;
#[cfg(unix)]
use crate::storage::xattr_unix::XattrCache;

#[cfg(windows)]
const ADS_STREAM_NAME: &str = ":ixos_rank";
#[cfg(unix)]
const XATTR_NAME: &str = "user.ixos.rank";
const FALLBACK_CAPACITY: usize = 10_000;
const STORAGE_VERSION: u32 = 1;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PersonalSignals {
    pub open_score: f32,
    pub last_open_ts: u64,
    pub pinned: bool,
    pub ignored: bool,
}

impl Default for PersonalSignals {
    fn default() -> Self {
        Self {
            open_score: 0.0,
            last_open_ts: 0,
            pinned: false,
            ignored: false,
        }
    }
}

impl PersonalSignals {
    pub const ENCODED_LEN: usize = 14;

    fn encode(self) -> [u8; Self::ENCODED_LEN] {
        let mut out = [0u8; Self::ENCODED_LEN];
        out[0..4].copy_from_slice(&self.open_score.to_le_bytes());
        out[4..12].copy_from_slice(&self.last_open_ts.to_le_bytes());
        out[12] = u8::from(self.pinned);
        out[13] = u8::from(self.ignored);
        out
    }

    fn decode(bytes: &[u8]) -> Option<Self> {
        if bytes.len() != Self::ENCODED_LEN {
            return None;
        }

        let mut score_bytes = [0u8; 4];
        score_bytes.copy_from_slice(&bytes[0..4]);

        let mut ts_bytes = [0u8; 8];
        ts_bytes.copy_from_slice(&bytes[4..12]);

        Some(Self {
            open_score: f32::from_le_bytes(score_bytes),
            last_open_ts: u64::from_le_bytes(ts_bytes),
            pinned: bytes[12] != 0,
            ignored: bytes[13] != 0,
        })
    }
}

#[derive(Debug, Serialize, Deserialize)]
struct FallbackFile {
    version: u32,
    entries: HashMap<String, PersonalSignals>,
}

struct FallbackStore {
    path: PathBuf,
    entries: HashMap<String, PersonalSignals>,
    lru: LruCache<String, ()>,
}

impl FallbackStore {
    fn load() -> Self {
        let path = dirs::config_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("ixos")
            .join("personal_signals_v1.json");
        let mut entries = HashMap::new();

        if let Ok(raw) = std::fs::read_to_string(&path) {
            if let Ok(file) = serde_json::from_str::<FallbackFile>(&raw) {
                if file.version == STORAGE_VERSION {
                    entries = file.entries;
                }
            }
        }

        let mut lru = LruCache::new(NonZeroUsize::new(FALLBACK_CAPACITY).expect("nonzero"));
        for key in entries.keys() {
            lru.put(key.clone(), ());
        }

        Self { path, entries, lru }
    }

    fn save(&self) -> Result<(), std::io::Error> {
        if let Some(parent) = self.path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let payload = FallbackFile {
            version: STORAGE_VERSION,
            entries: self.entries.clone(),
        };
        let json = serde_json::to_string_pretty(&payload)
            .map_err(|e| std::io::Error::other(e.to_string()))?;
        std::fs::write(&self.path, json)?;
        Ok(())
    }

    fn get(&mut self, key: &str) -> Option<PersonalSignals> {
        if self.entries.contains_key(key) {
            let _ = self.lru.get(key);
        }
        self.entries.get(key).copied()
    }

    fn set(&mut self, key: String, value: PersonalSignals) -> Result<(), std::io::Error> {
        self.entries.insert(key.clone(), value);
        self.lru.put(key, ());

        while self.entries.len() > FALLBACK_CAPACITY {
            if let Some((old_key, _)) = self.lru.pop_lru() {
                self.entries.remove(&old_key);
            } else {
                break;
            }
        }

        self.save()
    }

    fn remove(&mut self, key: &str) -> Result<(), std::io::Error> {
        self.entries.remove(key);
        let _ = self.lru.pop(key);
        self.save()
    }
}

static FALLBACK_STORE: OnceLock<Mutex<FallbackStore>> = OnceLock::new();

fn fallback_store() -> &'static Mutex<FallbackStore> {
    FALLBACK_STORE.get_or_init(|| Mutex::new(FallbackStore::load()))
}

fn should_fallback_from_native_error(error: &std::io::Error) -> bool {
    matches!(
        error.kind(),
        std::io::ErrorKind::PermissionDenied
            | std::io::ErrorKind::Unsupported
            | std::io::ErrorKind::InvalidInput
            | std::io::ErrorKind::Other
    )
}

fn fallback_key(path: &Path) -> String {
    std::fs::canonicalize(path)
        .unwrap_or_else(|_| path.to_path_buf())
        .to_string_lossy()
        .to_string()
}

#[cfg(windows)]
fn ads_rank_path(path: &Path) -> PathBuf {
    let mut rank_path = path.as_os_str().to_owned();
    rank_path.push(ADS_STREAM_NAME);
    PathBuf::from(rank_path)
}

fn is_native_supported(path: &Path) -> bool {
    #[cfg(windows)]
    {
        return AdsCache::is_supported_static(path);
    }
    #[cfg(unix)]
    {
        return XattrCache::is_supported_static(path);
    }
    #[allow(unreachable_code)]
    false
}

pub fn get_personal_signals(path: &Path) -> Result<Option<PersonalSignals>, std::io::Error> {
    if !path.exists() || !path.is_file() {
        return Ok(None);
    }

    if is_native_supported(path) {
        #[cfg(windows)]
        {
            let bytes = match std::fs::read(ads_rank_path(path)) {
                Ok(b) => b,
                Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
                Err(e) => {
                    if should_fallback_from_native_error(&e) {
                        tracing::debug!(
                            "ADS personal ranking read failed for {:?}, falling back: {}",
                            path,
                            e
                        );
                        Vec::new()
                    } else {
                        return Err(e);
                    }
                }
            };
            if !bytes.is_empty() {
                return Ok(PersonalSignals::decode(&bytes));
            }
        }

        #[cfg(unix)]
        {
            let bytes = match xattr::get(path, XATTR_NAME) {
                Ok(Some(b)) => b,
                Ok(None) => return Ok(None),
                Err(e) => {
                    if should_fallback_from_native_error(&e) {
                        tracing::debug!(
                            "xattr personal ranking read failed for {:?}, falling back: {}",
                            path,
                            e
                        );
                        Vec::new()
                    } else {
                        return Err(e);
                    }
                }
            };
            if !bytes.is_empty() {
                return Ok(PersonalSignals::decode(&bytes));
            }
        }
    }

    let key = fallback_key(path);
    let mut store = fallback_store().lock();
    Ok(store.get(&key))
}

pub fn set_personal_signals(path: &Path, signals: PersonalSignals) -> Result<(), std::io::Error> {
    if !path.exists() || !path.is_file() {
        return Ok(());
    }

    if is_native_supported(path) {
        let bytes = signals.encode();
        #[cfg(windows)]
        {
            match std::fs::write(ads_rank_path(path), bytes) {
                Ok(()) => return Ok(()),
                Err(e) if should_fallback_from_native_error(&e) => {
                    tracing::debug!(
                        "ADS personal ranking write failed for {:?}, falling back: {}",
                        path,
                        e
                    );
                }
                Err(e) => return Err(e),
            }
        }
        #[cfg(unix)]
        {
            match xattr::set(path, XATTR_NAME, &bytes) {
                Ok(()) => return Ok(()),
                Err(e) if should_fallback_from_native_error(&e) => {
                    tracing::debug!(
                        "xattr personal ranking write failed for {:?}, falling back: {}",
                        path,
                        e
                    );
                }
                Err(e) => return Err(e),
            }
        }
    }

    let key = fallback_key(path);
    let mut store = fallback_store().lock();
    store.set(key, signals)
}

pub fn clear_personal_signals(path: &Path) -> Result<(), std::io::Error> {
    if !path.exists() || !path.is_file() {
        return Ok(());
    }

    if is_native_supported(path) {
        #[cfg(windows)]
        {
            match std::fs::remove_file(ads_rank_path(path)) {
                Ok(()) => return Ok(()),
                Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(()),
                Err(e) if should_fallback_from_native_error(&e) => {
                    tracing::debug!(
                        "ADS personal ranking clear failed for {:?}, falling back: {}",
                        path,
                        e
                    );
                }
                Err(e) => return Err(e),
            }
        }

        #[cfg(unix)]
        {
            match xattr::remove(path, XATTR_NAME) {
                Ok(()) => return Ok(()),
                Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(()),
                Err(e) if should_fallback_from_native_error(&e) => {
                    tracing::debug!(
                        "xattr personal ranking clear failed for {:?}, falling back: {}",
                        path,
                        e
                    );
                }
                Err(e) => return Err(e),
            }
        }
    }

    let key = fallback_key(path);
    let mut store = fallback_store().lock();
    store.remove(&key)
}

pub fn reset_learning_for_directory(directory: &Path) -> usize {
    let mut cleared = 0usize;
    if !directory.exists() {
        return 0;
    }

    for entry in walkdir::WalkDir::new(directory)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
    {
        if clear_personal_signals(entry.path()).is_ok() {
            cleared += 1;
        }
    }
    cleared
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;

    #[test]
    fn signals_binary_roundtrip() {
        let src = PersonalSignals {
            open_score: 2.5,
            last_open_ts: 12345,
            pinned: true,
            ignored: false,
        };
        let bytes = src.encode();
        let decoded = PersonalSignals::decode(&bytes).expect("decode");
        assert_eq!(decoded, src);
    }

    #[test]
    fn fallback_roundtrip() {
        let temp = NamedTempFile::new().expect("temp");
        let path = temp.path();
        let src = PersonalSignals {
            open_score: 1.0,
            last_open_ts: 42,
            pinned: false,
            ignored: true,
        };
        set_personal_signals(path, src).expect("set");
        let out = get_personal_signals(path).expect("get");
        assert!(out.is_some());
    }
}
