#!/usr/bin/env bash
set -euo pipefail
root=/home/thunderboltdy/.cache/ixos-review-298088f-20261011
source "$root/environment.sh"
cd "$root/source"
mv "$root/gate21/tests.stdout" "$root/gate21/workspace-missing-deps.stdout"
mv "$root/gate21/tests.stderr" "$root/gate21/workspace-missing-deps.stderr"
cargo test -p ixos-protocol --lib --locked --jobs 2 > "$root/gate21/core-tests.stdout" 2> "$root/gate21/core-tests.stderr"
cargo test -p ixos-protocol --test settings_matrix --locked --jobs 2 > "$root/gate21/settings.stdout" 2> "$root/gate21/settings.stderr"
cargo build --release --locked --bin ixos > "$root/gate21/build.stdout" 2> "$root/gate21/build.stderr"
sha256sum target/release/ixos > "$root/gate21/binary.sha256"
tar -xzf /mnt/c/Users/pablo/Downloads/Ixos/.tmp/gate20/data/C01.tar.gz --strip-components=1 -C "$root/gate21-real-source"
