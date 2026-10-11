#!/usr/bin/env bash
set -euo pipefail
task_profile_root=/home/thunderboltdy/.cache/ixos-review-298088f-20261011/strace-gate14
mkdir -p "$task_profile_root"
cd "$task_profile_root"
apt-get download strace=6.8-0ubuntu2 > download.stdout 2> download.stderr
dpkg-deb -x strace_6.8-0ubuntu2_amd64.deb extracted
sha256sum strace_6.8-0ubuntu2_amd64.deb > identity.stdout
./extracted/usr/bin/strace --version >> identity.stdout
cat identity.stdout
