//! Metadata stream writes preserve the primary file and its timestamps.
use std::fs;
use std::io::Write;
use std::os::windows::fs::OpenOptionsExt;
use std::os::windows::io::AsRawHandle;
use std::path::Path;
/// Disable automatic access/write timestamp updates from THIS metadata handle.
/// No previously read timestamp is restored, so concurrent primary writes retain
/// their own timestamps. Stream updates can still generate filesystem events.
fn suppress_handle_times(file: &fs::File) -> std::io::Result<()> {
    use windows_sys::Win32::{Foundation::FILETIME, Storage::FileSystem::SetFileTime};
    let unchanged = FILETIME {
        dwLowDateTime: u32::MAX,
        dwHighDateTime: u32::MAX,
    };
    // SAFETY: the File owns a live handle; pointers address initialized FILETIME
    // values for this synchronous call. All-ones is the documented suppression
    // sentinel, not a timestamp value to assign to the source.
    if unsafe {
        SetFileTime(
            file.as_raw_handle(),
            std::ptr::null(),
            &unchanged,
            &unchanged,
        )
    } == 0
    {
        return Err(std::io::Error::last_os_error());
    }
    Ok(())
}

pub(crate) fn write_metadata_stream(path: &Path, name: &str, data: &[u8]) -> std::io::Result<()> {
    use windows_sys::Win32::Storage::FileSystem::{FILE_SHARE_READ, FILE_SHARE_WRITE};
    // Open the primary first and prevent rename/delete for this short write.
    // A missing primary must never be recreated just to attach cached metadata.
    let _primary = fs::OpenOptions::new()
        .read(true)
        .share_mode(FILE_SHARE_READ | FILE_SHARE_WRITE)
        .open(path)?;
    let mut stream = path.as_os_str().to_owned();
    stream.push(name);
    // Truncate only AFTER suppression. CREATE_ALWAYS would modify the stream
    // before its handle has been configured.
    let mut file = fs::OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(false)
        .open(stream)?;
    suppress_handle_times(&file)?;
    file.set_len(0)?;
    file.write_all(data)
}

pub(crate) fn remove_metadata_stream(stream: &Path) -> std::io::Result<()> {
    use windows_sys::Win32::Storage::FileSystem::{
        FileDispositionInfo, SetFileInformationByHandle, DELETE, FILE_DISPOSITION_INFO,
        FILE_WRITE_ATTRIBUTES,
    };
    let file = fs::OpenOptions::new()
        .access_mode(DELETE | FILE_WRITE_ATTRIBUTES)
        .open(stream)?;
    suppress_handle_times(&file)?;
    let disposition = FILE_DISPOSITION_INFO { DeleteFile: 1 };
    // SAFETY: live owned handle and correctly sized/initialized synchronous
    // disposition structure. This deletes the named metadata stream on close.
    if unsafe {
        SetFileInformationByHandle(
            file.as_raw_handle(),
            FileDispositionInfo,
            &disposition as *const _ as *const std::ffi::c_void,
            std::mem::size_of::<FILE_DISPOSITION_INFO>() as u32,
        )
    } == 0
    {
        return Err(std::io::Error::last_os_error());
    }
    Ok(())
}
