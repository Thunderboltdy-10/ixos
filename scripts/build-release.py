"""Build and verify one release platform, identically in Actions and locally."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import shutil
import subprocess
import sys
import tomllib

ROOT = Path(__file__).resolve().parents[1]
TARGETS = ("Windows-X64", "Linux-X64", "macOS-ARM64", "macOS-X64")
DESKTOP_ASSETS = json.loads((ROOT / "packages/releases/desktop-assets.json").read_text(encoding="utf8"))


def run(*command):
    print("+ " + subprocess.list2cmdline(list(map(str, command))), flush=True)
    subprocess.run(list(map(str, command)), cwd=ROOT, check=True)


def version(path):
    return tomllib.loads((ROOT / path).read_text(encoding="utf8"))["package"]["version"]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--kind", required=True, choices=("engine", "desktop"))
    parser.add_argument("--platform", required=True, choices=TARGETS)
    parser.add_argument("--tag", required=True)
    parser.add_argument("--signed-updates", action="store_true")
    args = parser.parse_args()
    windows, mac = args.platform.startswith("Windows"), args.platform.startswith("macOS")
    expected_os = "Windows" if windows else "Darwin" if mac else "Linux"
    if platform.system() != expected_os:
        parser.error("Run each platform on its native operating system")
    component_version = version("crates/ixos-cli/Cargo.toml" if args.kind == "engine" else "apps/desktop/src-tauri/Cargo.toml")
    if args.tag != f"{args.kind}-v{component_version}" or not re.fullmatch(r"(?:engine|desktop)-v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?", args.tag):
        parser.error("The component tag must match its package version")
    config = json.loads((ROOT / "apps/desktop/src-tauri/tauri.conf.json").read_text())
    if args.kind == "desktop" and config["version"] != component_version:
        parser.error("Tauri and desktop package versions must agree")
    if args.kind == "engine" and version("crates/ixos-runtime/Cargo.toml") != component_version:
        parser.error("Engine and runtime fallback versions must agree")
    output = ROOT / "release-dist" / args.tag / args.platform
    output.mkdir(parents=True, exist_ok=True)
    npm = shutil.which("npm.cmd" if windows else "npm")
    suffix = ".exe" if windows else ""
    if args.kind == "desktop":
        if not npm:
            parser.error("Node.js 22 and npm are required")
        run("node", "-e", "if(process.versions.node.split('.')[0] !== '22') throw Error('Release builds use Node.js 22')")
        run(npm, "ci")
        run(npm, "run", "build")
        run("cargo", "fmt", "--all", "--check")
        run("cargo", "clippy", "--workspace", "--locked", "--", "-D", "warnings")
        run("cargo", "test", "--workspace", "--locked")
    else:
        run("cargo", "test", "--locked", "-p", "ixos-core", "-p", "ixos-cli", "-p", "ixos-runtime", "--all-features")
    run("cargo", "build", "--locked", "-p", "ixos-cli", "-p", "ixos-install")
    run(sys.executable, "-m", "unittest", "discover", "-s", "eval", "-p", "test_*.py")
    command = ["cargo", "build", "--release", "--locked", "-p", "ixos-install"]
    if args.kind == "engine":
        command += ["-p", "ixos-cli"]
    run(*command)
    assets = []

    def collect(source, name):
        source = Path(source)
        if not source.is_file() or source.stat().st_size == 0:
            raise RuntimeError(f"Missing or empty release artifact: {source}")
        destination = output / name
        shutil.copy2(source, destination)
        digest = hashlib.sha256(destination.read_bytes()).hexdigest()
        if hashlib.sha256(source.read_bytes()).hexdigest() != digest:
            raise RuntimeError(f"Artifact copy changed: {name}")
        assets.append({"file": name, "sha256": digest, "bytes": destination.stat().st_size})
        print(f"Saved {destination} ({destination.stat().st_size:,} bytes)", flush=True)

    bootstrap = {"Windows-X64": "Windows-X64", "Linux-X64": "Linux-x86_64", "macOS-ARM64": "Darwin-arm64", "macOS-X64": "Darwin-x86_64"}[args.platform]
    collect(ROOT / f"target/release/ixos-install{suffix}", f"ixos-install-{bootstrap}{suffix}")
    if args.kind == "engine":
        primary = f"ixos-{args.platform}{suffix}"
        collect(ROOT / f"target/release/ixos{suffix}", primary)
    else:
        local_config = ROOT / ".tmp" / f"release-{args.platform}.json"
        local_config.parent.mkdir(exist_ok=True)
        if args.signed_updates and not all(os.environ.get(key) for key in ("TAURI_SIGNING_PRIVATE_KEY", "IXOS_UPDATER_PUBLIC_KEY")):
            parser.error("Signed updates require the private signing key and public verification key")
        local_config.write_text(json.dumps({"bundle": {"createUpdaterArtifacts": args.signed_updates}}), encoding="utf8")
        bundles = "nsis" if windows else "app,dmg" if mac else "deb,appimage"
        run(npm, "run", "tauri:build", "--", "--ci", "--bundles", bundles, "--config", local_config)
        bundle_root = ROOT / "target/release/bundle"

        def one(pattern):
            found = list(bundle_root.rglob(pattern))
            if len(found) != 1:
                raise RuntimeError(f"Expected one {pattern}, found {len(found)}")
            return found[0]

        primary = DESKTOP_ASSETS[args.platform]["update"]
        installer = one("*-setup.exe" if windows else "*.dmg" if mac else "*.AppImage")
        collect(installer, primary)
        if not windows and not mac:
            deb = one("*.deb")
            collect(deb, DESKTOP_ASSETS[args.platform]["download"])
            run("sudo", "bash", "scripts/test-desktop-install-linux.sh", deb)
        if windows:
            command = ["powershell.exe", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", "scripts/test-desktop-install.ps1", "-Installer", str(installer), "-RequireAppList"]
            if os.environ.get("IXOS_TEST_DESKTOP"):
                command += ["-DesktopName", os.environ["IXOS_TEST_DESKTOP"]]
            run(*command)
        if args.signed_updates:
            update = one("*.app.tar.gz") if mac else installer
            update_name = f"Ixos-{args.platform}.app.tar.gz" if mac else primary
            if mac:
                collect(update, update_name)
            collect(Path(str(update) + ".sig"), update_name + ".sig")
    for name in ("install-cli.ps1", "install-cli.sh"):
        collect(ROOT / "scripts" / name, name)
    (output / "SHA256SUMS").write_text("".join(f"{asset['sha256']}  {asset['file']}\n" for asset in assets), encoding="utf8")
    receipt = {"tag": args.tag, "platform": args.platform, "signed_updates": args.signed_updates and args.kind == "desktop", "assets": assets}
    (output / "build-receipt.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf8")
    print(f"Release platform verified and saved: {output}", flush=True)


if __name__ == "__main__":
    main()
