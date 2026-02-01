use std::ffi::{CStr, CString};
use std::os::raw::c_char;

use base64::{engine::general_purpose::STANDARD, Engine as _};
use chacha20poly1305::aead::{Aead, KeyInit};
use chacha20poly1305::{ChaCha20Poly1305, Key, Nonce};
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use libloading::{Library, Symbol};
use std::mem::ManuallyDrop;
use tempfile::TempPath;

use ixos_protocol::ixos_rank::ProcessedQuery;
use ixos_protocol::security::DeviceIdentity;

#[derive(Debug, thiserror::Error)]
pub enum ProModuleError {
    #[error("Missing entitlement token")]
    MissingEntitlement,
    #[error("Configuration error: {0}")]
    Config(String),
    #[error("Network error: {0}")]
    Network(String),
    #[error("Crypto error: {0}")]
    Crypto(String),
    #[error("Signature verification failed")]
    Signature,
    #[error("FFI error: {0}")]
    Ffi(String),
    #[error("I/O error: {0}")]
    Io(String),
}

pub struct ProModule {
    library: ManuallyDrop<Library>,
    temp_path: TempPath,
}

#[derive(Debug, serde::Serialize)]
struct AskModePlusInput {
    query: String,
    anchors: Vec<String>,
    passages: Option<Vec<String>>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct AskModePlusResult {
    pub normalized_query: String,
    pub entities: Vec<ProEntity>,
    pub normalized_time: Option<String>,
    pub expanded_anchors: Vec<String>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct ProEntity {
    pub kind: String,
    pub value: String,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct AnswerCard {
    pub answer: Option<String>,
    pub answer_type: String,
    pub confidence: f32,
}

impl ProModule {
    pub async fn download_and_load(
        device: DeviceIdentity,
        entitlement: String,
    ) -> Result<Self, ProModuleError> {
        let base_url = std::env::var("IXOS_PRO_MODULE_BASE_URL")
            .map_err(|_| ProModuleError::Config("IXOS_PRO_MODULE_BASE_URL missing".into()))?;
        let version = std::env::var("IXOS_PRO_MODULE_VERSION")
            .map_err(|_| ProModuleError::Config("IXOS_PRO_MODULE_VERSION missing".into()))?;

        let platform = platform_tag()?;
        let ext = platform_extension();

        let module_name = module_basename();
        let module_url = format!(
            "{}/modules/pro/v{}/{}/{}.{}.enc",
            base_url.trim_end_matches('/'),
            version,
            platform,
            module_name,
            ext
        );
        let envelope_url = format!(
            "{}/modules/pro/v{}/{}/envelope.enc",
            base_url.trim_end_matches('/'),
            version,
            platform
        );
        let signature_url = format!(
            "{}/modules/pro/v{}/{}/{}.{}.sig",
            base_url.trim_end_matches('/'),
            version,
            platform,
            module_name,
            ext
        );

        let client = reqwest::Client::new();
        let pubkey_b64 = STANDARD.encode(device.public_key());

        let module_enc = download_bytes(&client, &module_url, &entitlement, &device, &pubkey_b64)
            .await
            .map_err(|e| ProModuleError::Network(e))?;
        // let envelope = download_bytes(&client, &envelope_url, &entitlement, &device, &pubkey_b64)
        //     .await
        //     .map_err(|e| ProModuleError::Network(e))?;
        let signature = download_bytes(&client, &signature_url, &entitlement, &device, &pubkey_b64)
            .await
            .map_err(|e| ProModuleError::Network(e))?;

        let symmetric_key = if let Ok(key_str) = std::env::var("IXOS_PRO_DEV_SYMMETRIC_KEY") {
            let vec = decode_base64_or_hex(&key_str)
                .map_err(|e| ProModuleError::Config(format!("Bad dev key: {}", e)))?;
            if vec.len() != 32 {
                return Err(ProModuleError::Config("Bad dev key length".into()));
            }
            let mut arr = [0u8; 32];
            arr.copy_from_slice(&vec);
            arr
        } else {
            let envelope = download_bytes(&client, &envelope_url, &entitlement, &device, &pubkey_b64)
                .await
                .map_err(|e| ProModuleError::Network(e))?;
            
             device
                .decrypt_envelope(&envelope)
                .map_err(|e| ProModuleError::Crypto(e.to_string()))?
        };

        let module_bytes = decrypt_module(&module_enc, &symmetric_key)?;
        verify_signature(&module_bytes, &signature)?;

        let temp_path = write_temp_module(&module_bytes, ext)?;
        let library = unsafe { Library::new(&temp_path) }
            .map_err(|e| ProModuleError::Io(format!("Load failed: {}", e)))?;

        Ok(Self { library: ManuallyDrop::new(library), temp_path })
    }

    pub fn ask_mode_plus(&self, query: &ProcessedQuery) -> Result<AskModePlusResult, ProModuleError> {
        let input = AskModePlusInput {
            query: query.original.clone(),
            anchors: query.anchor_terms.iter().map(|a| a.term.clone()).collect(),
            passages: None,
        };
        let payload = serde_json::to_string(&input)
            .map_err(|e| ProModuleError::Ffi(format!("serialize: {}", e)))?;

        let output = call_ffi_json(
            self.library_ref(),
            b"ixos_pro_ask_mode_plus\0",
            &payload,
        )?;

        serde_json::from_str(&output)
            .map_err(|e| ProModuleError::Ffi(format!("parse result: {}", e)))
    }

    pub fn extract_answer_card(&self, passage: &str, query: &str) -> Result<AnswerCard, ProModuleError> {
        let output = call_ffi_pair(
            self.library_ref(),
            b"ixos_pro_extract_answer_card\0",
            passage,
            query,
        )?;

        serde_json::from_str(&output)
            .map_err(|e| ProModuleError::Ffi(format!("parse card: {}", e)))
    }

    fn library_ref(&self) -> &Library {
        // ManuallyDrop ensures we control drop order.
        unsafe { &*(&self.library as *const ManuallyDrop<Library> as *const Library) }
    }
}

fn platform_tag() -> Result<String, ProModuleError> {
    let os = std::env::consts::OS;
    let arch = std::env::consts::ARCH;
    let tag = match (os, arch) {
        ("windows", "x86_64") => "windows-x86_64",
        ("macos", "aarch64") => "macos-aarch64",
        ("macos", "x86_64") => "macos-x86_64",
        ("linux", "x86_64") => "linux-x86_64",
        ("linux", "aarch64") => "linux-aarch64",
        _ => return Err(ProModuleError::Config(format!("Unsupported platform: {}-{}", os, arch))),
    };
    Ok(tag.to_string())
}

fn platform_extension() -> &'static str {
    if cfg!(target_os = "windows") {
        "dll"
    } else if cfg!(target_os = "macos") {
        "dylib"
    } else {
        "so"
    }
}

fn module_basename() -> &'static str {
    if cfg!(target_os = "windows") {
        "ixos_pro"
    } else {
        "libixos_pro"
    }
}

async fn download_bytes(
    client: &reqwest::Client,
    url: &str,
    entitlement: &str,
    device: &DeviceIdentity,
    pubkey_b64: &str,
) -> Result<Vec<u8>, String> {
    let response = client
        .get(url)
        .bearer_auth(entitlement)
        .header("X-Device-Id", device.device_id())
        .header("X-Device-PubKey", pubkey_b64)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Download failed ({}): {}", response.status(), url));
    }

