//! Runtime diagnostics and health checks for CLI and desktop.

use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;
use tokio_util::sync::CancellationToken;

use crate::cli::IxosConfig;
use crate::compliance::compliance_dir;
use crate::ixos_embed::{MmapModel2VecEmbedder, ModelType, SecureEmbedder, StubModel};
use crate::ixos_rank::{
    CacheMode, ProgressiveSearchEngine, SearchEvent, SemanticEngine, StubLexicalEngine,
    StubSemanticEngine,
};
use crate::journalist_mode::JournalistMode;
use crate::storage::get_cache_for_path;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum DoctorStatus {
    Pass,
    Warn,
    Fail,
    Info,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DoctorCheck {
    pub id: String,
    pub name: String,
    pub status: DoctorStatus,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct DoctorSummary {
    pub pass: usize,
    pub warn: usize,
    pub fail: usize,
    pub info: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DoctorReport {
    pub generated_at_unix_s: u64,
    pub checks: Vec<DoctorCheck>,
    pub summary: DoctorSummary,
}

#[derive(Debug, Clone, Default)]
pub struct DoctorOptions {
    pub verbose: bool,
}

fn now_unix_s() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn detect_cache_backend(path: &Path) -> &'static str {
    #[cfg(windows)]
    {
        if crate::storage::ads_windows::AdsCache::is_supported_static(path) {
            return "ADS";
        }
    }

    #[cfg(all(unix, not(windows)))]
    {
        if crate::storage::xattr_unix::XattrCache::is_supported_static(path) {
            return "xattr";
        }
    }

    if crate::storage::sidecar_lmdb::LmdbSidecarCache::new().is_ok() {
        return "LMDB";
    }

    "Null"
}

fn with_summary(checks: Vec<DoctorCheck>) -> DoctorReport {
    let mut summary = DoctorSummary::default();
    for c in &checks {
        match c.status {
            DoctorStatus::Pass => summary.pass += 1,
            DoctorStatus::Warn => summary.warn += 1,
            DoctorStatus::Fail => summary.fail += 1,
            DoctorStatus::Info => summary.info += 1,
        }
    }
    DoctorReport {
        generated_at_unix_s: now_unix_s(),
        checks,
        summary,
    }
}

fn create_temp_doctor_dir(prefix: &str) -> Result<PathBuf, String> {
    let dir = std::env::temp_dir().join(format!("ixos-doctor-{prefix}-{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

async fn check_progressive_order() -> Result<(), String> {
    let temp_dir = create_temp_doctor_dir("progressive")?;
    let test_file = temp_dir.join("doctor_progressive.txt");
    std::fs::write(&test_file, "quarterly report with roadmap notes").map_err(|e| e.to_string())?;

    let mut lexical = StubLexicalEngine::new();
    lexical.add_file(
        test_file.clone(),
        "quarterly report with roadmap notes".to_string(),
    );

    let mut semantic = StubSemanticEngine::with_stub_model();
    semantic
        .add_file(
            test_file.clone(),
            "quarterly report with roadmap notes".to_string().as_str(),
        )
        .await
        .map_err(|e| e.to_string())?;

    let mut engine = ProgressiveSearchEngine::new(lexical, semantic);
    let (tx, mut rx) = mpsc::channel(32);
    let cancel = CancellationToken::new();

    let handle = tokio::spawn(async move {
        engine
            .search_progressive("quarterly report".to_string(), tx, cancel)
            .await
    });

    let mut saw_lexical = None;
    let mut saw_semantic = None;
    let mut saw_complete = None;
    let mut idx = 0usize;

    while let Some(event) = rx.recv().await {
        match event {
            SearchEvent::LexicalResults(_) | SearchEvent::LexicalBatch { .. } => {
                if saw_lexical.is_none() {
                    saw_lexical = Some(idx);
                }
            }
            SearchEvent::SemanticResults(_) => {
                if saw_semantic.is_none() {
                    saw_semantic = Some(idx);
                }
            }
            SearchEvent::Complete => {
                saw_complete = Some(idx);
                break;
            }
            SearchEvent::Error(e) => return Err(format!("search emitted error: {e}")),
            _ => {}
        }
        idx += 1;
    }

    let result = handle
        .await
        .map_err(|e| format!("progressive task join failed: {e}"))?
        .map_err(|e| format!("progressive search failed: {e}"));
    let _ = std::fs::remove_dir_all(&temp_dir);
    result?;

    let l = saw_lexical.ok_or_else(|| "missing lexical stage".to_string())?;
    let s = saw_semantic.ok_or_else(|| "missing semantic stage".to_string())?;
    let c = saw_complete.ok_or_else(|| "missing completion stage".to_string())?;
    if l < s && s < c {
        Ok(())
    } else {
        Err(format!(
            "event order invalid (lexical={l}, semantic={s}, complete={c})"
        ))
    }
}

async fn check_deep_search_write_prevention() -> Result<(), String> {
    let temp_dir = create_temp_doctor_dir("deep-search")?;
    let test_file = temp_dir.join("doctor_deep_search.txt");
    std::fs::write(&test_file, "sensitive draft").map_err(|e| e.to_string())?;

    let mut deep_search = JournalistMode::new();
    deep_search.enable();

    let model = std::sync::Arc::new(StubModel::new());
    let embedder = SecureEmbedder::new_fast(model);
    let mut semantic = StubSemanticEngine::with_cache_mode(embedder, CacheMode::Ephemeral);
    semantic
        .index_directory(&temp_dir)
        .await
        .map_err(|e| e.to_string())?;
    let _ = semantic
        .search_pure("sensitive draft", 1)
        .await
        .map_err(|e| e.to_string())?;

    let leaked = get_cache_for_path(&test_file).contains(&test_file);
    deep_search.disable();

    let _ = std::fs::remove_dir_all(&temp_dir);

    if leaked {
        Err("cache write detected while deep search mode check was active".to_string())
    } else {
        Ok(())
    }
}

pub async fn run_doctor(options: DoctorOptions) -> DoctorReport {
    let mut checks = Vec::new();

    let config_path = IxosConfig::default_path();
    let config = IxosConfig::load();
    checks.push(DoctorCheck {
        id: "config_resolution".to_string(),
        name: "Config resolution".to_string(),
        status: DoctorStatus::Pass,
        message: "Configuration loaded".to_string(),
        details: if options.verbose {
            Some(format!(
                "path={}, cache_mode={}, search_mode={}, model={}, pro_model={}",
                config_path.display(),
                config.search.cache_mode,
                config.search.search_mode,
                config.search.model_type,
                config.search.pro_model_type
            ))
        } else {
            Some(format!("path={}", config_path.display()))
        },
    });

    let backend = detect_cache_backend(Path::new("."));
    checks.push(DoctorCheck {
        id: "cache_backend".to_string(),
        name: "ADS/xattr capability".to_string(),
        status: if backend == "Null" {
            DoctorStatus::Warn
        } else {
            DoctorStatus::Pass
        },
        message: format!("Detected cache backend: {backend}"),
        details: None,
    });

    let flash_model = MmapModel2VecEmbedder::new_with_type(ModelType::IxosFlashV2);
    checks.push(DoctorCheck {
        id: "flash_model".to_string(),
        name: "Flash model".to_string(),
        status: if flash_model.is_ok() {
            DoctorStatus::Pass
        } else {
            DoctorStatus::Fail
        },
        message: match flash_model {
            Ok(_) => "ixos-flash-v2 load check passed".to_string(),
            Err(e) => format!("ixos-flash-v2 missing/unavailable: {e}"),
        },
        details: None,
    });

    let pro_model = MmapModel2VecEmbedder::new_with_type(ModelType::Potion);
    checks.push(DoctorCheck {
        id: "pro_model".to_string(),
        name: "Pro model".to_string(),
        status: if pro_model.is_ok() {
            DoctorStatus::Pass
        } else {
            DoctorStatus::Warn
        },
        message: match pro_model {
            Ok(_) => "potion-base-8m-int8 load check passed".to_string(),
            Err(e) => format!("potion-base-8m-int8 missing/unavailable: {e}"),
        },
        details: None,
    });

    let compliance_exists = compliance_dir().exists();
    checks.push(DoctorCheck {
        id: "compliance_storage".to_string(),
        name: "Compliance storage".to_string(),
        status: if compliance_exists {
            DoctorStatus::Pass
        } else {
            DoctorStatus::Warn
        },
        message: if compliance_exists {
            "Compliance storage directory exists".to_string()
        } else {
            "Compliance storage directory missing (expected on first run)".to_string()
        },
        details: Some(format!("path={}", compliance_dir().display())),
    });

    let default_timeout = config.search.timeout_seconds;
    let probe_timeout = if default_timeout == 0 {
        1
    } else {
        default_timeout.saturating_add(1)
    };
    let probe_path = config_path
        .parent()
        .unwrap_or_else(|| Path::new("."))
        .join("config.doctor.tmp.toml");

    let mut probe_cfg = config.clone();
    probe_cfg.search.timeout_seconds = probe_timeout;
    let persist_result = probe_cfg
        .save_to(probe_path.clone())
        .map_err(|e| e.to_string())
        .map(|_| {
            let loaded = IxosConfig::load_from(probe_path.clone());
            loaded.search.timeout_seconds == probe_timeout
        });
    let _ = std::fs::remove_file(&probe_path);

    checks.push(DoctorCheck {
        id: "config_persistence".to_string(),
        name: "Config persistence".to_string(),
        status: match persist_result {
            Ok(true) => DoctorStatus::Pass,
            Ok(false) => DoctorStatus::Fail,
            Err(_) => DoctorStatus::Fail,
        },
        message: match persist_result {
            Ok(true) => "Config round-trip check passed".to_string(),
            Ok(false) => "Config round-trip mismatch".to_string(),
            Err(e) => format!("Config persistence failed: {e}"),
        },
        details: None,
    });

    let deep_search_check = check_deep_search_write_prevention().await;
    checks.push(DoctorCheck {
        id: "deep_search_write_prevention".to_string(),
        name: "Deep Search write prevention".to_string(),
        status: match &deep_search_check {
            Ok(()) => DoctorStatus::Pass,
            Err(_) => DoctorStatus::Fail,
        },
        message: match deep_search_check {
            Ok(()) => "No persistent cache writes detected in deep search mode check".to_string(),
            Err(e) => format!("Deep search write prevention check failed: {e}"),
        },
        details: None,
    });

    let progressive_check = check_progressive_order().await;
    checks.push(DoctorCheck {
        id: "progressive_event_order".to_string(),
        name: "Progressive output integrity".to_string(),
        status: match &progressive_check {
            Ok(()) => DoctorStatus::Pass,
            Err(_) => DoctorStatus::Fail,
        },
        message: match progressive_check {
            Ok(()) => {
                "Progressive events arrived in expected lexical -> semantic -> complete order"
                    .to_string()
            }
            Err(e) => format!("Progressive output ordering failed: {e}"),
        },
        details: None,
    });

    checks.push(DoctorCheck {
        id: "platform_info".to_string(),
        name: "Platform info".to_string(),
        status: DoctorStatus::Info,
        message: format!(
            "os={}, arch={}, cache_backend={}",
            std::env::consts::OS,
            std::env::consts::ARCH,
            detect_cache_backend(Path::new("."))
        ),
        details: None,
    });

    let models = MmapModel2VecEmbedder::available_models();
    let available_count = models.iter().filter(|(_, available, _)| *available).count();
    checks.push(DoctorCheck {
        id: "model_warm_status".to_string(),
        name: "Model warm status".to_string(),
        status: DoctorStatus::Info,
        message: format!("available_models={available_count}"),
        details: if options.verbose {
            Some(
                models
                    .iter()
                    .map(|(ty, available, path)| {
                        format!(
                            "{:?}:{}:{}",
                            ty,
                            if *available { "ready" } else { "missing" },
                            path.as_ref()
                                .map(|p| p.display().to_string())
                                .unwrap_or_else(|| "-".to_string())
                        )
                    })
                    .collect::<Vec<_>>()
                    .join(", "),
            )
        } else {
            None
        },
    });

    with_summary(checks)
}
