//! Compact records in file metadata with an application-cache LMDB
//! fallback. No ordinary cache files are created beside searched documents.
use super::record::{unit, Passage};
use crate::digest::sha256;
use heed::{types::Bytes, Database, Env, EnvOpenOptions};
#[cfg(windows)]
use std::io::Read;
use std::path::Path;
#[cfg(windows)]
use std::path::PathBuf;
use xxhash_rust::xxh3::xxh3_64;

const MAX_RECORD: usize = 40 * 1024;
#[cfg(unix)]
const NAME: &str = "user.ixos";

pub struct DocumentCache {
    model_fingerprint: [u8; 32],
    fallback: Option<(Env, Database<Bytes, Bytes>)>,
}

impl DocumentCache {
    pub fn new(model_fingerprint: [u8; 32]) -> Self {
        Self {
            model_fingerprint,
            fallback: None,
        }
    }
    fn database(&mut self) -> anyhow::Result<&(Env, Database<Bytes, Bytes>)> {
        if self.fallback.is_none() {
            let directory = dirs::cache_dir()
                .ok_or_else(|| anyhow::anyhow!("No application cache directory"))?
                .join("ixos/records");
            std::fs::create_dir_all(&directory)?;
            // Opening one environment per DocumentCache/engine keeps ownership
            // explicit. LMDB serializes process writes; no source folder files.
            let env = unsafe {
                EnvOpenOptions::new()
                    .map_size(64 * 1024 * 1024)
                    .max_dbs(1)
                    .open(directory)?
            };
            let mut txn = env.write_txn()?;
            let db = env.create_database::<Bytes, Bytes>(&mut txn, Some("documents"))?;
            txn.commit()?;
            self.fallback = Some((env, db));
        }
        Ok(self.fallback.as_ref().unwrap())
    }
    fn path_key(path: &Path) -> [u8; 32] {
        sha256(path.as_os_str().as_encoded_bytes())
    }
    pub fn get_prefetched(
        &mut self,
        path: &Path,
        source: &[u8; 32],
        native: Option<Vec<u8>>,
    ) -> Option<(Vec<Passage>, &'static str)> {
        if let Some(data) = native {
            if let Ok(rows) = decode(&data, &self.model_fingerprint, source) {
                return Some((rows, "native"));
            }
        }
        // A successful native write avoids creating the fallback database. On
        // misses, consult an existing fallback only, never initialize it to read.
        let directory = dirs::cache_dir()?.join("ixos/records");
        if self.fallback.is_none() && !directory.join("data.mdb").exists() {
            return None;
        }
        let key = Self::path_key(path);
        let data = {
            let (env, db) = self.database().ok()?;
            let txn = env.read_txn().ok()?;
            let stored = db.get(&txn, &key).ok()??;
            if stored.len() > MAX_RECORD {
                return None;
            }
            stored.to_vec()
        };
        decode(&data, &self.model_fingerprint, source)
            .ok()
            .map(|rows| (rows, "application-db"))
    }
    pub fn set(
        &mut self,
        path: &Path,
        source: &[u8; 32],
        rows: &[Passage],
    ) -> anyhow::Result<&'static str> {
        let data = encode(rows, &self.model_fingerprint, source)?;
        if native_write(path, &data).is_ok() {
            return Ok("native");
        }
        let key = Self::path_key(path);
        let (env, db) = self.database()?;
        let mut txn = env.write_txn()?;
        db.put(&mut txn, &key, &data)?;
        txn.commit()?;
        Ok("application-db")
    }
    /// Inspect current-source records without loading a particular model.
    /// Validity here is not a promise that the next search's model_fingerprint will match.
    pub fn inspect(&mut self, path: &Path, source: &[u8; 32], text: &str) -> (bool, bool, usize) {
        let native = native_read(path).ok().flatten();
        let fallback = (|| -> Option<Vec<u8>> {
            let exists = dirs::cache_dir()?.join("ixos/records/data.mdb").exists();
            if !exists && self.fallback.is_none() {
                return None;
            }
            let (env, db) = self.database().ok()?;
            let txn = env.read_txn().ok()?;
            Some(
                db.get(&txn, &Self::path_key(path))
                    .ok()??
                    .iter()
                    .take(MAX_RECORD + 1)
                    .copied()
                    .collect(),
            )
        })();
        let mut present = false;
        let mut size = 0;
        for data in native.into_iter().chain(fallback) {
            present = true;
            size = data.len();
            let Some(model_fingerprint) =
                data.get(5..37).and_then(|s| <[u8; 32]>::try_from(s).ok())
            else {
                continue;
            };
            if let Ok(rows) = decode(&data, &model_fingerprint, source) {
                if rows.iter().all(|p| {
                    p.end_byte <= text.len()
                        && text.is_char_boundary(p.start_byte)
                        && text.is_char_boundary(p.end_byte)
                        && p.end_line <= text.split('\n').count()
                        && p.vector.iter().all(|v| v.is_finite())
                }) {
                    return (true, true, size);
                }
            }
        }
        (present, false, size)
    }
    pub fn remove_fallback(&mut self, path: &Path) {
        if let Some((env, db)) = &self.fallback {
            if let Ok(mut txn) = env.write_txn() {
                let _ = db.delete(&mut txn, &Self::path_key(path));
                let _ = txn.commit();
            }
        }
    }
    /// Clear the document record without touching primary bytes.
    pub fn remove(&mut self, path: &Path) -> anyhow::Result<bool> {
        let mut removed = false;
        if native_read(path).ok().flatten().is_some() {
            native_delete(path)?;
            removed = true;
        }
        let exists = dirs::cache_dir()
            .is_some_and(|directory| directory.join("ixos/records/data.mdb").exists());
        if exists || self.fallback.is_some() {
            let key = Self::path_key(path);
            let (env, db) = self.database()?;
            let mut txn = env.write_txn()?;
            removed |= db.delete(&mut txn, &key)?;
            txn.commit()?;
        }
        Ok(removed)
    }
}

