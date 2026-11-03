"""Verify saved build receipts and assemble the flat release assets."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
ASSETS = json.loads((ROOT / "packages/releases/desktop-assets.json").read_text(encoding="utf8"))


def assemble(source, output, tag, platforms):
    verified = {}
    for path in source.rglob("build-receipt.json"):
        receipt = json.loads(path.read_text(encoding="utf8"))
        target = receipt["platform"]
        if target not in platforms:
            continue
        if target in verified or receipt["tag"] != tag:
            raise ValueError("Duplicate or incompatible build receipt")
        asset = next((asset for asset in receipt["assets"] if asset["file"] == ASSETS[target]), None)
        if asset is None:
            raise ValueError(f"The installer is missing: {ASSETS[target]}")
        file = path.parent / asset["file"]
        if not file.is_file() or file.stat().st_size != asset["bytes"] or hashlib.sha256(file.read_bytes()).hexdigest() != asset["sha256"]:
            raise ValueError(f"Release artifact failed verification: {file}")
        verified[target] = (file, asset)
    if set(verified) != set(platforms):
        raise ValueError(f"Missing verified platforms: {set(platforms) - set(verified)}")
    output.mkdir(parents=True, exist_ok=True)
    for file, _ in verified.values():
        shutil.copy2(file, output / file.name)
    contract = (ROOT / "crates/ixos-runtime/src/lib.rs").read_text(encoding="utf8")
    manifest = {
        "protocol_major": int(re.search(r"pub const PROTOCOL_MAJOR: u32 = (\d+);", contract)[1]),
        "version": tag.removeprefix("v"),
        "assets": [{"target": target, "file": asset["file"], "sha256": asset["sha256"]} for target, (_, asset) in verified.items()],
    }
    (output / "desktop-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf8")
    print(f"Verified {len(platforms)} platforms; saved release assets to {output}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--platforms", nargs="+", choices=tuple(ASSETS), default=list(ASSETS), help="Subset for local validation; Actions always requires all four")
    args = parser.parse_args()
    assemble(args.source, args.output, os.environ["RELEASE_TAG"], args.platforms)


if __name__ == "__main__":
    main()
