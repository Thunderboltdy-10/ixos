"""Verify saved build receipts and assemble flat, downloadable release assets."""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil

SPEC = importlib.util.spec_from_file_location("runtime_manifest", Path(__file__).with_name("runtime-manifest.py"))
RUNTIME = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(RUNTIME)


def assemble(source, output, tag, kind, platforms, signed):
    version = tag.removeprefix(kind + "-v")
    receipts = {}
    assets = {}
    for path in source.rglob("build-receipt.json"):
        receipt = json.loads(path.read_text(encoding="utf8"))
        target = receipt["platform"]
        if target not in platforms:
            continue
        if target in receipts or receipt["tag"] != tag or receipt["signed_updates"] != signed:
            raise ValueError("Duplicate or incompatible build receipt")
        for asset in receipt["assets"]:
            name = asset["file"]
            if Path(name).name != name:
                raise ValueError("Release assets must have flat filenames")
            file = path.parent / name
            if not file.is_file() or file.stat().st_size != asset["bytes"] or hashlib.sha256(file.read_bytes()).hexdigest() != asset["sha256"]:
                raise ValueError(f"Release artifact failed verification: {file}")
            if name in assets and assets[name][1] != asset["sha256"]:
                raise ValueError(f"Conflicting release asset: {name}")
            assets[name] = (file, asset["sha256"])
        receipts[target] = path
    if set(receipts) != set(platforms):
        raise ValueError(f"Missing verified platforms: {set(platforms) - set(receipts)}")
    if kind == "desktop":
        for target in platforms:
            name = RUNTIME.DESKTOP_ASSETS[target]["download"]
            if name not in assets:
                raise ValueError(f"The landing page's installer is missing: {name}")
    output.mkdir(parents=True, exist_ok=True)
    for name, (file, _) in assets.items():
        shutil.copy2(file, output / name)
    for target, file in receipts.items():
        shutil.copy2(file, output / f"build-receipt-{target}.json")
    root = Path(__file__).resolve().parents[1]
    import re
    contract = (root / "crates/ixos-runtime/src/lib.rs").read_text(encoding="utf8")
    protocol = int(re.search(r"pub const PROTOCOL_MAJOR: u32 = (\d+);", contract)[1])
    manifest = RUNTIME.manifest(output, version, protocol, kind, platforms)
    (output / ("runtime-manifest.json" if kind == "engine" else "desktop-manifest.json")).write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf8")
    if kind == "desktop" and signed:
        (output / "desktop-update.json").write_text(json.dumps(RUNTIME.desktop_update(output, version, platforms), indent=2) + "\n", encoding="utf8")
    lines = []
    for file in sorted(output.iterdir()):
        if file.is_file() and file.name != "SHA256SUMS":
            lines.append(f"{hashlib.sha256(file.read_bytes()).hexdigest()}  {file.name}\n")
    (output / "SHA256SUMS").write_text("".join(lines), encoding="utf8")
    print(f"Verified {len(platforms)} platforms; saved {len(lines) + 1} release assets to {output}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--platforms", nargs="+", choices=RUNTIME.TARGETS, default=list(RUNTIME.TARGETS), help="Subset for local validation; Actions always requires all four")
    args = parser.parse_args()
    assemble(args.source, args.output, os.environ["RELEASE_TAG"], os.environ["RELEASE_KIND"], args.platforms, os.environ.get("SIGNED_UPDATES", "false").lower() == "true")


if __name__ == "__main__":
    main()
