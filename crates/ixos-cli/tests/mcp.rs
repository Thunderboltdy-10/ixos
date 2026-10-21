use serde_json::{json, Value};
use std::{
    io::Write,
    process::{Command, Stdio},
};

fn read_calls(dir: &std::path::Path, arguments: Vec<Value>) -> Vec<Value> {
    let mut child = Command::new(env!("CARGO_BIN_EXE_ixos"))
        .env("IXOS_SKILL_HOME", dir.join("agent-home"))
        .args(["mcp", "--dir"])
        .arg(dir)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    let mut input = child.stdin.take().unwrap();
    writeln!(
        input,
        "{}",
        json!({"jsonrpc":"2.0","id":0,"method":"initialize"})
    )
    .unwrap();
    for (id, args) in arguments.into_iter().enumerate() {
        writeln!(input, "{}", json!({"jsonrpc":"2.0","id":id+1,"method":"tools/call","params":{"name":"read","arguments":args}})).unwrap();
    }
    drop(input);
    let output = child.wait_with_output().unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    output
        .stdout
        .split(|b| *b == b'\n')
        .filter(|line| !line.is_empty())
        .skip(1)
        .map(|line| serde_json::from_slice::<Value>(line).unwrap()["result"].clone())
        .collect()
}

#[cfg(feature = "evidence-functions")]
#[test]
fn exact_function_reads_preserve_scopes_ranges_and_ambiguity() {
    let dir = tempfile::tempdir().unwrap();
    let text="class Left:\n    def visit(self):\n        # begin traversal\n        result = '中😀'\n        # finish reconstruction\n        return result\n\nclass Right:\n    def visit(self):\n        return None\n";
    std::fs::write(dir.path().join("tree.py"), text).unwrap();
    let calls = read_calls(
        dir.path(),
        vec![
            json!({"path":"tree.py","within":"Left::visit","view":"numbered"}),
            json!({"path":"tree.py","within":"visit"}),
            json!({"path":"tree.py","within":"Left::visit","start":4,"end":5}),
            json!({"requests":[{"id":"left","path":"tree.py","within":"Left::visit"},{"id":"right","path":"tree.py","within":"Right::visit"},{"id":"missing","path":"tree.py","within":"unknown"}],"max_bytes":12000}),
            json!({"path":"tree.py","within":"Left::visit","characters":2}),
            json!({"path":"tree.py","body":false}),
        ],
    );
    assert_eq!(
        calls[0]["structuredContent"]["selection"]["symbol"],
        json!(["visit", 2, 6])
    );
    assert_eq!(
        calls[0]["structuredContent"]["snippet"]["text"],
        text.lines().skip(1).take(5).collect::<Vec<_>>().join("\n")
    );
    assert_eq!(
        calls[1]["structuredContent"]["selection"]["status"],
        "ambiguous"
    );
    assert!(calls[1]["structuredContent"].get("snippet").is_none());
    assert_eq!(
        calls[2]["structuredContent"]["selection"]["requested_lines"],
        json!([4, 5])
    );
    assert_eq!(
        calls[3]["structuredContent"]["results"][2]["selection"]["status"],
        "not_found"
    );
    assert_eq!(calls[4]["isError"], true);
    assert_eq!(calls[5]["isError"], true);
}

#[test]
fn removed_approximate_selectors_are_rejected_without_model_setup() {
    let dir = tempfile::tempdir().unwrap();
    std::fs::write(dir.path().join("a.rs"), "fn sample() {}\n").unwrap();
    let requests = [
        json!({"query":"sample"}),
        json!({"mode":"hybrid"}),
        json!({"from":{"query":"sample"}}),
        json!({"to":{"query":"sample"}}),
        json!({"context":1}),
    ]
    .into_iter()
    .map(|mut args| {
        args["path"] = json!("a.rs");
        args
    })
    .collect();
    for result in read_calls(dir.path(), requests) {
        assert_eq!(result["isError"], true);
    }
}

