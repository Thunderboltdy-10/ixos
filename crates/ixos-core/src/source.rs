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
    // Unlike mtime, these OS change indicators also move when a writer restores
    // the original modification time after an in-place edit.
    changed: i128,
}

impl Stamp {
    pub fn read(path: &Path) -> std::io::Result<Self> {
        #[cfg(unix)]
        let (metadata, identity, changed) = {
            use std::os::unix::fs::MetadataExt;
            let metadata = std::fs::symlink_metadata(path)?;
            let identity = (u128::from(metadata.dev()) << 64) | u128::from(metadata.ino());
            let changed =
                i128::from(metadata.ctime()) * 1_000_000_000 + i128::from(metadata.ctime_nsec());
            (metadata, identity, changed)
        };
        #[cfg(windows)]
        let (metadata, identity, changed) = {
            use std::os::windows::{fs::OpenOptionsExt, io::AsRawHandle};
            use windows_sys::Win32::Storage::FileSystem::{
                FileBasicInfo, GetFileInformationByHandle, GetFileInformationByHandleEx,
                BY_HANDLE_FILE_INFORMATION, FILE_BASIC_INFO, FILE_FLAG_OPEN_REPARSE_POINT,
                FILE_READ_ATTRIBUTES, FILE_SHARE_DELETE, FILE_SHARE_READ, FILE_SHARE_WRITE,
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
            // SAFETY: the live file handle and correctly sized output buffer are
            // valid for the duration of this synchronous metadata query.
            let mut basic: FILE_BASIC_INFO = unsafe { std::mem::zeroed() };
            if unsafe {
                GetFileInformationByHandleEx(
                    file.as_raw_handle(),
                    FileBasicInfo,
                    (&mut basic as *mut FILE_BASIC_INFO).cast(),
                    std::mem::size_of::<FILE_BASIC_INFO>() as u32,
                )
            } == 0
            {
                // An unavailable change indicator disables metadata reuse. The
                // caller still reads/hashes this source through its normal path.
                return Err(std::io::Error::last_os_error());
            }
            let identity = (u128::from(info.dwVolumeSerialNumber) << 64)
                | (u128::from(info.nFileIndexHigh) << 32)
                | u128::from(info.nFileIndexLow);
            (file.metadata()?, identity, i128::from(basic.ChangeTime))
        };
        Self::from_metadata(metadata, identity, changed)
    }

    fn from_metadata(metadata: Metadata, identity: u128, changed: i128) -> std::io::Result<Self> {
        if !metadata.is_file() || metadata.file_type().is_symlink() || identity == 0 {
            return Err(std::io::Error::other("Source is not a regular file"));
        }
        Ok(Self {
            size: metadata.len(),
            modified: metadata.modified()?,
            identity,
            changed,
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
    fn in_place_edit_with_restored_size_and_mtime_requires_hashing() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("source.txt");
        let old_time = SystemTime::now() - Duration::from_secs(60);
        let write = |text: &str| {
            std::fs::write(&path, text).unwrap();
            std::fs::OpenOptions::new()
                .write(true)
                .open(&path)
                .unwrap()
                .set_times(std::fs::FileTimes::new().set_modified(old_time))
                .unwrap();
        };
        write("before");
        let before = Stamp::read(&path).unwrap();
        std::thread::sleep(Duration::from_millis(5));
        write("edited");
        let after = Stamp::read(&path).unwrap();
        assert_eq!(before.size, after.size);
        assert_eq!(before.modified, after.modified);
        assert_eq!(before.identity, after.identity);
        assert!(!after.reusable(&before, SystemTime::now()));
    }
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
