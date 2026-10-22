//! The normal owner kills/waits on drop. Windows also closes an owned process
//! job if the desktop exits abruptly, so a busy worker cannot outlive it.
use std::process::Child;
pub(super) struct Owner {
    #[cfg(windows)]
    _job: std::os::windows::io::OwnedHandle,
}
impl Owner {
    pub(super) fn attach(child: &Child) -> anyhow::Result<Self> {
        #[cfg(windows)]
        {
            use std::os::windows::io::{AsRawHandle, FromRawHandle, OwnedHandle};
            use windows_sys::Win32::System::JobObjects::{
                AssignProcessToJobObject, CreateJobObjectW, JobObjectExtendedLimitInformation,
                SetInformationJobObject, JOBOBJECT_EXTENDED_LIMIT_INFORMATION,
                JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
            };
            // SAFETY: null names/security request an unnamed owned job. The
            // returned handle is checked and immediately wrapped in RAII.
            let handle = unsafe { CreateJobObjectW(std::ptr::null(), std::ptr::null()) };
            anyhow::ensure!(
                !handle.is_null(),
                "Create runtime ownership job: {}",
                std::io::Error::last_os_error()
            );
            let job = unsafe { OwnedHandle::from_raw_handle(handle) };
            let mut limits: JOBOBJECT_EXTENDED_LIMIT_INFORMATION = unsafe { std::mem::zeroed() };
            limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
            // SAFETY: the handle, child handle and correctly sized limit
            // structure remain live for these synchronous ownership calls.
            anyhow::ensure!(
                unsafe {
                    SetInformationJobObject(
                        handle,
                        JobObjectExtendedLimitInformation,
                        (&limits as *const JOBOBJECT_EXTENDED_LIMIT_INFORMATION).cast(),
                        std::mem::size_of_val(&limits) as u32,
                    )
                } != 0,
                "Set runtime ownership: {}",
                std::io::Error::last_os_error()
            );
            anyhow::ensure!(
                unsafe { AssignProcessToJobObject(handle, child.as_raw_handle()) } != 0,
                "Own runtime process: {}",
                std::io::Error::last_os_error()
            );
            Ok(Self { _job: job })
        }
        #[cfg(not(windows))]
        {
            let _ = child;
            Ok(Self {})
        }
    }
}