#[cfg(feature = "evidence-functions")]
#[test]
fn implementation_reads_preserve_default_documentation_and_exact_body_lines() {
    let dir = tempfile::tempdir().unwrap();
    let text = "def visit(value):\n    \"\"\"Explain traversal.\"\"\"\n    # Associated implementation comment.\n    return value + 1\n";
    std::fs::write(dir.path().join("tree.py"), text).unwrap();
    let calls = read_calls(
        dir.path(),
        vec![
            json!({"path":"tree.py","within":"visit"}),
            json!({"path":"tree.py","within":"visit","body":true}),
            json!({"path":"tree.py","body":true}),
        ],
    );
    assert_eq!(calls[0]["structuredContent"]["snippet"]["start_line"], 1);
    assert!(calls[0]["structuredContent"]["snippet"]["text"]
        .as_str()
        .unwrap()
        .contains("Explain traversal"));
    let body = &calls[1]["structuredContent"];
    assert_eq!(body["selection"]["symbol"], json!(["visit", 1, 4]));
    assert_eq!(body["selection"]["scope"], json!([4, 4]));
    assert_eq!(body["snippet"]["text"], "    return value + 1");
    assert_eq!(body["truncated"], false);
    assert_eq!(calls[2]["isError"], true);
}

#[test]
fn batches_fairly_bound_unicode_source_and_independent_continuation() {
    let dir = tempfile::tempdir().unwrap();
    let source = (0..300)
        .map(|i| format!("// line {i} 中😀 {}\n", "body ".repeat(12)))
        .collect::<String>();
    std::fs::write(dir.path().join("source.rs"), &source).unwrap();
    let calls = read_calls(
        dir.path(),
        vec![
            json!({"requests":[{"id":"left","path":"source.rs","lines":300},{"id":"right","path":"source.rs","lines":300}],"view":"numbered"}),
            json!({"requests":[{"path":"source.rs","lines":1,"characters":3,"character_offset":10}]}),
            json!({"path":"source.rs","lines":300}),
            json!({"path":"source.rs","lines":300,"max_bytes":24000}),
            json!({"requests":(0..8).map(|id| json!({"id":id.to_string(),"path":"source.rs","lines":300})).collect::<Vec<_>>()}),
        ],
    );
    let rows = calls[0]["structuredContent"]["results"].as_array().unwrap();
    assert_eq!(rows.len(), 2);
    for (row, id) in rows.iter().zip(["left", "right"]) {
        assert_eq!(row["id"], id);
        assert_eq!(row["truncated"], true);
        let end = row["snippet"]["end_line"].as_u64().unwrap();
        assert_eq!(row["next_start_line"], end + 1);
        assert!(row["snippet"]["text"].as_str().unwrap().len() > 1000);
        assert_eq!(
            row["snippet"]["text"],
            source
                .lines()
                .take(end as usize)
                .collect::<Vec<_>>()
                .join("\n")
        );
    }
    assert_eq!(
        rows[0]["snippet"]["end_line"],
        rows[1]["snippet"]["end_line"]
    );
    for index in [0, 4] {
        let text = calls[index]["content"][0]["text"].as_str().unwrap();
        assert!(text.len() <= 6000);
        assert_eq!(
            serde_json::from_str::<Value>(text).unwrap(),
            calls[index]["structuredContent"]
        );
    }
    let eight = calls[4]["structuredContent"]["results"].as_array().unwrap();
    assert_eq!(eight.len(), 8);
    for row in eight {
        assert!(row["snippet"]["text"].as_str().unwrap().contains("中😀"));
    }
    let unicode = &calls[1]["structuredContent"]["results"][0];
    assert_eq!(unicode["slice"]["text"], "中😀 ");
    assert_eq!(unicode["next_character_offset"], 13);
    assert_eq!(unicode["slice"]["start_byte"], 10);
    assert_eq!(unicode["slice"]["end_byte"], 18);
    let continued = read_calls(
        dir.path(),
        vec![
            json!({"requests":rows.iter().map(|row| json!({"path":"source.rs","start":row["next_start_line"],"lines":1,"expected_source_hash":row["source_hash"]})).collect::<Vec<_>>()}),
        ],
    );
    for (row, previous) in continued[0]["structuredContent"]["results"]
        .as_array()
        .unwrap()
        .iter()
        .zip(rows)
    {
        assert_eq!(row["snippet"]["start_line"], previous["next_start_line"]);
    }
    assert!(calls[2]["structuredContent"].get("results").is_none());
    assert!(
        calls[3]["structuredContent"]["snippet"]["end_line"]
            .as_u64()
            .unwrap()
            > calls[2]["structuredContent"]["snippet"]["end_line"]
                .as_u64()
                .unwrap()
    );
    assert!(calls[3]["content"][0]["text"].as_str().unwrap().len() <= 24000);
}

