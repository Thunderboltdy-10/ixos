#!/usr/bin/env bash
set -euo pipefail
root=/home/thunderboltdy/.cache/ixos-review-298088f-20261011
source "$root/environment.sh"
mkdir -p "$root/gate21" "$root/gate21-real-source"
cp "$root/source/target/release/ixos" "$root/control-gate21-ixos"
sha256sum "$root/control-gate21-ixos" > "$root/gate21/control.sha256"
cp /mnt/c/Users/pablo/Downloads/Ixos/src/retrieval/commands.rs "$root/source/src/retrieval/commands.rs"
cp /mnt/c/Users/pablo/Downloads/Ixos/src/cli/commands.rs "$root/source/src/cli/commands.rs"
cp /mnt/c/Users/pablo/Downloads/Ixos/src/main.rs "$root/source/src/main.rs"
cd "$root/source"
cargo test --workspace --locked --jobs 2 > "$root/gate21/tests.stdout" 2> "$root/gate21/tests.stderr"
cargo build --release --locked --bin ixos > "$root/gate21/build.stdout" 2> "$root/gate21/build.stderr"
sha256sum target/release/ixos > "$root/gate21/binary.sha256"
tar -xzf /mnt/c/Users/pablo/Downloads/Ixos/.tmp/gate20/data/C01.tar.gz --strip-components=1 -C "$root/gate21-real-source"
