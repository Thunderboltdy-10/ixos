"""Run the actual Ixos MCP process and serialize bounded baseline results."""

import json
import subprocess


def encode(value):
    return (
        json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        + b"\n"
    )


def bounded(rows, budget=6000):
    output = []
    for original in rows:
        row = dict(original)
        if len(encode({"results": output + [row]})) > budget:
            if row.get("snippet"):
                row.pop("snippet")
                row["snippet_omitted"] = True
        if len(encode({"results": output + [row]})) > budget:
            break
        output.append(row)
    return encode({"results": output})


class Ixos:
    def __init__(self, binary, root, profile, model, config, stderr):
        self.process = subprocess.Popen(
            [
                str(binary.resolve()),
                "--config",
                str(config.resolve()),
                "mcp",
                "--dir",
                str(root.resolve()),
                "--profile",
                profile,
                "--model-path",
                str(model.resolve()),
            ],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=stderr,
        )
        self.next_id = 0
        self.call(
            "initialize",
            {
                "protocolVersion": "2025-11-25",
                "capabilities": {},
                "clientInfo": {"name": "ixos-eval", "version": "0.1"},
            },
        )

    def call(self, method, params):
        self.next_id += 1
        self.process.stdin.write(
            encode(
                {
                    "jsonrpc": "2.0",
                    "id": self.next_id,
                    "method": method,
                    "params": params,
                }
            )
        )
        self.process.stdin.flush()
        line = self.process.stdout.readline()
        if not line:
            raise ValueError(f"Ixos stopped with exit code {self.process.poll()}")
        reply = json.loads(line)
        if reply.get("error") or reply.get("id") != self.next_id:
            raise ValueError("MCP request failed")
        return reply["result"]

    def search(self, query, mode="hybrid"):
        result = self.call(
            "tools/call",
            {
                "name": "search",
                "arguments": {"query": query, "mode": mode, "limit": 10, "context": 2},
            },
        )
        if result.get("isError"):
            raise ValueError(result["content"][0]["text"])
        # The protocol text contains the CLI JSON payload. Count that payload,
        # without JSON-RPC framing or duplicated structuredContent.
        return result["content"][0]["text"].encode("utf-8") + b"\n"

    def close(self):
        self.process.stdin.close()
        self.process.wait(timeout=30)
        self.process.stdout.close()
        if self.process.returncode:
            raise ValueError("Ixos MCP exited unsuccessfully")
