# Install from source

Builds require Rust 1.89+ with the platform C toolchain (Visual Studio C++ build tools on Windows, Command Line Tools on macOS, GCC/Clang on Linux). Python 3.11+ prepares pinned model variants. Code preparation uses the standard library; documents additionally use `numpy==2.3.5`. Runtime search uses Rust/CPU and needs no Python process or network request.

```sh
cargo build --release --locked --bin ixos
python scripts/setup_models.py --profile code
```

On Windows run `target/release/ixos.exe`; on Unix run `./target/release/ixos`. Add that directory to PATH or copy only the executable to your chosen bin directory. A source installation is the currently verified path; release artifacts/auto-updates are separate and have not been published for this restoration.

For dense documents:

```sh
python -m pip install numpy==2.3.5
python scripts/setup_models.py --profile documents
```

Models install in `%LOCALAPPDATA%/ixos/models` (Windows), `~/Library/Application Support/ixos/models` (macOS), or `$XDG_DATA_HOME/ixos/models` / `~/.local/share/ixos/models` (Linux). Pinned parents, exact sizes/SHA256s, revisions, transforms and runtime fingerprints are in `config/retrieval-models.json`. Existing folders must match hashes; conflicting artifacts are rejected. Downloads/conversion occur in a temporary model folder, then a verified folder is renamed into place. Existing sources are untouched. Preserve each upstream model card and install receipt.

Offline: provide `--source-root PATH`, containing the original `potion-code-16M-v2` and/or `potion-retrieval-32M` folders at their pinned revisions. A custom `--destination PATH` requires `--model-path PATH/FOLDER`, `IXOS_MODEL_PATH` or `retrieval.model_path` configuration.

```sh
ixos search "where are source edits verified" --dir . --json
ixos search "source hash" --profile lexical --dir . --json
ixos doctor --json
```

`doctor` still describes some legacy model facilities; a current profile search is the definitive runtime probe. Missing models do not silently produce stub results. Lexical and exact grep/read need no model. Config paths can be found with `ixos config --path`. Native caching may write ADS/xattr metadata; use `--cache-mode ephemeral` to disable persistent embedding records. No adjacent embedding files are created.

Windows source installation was also checked from an exported staged tree with a fresh build directory and independently downloaded models in a custom destination; receipts and exact isolation conditions are in `reports/restoration/GATE4.md` and `GATE5.md`. Gate6 additionally built the exported CLI on Ubuntu24.04/WSL x86-64 on ext4, using isolated Rust1.92.0, a fresh Cargo cache and pinned code-model download. It passed530core tests, the settings matrix, nine actual-model native/source/cache probes, eight profile checks and extracted Linux package execution. Latest Windows checks pass532core/16desktop/48settings combinations, nine native probes and eight profile checks including frozen-fixture equivalence. See `reports/restoration/GATE6.md`. These checks use real models; they do not establish worst-device performance. Rust1.89 is the declared manifest minimum; these restoration builds were tested with1.92.0.

Mac CI is configured; native Mac runtime has not been verified locally and the owner deferred it for now. The release checklist includes Mac Unicode/long-source, native xattr failure/fallback, edits and actual default-model search. A passing build alone is insufficient. For core-only checks without Linux desktop libraries, use `cargo test --locked -p ixos-protocol --lib --bin ixos --test settings_matrix --jobs 2`.

Desktop development: `npm ci`, then `npm run tauri:dev`; website: `npm run site:dev`. Linux desktop development additionally needs WebKitGTK/GTK dependencies. Desktop legacy model resources remain separate from these current CLI models; packaging and visual polish are separate workstreams.