pub(super) fn prefetch(path: &Path) -> Option<Vec<u8>> {
    native_read(path).ok().flatten()
}

fn row_scale(vector: &[f32]) -> f32 {
    let maximum = vector.iter().map(|v| v.abs()).fold(0.0f32, f32::max);
    if maximum > 0.0 {
        maximum / 127.0
    } else {
        1.0
    }
}

fn row_byte(value: f32, scale: f32) -> u8 {
    (value / scale).round().clamp(-127.0, 127.0) as i8 as u8
}

/// The same single storage round-trip used by native-record decoding. Call on
/// original model output, after serializing it if persistence is requested.
pub(super) fn quantize(vector: &mut [f32]) {
    let scale = row_scale(vector);
    for value in vector.iter_mut() {
        *value = (row_byte(*value, scale) as i8 as f32) * scale;
    }
    unit(vector);
}

fn encode(
    rows: &[Passage],
    model_fingerprint: &[u8; 32],
    source: &[u8; 32],
) -> anyhow::Result<Vec<u8>> {
    anyhow::ensure!(!rows.is_empty() && rows.len() <= 8, "Invalid passage count");
    let dims = rows[0].vector.len();
    anyhow::ensure!(dims > 0 && dims <= 4096, "Invalid vector dimensions");
    let mut data = b"IXOS".to_vec();
    data.push(1);
    data.extend_from_slice(model_fingerprint);
    data.extend_from_slice(source);
    data.extend_from_slice(&(dims as u16).to_le_bytes());
    data.push(rows.len() as u8);
    for row in rows {
        anyhow::ensure!(
            row.vector.len() == dims && row.vector.iter().all(|v| v.is_finite()),
            "Invalid vector values"
        );
        data.extend_from_slice(&(row.start_byte as u64).to_le_bytes());
        data.extend_from_slice(&(row.end_byte as u64).to_le_bytes());
        data.extend_from_slice(&(row.start_line as u32).to_le_bytes());
        data.extend_from_slice(&(row.end_line as u32).to_le_bytes());
        let scale = row_scale(&row.vector);
        data.extend_from_slice(&scale.to_le_bytes());
        data.extend(row.vector.iter().map(|v| row_byte(*v, scale)));
    }
    let checksum = xxh3_64(&data);
    data.extend_from_slice(&checksum.to_le_bytes());
    anyhow::ensure!(
        data.len() <= MAX_RECORD,
        "Document metadata exceeds record cap"
    );
    Ok(data)
}