    let bytes = response.bytes().await.map_err(|e| e.to_string())?;
    Ok(bytes.to_vec())
}

fn decrypt_module(module_enc: &[u8], symmetric_key: &[u8; 32]) -> Result<Vec<u8>, ProModuleError> {
    if module_enc.len() < 12 {
        return Err(ProModuleError::Crypto("Encrypted module too short".into()));
    }

    let (nonce_bytes, ciphertext) = module_enc.split_at(12);
    let cipher = ChaCha20Poly1305::new(Key::from_slice(symmetric_key));
    let nonce = Nonce::from_slice(nonce_bytes);
    cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| ProModuleError::Crypto("Module decrypt failed".into()))
}

fn verify_signature(module_bytes: &[u8], signature_bytes: &[u8]) -> Result<(), ProModuleError> {
    let key_env = std::env::var("IXOS_PRO_MODULE_PUBKEY")
        .map_err(|_| ProModuleError::Config("IXOS_PRO_MODULE_PUBKEY missing".into()))?;
    let key_bytes = decode_base64_or_hex(&key_env)?;
    if key_bytes.len() != 32 {
        return Err(ProModuleError::Crypto("Invalid public key length".into()));
    }
    let mut key_array = [0u8; 32];
    key_array.copy_from_slice(&key_bytes);
    let verifying_key = VerifyingKey::from_bytes(&key_array)
        .map_err(|e| ProModuleError::Crypto(format!("Invalid public key: {}", e)))?;

    let sig_bytes = if signature_bytes.len() == 64 {
        signature_bytes.to_vec()
    } else if let Ok(text) = std::str::from_utf8(signature_bytes) {
        decode_base64_or_hex(text)?
    } else {
        return Err(ProModuleError::Crypto("Invalid signature format".into()));
    };

    if sig_bytes.len() != 64 {
        return Err(ProModuleError::Crypto("Invalid signature length".into()));
    }

    let mut sig_array = [0u8; 64];
    sig_array.copy_from_slice(&sig_bytes);
    let signature = Signature::from_bytes(&sig_array);

    verifying_key
        .verify(module_bytes, &signature)
        .map_err(|_| ProModuleError::Signature)
}

