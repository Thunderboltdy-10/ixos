# MCP

`ixos mcp --dir /absolute/project --profile code` starts a local stdio server. Install the profile’s model first with `ixos model install code` (or `documents`). During development, use `--model-path` or `IXOS_MODEL_PATH` for a local model.

| Tool | Use it for | Arguments |
|---|---|---|
| `search` | Finding a file from a concept or keywords | `query`, `dir`, `profile`, `mode`, `limit`, `context` |
| `grep` | Exact text, identifiers or regular expressions | `pattern`, `dir`, `fixed`, `ignore_case`, `limit`, `context` |
| `read` | Reading a known file’s lines or extracted document text | `path`, `dir`, `start`, `lines`, `characters`, `character_offset` |

Only the query, pattern or path is required. Other arguments match the CLI choices; omitted values use the server’s location and settings. Results contain the same JSON as the CLI, in both MCP text content and structured content. Scores order results; they are not probabilities.

The process keeps models, parsed text, BM25 statistics and vectors resident per location and profile. Changing mode, limit or context reuses that state. Each search walks the location again and updates changed sources. There is no session learning. Search stores records when caching is enabled; grep and read only read sources.

## Claude Code

Run this in your project, replacing the absolute location. The command follows the [Claude Code stdio setup](https://code.claude.com/docs/en/mcp#option-3-add-a-local-stdio-server).

```sh
claude mcp add --transport stdio ixos -- ixos mcp --dir /absolute/project --profile code
```

Use `/mcp` inside Claude Code to check the connection.

## Codex

Register the same command using the [Codex MCP setup](https://developers.openai.com/codex/mcp).

```sh
codex mcp add ixos -- ixos mcp --dir /absolute/project --profile code
```

Use `/mcp` inside Codex to check the connection. On Windows, quote paths with spaces and use the full path to `ixos.exe` when it is not on PATH.

## Implementation and checks

Ixos implements the small stdio subset directly: initialization, ping, tool listing and calls. This keeps three local tools in one small module without adding the Rust SDK or its transport features. Messages use newline-delimited JSON-RPC as specified by [MCP stdio](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports#stdio); stdout carries only protocol messages.

`cargo test -p ixos-cli --test mcp` starts the real binary, lists the tools, calls all three, checks ignored paths and Unicode text, and verifies recovery from malformed requests. The cleanup also checked all three tools with the official TypeScript MCP client and compared their structured results with CLI JSON; Claude Code’s connection check succeeded against this repository.