fn decode(
    data: &[u8],
    model_fingerprint: &[u8; 32],
    source: &[u8; 32],
) -> anyhow::Result<Vec<Passage>> {
    anyhow::ensure!(
        data.len() >= 80 && data.len() <= MAX_RECORD,
        "Invalid document metadata size"
    );
    let payload = data.len() - 8;
    anyhow::ensure!(
        xxh3_64(&data[..payload]) == u64::from_le_bytes(data[payload..].try_into()?),
        "Invalid record checksum"
    );
    anyhow::ensure!(
        &data[..4] == b"IXOS"
            && data[4] == 1
            && &data[5..37] == model_fingerprint
            && &data[37..69] == source,
        "Record is for another model or source"
    );
    let dims = u16::from_le_bytes(data[69..71].try_into()?) as usize;
    let count = data[71] as usize;
    anyhow::ensure!(
        dims > 0 && dims <= 4096 && count > 0 && count <= 8 && payload == 72 + count * (28 + dims),
        "Invalid document record shape"
    );
    let mut rows = Vec::new();
    for i in 0..count {
        let at = 72 + i * (28 + dims);
        let start_byte = usize::try_from(u64::from_le_bytes(data[at..at + 8].try_into()?))?;
        let end_byte = usize::try_from(u64::from_le_bytes(data[at + 8..at + 16].try_into()?))?;
        let start_line = u32::from_le_bytes(data[at + 16..at + 20].try_into()?) as usize;
        let end_line = u32::from_le_bytes(data[at + 20..at + 24].try_into()?) as usize;
        let scale = f32::from_le_bytes(data[at + 24..at + 28].try_into()?);
        anyhow::ensure!(
            scale.is_finite()
                && scale > 0.0
                && start_byte < end_byte
                && start_line > 0
                && end_line >= start_line,
            "Invalid document locators/scale"
        );
        let mut vector: Vec<f32> = data[at + 28..at + 28 + dims]
            .iter()
            .map(|v| (*v as i8 as f32) * scale)
            .collect();
        anyhow::ensure!(
            vector.iter().all(|value| value.is_finite()),
            "Invalid record vector values"
        );
        unit(&mut vector);
        rows.push(Passage {
            start_byte,
            end_byte,
            start_line,
            end_line,
            vector,
        });
    }
    Ok(rows)
}

