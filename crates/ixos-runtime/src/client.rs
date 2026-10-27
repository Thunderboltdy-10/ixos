//! A synchronous owned child process, used from the desktop's blocking workers.
//! The desktop never links the search engine, tokenizers, models, or grammars.
use crate::{
    protocol::{Options, RetrievalMode},
    MAX_FRAME_BYTES, PROTOCOL_MAJOR,
};
use anyhow::Context;
use serde_json::{json, Value};
use std::{
    collections::BTreeMap,
    io::{BufRead, BufReader, Read, Write},
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::{
        atomic::{AtomicU64, Ordering},
        mpsc::{self, Receiver, RecvTimeoutError, SyncSender},
        Arc,
    },
    time::{Duration, Instant},
};
mod install;
mod ownership;
pub use install::ensure_runtime;

/// A request belongs to one generation. Changing it interrupts a blocking call.
#[derive(Clone)]
pub struct Cancellation {
    generation: Arc<AtomicU64>,
    expected: u64,
}
impl Cancellation {
    pub fn new(generation: Arc<AtomicU64>, expected: u64) -> Self {
        Self {
            generation,
            expected,
        }
    }
    fn cancelled(&self) -> bool {
        self.generation.load(Ordering::Acquire) != self.expected
    }
}
fn timeout_for(op: &str) -> Duration {
    Duration::from_secs(match op {
        "hello" => 5,
        // Three independently bounded model downloads plus verification.
        "model-install" => 20 * 60,
        "refresh" | "search" | "cache" | "doctor" => 120,
        _ => 30,
    })
}

