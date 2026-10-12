use serde_json::{json, Value};
use std::{
    io::Write,
    process::{Command, Stdio},
};

#[test]
fn stdio_lists_and_runs_source_tools_and_recovers_from_errors() {
    let dir = tempfile::tempdir().unwrap();
    std::fs::write(
        dir.path().join("source.rs"),
        "fn cache_key() {}\n// Unicode 中😀\n",
    )
    .unwrap();
    std::fs::write(dir.path().join(".gitignore"), "ignored.txt\n").unwrap();
    std::fs::write(dir.path().join("ignored.txt"), "cache_key").unwrap();
    let mut process = Command::new(env!("CARGO_BIN_EXE_ixos"))
        .args(["mcp", "--dir"])
        .arg(dir.path())
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    let messages = [
        json!({"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"test","version":"1"}}}),
        json!({"jsonrpc":"2.0","method":"notifications/initialized"}),
        json!({"jsonrpc":"2.0","id":2,"method":"tools/list"}),
        json!({"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"search","arguments":{"query":"cache_key","mode":"lexical"}}}),
        json!({"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"grep","arguments":{"pattern":"cache_key","fixed":true}}}),
        json!({"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"read","arguments":{"path":"ignored.txt"}}}),
        json!({"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"read","arguments":{"path":"source.rs","start":2,"lines":1}}}),
    ];
    let mut input = process.stdin.take().unwrap();
    input.write_all(b"{bad json}\n").unwrap();
    for request in messages {
        serde_json::to_writer(&mut input, &request).unwrap();
        input.write_all(b"\n").unwrap();
    }
    drop(input);
    let output = process.wait_with_output().unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    let responses = output
        .stdout
        .split(|b| *b == b'\n')
        .filter(|line| !line.is_empty())
        .map(|line| serde_json::from_slice::<Value>(line).unwrap())
        .collect::<Vec<_>>();
    assert_eq!(responses.len(), 7);
    assert_eq!(responses[0]["error"]["code"], -32700);
    assert_eq!(
        responses[2]["result"]["tools"]
            .as_array()
            .unwrap()
            .iter()
            .map(|tool| tool["name"].as_str().unwrap())
            .collect::<Vec<_>>(),
        ["search", "grep", "read"]
    );
    assert_eq!(
        responses[3]["result"]["structuredContent"]["results"][0]["path"],
        "source.rs"
    );
    assert_eq!(
        responses[4]["result"]["structuredContent"]["results"][0]["line"],
        1
    );
    assert_eq!(responses[5]["result"]["isError"], true);
    assert_eq!(
        responses[6]["result"]["structuredContent"]["snippet"]["text"],
        "// Unicode 中😀"
    );
    for response in [&responses[3], &responses[4], &responses[6]] {
        let text = response["result"]["content"][0]["text"].as_str().unwrap();
        assert_eq!(
            serde_json::from_str::<Value>(text).unwrap(),
            response["result"]["structuredContent"]
        );
    }
}