#[cfg(windows)]
fn stream(path: &Path) -> PathBuf {
    let mut name = path.as_os_str().to_owned();
    name.push(":ixos");
    PathBuf::from(name)
}
#[cfg(windows)]
fn native_read(path: &Path) -> std::io::Result<Option<Vec<u8>>> {
    let file = match std::fs::File::open(stream(path)) {
        Ok(file) => file,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(e) => return Err(e),
    };
    let mut data = Vec::new();
    file.take((MAX_RECORD + 1) as u64).read_to_end(&mut data)?;
    Ok(Some(data))
}
#[cfg(windows)]
fn native_write(path: &Path, data: &[u8]) -> std::io::Result<()> {
    crate::metadata_windows::write_metadata_stream(path, ":ixos", data)
}
#[cfg(windows)]
fn native_delete(path: &Path) -> std::io::Result<()> {
    crate::metadata_windows::remove_metadata_stream(&stream(path))
}
#[cfg(unix)]
fn native_read(path: &Path) -> std::io::Result<Option<Vec<u8>>> {
    xattr::get(path, NAME)
}
#[cfg(unix)]
fn native_write(path: &Path, data: &[u8]) -> std::io::Result<()> {
    xattr::set(path, NAME, data)
}
#[cfg(unix)]
fn native_delete(path: &Path) -> std::io::Result<()> {
    xattr::remove(path, NAME)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn serialized_original_rows_match_single_ram_round_trip_exactly() {
        for dims in [1, 64, 256, 512, 4096] {
            for variant in 0..8 {
                let raw: Vec<f32> = (0..dims)
                    .map(|i| match variant {
                        0 => 0.0,
                        1 => -0.0,
                        2 => 0.5,
                        3 => -0.5,
                        _ => ((i * 17 + variant * 23) as f32).sin() * 0.11,
                    })
                    .collect();
                let row = Passage {
                    start_byte: 0,
                    end_byte: 100,
                    start_line: 1,
                    end_line: 3,
                    vector: raw.clone(),
                };
                let decoded = decode(
                    &encode(&[row], &[1; 32], &[2; 32]).unwrap(),
                    &[1; 32],
                    &[2; 32],
                )
                .unwrap();
                let mut ram = raw;
                quantize(&mut ram);
                assert_eq!(
                    ram.iter().map(|v| v.to_bits()).collect::<Vec<_>>(),
                    decoded[0]
                        .vector
                        .iter()
                        .map(|v| v.to_bits())
                        .collect::<Vec<_>>()
                );
            }
        }
    }

    #[test]
    fn compact_record_rejects_stale_tampered_and_keeps_all_dimensions() {
        let row = Passage {
            start_byte: 0,
            end_byte: 100,
            start_line: 1,
            end_line: 3,
            vector: (0..512).map(|i| i as f32 / 512.0).collect(),
        };
        let mut data = encode(&[row], &[1; 32], &[2; 32]).unwrap();
        let decoded = decode(&data, &[1; 32], &[2; 32]).unwrap();
        assert_eq!(decoded[0].vector.len(), 512);
        assert_eq!(data.len(), 620);
        assert!(decode(&data, &[4; 32], &[2; 32]).is_err());
        assert!(decode(&data, &[1; 32], &[4; 32]).is_err());
        data[101] ^= 1;
        assert!(decode(&data, &[1; 32], &[2; 32]).is_err());
    }
    #[test]
    fn native_record_survives_rename_and_never_modifies_primary_bytes() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("a.txt");
        std::fs::write(&path, "unchanged source").unwrap();
        let modified = std::fs::metadata(&path).unwrap().modified().unwrap();
        let rows = vec![Passage {
            start_byte: 0,
            end_byte: 16,
            start_line: 1,
            end_line: 1,
            vector: vec![0.1; 256],
        }];
        let data = encode(&rows, &[1; 32], &[2; 32]).unwrap();
        if native_write(&path, &data).is_err() {
            return;
        } // FS capabilities are platform dependent.
        let moved = directory.path().join("moved.txt");
        std::fs::rename(&path, &moved).unwrap();
        assert_eq!(std::fs::read(&moved).unwrap(), b"unchanged source");
        assert!(decode(&native_read(&moved).unwrap().unwrap(), &[1; 32], &[2; 32]).is_ok());
        assert_eq!(std::fs::read_dir(directory.path()).unwrap().count(), 1);
        native_delete(&moved).unwrap();
        assert!(native_read(&moved).unwrap().is_none());
        assert_eq!(std::fs::read(&moved).unwrap(), b"unchanged source");
        assert_eq!(
            std::fs::metadata(&moved).unwrap().modified().unwrap(),
            modified
        );
    }
}
