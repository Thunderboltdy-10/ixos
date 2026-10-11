"""One-off staged source audit; receipts include the commands and conditions."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    root = args.source.resolve()
    tracked = subprocess.check_output(['git', 'ls-files', '-z']).decode().split('\0')
    tracked = sorted(p for p in tracked if p)
    files = sorted(p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file())
    assert files == tracked, (len(files), len(tracked), set(files) ^ set(tracked))
    forbidden = []
    for name in files:
        path = Path(name)
        if any(part in {'.git', 'private-process', 'target', 'node_modules', '.next', '.tmp'} for part in path.parts):
            forbidden.append(name)
        if path.suffix == '.safetensors' or (path.name.startswith('.env') and path.name != '.env.example'):
            forbidden.append(name)
    assert not forbidden, forbidden
    archives = json.loads((root / 'reports/restoration/gate4/gate4-archive-manifest.json').read_text())
    for row in archives:
        assert digest(root / row['archive']) == row['sha256'], row['archive']
    receipts = json.loads((root / 'reports/restoration/PATH_MAP.json').read_text())
    for row in receipts:
        assert digest(root / row['current']) == row['sha256'], row['current']
    record = {
        'source': str(root), 'export': 'git checkout-index --all --prefix=.tmp/gate4/clean-source/',
        'git_index_tree': subprocess.check_output(['git', 'write-tree']).decode().strip(),
        'file_count': len(files), 'no_local_envs_weights_private_build_outputs': True,
        'verified_archives': len(archives), 'verified_moved_receipts': len(receipts),
        'build_command': 'cargo build --release --locked --bin ixos --manifest-path .tmp/gate4/clean-source/Cargo.toml --target-dir .tmp/gate4/reviewer-target',
        'isolation': 'Source and target directories are fresh. Installed Rust/C toolchain and existing Cargo registry cache are reused. Models are downloaded independently into a fresh custom destination; CLI uses the documented --model-path path and an absent explicit config. No OS-known-folder paths are redirected.'
    }
    args.output.write_text(json.dumps(record, indent=2) + '\n')
    print(json.dumps(record, indent=2))


if __name__ == '__main__':
    main()
