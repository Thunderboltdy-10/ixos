//! Installation diagnostics for the current CLI; legacy desktop checks remain separate.
use super::{with_summary, DoctorCheck, DoctorReport, DoctorStatus};
use crate::cli::{IxosConfig, RetrievalProfile};
use crate::ixos_embed::{EmbeddingModel, Model2VecEmbedder};
use crate::retrieval::{
    cache::DocumentCache, record::Passage, Engine, EvidencePolicy, Options, RetrievalMode,
};
use crate::security::crypto::sha256;
use std::path::{Path, PathBuf};

pub struct CliDoctorOptions {
    pub verbose: bool,
    pub root: PathBuf,
    pub profile: Option<RetrievalProfile>,
    pub model_path: Option<PathBuf>,
}

struct ProbeDirectory(PathBuf);
impl ProbeDirectory {
    fn new(root: &Path) -> std::io::Result<Self> {
        let path = root.join(format!(".ixos-doctor-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir(&path)?;
        Ok(Self(path))
    }
}
impl Drop for ProbeDirectory {
    fn drop(&mut self) {
        // This path is generated and created exclusively by this invocation.
        let _ = std::fs::remove_dir_all(&self.0);
    }
}

fn check(
    id: &str,
    name: &str,
    status: DoctorStatus,
    message: impl Into<String>,
    details: Option<String>,
) -> DoctorCheck {
    DoctorCheck {
        id: id.into(),
        name: name.into(),
        status,
        message: message.into(),
        details,
    }
}

/// Uses the same effective configuration/model precedence and loader as search.
/// Tests only a temporary witness, never indexes or writes metadata on user sources.
pub fn run_cli_doctor(
    config: &IxosConfig,
    config_path: &Path,
    options: CliDoctorOptions,
) -> DoctorReport {
    let mut checks = vec![check(
        "config_resolution",
        "CLI configuration",
        DoctorStatus::Pass,
        "Effective CLI configuration loaded",
        Some(format!("path={}", config_path.display())),
    )];
    let selected = match config.retrieval.options(options.profile) {
        Ok(selected) => selected,
        Err(error) => {
            checks.push(check(
                "retrieval_options",
                "Retrieval settings",
                DoctorStatus::Fail,
                error.to_string(),
                None,
            ));
            return with_summary(checks);
        }
    };
    checks.push(check(
        "retrieval_options",
        "Retrieval settings",
        DoctorStatus::Pass,
        format!(
            "profile={:?}, mode={:?}, representation={:?}, persistent_cache={}",
            options.profile.unwrap_or(config.retrieval.profile),
            selected.mode,
            selected.representation,
            selected.persist
        ),
        options.verbose.then(|| {
            format!(
                "io_workers={}, evidence={:?}, session={:?}, output_bytes={}",
                selected.io_workers,
                selected.evidence_policy,
                selected.session,
                selected.output_bytes
            )
        }),
    ));
    let text = "ixostestdiagnostic search evidence\n";
    let vector = if selected.mode == RetrievalMode::Lexical {
        checks.push(check(
            "retrieval_model",
            "Current retrieval model",
            DoctorStatus::Info,
            "Lexical retrieval requires no embedding model",
            None,
        ));
        None
    } else {
        let result = (|| -> anyhow::Result<(PathBuf, Model2VecEmbedder, Vec<f32>)> {
            let path = config
                .retrieval
                .model(options.profile, options.model_path)?;
            let model = Model2VecEmbedder::from_path_encoded(&path)?;
            let vector = model.embed(text)?;
            anyhow::ensure!(
                !vector.is_empty()
                    && vector.len() == model.dimensions()
                    && vector.iter().all(|x| x.is_finite())
                    && vector.iter().any(|x| *x != 0.0),
                "Probe produced an empty, zero or invalid vector"
            );
            Ok((path, model, vector))
        })();
        match result {
            Ok((path, model, vector)) => {
                checks.push(check(
                    "retrieval_model",
                    "Current retrieval model",
                    DoctorStatus::Pass,
                    format!(
                        "Local encoded-row load and real inference passed ({} dimensions)",
                        model.dimensions()
                    ),
                    Some(format!(
                        "path={}, fingerprint={}",
                        path.display(),
                        hex::encode(model.fingerprint())
                    )),
                ));
                Some(vector)
            }
            Err(error) => {
                checks.push(check(
                    "retrieval_model",
                    "Current retrieval model",
                    DoctorStatus::Fail,
                    format!("Selected model unavailable: {error}"),
                    None,
                ));
                None
            }
        }
    };
    let root = match options.root.canonicalize() {
        Ok(root) if root.is_dir() => root,
        _ => {
            checks.push(check(
                "search_root",
                "Search root",
                DoctorStatus::Fail,
                format!("Not an accessible directory: {}", options.root.display()),
                None,
            ));
            return with_summary(checks);
        }
    };
    checks.push(check(
        "search_root",
        "Search root",
        DoctorStatus::Pass,
        "Directory is accessible",
        Some(root.display().to_string()),
    ));
    let probe = match ProbeDirectory::new(&root) {
        Ok(probe) => probe,
        Err(error) => {
            checks.push(check("runtime_probe", "Isolated runtime/cache probe", DoctorStatus::Warn,
                format!("Could not create temporary witness: {error}. Read-only search may still work; cache capability unverified."), None));
            return with_summary(checks);
        }
    };
    let path = probe.0.join("witness.txt");
    let result = (|| -> anyhow::Result<()> {
        std::fs::write(&path, text)?;
        let before = std::fs::metadata(&path)?.modified()?;
        let smoke_options = Options {
            mode: RetrievalMode::Lexical,
            persist: false,
            limit: 1,
            context: 0,
            output_bytes: 2048,
            evidence_policy: EvidencePolicy::GlobalLine,
            ..Options::default()
        };
        let mut engine = Engine::new(&probe.0, None, smoke_options)?;
        let (raw, stats) = engine.search("ixostestdiagnostic", "doctor", None)?;
        let output: serde_json::Value = serde_json::from_slice(&raw)?;
        anyhow::ensure!(stats.returned_results == 1
            && output["results"][0]["view"]["text"].as_str() == Some(text.trim_end()),
            "Lexical witness was not returned with exact source evidence (folder/global ignores can exclude it)");
        checks.push(check(
            "lexical_runtime",
            "Current lexical retrieval",
            DoctorStatus::Pass,
            "Real current-engine search returned exact witness evidence; no stub model",
            None,
        ));
        if selected.persist {
            if let Some(vector) = vector {
                let mut cache = DocumentCache::new(sha256(b"ixos:doctor:isolated-storage:v1"));
                let source = sha256(text.as_bytes());
                let rows = [Passage {
                    start_byte: 0,
                    end_byte: text.len(),
                    start_line: 1,
                    end_line: 1,
                    vector,
                }];
                let roundtrip = (|| -> anyhow::Result<&str> {
                    let backend = cache.set(&path, &source, &rows)?;
                    let (present, valid, _) = cache.inspect(&path, &source, text);
                    anyhow::ensure!(
                        present && valid,
                        "Signed witness cache record did not round-trip"
                    );
                    Ok(backend)
                })();
                let cleanup = cache.remove(&path);
                let status = if roundtrip.is_ok() && cleanup.is_ok() {
                    DoctorStatus::Pass
                } else {
                    DoctorStatus::Warn
                };
                let message = match (roundtrip, cleanup) {
                    (Ok(backend), Ok(_)) => format!("Signed isolated record round-trip passed: {backend}; probe record removed. Capability applies to this filesystem, not every source."),
                    (Err(error), _) | (_, Err(error)) => format!("Cache probe unavailable: {error}. JIT retrieval remains available."),
                };
                checks.push(check(
                    "cache_backend",
                    "Current document cache",
                    status,
                    message,
                    None,
                ));
            } else {
                checks.push(check("cache_backend", "Current document cache", DoctorStatus::Info,
                    "Not probed: selected model unavailable or lexical mode; no embedding records written", None));
            }
        } else {
            checks.push(check("cache_backend", "Current document cache", DoctorStatus::Info,
                "Persistent cache disabled by effective configuration; no embedding records written", None));
        }
        anyhow::ensure!(
            std::fs::read(&path)? == text.as_bytes()
                && std::fs::metadata(&path)?.modified()? == before,
            "Isolated probe source bytes or modification time changed"
        );
        Ok(())
    })();
    if let Err(error) = result {
        checks.push(check(
            "runtime_probe",
            "Isolated runtime/source integrity",
            DoctorStatus::Fail,
            error.to_string(),
            None,
        ));
    }
    let directory = probe.0.clone();
    drop(probe);
    checks.push(check(
        "probe_cleanup",
        "Temporary probe cleanup",
        if directory.exists() {
            DoctorStatus::Fail
        } else {
            DoctorStatus::Pass
        },
        if directory.exists() {
            "Temporary probe directory could not be removed"
        } else {
            "Temporary probe removed; existing source files were not touched"
        },
        None,
    ));
    checks.push(check(
        "platform_info",
        "Platform",
        DoctorStatus::Info,
        format!(
            "os={}, arch={}; diagnostic witness is not a relevance/performance benchmark",
            std::env::consts::OS,
            std::env::consts::ARCH
        ),
        None,
    ));
    with_summary(checks)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn lexical_doctor_needs_no_model_and_preserves_existing_sources() {
        let root = tempfile::tempdir().unwrap();
        let source = root.path().join("source.txt");
        std::fs::write(&source, "existing source\n").unwrap();
        let before = std::fs::metadata(&source).unwrap().modified().unwrap();
        let mut config = IxosConfig::default();
        config.retrieval.profile = RetrievalProfile::Lexical;
        let config_path = root.path().join("chosen.toml");
        let report = run_cli_doctor(
            &config,
            &config_path,
            CliDoctorOptions {
                verbose: true,
                root: root.path().into(),
                profile: None,
                model_path: Some(root.path().join("missing-model")),
            },
        );
        assert_eq!(report.summary.fail, 0, "{:?}", report);
        assert!(report.checks[0]
            .details
            .as_ref()
            .unwrap()
            .contains("chosen.toml"));
        assert!(report
            .checks
            .iter()
            .any(|c| c.id == "lexical_runtime" && matches!(c.status, DoctorStatus::Pass)));
        assert!(report
            .checks
            .iter()
            .all(|c| c.id != "flash_model" && c.id != "progressive_event_order"));
        assert_eq!(std::fs::read(&source).unwrap(), b"existing source\n");
        assert_eq!(
            std::fs::metadata(&source).unwrap().modified().unwrap(),
            before
        );
        assert_eq!(std::fs::read_dir(root.path()).unwrap().count(), 1);
    }
    #[test]
    fn missing_required_model_fails_even_when_lexical_runtime_passes() {
        let root = tempfile::tempdir().unwrap();
        let report = run_cli_doctor(
            &IxosConfig::default(),
            &root.path().join("config.toml"),
            CliDoctorOptions {
                verbose: false,
                root: root.path().into(),
                profile: Some(RetrievalProfile::Code),
                model_path: Some(root.path().join("missing-model")),
            },
        );
        assert_eq!(report.summary.fail, 1, "{:?}", report);
        assert!(report
            .checks
            .iter()
            .any(|c| c.id == "retrieval_model" && matches!(c.status, DoctorStatus::Fail)));
        assert!(report
            .checks
            .iter()
            .any(|c| c.id == "lexical_runtime" && matches!(c.status, DoctorStatus::Pass)));
        assert_eq!(std::fs::read_dir(root.path()).unwrap().count(), 0);
    }
}
