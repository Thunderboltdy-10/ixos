#!/usr/bin/env bash
set -euo pipefail

REPO="${IXOS_REPO:-IxosProtocol/ixos-releases}"
INSTALL_ROOT="${IXOS_INSTALL_DIR:-$HOME/.ixos/cli}"
BIN_DIR="$INSTALL_ROOT/bin"
ASSET_URL_OVERRIDE="${IXOS_ASSET_URL:-}"
SKIP_PATH_PERSIST="${IXOS_SKIP_PATH_PERSIST:-}"

detect_os() {
  case "$(uname -s)" in
    Linux) echo "linux" ;;
    Darwin) echo "macos" ;;
    *)
      echo "Unsupported OS: $(uname -s)" >&2
      exit 1
      ;;
  esac
}

detect_arch() {
  local os="$1"
  case "$(uname -m)" in
    x86_64|amd64) echo "x86_64" ;;
    arm64|aarch64)
      if [[ "$os" == "macos" ]]; then
        echo "arm64"
      else
        echo "Unsupported architecture for $os: $(uname -m). Supported: x86_64." >&2
        exit 1
      fi
      ;;
    *)
      echo "Unsupported architecture: $(uname -m)" >&2
      exit 1
      ;;
  esac
}

resolve_tag() {
  if [[ -n "${IXOS_TAG:-}" ]]; then
    echo "$IXOS_TAG"
    return
  fi

  local releases_json
  releases_json="$(curl -fsSL -H "User-Agent: ixos-install-script" "https://api.github.com/repos/$REPO/releases?per_page=30")"
  local cli_tag
  cli_tag="$(printf '%s' "$releases_json" \
    | grep -oE '"tag_name":[[:space:]]*"cli-v[^"]+"' \
    | head -n1 \
    | sed -E 's/.*"([^"]+)"/\1/')"

  if [[ -n "$cli_tag" ]]; then
    echo "$cli_tag"
    return
  fi

  echo "No cli-v* release tags found for $REPO. Set IXOS_TAG=cli-vX.Y.Z explicitly." >&2
  exit 1
}

verify_checksum() {
  local archive="$1" checksum_url="$2" tmp_dir="$3"
  local checksum_file="$tmp_dir/checksum.sha256"

  if ! curl -fsSL "$checksum_url" -o "$checksum_file" 2>/dev/null; then
    echo "Warning: SHA256 checksum file not available, skipping verification" >&2
    return 0
  fi

  local expected actual
  expected="$(awk '{print $1}' "$checksum_file")"
  if command -v shasum >/dev/null 2>&1; then
    actual="$(shasum -a 256 "$archive" | awk '{print $1}')"
  elif command -v sha256sum >/dev/null 2>&1; then
    actual="$(sha256sum "$archive" | awk '{print $1}')"
  else
    echo "Warning: neither shasum nor sha256sum is available, skipping verification" >&2
    return 0
  fi

  if [[ "$expected" != "$actual" ]]; then
    echo "Checksum verification FAILED" >&2
    echo "  Expected: $expected" >&2
    echo "  Got:      $actual" >&2
    exit 1
  fi

  echo "Checksum verified OK"
}

ensure_path() {
  if [[ "$SKIP_PATH_PERSIST" == "1" ]]; then
    return
  fi
  local shell_name rc_file path_line
  shell_name="$(basename "${SHELL:-}")"
  case "$shell_name" in
    zsh) rc_file="$HOME/.zshrc" ;;
    bash) rc_file="$HOME/.bashrc" ;;
    *) rc_file="$HOME/.profile" ;;
  esac

  path_line="export PATH=\"$BIN_DIR:\$PATH\""
  touch "$rc_file"
  if ! grep -Fq "$path_line" "$rc_file"; then
    printf '\n%s\n' "$path_line" >> "$rc_file"
    echo "Updated PATH in $rc_file"
  fi
}

main() {
  local os arch tag version artifact url tmp_dir
  os="$(detect_os)"
  arch="$(detect_arch "$os")"
  tag="$(resolve_tag)"
  version="${tag#cli-v}"
  artifact="ixos-${version}-${os}-${arch}.tar.gz"
  if [[ -n "$ASSET_URL_OVERRIDE" ]]; then
    url="$ASSET_URL_OVERRIDE"
  else
    url="https://github.com/$REPO/releases/download/$tag/$artifact"
  fi

  echo "Installing Ixos CLI ($tag) from $url"
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' EXIT

  mkdir -p "$BIN_DIR"
  curl -fL "$url" -o "$tmp_dir/$artifact"

  # Verify SHA256 checksum
  local checksum_url="https://github.com/$REPO/releases/download/$tag/$artifact.sha256"
  verify_checksum "$tmp_dir/$artifact" "$checksum_url" "$tmp_dir"

  tar -xzf "$tmp_dir/$artifact" -C "$tmp_dir"

  if [[ ! -f "$tmp_dir/ixos" ]]; then
    echo "Archive does not contain ixos binary: $artifact" >&2
    exit 1
  fi

  install -m 755 "$tmp_dir/ixos" "$BIN_DIR/ixos"
  if [[ ! -x "$BIN_DIR/ixos" ]]; then
    echo "Installed binary is not executable: $BIN_DIR/ixos" >&2
    exit 1
  fi
  ensure_path
  export PATH="$BIN_DIR:$PATH"
  hash -r 2>/dev/null || true

  echo "Installed to $BIN_DIR/ixos"
  "$BIN_DIR/ixos" --version || true
}

main "$@"
