"""Build and verify one release platform, identically in Actions and locally."""
import argparse
import hashlib
import json
from pathlib import Path
import platform
import re
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
ASSETS = json.loads((ROOT / "packages/releases/desktop-assets.json").read_text(encoding="utf8"))
PACKAGES = {"ixos-cli": "crates/ixos-cli", "ixos-core": "crates/ixos-core", "ixos-runtime": "crates/ixos-runtime", "ixos-app": "apps/desktop/src-tauri"}


def run(*command):
    print("+ " + subprocess.list2cmdline(list(map(str, command))), flush=True)
    subprocess.run(list(map(str, command)), cwd=ROOT, check=True)


def set_version(version):
    """The tag is the version. Sources keep a 0.0.0 placeholder."""
    def edit(path, pattern):
        file = ROOT / path
        text, count = re.subn(pattern, lambda found: found[1] + version + found[2], file.read_bytes().decode("utf8"), count=1)
        if count != 1:
            raise RuntimeError(f"No version found in {path}")
        file.write_bytes(text.encode("utf8"))

    for name, folder in PACKAGES.items():
        edit(f"{folder}/Cargo.toml", r'(?m)^(version = ")[^"]*(")')
        edit("Cargo.lock", rf'(name = "{name}"\r?\nversion = ")[^"]*(")')
    edit("apps/desktop/src-tauri/tauri.conf.json", r'("version": ")[^"]*(")')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--platform", required=True, choices=tuple(ASSETS))
    parser.add_argument("--tag", required=True)
    args = parser.parse_args()
    windows, mac = args.platform.startswith("Windows"), args.platform.startswith("macOS")
    expected_os = "Windows" if windows else "Darwin" if mac else "Linux"
    if platform.system() != expected_os:
        parser.error("Run each platform on its native operating system")
    triple = {"Windows-X64": "x86_64-pc-windows-msvc", "Linux-X64": "x86_64-unknown-linux-gnu", "macOS-ARM64": "aarch64-apple-darwin", "macOS-X64": "x86_64-apple-darwin"}[args.platform]
    # The installer's name must describe what this machine actually builds.
    if f"host: {triple}" not in subprocess.check_output(["rustc", "-vV"], text=True):
        parser.error(f"{args.platform} must be built on {triple}")
    if not re.fullmatch(r"v\d+\.\d+\.\d+", args.tag):
        parser.error("The release tag must look like v1.2.3")
    set_version(args.tag.removeprefix("v"))
    output = ROOT / "release-dist" / args.tag / args.platform
    output.mkdir(parents=True, exist_ok=True)
    npm = shutil.which("npm.cmd" if windows else "npm")
    suffix = ".exe" if windows else ""
    if not npm:
        parser.error("Node.js 22 and npm are required")
    run("node", "-e", "if(process.versions.node.split('.')[0] !== '22') throw Error('Release builds use Node.js 22')")
    run(npm, "ci")
    run(npm, "run", "build")
    run("cargo", "fmt", "--all", "--check")
    run("cargo", "clippy", "--workspace", "--locked", "--", "-D", "warnings")
    run("cargo", "test", "--workspace", "--locked")
    run("cargo", "build", "--locked", "-p", "ixos-cli")
    run(sys.executable, "-m", "unittest", "discover", "-s", "eval", "-p", "test_*.py")
    run("cargo", "build", "--release", "--locked", "-p", "ixos-cli")
    binaries = ROOT / "apps/desktop/src-tauri/binaries"
    binaries.mkdir(exist_ok=True)
    shutil.copy2(ROOT / f"target/release/ixos{suffix}", binaries / f"ixos-engine-{triple}{suffix}")
    local_config = ROOT / ".tmp" / f"release-{args.platform}.json"
    local_config.parent.mkdir(exist_ok=True)
    local_config.write_text(json.dumps({"bundle": {"externalBin": ["binaries/ixos-engine"]}}), encoding="utf8")
    # Earlier local builds must not count as this version's artifacts.
    bundle_root = ROOT / "target/release/bundle"
    shutil.rmtree(bundle_root, ignore_errors=True)
    bundles = "nsis" if windows else "app,dmg" if mac else "deb"
    run(npm, "run", "tauri:build", "--", "--ci", "--bundles", bundles, "--config", local_config)
    found = list(bundle_root.rglob("*-setup.exe" if windows else "*.dmg" if mac else "*.deb"))
    if len(found) != 1:
        raise RuntimeError(f"Expected one installer, found {found}")
    installer = found[0]
    if windows:
        run("powershell.exe", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", "scripts/test-desktop-install.ps1", "-Installer", installer, "-RequireAppList")
    elif not mac:
        run("sudo", "bash", "scripts/test-desktop-install-linux.sh", installer)
    name = ASSETS[args.platform]
    destination = output / name
    shutil.copy2(installer, destination)
    asset = {"file": name, "sha256": hashlib.sha256(destination.read_bytes()).hexdigest(), "bytes": destination.stat().st_size}
    receipt = {"tag": args.tag, "platform": args.platform, "assets": [asset]}
    (output / "build-receipt.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf8")
    print(f"Release platform verified and saved: {output}", flush=True)


if __name__ == "__main__":
    main()
