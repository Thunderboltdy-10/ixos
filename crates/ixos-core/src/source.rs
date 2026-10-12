//! Metadata permits reuse only after the timestamp has left the race window.
use std::{
    fs::Metadata,
    path::Path,
    time::{Duration, SystemTime},
};

#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) struct Stamp {
    pub size: u64,
    modified: SystemTime,
    identity: u128,
}

impl Stamp {
    pub fn read(path: &Path) -> std::io::Result<Self> {
        #[cfg(unix)]
        let (metadata, identity) = {
            use std::os::unix::fs::MetadataExt;
            let metadata = std::fs::symlink_metadata(path)?;
            let identity = (u128::from(metadata.dev()) << 64) | u128::from(metadata.ino());
            (metadata, identity)
        };
        #[cfg(windows)]
        let (metadata, identity) = {
            use std::os::windows::{fs::OpenOptionsExt, io::AsRawHandle};
            use windows_sys::Win32::Storage::FileSystem::{
                GetFileInformationByHandle, BY_HANDLE_FILE_INFORMATION,
                FILE_FLAG_OPEN_REPARSE_POINT, FILE_READ_ATTRIBUTES, FILE_SHARE_DELETE,
                FILE_SHARE_READ, FILE_SHARE_WRITE,
            };
            let file = std::fs::OpenOptions::new()
                .access_mode(FILE_READ_ATTRIBUTES)
                .share_mode(FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE)
                .custom_flags(FILE_FLAG_OPEN_REPARSE_POINT)
                .open(path)?;
            // SAFETY: the owned handle and output buffer remain live for this call.
            let mut info: BY_HANDLE_FILE_INFORMATION = unsafe { std::mem::zeroed() };
            if unsafe { GetFileInformationByHandle(file.as_raw_handle(), &mut info) } == 0 {
                return Err(std::io::Error::last_os_error());
            }
            let identity = (u128::from(info.dwVolumeSerialNumber) << 64)
                | (u128::from(info.nFileIndexHigh) << 32)
                | u128::from(info.nFileIndexLow);
            (file.metadata()?, identity)
        };
        Self::from_metadata(metadata, identity)
    }

    fn from_metadata(metadata: Metadata, identity: u128) -> std::io::Result<Self> {
        if !metadata.is_file() || metadata.file_type().is_symlink() {
            return Err(std::io::Error::other("Source is not a regular file"));
        }
        Ok(Self {
            size: metadata.len(),
            modified: metadata.modified()?,
            identity,
        })
    }

    pub fn reusable(&self, previous: &Self, observed: SystemTime) -> bool {
        self == previous
            && observed
                .duration_since(self.modified)
                .is_ok_and(|age| age > Duration::from_secs(2))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn recent_timestamps_and_replaced_files_require_hashing() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("source.txt");
        std::fs::write(&path, "same").unwrap();
        let now = SystemTime::now();
        let recent = Stamp::read(&path).unwrap();
        assert!(!recent.reusable(&recent, now));
        let old_time = now - Duration::from_secs(10);
        std::fs::OpenOptions::new()
            .write(true)
            .open(&path)
            .unwrap()
            .set_times(std::fs::FileTimes::new().set_modified(old_time))
            .unwrap();
        let old = Stamp::read(&path).unwrap();
        assert!(old.reusable(&old, now));
        let replacement = dir.path().join("replacement.txt");
        std::fs::write(&replacement, "edit").unwrap();
        std::fs::OpenOptions::new()
            .write(true)
            .open(&replacement)
            .unwrap()
            .set_times(std::fs::FileTimes::new().set_modified(old_time))
            .unwrap();
        std::fs::remove_file(&path).unwrap();
        std::fs::rename(replacement, &path).unwrap();
        assert!(!Stamp::read(&path).unwrap().reusable(&old, now));
    }
}
