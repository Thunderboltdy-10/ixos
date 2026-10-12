# CLI

`ixos --help` lists eight commands. `--config PATH` selects a settings file; `--version` prints the version. Search defaults to the code profile and hybrid mode.

```sh
ixos search "cache freshness" --dir . --profile code --mode hybrid --limit 10 --context 2 --json
ixos grep "source_hash" --dir crates/ixos-core --fixed --context 2 --json
ixos read src/source.rs --dir crates/ixos-core --start 1 --lines 30 --json
ixos mcp --dir . --profile code
```

Search flags are `--dir`, `--profile code|documents`, `--mode lexical|semantic|hybrid`, `--limit`, `--context` and `--json`. During development, `--model-path` or `IXOS_MODEL_PATH` selects local artifacts. Lexical search works without a model. Scores rank files; they are not probabilities.

Grep accepts regular expressions by default, `--fixed` for literals, and `--ignore-case`. Read accepts line ranges, plus `--characters` and `--character-offset` for long extracted lines. Both honor discovery ignore rules. JSON snippets contain `path`, `start_line`, `end_line` and `text`. Output has a 6,000-byte ceiling.

```sh
ixos cache stats .
ixos cache clear .
ixos cache clear . --yes
ixos cache clear --all --yes
ixos model install code
ixos model list
ixos doctor --dir . --profile code
```

Cache stats report files, record bytes, fallback entries and old records. Clear is a dry run unless `--yes` is supplied; `--all` includes configured locations and orphaned fallback entries. Only Ixos metadata is removed. Model install verifies SHA-256 hashes; `--from models/code` installs local build artifacts before publication. Doctor loads the selected model, checks application-cache writability, and runs a tiny search.

`ixos config` shows the shared settings: `locations`, `profile`, `limit`, `context`, `cache` and `model_dir`. Use `ixos config limit 5` or `ixos config cache false` to change a key; locations accepts a JSON array of folder paths. The settings file lives in the platform configuration directory under `ixos/settings.toml`; installed models live in the platform local-data directory under `ixos/models`.
