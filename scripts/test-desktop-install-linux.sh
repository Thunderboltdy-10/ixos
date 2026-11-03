#!/usr/bin/env bash
set -euo pipefail

if [[ ${1:-} == --launch ]]; then
  task_log=$2
  task_pid=
  trap 'if [[ -n "$task_pid" ]]; then kill "$task_pid" 2>/dev/null || true; wait "$task_pid" 2>/dev/null || true; fi' EXIT
  wait_for_window() {
    for ((task_try=0; task_try<200; task_try++)); do
      if ! kill -0 "$task_pid" 2>/dev/null; then cat "$task_log"; return 1; fi
      if xdotool search --onlyvisible --pid "$task_pid" --name '^Ixos$' >/dev/null 2>&1; then return 0; fi
      sleep 0.1
    done
    cat "$task_log"
    return 1
  }
  /usr/bin/Ixos >"$task_log" 2>&1 &
  task_pid=$!
  wait_for_window
  echo 'PASS: normal Linux launch shows the native window'
  kill "$task_pid"
  wait "$task_pid" 2>/dev/null || true
  /usr/bin/Ixos --hidden >"$task_log" 2>&1 &
  task_pid=$!
  sleep 2
  kill -0 "$task_pid"
  if xdotool search --onlyvisible --pid "$task_pid" --name '^Ixos$' >/dev/null 2>&1; then
    echo 'Hidden launch unexpectedly showed the window' >&2; exit 1
  fi
  timeout 10 /usr/bin/Ixos >>"$task_log" 2>&1
  wait_for_window
  echo 'PASS: hidden startup and repeated Linux launch use the original instance'
  exit 0
fi

task_package=$(realpath "${1:?Usage: test-desktop-install-linux.sh package.deb}")
dpkg -i "$task_package"
task_entry=/usr/share/applications/Ixos.desktop
test -x /usr/bin/Ixos
test -x /usr/bin/ixos-engine
test -f "$task_entry"
desktop-file-validate "$task_entry"
grep -qx 'Name=Ixos' "$task_entry"
grep -q '^Exec=Ixos\|^Exec=/usr/bin/Ixos' "$task_entry"
update-desktop-database /usr/share/applications
echo 'PASS: Linux package installs Ixos and a searchable application entry'

task_temp=$(mktemp -d /tmp/ixos-install-test.XXXXXXXX)
trap 'if [[ "$task_temp" == /tmp/ixos-install-test.* ]]; then rm -rf -- "$task_temp"; fi' EXIT
# Verify local setup from the actual packaged engine without a model download.
env IXOS_HOME="$task_temp/home" IXOS_SKILL_HOME="$task_temp/agents" /usr/bin/ixos-engine setup --install --skip-models
test -x "$task_temp/home/bin/ixos"
test -f "$task_temp/agents/.codex/config.toml"
test -f "$task_temp/agents/.claude.json"
test -f "$task_temp/agents/.claude/skills/ixos/SKILL.md"
echo 'PASS: bundled engine, Codex/Claude MCP and skills installed automatically'
# All app data is disposable. The sandbox override is restricted to this root-run
# package smoke test; it is never included in the installed application's launcher.
xvfb-run -a dbus-run-session -- env IXOS_HOME="$task_temp/home" IXOS_SKILL_HOME="$task_temp/skills" IXOS_ENGINE_PATH="$task_temp/missing-engine" IXOS_NO_UPDATE_CHECK=1 WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS=1 bash "$0" --launch "$task_temp/launch.log"
