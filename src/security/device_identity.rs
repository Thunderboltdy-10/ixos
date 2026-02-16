//! Cryptographic device identity backed by OS secure storage.

use ed25519_dalek::{Signature, Signer, SigningKey};
use rand::rngs::OsRng;
use ring::digest::{digest, SHA512};
use thiserror::Error;
use zeroize::Zeroize;

use crate::security::crypto::sha256;

#[allow(dead_code)]
const KEY_SERVICE: &str = "ixos";
const KEY_ACCOUNT: &str = "device_identity_v1";
const KEY_LABEL: &str = "Ixos Device Identity";

#[derive(Debug, Clone)]
pub struct DeviceIdentity {
    signing_key: SigningKey,
    device_id: String,
}

impl DeviceIdentity {
    pub fn load_or_create() -> Result<Self, DeviceIdentityError> {
        let key_bytes = match load_key_bytes()? {
            Some(bytes) => bytes,
            None => {
                let signing_key = SigningKey::generate(&mut OsRng);
                let bytes = signing_key.to_bytes().to_vec();
                store_key_bytes(&bytes)?;
                bytes
            }
        };

        if key_bytes.len() != 32 {
            return Err(DeviceIdentityError::InvalidKeyLength(key_bytes.len()));
        }

        let mut key_array = [0u8; 32];
        key_array.copy_from_slice(&key_bytes);
        let signing_key = SigningKey::from_bytes(&key_array);
        let device_id = hex_encode(&sha256(&signing_key.verifying_key().to_bytes()));

        Ok(Self {
            signing_key,
            device_id,
        })
    }

    pub fn public_key(&self) -> [u8; 32] {
        self.signing_key.verifying_key().to_bytes()
    }

    pub fn device_id(&self) -> &str {
        &self.device_id
    }

    pub fn sign_challenge(&self, challenge: &[u8]) -> Signature {
        self.signing_key.sign(challenge)
    }

    /// Derive a deterministic symmetric key from the device signing key.
    ///
    /// Different `context` values produce different keys.
    pub fn derive_storage_key(&self, context: &str) -> [u8; 32] {
        let mut material = Vec::with_capacity(32 + context.len());
        material.extend_from_slice(&self.signing_key.to_bytes());
        material.extend_from_slice(context.as_bytes());
        sha256(&material)
    }

    /// Decrypt an envelope-encrypted symmetric key.
    ///
    /// Envelope format: [ephemeral_pubkey(32) | nonce(12) | ciphertext+tag]
    pub fn decrypt_envelope(&self, encrypted_key: &[u8]) -> Result<[u8; 32], DeviceIdentityError> {
        use chacha20poly1305::aead::{Aead, KeyInit};
        use chacha20poly1305::{ChaCha20Poly1305, Key, Nonce};
        use x25519_dalek::PublicKey;

        const PUBKEY_LEN: usize = 32;
        const NONCE_LEN: usize = 12;
        const KEY_LEN: usize = 32;

        if encrypted_key.len() < PUBKEY_LEN + NONCE_LEN + 16 {
            return Err(DeviceIdentityError::EnvelopeFormat(
                "Envelope too short".to_string(),
            ));
        }

        let (ephemeral_bytes, rest) = encrypted_key.split_at(PUBKEY_LEN);
        let (nonce_bytes, ciphertext) = rest.split_at(NONCE_LEN);

        let mut eph_array = [0u8; PUBKEY_LEN];
        eph_array.copy_from_slice(ephemeral_bytes);
        let ephemeral_pub = PublicKey::from(eph_array);

        let static_secret = ed25519_to_x25519_secret(&self.signing_key);

        let shared = static_secret.diffie_hellman(&ephemeral_pub);
        let key = Key::from_slice(shared.as_bytes());
        let cipher = ChaCha20Poly1305::new(key);
        let nonce = Nonce::from_slice(nonce_bytes);

        let plaintext = cipher
            .decrypt(nonce, ciphertext)
            .map_err(|_| DeviceIdentityError::EnvelopeFormat("Decrypt failed".to_string()))?;

        if plaintext.len() != KEY_LEN {
            return Err(DeviceIdentityError::EnvelopeFormat(
                "Invalid key length".to_string(),
            ));
        }

        let mut key_array = [0u8; KEY_LEN];
        key_array.copy_from_slice(&plaintext);
        Ok(key_array)
    }
}

fn ed25519_to_x25519_secret(signing_key: &SigningKey) -> x25519_dalek::StaticSecret {
    let mut seed = signing_key.to_bytes();
    let hash = digest(&SHA512, &seed);
    seed.zeroize();

    let mut expanded = [0u8; 64];
    expanded.copy_from_slice(hash.as_ref());

    expanded[0] &= 248;
    expanded[31] &= 127;
    expanded[31] |= 64;

    let mut scalar_bytes = [0u8; 32];
    scalar_bytes.copy_from_slice(&expanded[..32]);
    expanded.zeroize();

    x25519_dalek::StaticSecret::from(scalar_bytes)
}

#[derive(Debug, Error)]
pub enum DeviceIdentityError {
    #[error("Device identity storage error: {0}")]
    Storage(String),
    #[error("Invalid key length: {0}")]
    InvalidKeyLength(usize),
    #[error("Envelope error: {0}")]
    EnvelopeFormat(String),
}

fn hex_encode(bytes: &[u8]) -> String {
    let mut out = String::with_capacity(bytes.len() * 2);
    for b in bytes {
        use std::fmt::Write;
        let _ = write!(out, "{:02x}", b);
    }
    out
}

