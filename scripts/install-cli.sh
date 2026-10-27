#!/bin/sh
# Download the same lightweight binary installer used by the website.
set -eu
case "$(uname -s)/$(uname -m)" in
  Linux/x86_64|Darwin/arm64|Darwin/x86_64) task_platform=$(uname -s)-$(uname -m) ;;
  *) echo 'No prebuilt installer for this platform; build from source.' >&2; exit 1 ;;
esac
case "${1:-}" in ''|--no-desktop) ;; *) echo 'Usage: install-cli.sh [--no-desktop]' >&2; exit 1 ;; esac
task_base=https://github.com/Thunderboltdy-10/ixos/releases/latest/download
task_name=ixos-install-$task_platform
task_temp=$(mktemp -d)
trap 'rm -f "$task_temp/$task_name" "$task_temp/SHA256SUMS"; rmdir "$task_temp"' EXIT HUP INT TERM
curl -fSL --retry 3 "$task_base/$task_name" -o "$task_temp/$task_name"
curl -fsSL --retry 3 "$task_base/SHA256SUMS" -o "$task_temp/SHA256SUMS"
task_expected=$(awk -v name="$task_name" '$2 == name { print $1 }' "$task_temp/SHA256SUMS")
if command -v sha256sum >/dev/null 2>&1; then
  task_actual=$(sha256sum "$task_temp/$task_name" | cut -d ' ' -f 1)
else
  task_actual=$(shasum -a 256 "$task_temp/$task_name" | cut -d ' ' -f 1)
fi
[ "${#task_expected}" -eq 64 ] && [ "$task_expected" = "$task_actual" ] || { echo 'Installer checksum mismatch; retry.' >&2; exit 1; }
chmod +x "$task_temp/$task_name"
"$task_temp/$task_name" "$@"