fn write_temp_module(module_bytes: &[u8], ext: &str) -> Result<TempPath, ProModuleError> {
    let mut file = tempfile::Builder::new()
        .suffix(&format!(".{}", ext))
        .tempfile()
        .map_err(|e| ProModuleError::Io(e.to_string()))?;

    use std::io::Write;
    file.write_all(module_bytes)
        .map_err(|e| ProModuleError::Io(e.to_string()))?;
    file.flush().map_err(|e| ProModuleError::Io(e.to_string()))?;

    let temp_path = file.into_temp_path();

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Ok(metadata) = std::fs::metadata(&temp_path) {
            let mut perms = metadata.permissions();
            perms.set_mode(0o600);
            let _ = std::fs::set_permissions(&temp_path, perms);
        }
    }

    Ok(temp_path)
}

fn decode_base64_or_hex(value: &str) -> Result<Vec<u8>, ProModuleError> {
    let trimmed = value.trim();
    if let Ok(bytes) = STANDARD.decode(trimmed) {
        return Ok(bytes);
    }

    if trimmed.len() % 2 == 0 && trimmed.chars().all(|c| c.is_ascii_hexdigit()) {
        let mut bytes = Vec::with_capacity(trimmed.len() / 2);
        let chars: Vec<char> = trimmed.chars().collect();
        for idx in (0..chars.len()).step_by(2) {
            let pair: String = [chars[idx], chars[idx + 1]].iter().collect();
            let value = u8::from_str_radix(&pair, 16)
                .map_err(|_| ProModuleError::Crypto("Invalid hex".into()))?;
            bytes.push(value);
        }
        return Ok(bytes);
    }

    Err(ProModuleError::Crypto("Invalid base64/hex".into()))
}

fn call_ffi_json(
    library: &Library,
    symbol: &[u8],
    payload: &str,
) -> Result<String, ProModuleError> {
    let func: Symbol<unsafe extern "C" fn(*const c_char, *mut c_char, usize) -> i32> = unsafe {
        library
            .get(symbol)
            .map_err(|e| ProModuleError::Ffi(format!("symbol: {}", e)))?
    };

    let input = CString::new(payload).map_err(|e| ProModuleError::Ffi(e.to_string()))?;
    let mut buffer = vec![0u8; 16 * 1024];
    let rc = unsafe { func(input.as_ptr(), buffer.as_mut_ptr() as *mut c_char, buffer.len()) };
    if rc != 0 {
        return Err(ProModuleError::Ffi(format!("call failed: {}", rc)));
    }

    let cstr = unsafe { CStr::from_ptr(buffer.as_ptr() as *const c_char) };
    cstr.to_str()
        .map(|s| s.to_string())
        .map_err(|e| ProModuleError::Ffi(format!("utf8: {}", e)))
}

fn call_ffi_pair(
    library: &Library,
    symbol: &[u8],
    passage: &str,
    query: &str,
) -> Result<String, ProModuleError> {
    let func: Symbol<unsafe extern "C" fn(*const c_char, *const c_char, *mut c_char, usize) -> i32> = unsafe {
        library
            .get(symbol)
            .map_err(|e| ProModuleError::Ffi(format!("symbol: {}", e)))?
    };

    let passage_c = CString::new(passage).map_err(|e| ProModuleError::Ffi(e.to_string()))?;
    let query_c = CString::new(query).map_err(|e| ProModuleError::Ffi(e.to_string()))?;
    let mut buffer = vec![0u8; 16 * 1024];
    let rc = unsafe {
        func(
            passage_c.as_ptr(),
            query_c.as_ptr(),
            buffer.as_mut_ptr() as *mut c_char,
            buffer.len(),
        )
    };
    if rc != 0 {
        return Err(ProModuleError::Ffi(format!("call failed: {}", rc)));
    }

    let cstr = unsafe { CStr::from_ptr(buffer.as_ptr() as *const c_char) };
    cstr.to_str()
        .map(|s| s.to_string())
        .map_err(|e| ProModuleError::Ffi(format!("utf8: {}", e)))
}


impl Drop for ProModule {
    fn drop(&mut self) {
        unsafe { ManuallyDrop::drop(&mut self.library); }
    }
}
