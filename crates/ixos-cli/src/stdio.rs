//! A protocol stream only its transport can write to. Libraries may print, and a
//! printed line must neither corrupt a frame nor wait on a lock held for the session.
use std::fs::File;

/// Returns the original stdout and sends everything else printed there to stderr.
#[cfg(windows)]
pub fn protocol_output() -> anyhow::Result<File> {
    use std::os::windows::io::FromRawHandle;
    use windows_sys::Win32::{
        Foundation::INVALID_HANDLE_VALUE,
        System::Console::{GetStdHandle, SetStdHandle, STD_ERROR_HANDLE, STD_OUTPUT_HANDLE},
    };
    // SAFETY: the process's standard handles are read and replaced once, before any
    // other thread starts, and the original handle is owned from here on.
    unsafe {
        let output = GetStdHandle(STD_OUTPUT_HANDLE);
        anyhow::ensure!(
            !output.is_null() && output != INVALID_HANDLE_VALUE,
            "Standard output is unavailable"
        );
        SetStdHandle(STD_OUTPUT_HANDLE, GetStdHandle(STD_ERROR_HANDLE));
        Ok(File::from_raw_handle(output))
    }
}

/// Returns the original stdout and sends everything else printed there to stderr.
#[cfg(unix)]
pub fn protocol_output() -> anyhow::Result<File> {
    use std::os::unix::io::FromRawFd;
    // SAFETY: these standard descriptors stay open; the duplicate is owned from here on.
    unsafe {
        let output = libc::dup(libc::STDOUT_FILENO);
        anyhow::ensure!(output >= 0, "Standard output is unavailable");
        libc::dup2(libc::STDERR_FILENO, libc::STDOUT_FILENO);
        Ok(File::from_raw_fd(output))
    }
}
