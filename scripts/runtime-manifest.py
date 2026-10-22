"""Create a release manifest from all four built runtime assets, without uploading."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import tomllib

TARGETS = ("Windows-X64", "Linux-X64", "macOS-ARM64", "macOS-X64")


def manifest(directory: Path, version: str, protocol: int) -> dict:
    if not re.fullmatch(r"\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?", version):
        raise ValueError("Expected an engine semantic version")
    assets = []
    for target in TARGETS:
        name = f"ixos-{target}" + (".exe" if target.startswith("Windows") else "")
        matches = list(directory.rglob(name))
        if len(matches) != 1 or not matches[0].is_file():
            raise ValueError(f"Expected exactly one runtime asset: {name}")
        with matches[0].open("rb") as source:
            digest = hashlib.file_digest(source, "sha256").hexdigest()
        assets.append({"target": target, "file": name, "sha256": digest})
    return {"protocol_major": protocol, "version": version, "assets": assets}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    parser.add_argument("--version", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    versions = [tomllib.loads((root / f"crates/{crate}/Cargo.toml").read_text(encoding="utf8"))["package"]["version"] for crate in ("ixos-cli", "ixos-runtime")]
    if versions != [args.version, args.version]:
        parser.error("Engine tag, CLI version and runtime fallback version must agree")
    contract = (root / "crates/ixos-runtime/src/lib.rs").read_text(encoding="utf8")
    protocol = int(re.search(r"pub const PROTOCOL_MAJOR: u32 = (\d+);", contract)[1])
    args.output.write_text(json.dumps(manifest(args.directory, args.version, protocol), indent=2) + "\n", encoding="utf8")


if __name__ == "__main__":
    main()
