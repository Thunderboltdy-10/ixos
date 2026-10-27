use ixos_runtime::{
    client::Session,
    protocol::{Options, RetrievalMode},
};
use serde_json::{json, Value};
use std::{
    io::{BufRead, BufReader, Write},
    process::{Command, Stdio},
};
#[test]
fn runtime_client_uses_real_engine_and_recovers_after_invalid_requests() {
    let root = tempfile::tempdir().unwrap();
    let source = root.path().join("cache.rs");
    std::fs::write(&source, "// cache marker\nfn before_edit() {}\n").unwrap();
    // The child has its own explicitly isolated skill home.
    let mut process = Command::new(env!("CARGO_BIN_EXE_ixos"))
        .env("IXOS_SKILL_HOME", root.path().join("agent-home"))
        .args(["runtime", "serve"])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    let mut input = process.stdin.take().unwrap();
    let mut output = BufReader::new(process.stdout.take().unwrap());
    let mut id = 0;
    {
        let mut call = |op: &str, params: Value| -> Value {
            id += 1;
            serde_json::to_writer(&mut input, &json!({"id":id,"op":op,"params":params})).unwrap();
            input.write_all(b"\n").unwrap();
            input.flush().unwrap();
            let mut line = String::new();
            output.read_line(&mut line).unwrap();
            let v: Value = serde_json::from_str(&line).unwrap();
            assert_eq!(v["id"], id);
            v
        };
        assert_eq!(call("hello", json!({}))["result"]["protocol_major"], 1);
        let options = Options {
            mode: RetrievalMode::Lexical,
            persist: false,
            ..Default::default()
        };
        assert!(
            call("open", json!({"roots":[root.path()],"options":options}))
                .get("error")
                .is_none()
        );
        let refreshed = call("refresh", json!({}));
        assert_eq!(refreshed["result"]["sources"][0]["files"], 1);
        let first = call("search", json!({"query":"cache marker"}));
        assert!(first["result"]["output"]["results"][0]["snippet"]["text"]
            .as_str()
            .unwrap()
            .contains("before_edit"));
        std::fs::write(&source, "// cache marker\nfn after_edit() {}\n").unwrap();
        let next = call("search", json!({"query":"cache marker"}));
        assert!(next["result"]["output"]["results"][0]["snippet"]["text"]
            .as_str()
            .unwrap()
            .contains("after_edit"));
        assert!(
            call("configure", json!({"mode":"lexical","limit":0,"context":2}))
                .get("error")
                .is_some()
        );
        assert!(call("unknown", json!({})).get("error").is_some());
        assert!(call("search", json!({"query":"cache marker"}))
            .get("error")
            .is_none());
    }
    drop(input);
    assert!(process.wait().unwrap().success());
    // This integration-test binary has one test. Its child inherits an isolated
    // skill home; no user skill installation is touched by the typed client.
    let previous = std::env::var_os("IXOS_SKILL_HOME");
    std::env::set_var("IXOS_SKILL_HOME", root.path().join("agent-home"));
    let mut client = Session::start(std::path::Path::new(env!("CARGO_BIN_EXE_ixos"))).unwrap();
    assert_eq!(
        client.call("hello", json!({})).unwrap()["protocol_major"],
        1
    );
    assert!(client.call("unknown", json!({})).is_err());
    assert!(client.call("hello", json!({})).is_ok());
    drop(client);
    let previous_engine = std::env::var_os("IXOS_ENGINE_PATH");
    std::env::set_var("IXOS_ENGINE_PATH", env!("CARGO_BIN_EXE_ixos"));
    let mut engine = ixos_runtime::client::Engine::new_locations(
        &[root.path().to_owned()],
        None,
        Options {
            mode: RetrievalMode::Lexical,
            persist: false,
            ..Default::default()
        },
    )
    .unwrap();
    engine.refresh().unwrap();
    let source = engine.source(&root.path().canonicalize().unwrap());
    assert_eq!(source.files, 1);
    assert!(source.lines > 0);
    engine
        .configure_search(RetrievalMode::Lexical, 1, 2, None)
        .unwrap();
    let (raw, _) = engine.search_location("cache marker", None).unwrap();
    let payload: Value = serde_json::from_slice(&raw).unwrap();
    assert!(payload["results"][0]["snippet"]["text"]
        .as_str()
        .unwrap()
        .contains("after_edit"));
    drop(engine);
    match previous_engine {
        Some(value) => std::env::set_var("IXOS_ENGINE_PATH", value),
        None => std::env::remove_var("IXOS_ENGINE_PATH"),
    };
    match previous {
        Some(value) => std::env::set_var("IXOS_SKILL_HOME", value),
        None => std::env::remove_var("IXOS_SKILL_HOME"),
    };
}