#[cfg(target_os = "windows")]
fn load_key_bytes() -> Result<Option<Vec<u8>>, DeviceIdentityError> {
    use std::ptr;
    use std::slice;

    use windows_sys::Win32::Foundation::{GetLastError, ERROR_NOT_FOUND};
    use windows_sys::Win32::Security::Credentials::{
        CredFree, CredReadW, CREDENTIALW, CRED_TYPE_GENERIC,
    };

    let target = to_wide(KEY_LABEL);
    let mut cred_ptr: *mut CREDENTIALW = ptr::null_mut();
    let ok = unsafe { CredReadW(target.as_ptr(), CRED_TYPE_GENERIC, 0, &mut cred_ptr) };
    if ok == 0 {
        let err = unsafe { GetLastError() };
        if err == ERROR_NOT_FOUND {
            return Ok(None);
        }
        return Err(DeviceIdentityError::Storage(format!(
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
fn store_key_bytes(key_bytes: &[u8]) -> Result<(), DeviceIdentityError> {
    use std::mem;
    use std::ptr;

    use windows_sys::Win32::Security::Credentials::{
        CredWriteW, CREDENTIALW, CRED_PERSIST_LOCAL_MACHINE, CRED_TYPE_GENERIC,
    };

    let mut target = to_wide(KEY_LABEL);
    let mut user = to_wide(KEY_ACCOUNT);

    let mut credential: CREDENTIALW = unsafe { mem::zeroed() };
    credential.Type = CRED_TYPE_GENERIC;
    credential.TargetName = target.as_mut_ptr();
    credential.UserName = user.as_mut_ptr();
    credential.CredentialBlobSize = key_bytes.len() as u32;
    credential.CredentialBlob = key_bytes.as_ptr() as *mut u8;
    credential.Persist = CRED_PERSIST_LOCAL_MACHINE;
    credential.AttributeCount = 0;
    credential.Attributes = ptr::null_mut();

    let ok = unsafe { CredWriteW(&mut credential, 0) };
    if ok == 0 {
        return Err(DeviceIdentityError::Storage(
            "CredWriteW failed".to_string(),
        ));
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
fn load_key_bytes() -> Result<Option<Vec<u8>>, DeviceIdentityError> {
    use security_framework::passwords::get_generic_password;

    const ERR_SEC_ITEM_NOT_FOUND: i32 = -25300;

    match get_generic_password(KEY_SERVICE, KEY_ACCOUNT) {
        Ok(bytes) => Ok(Some(bytes)),
        Err(err) => {
            if err.code() == ERR_SEC_ITEM_NOT_FOUND {
                Ok(None)
            } else {
                Err(DeviceIdentityError::Storage(err.to_string()))
            }
        }
    }
}

#[cfg(target_os = "macos")]
fn store_key_bytes(key_bytes: &[u8]) -> Result<(), DeviceIdentityError> {
    use security_framework::passwords::set_generic_password;

    set_generic_password(KEY_SERVICE, KEY_ACCOUNT, key_bytes)
        .map_err(|err| DeviceIdentityError::Storage(err.to_string()))
}

#[cfg(target_os = "linux")]
fn load_key_bytes() -> Result<Option<Vec<u8>>, DeviceIdentityError> {
    use secret_service::blocking::SecretService;
    use secret_service::EncryptionType;
    use std::collections::HashMap;

    let ss = SecretService::connect(EncryptionType::Dh)
        .map_err(|e| DeviceIdentityError::Storage(e.to_string()))?;
    let collection = ss
        .get_default_collection()
        .map_err(|e| DeviceIdentityError::Storage(e.to_string()))?;
    collection
        .unlock()
        .map_err(|e| DeviceIdentityError::Storage(e.to_string()))?;

    let mut attributes = HashMap::new();
    attributes.insert("application", KEY_SERVICE);
    attributes.insert("account", KEY_ACCOUNT);

    let items = collection
        .search_items(attributes)
        .map_err(|e| DeviceIdentityError::Storage(e.to_string()))?;
    if let Some(item) = items.first() {
        item.unlock()
            .map_err(|e| DeviceIdentityError::Storage(e.to_string()))?;
        let secret = item
            .get_secret()
            .map_err(|e| DeviceIdentityError::Storage(e.to_string()))?;
        return Ok(Some(secret));
    }

    Ok(None)
}

#[cfg(target_os = "linux")]
fn store_key_bytes(key_bytes: &[u8]) -> Result<(), DeviceIdentityError> {
    use secret_service::blocking::SecretService;
    use secret_service::EncryptionType;
    use std::collections::HashMap;

    let ss = SecretService::connect(EncryptionType::Dh)
        .map_err(|e| DeviceIdentityError::Storage(e.to_string()))?;
    let collection = ss
        .get_default_collection()
        .map_err(|e| DeviceIdentityError::Storage(e.to_string()))?;
    collection
        .unlock()
        .map_err(|e| DeviceIdentityError::Storage(e.to_string()))?;

    let mut attributes = HashMap::new();
    attributes.insert("application", KEY_SERVICE);
    attributes.insert("account", KEY_ACCOUNT);

    collection
        .create_item(
            KEY_LABEL,
            attributes,
            key_bytes,
            true,
            "application/octet-stream",
        )
        .map_err(|e| DeviceIdentityError::Storage(e.to_string()))?;

    Ok(())
}

#[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
fn load_key_bytes() -> Result<Option<Vec<u8>>, DeviceIdentityError> {
    Err(DeviceIdentityError::Storage(
        "Unsupported OS for secure storage".to_string(),
    ))
}

#[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
fn store_key_bytes(_key_bytes: &[u8]) -> Result<(), DeviceIdentityError> {
    Err(DeviceIdentityError::Storage(
        "Unsupported OS for secure storage".to_string(),
    ))
}