#[test]
fn batch_errors_are_local_and_invalid_envelopes_are_rejected() {
    let dir = tempfile::tempdir().unwrap();
    std::fs::write(dir.path().join("source.rs"), "fn before() {}\n").unwrap();
    std::fs::write(dir.path().join(".gitignore"), "ignored.txt\n").unwrap();
    std::fs::write(dir.path().join("ignored.txt"), "secret").unwrap();
    let outside = tempfile::NamedTempFile::new().unwrap();
    let initial = read_calls(dir.path(), vec![json!({"path":"source.rs","lines":1})]);
    let hash = initial[0]["structuredContent"]["source_hash"].clone();
    std::fs::write(dir.path().join("source.rs"), "fn after() {}\n").unwrap();
    let result = read_calls(
        dir.path(),
        vec![json!({"requests":[
            {"id":"stale","path":"source.rs","expected_source_hash":hash},
            {"id":"ignored","path":"ignored.txt"}, {"id":"outside","path":outside.path()},
            {"id":"unknown","path":"source.rs","wat":true},
            {"id":"range","path":"source.rs","end":2,"lines":2},
            {"id":"nested","path":"source.rs","dir":"."},
            {"id":"good","path":"source.rs","lines":1}
        ]})],
    );
    assert_eq!(result[0]["isError"], false);
    let rows = result[0]["structuredContent"]["results"]
        .as_array()
        .unwrap();
    assert!(rows[0]["error"]
        .as_str()
        .unwrap()
        .contains("Source changed"));
    for row in &rows[..6] {
        assert!(row["error"].is_string());
        assert!(row["id"].is_string());
        assert!(row.get("snippet").is_none());
    }
    assert_eq!(rows[6]["snippet"]["text"], "fn after() {}");
    let invalid = vec![
        json!({"requests":[]}),
        json!({"requests":vec![json!({"path":"source.rs"});9]}),
        json!({"path":"source.rs","requests":[{"path":"source.rs"}]}),
        json!({"start":1,"requests":[{"path":"source.rs"}]}),
        json!({"requests":[{"path":"source.rs","id":"same"},{"path":"source.rs","id":"same"}]}),
        json!({"requests":[{"path":"source.rs","id":123}]}),
        json!({"path":"source.rs","max_bytes":24001}),
        json!({"path":"source.rs","max_bytes":1}),
        json!({"requests":[{"path":"source.rs"},{"path":"source.rs"}],"max_bytes":128}),
        json!({"requests":[{"path":"source.rs"}],"unknown":true}),
    ];
    for result in read_calls(dir.path(), invalid) {
        assert_eq!(result["isError"], true);
    }
    let legacy = read_calls(
        dir.path(),
        vec![json!({"path":"source.rs","lines":1,"dir":null})],
    );
    let expected: Value = serde_json::from_slice(
        &ixos_core::tools::read_range(
            dir.path(),
            std::path::Path::new("source.rs"),
            1,
            1,
            None,
            0,
            6000,
        )
        .unwrap(),
    )
    .unwrap();
    assert_eq!(legacy[0]["structuredContent"], expected);
}

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
        .env("IXOS_SKILL_HOME", dir.path().join("agent-home"))
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
        json!({"jsonrpc":"2.0","id":7,"method":"tools/call","params":{"name":"search","arguments":{"query":"cache_key","mode":"lexical","limit":1,"context":0}}}),
        json!({"jsonrpc":"1.0","id":8,"method":"tools/list"}),
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
    assert_eq!(responses.len(), 9);
    assert_eq!(responses[8]["error"]["code"], -32600);
    assert_eq!(
        responses[7]["result"]["structuredContent"]["results"]
            .as_array()
            .unwrap()
            .len(),
        1
    );
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

