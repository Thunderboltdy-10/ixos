//! Cross-platform secure storage wrapper for small secrets.

use thiserror::Error;

#[derive(Debug, Error)]
pub enum SecureStoreError {
    #[error("Secure storage error: {0}")]
    Storage(String),
    #[error("Unsupported OS for secure storage")]
    Unsupported,
}

pub struct SecureStore;

impl SecureStore {
    pub fn load(service: &str, account: &str) -> Result<Option<Vec<u8>>, SecureStoreError> {
        load_secret(service, account)
    }

    pub fn store(
        service: &str,
        account: &str,
        label: &str,
        secret: &[u8],
    ) -> Result<(), SecureStoreError> {
        store_secret(service, account, label, secret)
    }

    pub fn delete(service: &str, account: &str) -> Result<(), SecureStoreError> {
        delete_secret(service, account)
    }
}

#[cfg(target_os = "windows")]
fn load_secret(service: &str, account: &str) -> Result<Option<Vec<u8>>, SecureStoreError> {
    use std::ptr;
    use std::slice;

    use windows_sys::Win32::Foundation::{GetLastError, ERROR_NOT_FOUND};
    use windows_sys::Win32::Security::Credentials::{
        CredFree, CredReadW, CREDENTIALW, CRED_TYPE_GENERIC,
    };

    let target = to_wide(&format!("{}:{}", service, account));
    let mut cred_ptr: *mut CREDENTIALW = ptr::null_mut();
    let ok = unsafe { CredReadW(target.as_ptr(), CRED_TYPE_GENERIC, 0, &mut cred_ptr) };
    if ok == 0 {
        let err = unsafe { GetLastError() };
        if err == ERROR_NOT_FOUND {
            return Ok(None);
        }
        return Err(SecureStoreError::Storage(format!(
            "CredReadW failed: {}",
            err
        )));
    }

    let cred = unsafe { *cred_ptr };
    let data = unsafe {
        slice::from_raw_parts(cred.CredentialBlob, cred.CredentialBlobSize as usize).to_vec()
    };
    unsafe { CredFree(cred_ptr as *mut _) };

    Ok(Some(data))
}

#[cfg(target_os = "windows")]
fn store_secret(
    service: &str,
    account: &str,
    _label: &str,
    secret: &[u8],
) -> Result<(), SecureStoreError> {
    use std::mem;
    use std::ptr;

    use windows_sys::Win32::Security::Credentials::{
        CredWriteW, CREDENTIALW, CRED_PERSIST_LOCAL_MACHINE, CRED_TYPE_GENERIC,
    };

    let mut target = to_wide(&format!("{}:{}", service, account));
    let mut user = to_wide(account);

    let mut credential: CREDENTIALW = unsafe { mem::zeroed() };
    credential.Type = CRED_TYPE_GENERIC;
    credential.TargetName = target.as_mut_ptr();
    credential.UserName = user.as_mut_ptr();
    credential.CredentialBlobSize = secret.len() as u32;
    credential.CredentialBlob = secret.as_ptr() as *mut u8;
    credential.Persist = CRED_PERSIST_LOCAL_MACHINE;
    credential.AttributeCount = 0;
    credential.Attributes = ptr::null_mut();

    let ok = unsafe { CredWriteW(&mut credential, 0) };
    if ok == 0 {
        return Err(SecureStoreError::Storage("CredWriteW failed".to_string()));
    }

    Ok(())
}

#[cfg(target_os = "windows")]
fn delete_secret(service: &str, account: &str) -> Result<(), SecureStoreError> {
    use windows_sys::Win32::Foundation::{GetLastError, ERROR_NOT_FOUND};
    use windows_sys::Win32::Security::Credentials::{CredDeleteW, CRED_TYPE_GENERIC};

    let target = to_wide(&format!("{}:{}", service, account));
    let ok = unsafe { CredDeleteW(target.as_ptr(), CRED_TYPE_GENERIC, 0) };
    if ok == 0 {
        let err = unsafe { GetLastError() };
        if err == ERROR_NOT_FOUND {
            return Ok(());
        }
        return Err(SecureStoreError::Storage(format!(
            "CredDeleteW failed: {}",
            err
        )));
    }
    Ok(())
}

#[cfg(target_os = "windows")]
fn to_wide(value: &str) -> Vec<u16> {
    use std::os::windows::ffi::OsStrExt;
    std::ffi::OsStr::new(value)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect()
}

