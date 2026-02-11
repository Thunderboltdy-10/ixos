---
name: ixos-search
description: "Use Ixos semantic search before literal grep/glob for code exploration. Use grep only for exact token matches."
allowed-tools: Bash(ixos *), Bash(.\target\release\ixos.exe *), Bash(./target/release/ixos *)
---

# Ixos Search Skill

## Default Rule
- Use `ixos search` first for exploratory questions.
- Use `rg`/`grep` only for exact symbol/string lookups.

## Canonical Models
- `ixos-flash-v2` (default fast path)
- `ixos-pro-v2` (Pro path)

## Standard Commands
```bash
# Windows
.\target\release\ixos.exe search "your query" --dir . --context 3 --show-scores

# Unix
./target/release/ixos search "your query" --dir . --context 3 --show-scores
```

## Recommended Flags
- `--context 3`: useful snippet context
- `--show-scores`: quality triage
- `--limit 10`: tighter result set
- `--json`: machine parsing
- `--search-mode flash|pro|auto`: explicit mode control

## Privacy-Sensitive Search
```bash
ixos search "sensitive query" --dir . --journalist-mode --cache-mode jit
```

## When Literal Search Is Better
- Exact function signature lookup
- Exact import or config key lookup
- Bulk string replacement prep

## Invocation Shortcut
When invoked as `/ixos-search <query>`:
```bash
ixos search "$ARGUMENTS" --dir . --context 3 --show-scores --search-mode flash
```
