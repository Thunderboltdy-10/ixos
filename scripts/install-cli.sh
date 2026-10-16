#!/bin/sh
# Build the CLI and complete model setup for the current user.
set -eu
task_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cargo install --path "$task_root/crates/ixos-cli" --locked
"${CARGO_HOME:-$HOME/.cargo}/bin/ixos" setup