#[test]
fn inclusive_ranges_numbered_views_and_source_guards_work_through_stdio() {
    let dir = tempfile::tempdir().unwrap();
    std::fs::write(
        dir.path().join("source.rs"),
        "// documentation\nfn target() {}\n// 中😀\n",
    )
    .unwrap();
    let mut child = Command::new(env!("CARGO_BIN_EXE_ixos"))
        .env("IXOS_SKILL_HOME", dir.path().join("agent-home"))
        .args(["mcp", "--dir"])
        .arg(dir.path())
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    use std::io::{BufRead, BufReader};
    let mut input = child.stdin.take().unwrap();
    let mut output = BufReader::new(child.stdout.take().unwrap());
    let mut id = 0;
    let mut call = |method: &str, params: Value| -> Value {
        id += 1;
        serde_json::to_writer(
            &mut input,
            &json!({"jsonrpc":"2.0","id":id,"method":method,"params":params}),
        )
        .unwrap();
        input.write_all(b"\n").unwrap();
        input.flush().unwrap();
        let mut line = String::new();
        output.read_line(&mut line).unwrap();
        serde_json::from_str::<Value>(&line).unwrap()["result"].clone()
    };
    call("initialize", json!({}));
    let v = call(
        "tools/call",
        json!({"name":"read","arguments":{"path":"source.rs","start":2,"end":3,"view":"numbered"}}),
    );
    assert_eq!(
        v["structuredContent"]["snippet"]["text"],
        "fn target() {}\n// 中😀"
    );
    assert!(v["content"][0]["text"]
        .as_str()
        .unwrap()
        .contains("3 |// 中😀"));
    let hash = v["structuredContent"]["source_hash"].clone();
    let v = call(
        "tools/call",
        json!({"name":"read","arguments":{"path":"source.rs","expected_source_hash":hash}}),
    );
    assert_eq!(v["isError"], false);
    std::fs::write(dir.path().join("source.rs"), "fn changed() {}\n").unwrap();
    let v = call(
        "tools/call",
        json!({"name":"read","arguments":{"path":"source.rs","expected_source_hash":hash}}),
    );
    assert_eq!(v["isError"], true);
    assert!(v["content"][0]["text"]
        .as_str()
        .unwrap()
        .contains("Source changed"));
    let v = call(
        "tools/call",
        json!({"name":"read","arguments":{"path":"source.rs","end":2,"lines":2}}),
    );
    assert_eq!(v["isError"], true);
    let v = call(
        "tools/call",
        json!({"name":"grep","arguments":{"pattern":"changed","fixed":true,"view":"numbered"}}),
    );
    assert!(v["content"][0]["text"]
        .as_str()
        .unwrap()
        .contains("hits L1"));
    let v = call(
        "tools/call",
        json!({"name":"read","arguments":{"path":"source.rs","view":"invalid"}}),
    );
    assert_eq!(v["isError"], true);
    let long = (1..=400)
        .map(|i| format!("line {i}: {}\n", "source text ".repeat(8)))
        .collect::<String>();
    std::fs::write(dir.path().join("source.rs"), &long).unwrap();
    let v = call(
        "tools/call",
        json!({"name":"read","arguments":{"path":"source.rs","start":1,"end":400,"view":"numbered"}}),
    );
    let body = &v["structuredContent"];
    assert_eq!(body["truncated"], true);
    let next = body["next_start_line"].as_u64().unwrap();
    assert_eq!(next, body["snippet"]["end_line"].as_u64().unwrap() + 1);
    assert!(v["content"][0]["text"].as_str().unwrap().len() <= 6000);
    let v = call(
        "tools/call",
        json!({"name":"read","arguments":{"path":"source.rs","start":next,"lines":1,"view":"numbered"}}),
    );
    assert_eq!(
        v["structuredContent"]["snippet"]["text"],
        long.lines().nth(next as usize - 1).unwrap()
    );
    std::fs::write(dir.path().join("source.rs"), "中😀".repeat(5000)).unwrap();
    let v = call(
        "tools/call",
        json!({"name":"read","arguments":{"path":"source.rs","lines":1,"view":"numbered"}}),
    );
    assert_eq!(v["isError"], true);
    let v = call(
        "tools/call",
        json!({"name":"read","arguments":{"path":"source.rs","start":1,"end":1,"characters":8,"character_offset":3,"view":"numbered"}}),
    );
    assert_eq!(v["structuredContent"]["slice"]["text"], "😀中😀中😀中😀中");
    assert_eq!(v["structuredContent"]["next_character_offset"], 11);
    assert_eq!(v["structuredContent"]["slice"]["start_byte"], 10);
    assert_eq!(v["structuredContent"]["slice"]["end_byte"], 38);
    // Character slices retain their precise extracted-text byte coordinates.
    assert_eq!(
        serde_json::from_str::<Value>(v["content"][0]["text"].as_str().unwrap()).unwrap(),
        v["structuredContent"]
    );
    drop(input);
    assert!(child.wait().unwrap().success());
}