#[cfg(target_os = "macos")]
fn load_secret(service: &str, account: &str) -> Result<Option<Vec<u8>>, SecureStoreError> {
    use security_framework::passwords::get_generic_password;

    const ERR_SEC_ITEM_NOT_FOUND: i32 = -25300;

    match get_generic_password(service, account) {
        Ok(bytes) => Ok(Some(bytes)),
        Err(err) => {
            if err.code() == ERR_SEC_ITEM_NOT_FOUND {
                Ok(None)
            } else {
                Err(SecureStoreError::Storage(err.to_string()))
            }
        }
    }
}

#[cfg(target_os = "macos")]
fn store_secret(
    service: &str,
    account: &str,
    _label: &str,
    secret: &[u8],
) -> Result<(), SecureStoreError> {
    use security_framework::passwords::set_generic_password;

    set_generic_password(service, account, secret)
        .map_err(|err| SecureStoreError::Storage(err.to_string()))
}

#[cfg(target_os = "macos")]
fn delete_secret(service: &str, account: &str) -> Result<(), SecureStoreError> {
    use security_framework::passwords::delete_generic_password;

    delete_generic_password(service, account)
        .map_err(|err| SecureStoreError::Storage(err.to_string()))
}

#[cfg(target_os = "linux")]
fn load_secret(service: &str, account: &str) -> Result<Option<Vec<u8>>, SecureStoreError> {
    use secret_service::blocking::SecretService;
    use secret_service::EncryptionType;
    use std::collections::HashMap;

    let ss = SecretService::connect(EncryptionType::Dh)
        .map_err(|e| SecureStoreError::Storage(e.to_string()))?;
    let collection = ss
        .get_default_collection()
        .map_err(|e| SecureStoreError::Storage(e.to_string()))?;
    collection
        .unlock()
        .map_err(|e| SecureStoreError::Storage(e.to_string()))?;

    let mut attributes = HashMap::new();
    attributes.insert("application", service);
    attributes.insert("account", account);

    let items = collection
        .search_items(attributes)
        .map_err(|e| SecureStoreError::Storage(e.to_string()))?;
    if let Some(item) = items.first() {
        item.unlock()
            .map_err(|e| SecureStoreError::Storage(e.to_string()))?;
        let secret = item
            .get_secret()
            .map_err(|e| SecureStoreError::Storage(e.to_string()))?;
        return Ok(Some(secret));
    }

    Ok(None)
}

#[cfg(target_os = "linux")]
fn store_secret(
    service: &str,
    account: &str,
    label: &str,
    secret: &[u8],
) -> Result<(), SecureStoreError> {
    use secret_service::blocking::SecretService;
    use secret_service::EncryptionType;
    use std::collections::HashMap;

    let ss = SecretService::connect(EncryptionType::Dh)
        .map_err(|e| SecureStoreError::Storage(e.to_string()))?;
    let collection = ss
        .get_default_collection()
        .map_err(|e| SecureStoreError::Storage(e.to_string()))?;
    collection
        .unlock()
        .map_err(|e| SecureStoreError::Storage(e.to_string()))?;

    let mut attributes = HashMap::new();
    attributes.insert("application", service);
    attributes.insert("account", account);

    collection
        .create_item(label, attributes, secret, true, "application/octet-stream")
        .map_err(|e| SecureStoreError::Storage(e.to_string()))?;

    Ok(())
}

#[cfg(target_os = "linux")]
fn delete_secret(service: &str, account: &str) -> Result<(), SecureStoreError> {
    use secret_service::blocking::SecretService;
    use secret_service::EncryptionType;
    use std::collections::HashMap;

    let ss = SecretService::connect(EncryptionType::Dh)
        .map_err(|e| SecureStoreError::Storage(e.to_string()))?;
    let collection = ss
        .get_default_collection()
        .map_err(|e| SecureStoreError::Storage(e.to_string()))?;
    collection
        .unlock()
        .map_err(|e| SecureStoreError::Storage(e.to_string()))?;

    let mut attributes = HashMap::new();
    attributes.insert("application", service);
    attributes.insert("account", account);

    let items = collection
        .search_items(attributes)
        .map_err(|e| SecureStoreError::Storage(e.to_string()))?;
    for item in items {
        let _ = item.delete();
    }

    Ok(())
}

#[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
fn load_secret(_service: &str, _account: &str) -> Result<Option<Vec<u8>>, SecureStoreError> {
    Err(SecureStoreError::Unsupported)
}

#[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
fn store_secret(
    _service: &str,
    _account: &str,
    _label: &str,
    _secret: &[u8],
) -> Result<(), SecureStoreError> {
    Err(SecureStoreError::Unsupported)
}

#[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
fn delete_secret(_service: &str, _account: &str) -> Result<(), SecureStoreError> {
    Err(SecureStoreError::Unsupported)
}
