# CLI

`ixos --help` lists nine commands. `--config PATH` selects a settings file; `--version` prints the version. Search defaults to the code profile and hybrid mode.

```sh
ixos search "cache freshness" --dir . --profile code --mode hybrid --limit 10 --context 2 --json
ixos grep "source_hash" --dir crates/ixos-core --fixed --context 2 --json
ixos read src/source.rs --dir crates/ixos-core --start 1 --lines 30 --json
ixos mcp --dir . --profile code
```

Search flags are `--dir`, `--profile code|documents`, `--mode lexical|semantic|hybrid`, `--limit`, `--context` and `--json`. During development, `--model-path` or `IXOS_MODEL_PATH` selects local artifacts. Lexical search works without a model. Scores rank files; they are not probabilities.

Grep accepts regular expressions by default, `--fixed` for literals, and `--ignore-case`. Read accepts line ranges, plus `--characters` and `--character-offset` for long extracted lines. Both honor discovery ignore rules. JSON snippets contain `path`, `start_line`, `end_line` and `text`. Output has a 6,000-byte ceiling.

```sh
ixos cache stats --dir .
ixos cache clear --dir .
ixos cache clear --dir . --yes
ixos cache clear --all --yes
ixos setup
ixos model install code
ixos model list
ixos doctor --dir . --profile code
```

Cache stats report files, record bytes, fallback entries and old records. Stats and clear use `--dir`, defaulting to the current folder. Clear is a dry run unless `--yes` is supplied; `--all` includes configured locations and orphaned fallback entries and cannot be combined with `--dir`. Only Ixos metadata is removed. `ixos setup` completes installation by downloading both models from pinned Hugging Face revisions. Model install verifies SHA-256 hashes and loads the artifacts before publishing the installed directory. Downloads use temporary directories and a per-profile filesystem lock shared with the desktop. A failed download leaves no partial model installed; retry setup or model install after reconnecting. `--from models/code` installs local artifacts without downloading. CLI and MCP semantic/hybrid search automatically install a missing managed model for the selected profile. Explicit `--model-path` and `IXOS_MODEL_PATH` overrides remain local; lexical search, grep and read never download models. Doctor loads the selected model, checks application-cache writability, and runs a tiny search.

`ixos config` shows the shared settings: `locations`, `profile`, `limit`, `context`, `cache` and `model_dir`. Use `ixos config limit 5` or `ixos config cache false` to change a key; locations accepts a JSON array of folder paths. The settings file lives in the platform configuration directory under `ixos/settings.toml`; installed models live in the platform local-data directory under `ixos/models`.
