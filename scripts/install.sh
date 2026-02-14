#!/usr/bin/env bash
set -euo pipefail

REPO="${IXOS_REPO:-Thunderboltdy-10/Ixos}"
INSTALL_ROOT="${IXOS_INSTALL_DIR:-$HOME/.ixos}"
BIN_DIR="$INSTALL_ROOT/bin"

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
  case "$(uname -m)" in
    x86_64|amd64) echo "x86_64" ;;
    arm64|aarch64) echo "arm64" ;;
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
  releases_json="$(curl -fsSL "https://api.github.com/repos/$REPO/releases?per_page=30")"
  local cli_tag
  cli_tag="$(printf '%s' "$releases_json" \
    | grep -oE '"tag_name":[[:space:]]*"cli-v[^"]+"' \
    | head -n1 \
    | sed -E 's/.*"([^"]+)"/\1/')"

  if [[ -n "$cli_tag" ]]; then
    echo "$cli_tag"
    return
  fi

  curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" \
    | grep -oE '"tag_name":[[:space:]]*"[^"]+"' \
    | head -n1 \
    | sed -E 's/.*"([^"]+)"/\1/'
}

ensure_path() {
  local shell_name rc_file path_line
  shell_name="$(basename "${SHELL:-}")"
  case "$shell_name" in
    zsh) rc_file="$HOME/.zshrc" ;;
    bash) rc_file="$HOME/.bashrc" ;;
    *) rc_file="$HOME/.profile" ;;
  esac

  path_line='export PATH="$HOME/.ixos/bin:$PATH"'
  touch "$rc_file"
  if ! grep -Fq "$path_line" "$rc_file"; then
    printf '\n%s\n' "$path_line" >> "$rc_file"
    echo "Updated PATH in $rc_file"
  fi
}

main() {
  local os arch tag version artifact url tmp_dir
  os="$(detect_os)"
  arch="$(detect_arch)"
  tag="$(resolve_tag)"
  version="${tag#cli-v}"
  artifact="ixos-${version}-${os}-${arch}.tar.gz"
  url="https://github.com/$REPO/releases/download/$tag/$artifact"

  echo "Installing Ixos CLI from $url"
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' EXIT

  mkdir -p "$BIN_DIR"
  curl -fL "$url" -o "$tmp_dir/$artifact"
  tar -xzf "$tmp_dir/$artifact" -C "$tmp_dir"

  if [[ ! -f "$tmp_dir/ixos" ]]; then
    echo "Archive does not contain ixos binary: $artifact" >&2
    exit 1
  fi

  install -m 755 "$tmp_dir/ixos" "$BIN_DIR/ixos"
  ensure_path
  export PATH="$BIN_DIR:$PATH"

  echo "Installed to $BIN_DIR/ixos"
  "$BIN_DIR/ixos" --version || true
}

main "$@"