fn command(path: &Path) -> Command {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        let mut command = Command::new(path);
        command.creation_flags(0x08000000);
        command
    }
    #[cfg(not(windows))]
    {
        Command::new(path)
    }
}
pub struct Session {
    child: Child,
    input: SyncSender<Vec<u8>>,
    output: Receiver<anyhow::Result<Value>>,
    id: u64,
    healthy: bool,
    cancellation: Option<Cancellation>,
    _owner: ownership::Owner,
}
impl Drop for Session {
    fn drop(&mut self) {
        self.stop();
    }
}
impl Session {
    pub fn start(path: &Path) -> anyhow::Result<Self> {
        Self::start_with_cancellation(path, None)
    }
    pub fn start_with_cancellation(
        path: &Path,
        cancellation: Option<Cancellation>,
    ) -> anyhow::Result<Self> {
        Self::start_command(command(path), cancellation, timeout_for("hello"))
            .with_context(|| format!("Starting runtime {}", path.display()))
    }
    fn start_command(
        mut command: Command,
        cancellation: Option<Cancellation>,
        timeout: Duration,
    ) -> anyhow::Result<Self> {
        let mut child = command
            .args(["runtime", "serve"])
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit())
            .spawn()?;
        let owner = match ownership::Owner::attach(&child) {
            Ok(owner) => owner,
            Err(error) => {
                let _ = child.kill();
                let _ = child.wait();
                return Err(error);
            }
        };
        let mut input = child.stdin.take().context("Missing runtime stdin")?;
        let mut pipe = BufReader::new(child.stdout.take().context("Missing runtime stdout")?);
        // Bound queued frames and the compatibility probe. A broken executable
        // found on PATH must not hang desktop startup indefinitely.
        let (sender, output) = mpsc::sync_channel(1);
        let errors = sender.clone();
        let (requests, writes) = mpsc::sync_channel::<Vec<u8>>(1);
        // A child can stop reading stdin after hello. Writing on the caller
        // thread would bypass every response deadline and cancellation check.
        std::thread::spawn(move || {
            for frame in writes {
                let result = input.write_all(&frame).and_then(|()| input.flush());
                if let Err(error) = result {
                    let _ = errors.send(Err(error.into()));
                    break;
                }
            }
        });
        std::thread::spawn(move || loop {
            let frame = read_frame(&mut pipe);
            let failed = frame.is_err();
            if sender.send(frame).is_err() || failed {
                break;
            }
        });
        let mut session = Self {
            child,
            input: requests,
            output,
            id: 0,
            healthy: true,
            cancellation,
            _owner: owner,
        };
        let hello = session.request("hello", json!({}), timeout)?;
        anyhow::ensure!(
            hello["protocol_major"].as_u64() == Some(u64::from(PROTOCOL_MAJOR)),
            "Incompatible Ixos runtime protocol; install a compatible runtime"
        );
        for capability in [
            "resident-search",
            "shared-settings",
            "models",
            "cache",
            "skill",
        ] {
            anyhow::ensure!(
                hello["capabilities"]
                    .as_array()
                    .is_some_and(|values| values.iter().any(|v| v.as_str() == Some(capability))),
                "Ixos runtime lacks required capability: {capability}"
            );
        }
        Ok(session)
    }
    pub fn call(&mut self, op: &str, params: Value) -> anyhow::Result<Value> {
        self.request(op, params, timeout_for(op))
    }
    pub fn is_healthy(&self) -> bool {
        self.healthy
    }
    pub fn set_cancellation(&mut self, cancellation: Cancellation) {
        self.cancellation = Some(cancellation);
    }
    fn stop(&mut self) {
        if self.healthy {
            self.healthy = false;
            let _ = self.child.kill();
            let _ = self.child.wait();
        }
    }
    fn request(&mut self, op: &str, params: Value, timeout: Duration) -> anyhow::Result<Value> {
        anyhow::ensure!(
            self.healthy,
            "Ixos runtime session stopped; create a new session"
        );
        self.id += 1;
        let mut frame = serde_json::to_vec(&json!({"id":self.id,"op":op,"params":params}))?;
        anyhow::ensure!(
            (frame.len() as u64) < MAX_FRAME_BYTES,
            "Runtime request exceeds frame limit"
        );
        frame.push(b'\n');
        let deadline = Instant::now() + timeout;
        let response = (|| {
            self.input
                .try_send(frame)
                .context("Runtime write queue stopped or is full")?;
            loop {
                anyhow::ensure!(
                    !self
                        .cancellation
                        .as_ref()
                        .is_some_and(Cancellation::cancelled),
                    "Runtime request cancelled"
                );
                let remaining = deadline.saturating_duration_since(Instant::now());
                anyhow::ensure!(
                    !remaining.is_zero(),
                    "Runtime {op} timed out after {} seconds; start a new session",
                    timeout.as_secs()
                );
                match self
                    .output
                    .recv_timeout(remaining.min(Duration::from_millis(25)))
                {
                    Ok(value) => return value,
                    Err(RecvTimeoutError::Timeout) => {}
                    Err(RecvTimeoutError::Disconnected) => {
                        anyhow::bail!("Runtime stopped during {op}")
                    }
                }
            }
        })();
        let value = match response {
            Ok(value) => value,
            Err(error) => {
                self.stop();
                return Err(error);
            }
        };
        if value["id"].as_u64() != Some(self.id)
            || value.get("result").is_some() == value.get("error").is_some()
            || value.get("error").is_some_and(|e| !e.is_string())
        {
            self.stop();
            anyhow::bail!("Runtime returned an invalid response or identity mismatch");
        }
        // Ordinary operation errors do not desynchronize a valid session.
        if let Some(error) = value["error"].as_str() {
            anyhow::bail!("{error}");
        }
        Ok(value["result"].clone())
    }
}
fn read_frame(input: &mut impl BufRead) -> anyhow::Result<Value> {
    let mut line = Vec::new();
    let count = input
        .by_ref()
        .take(MAX_FRAME_BYTES + 1)
        .read_until(b'\n', &mut line)?;
    anyhow::ensure!(
        count > 0 && count as u64 <= MAX_FRAME_BYTES && line.last() == Some(&b'\n'),
        "Runtime stopped or returned an oversized/incomplete frame"
    );
    Ok(serde_json::from_slice(&line)?)
}

pub fn manage(op: &str, params: Value) -> anyhow::Result<Value> {
    Session::start(&ensure_runtime()?)?.call(op, params)
}
pub fn manage_cancelled(
    op: &str,
    params: Value,
    cancellation: Cancellation,
) -> anyhow::Result<Value> {
    Session::start_with_cancellation(&ensure_runtime()?, Some(cancellation))?.call(op, params)
}

/// What the worker holds for one location after a refresh.
#[derive(Clone, Copy, Debug, Default)]
pub struct Source {
    pub files: usize,
    pub bytes: u64,
    pub lines: usize,
    pub discovered: usize,
}

