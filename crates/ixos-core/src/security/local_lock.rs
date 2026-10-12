//! Short-lived file locks for application-owned state, never for searched files.
use std::fs::{File, OpenOptions};
use std::io;
use std::path::Path;

pub fn exclusive(path: &Path) -> io::Result<File> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let file = OpenOptions::new()
        .read(true)
        .write(true)
        .create(true)
        .truncate(false)
        .open(path)?;
    file.lock()?;
    Ok(file) // Dropping the handle releases the OS lock.
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn separate_handles_serialize_state_updates() {
        let root = tempfile::tempdir().unwrap();
        let lock_path = root.path().join("state.lock");
        let data_path = root.path().join("count");
        std::fs::write(&data_path, "0").unwrap();
        let threads: Vec<_> = (0..8)
            .map(|_| {
                let lock_path = lock_path.clone();
                let data_path = data_path.clone();
                std::thread::spawn(move || {
                    for _ in 0..20 {
                        let _guard = exclusive(&lock_path).unwrap();
                        let count: usize = std::fs::read_to_string(&data_path)
                            .unwrap()
                            .parse()
                            .unwrap();
                        std::fs::write(&data_path, (count + 1).to_string()).unwrap();
                    }
                })
            })
            .collect();
        for thread in threads {
            thread.join().unwrap();
        }
        assert_eq!(std::fs::read_to_string(data_path).unwrap(), "160");
    }
}
