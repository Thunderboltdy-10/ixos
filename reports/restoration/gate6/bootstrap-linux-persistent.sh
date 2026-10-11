#!/usr/bin/env bash
set -euo pipefail
task_root=/home/thunderboltdy/.cache/ixos-review-298088f-20261011
test ! -e "$task_root"
mkdir -p "$task_root"/receipts "$task_root"/source "$task_root"/models
export CARGO_HOME="$task_root/cargo"
export RUSTUP_HOME="$task_root/rustup"
export PATH="$CARGO_HOME/bin:$PATH"
export XDG_CONFIG_HOME="$task_root/app-config"
export XDG_CACHE_HOME="$task_root/app-cache"
export XDG_DATA_HOME="$task_root/app-data"
cat > "$task_root/environment.sh" <<'ENV'
export IXOS_REVIEW_ROOT=/home/thunderboltdy/.cache/ixos-review-298088f-20261011
export CARGO_HOME="$IXOS_REVIEW_ROOT/cargo"
export RUSTUP_HOME="$IXOS_REVIEW_ROOT/rustup"
export PATH="$CARGO_HOME/bin:$PATH"
export XDG_CONFIG_HOME="$IXOS_REVIEW_ROOT/app-config"
export XDG_CACHE_HOME="$IXOS_REVIEW_ROOT/app-cache"
export XDG_DATA_HOME="$IXOS_REVIEW_ROOT/app-data"
ENV
cd "$task_root"
installer_url=https://static.rust-lang.org/rustup/archive/1.28.2/x86_64-unknown-linux-gnu/rustup-init
curl --proto '=https' --tlsv1.2 --fail --location "$installer_url" -o rustup-init
curl --proto '=https' --tlsv1.2 --fail --location "$installer_url.sha256" -o rustup-init.sha256
sha256sum --check rustup-init.sha256 | tee receipts/installer-hash.stdout
chmod u+x rustup-init
./rustup-init -y --no-modify-path --profile minimal --default-toolchain 1.92.0 > receipts/toolchain.stdout 2> receipts/toolchain.stderr
rustc --version --verbose > receipts/rustc.stdout
cargo --version > receipts/cargo.stdout
uname -a > receipts/uname.stdout
tar -xf /mnt/c/Users/pablo/Downloads/Ixos/.tmp/gate6/source-298088f.tar -C source
python3 source/scripts/setup_models.py --profile code --destination "$task_root/models" > receipts/code-model.stdout 2> receipts/code-model.stderr
cp -a /mnt/c/Users/pablo/Downloads/Ixos/.tmp/gate4/reviewer-models/potion-retrieval-32M-row-int8 models/
cd source
cargo build --release --locked --bin ixos --jobs 2 > "$task_root/receipts/build.stdout" 2> "$task_root/receipts/build.stderr"
sha256sum target/release/ixos > "$task_root/receipts/binary-hash.stdout"
printf 'Linux source build complete: %s\n' "$task_root"