/// Desktop adapter mirrors the core's resident operations without embedding it.
pub struct Engine {
    session: Session,
    sources: BTreeMap<PathBuf, Source>,
}
impl Engine {
    pub fn new_locations(
        roots: &[PathBuf],
        model: Option<&Path>,
        options: Options,
    ) -> anyhow::Result<Self> {
        Self::new_locations_cancelled(roots, model, options, None)
    }
    pub fn new_locations_cancelled(
        roots: &[PathBuf],
        model: Option<&Path>,
        options: Options,
        cancellation: Option<Cancellation>,
    ) -> anyhow::Result<Self> {
        let mut session = Session::start_with_cancellation(&ensure_runtime()?, cancellation)?;
        session.call(
            "open",
            json!({"roots":roots,"model":model,"options":options}),
        )?;
        Ok(Self {
            session,
            sources: BTreeMap::new(),
        })
    }
    pub fn set_cancellation(&mut self, cancellation: Cancellation) {
        self.session.set_cancellation(cancellation);
    }
    pub fn is_healthy(&self) -> bool {
        self.session.is_healthy()
    }
    pub fn configure_search(
        &mut self,
        mode: RetrievalMode,
        limit: usize,
        context: usize,
        model: Option<&Path>,
    ) -> anyhow::Result<()> {
        self.session.call(
            "configure",
            json!({"mode":mode,"limit":limit,"context":context,"model":model}),
        )?;
        Ok(())
    }
    pub fn refresh(&mut self) -> anyhow::Result<Value> {
        let value = self.session.call("refresh", json!({}))?;
        self.sources.clear();
        for source in value["sources"]
            .as_array()
            .context("Missing source reports")?
        {
            self.sources.insert(
                PathBuf::from(source["root"].as_str().context("Missing source root")?),
                Source {
                    files: source["files"].as_u64().unwrap_or(0) as usize,
                    bytes: source["bytes"].as_u64().unwrap_or(0),
                    lines: source["lines"].as_u64().unwrap_or(0) as usize,
                    discovered: source["discovered"].as_u64().unwrap_or(0) as usize,
                },
            );
        }
        Ok(value["stats"].clone())
    }
    pub fn source(&self, root: &Path) -> Source {
        self.sources.get(root).copied().unwrap_or_default()
    }
    /// Lines of one discovered file, including extracted PDF and Office text.
    pub fn read(
        &mut self,
        root: &Path,
        path: &Path,
        start: usize,
        lines: usize,
    ) -> anyhow::Result<Value> {
        self.session.call(
            "read",
            json!({"root":root,"path":path,"start":start,"lines":lines}),
        )
    }
    pub fn search_location(
        &mut self,
        query: &str,
        directory: Option<&Path>,
    ) -> anyhow::Result<(Vec<u8>, Value)> {
        let value = self
            .session
            .call("search", json!({"query":query,"directory":directory}))?;
        if !value["output"]["results"]
            .as_array()
            .is_some_and(|rows| rows.iter().all(|row| row["path"].is_string()))
        {
            self.session.stop();
            anyhow::bail!("Runtime returned an invalid search result; start a new session");
        }
        let mut raw = serde_json::to_vec(&value["output"])?;
        raw.push(b'\n');
        Ok((raw, value["stats"].clone()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    pub(super) fn fixture() -> (tempfile::TempDir, PathBuf) {
        let dir = tempfile::tempdir().unwrap();
        let source = dir.path().join("worker.rs");
        std::fs::write(&source, include_str!("../tests/fixtures/worker.rs")).unwrap();
        let binary = dir.path().join(if cfg!(windows) {
            "worker.exe"
        } else {
            "worker"
        });
        let compiler = std::env::var_os("RUSTC").unwrap_or_else(|| "rustc".into());
        let built = Command::new(compiler)
            .args(["--edition=2021"])
            .arg(source)
            .arg("-o")
            .arg(&binary)
            .output()
            .unwrap();
        assert!(
            built.status.success(),
            "{}",
            String::from_utf8_lossy(&built.stderr)
        );
        (dir, binary)
    }
    fn start_fixture(
        path: &Path,
        mode: &str,
        timeout: Duration,
        cancellation: Option<Cancellation>,
    ) -> anyhow::Result<Session> {
        let mut worker = command(path);
        worker.env("IXOS_WORKER_MODE", mode);
        Session::start_command(worker, cancellation, timeout)
    }
    #[test]
    fn frames_are_complete_bounded_json() {
        assert_eq!(read_frame(&mut &b"{\"id\":1}\n"[..]).unwrap()["id"], 1);
        assert!(read_frame(&mut &b"{}"[..]).is_err());
        assert!(read_frame(&mut &b"broken\n"[..]).is_err());
        assert!(read_frame(&mut &vec![b' '; MAX_FRAME_BYTES as usize + 1][..]).is_err());
    }
    #[test]
    fn validates_protocol_and_capabilities_without_pinning_product_version() {
        let (_dir, path) = fixture();
        for mode in ["bad-major", "missing-capability"] {
            assert!(
                start_fixture(&path, mode, Duration::from_secs(2), None).is_err(),
                "{mode}"
            );
        }
        let mut good = start_fixture(&path, "normal", Duration::from_secs(2), None).unwrap();
        assert_eq!(good.call("ping", json!({})).unwrap()["ok"], true);
        assert!(good.is_healthy());
        assert!(timeout_for("model-install") > timeout_for("search"));
    }
    #[test]
    fn handshake_and_post_handshake_deadlines_kill_unresponsive_workers() {
        let (_dir, path) = fixture();
        let started = Instant::now();
        assert!(start_fixture(&path, "no-hello", Duration::from_millis(80), None).is_err());
        assert!(started.elapsed() < Duration::from_secs(3));
        for mode in ["hang", "blocked-write"] {
            let mut client = start_fixture(&path, mode, Duration::from_secs(2), None).unwrap();
            let started = Instant::now();
            let error = client
                .request(
                    "ping",
                    json!({"payload":"x".repeat(1024*1024)}),
                    Duration::from_millis(100),
                )
                .unwrap_err();
            assert!(error.to_string().contains("timed out"), "{error}");
            assert!(started.elapsed() < Duration::from_secs(3));
            assert!(!client.is_healthy());
            assert!(client.child.try_wait().unwrap().is_some());
            assert!(client.call("ping", json!({})).is_err());
        }
        let mut restarted = start_fixture(&path, "normal", Duration::from_secs(2), None).unwrap();
        assert!(restarted.call("ping", json!({})).is_ok());
    }
    #[test]
    fn cancellation_interrupts_an_active_request_and_reaps_the_child() {
        let (_dir, path) = fixture();
        let generation = Arc::new(AtomicU64::new(1));
        let mut client = start_fixture(
            &path,
            "hang",
            Duration::from_secs(2),
            Some(Cancellation::new(generation.clone(), 1)),
        )
        .unwrap();
        let signal = std::thread::spawn(move || {
            std::thread::sleep(Duration::from_millis(50));
            generation.fetch_add(1, Ordering::AcqRel);
        });
        let started = Instant::now();
        assert!(client
            .call("ping", json!({}))
            .unwrap_err()
            .to_string()
            .contains("cancelled"));
        signal.join().unwrap();
        assert!(started.elapsed() < Duration::from_secs(3));
        assert!(!client.is_healthy());
        assert!(client.child.try_wait().unwrap().is_some());
    }
    #[test]
    fn transport_failures_invalidate_session_but_operation_errors_do_not() {
        let (_dir, path) = fixture();
        for mode in [
            "crash",
            "incomplete",
            "oversized",
            "malformed",
            "wrong-id",
            "bad-result",
        ] {
            let mut client = start_fixture(&path, mode, Duration::from_secs(2), None).unwrap();
            assert!(
                client
                    .request("ping", json!({}), Duration::from_secs(2))
                    .is_err(),
                "{mode}"
            );
            assert!(!client.is_healthy(), "{mode}");
            assert!(client.child.try_wait().unwrap().is_some());
        }
        let mut client = start_fixture(&path, "normal", Duration::from_secs(2), None).unwrap();
        assert!(client.call("unknown", json!({})).is_err());
        assert!(client.is_healthy());
        assert_eq!(client.call("ping", json!({})).unwrap()["ok"], true);
    }
    #[test]
    fn malformed_search_content_does_not_poison_the_desktop_engine_mutex() {
        let (_dir, path) = fixture();
        let session = start_fixture(&path, "normal", Duration::from_secs(2), None).unwrap();
        let mut engine = Engine {
            session,
            sources: BTreeMap::new(),
        };
        assert!(engine.search_location("query", None).is_err());
        assert!(!engine.is_healthy());
    }
    #[cfg(windows)]
    #[test]
    fn closing_ownership_job_terminates_a_busy_worker() {
        let (_dir, path) = fixture();
        let mut child = command(&path)
            .env("IXOS_WORKER_MODE", "no-hello")
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .spawn()
            .unwrap();
        let owner = ownership::Owner::attach(&child).unwrap();
        assert!(child.try_wait().unwrap().is_none());
        drop(owner);
        // Job closure terminates the process, but Windows can report exit code
        // zero for this termination. Test bounded liveness, not the exit code.
        let deadline = Instant::now() + Duration::from_secs(3);
        loop {
            if child.try_wait().unwrap().is_some() {
                break;
            }
            if Instant::now() >= deadline {
                let _ = child.kill();
                let _ = child.wait();
                panic!("worker survived closing its ownership job");
            }
            std::thread::sleep(Duration::from_millis(10));
        }
    }
}
