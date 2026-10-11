"""Package a built CLI plus pinned model setup, without weights or private data."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import tarfile
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
FILES = ['LICENSE', 'config/retrieval-models.json', 'scripts/setup_models.py',
         'eval/__init__.py', 'eval/artifacts.py', 'eval/normalize_tokenizer.py', 'eval/compress_model.py',
         'skills/ixos-retrieval/SKILL.md', 'docs/CLI.md', 'docs/ARCHITECTURE.md', 'docs/models/README.md', 'docs/models/PUBLISHING.md']


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--binary', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        parser.error('Refusing to replace an existing package')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='ixos-package-') as temporary:
        root = Path(temporary)
        binary = root / ('ixos.exe' if args.binary.suffix == '.exe' else 'ixos')
        shutil.copy2(args.binary, binary)
        binary.chmod(0o755)
        for name in FILES:
            target = root / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / name, target)
        (root / 'README.md').write_text('# Ixos CLI\n\nEverything is free. Run `python scripts/setup_models.py --profile code` with Python 3.11+, then `ixos search "concept" --dir ROOT --json`. Document setup needs `numpy==2.3.5` and `--profile documents`. Search runs on Rust/CPU, offline after setup. Use `--profile lexical` or grep/read without a model. Add the executable to PATH or invoke it by its full path. Model cards/receipts are preserved in the application model folder. No adjacent cache sidecars.\n\nSee docs/CLI.md, docs/ARCHITECTURE.md and skills/ixos-retrieval/SKILL.md. Native platform and complete release validation remain required.\n', encoding='utf-8')
        if args.output.name.endswith('.zip'):
            with zipfile.ZipFile(args.output, 'x', zipfile.ZIP_DEFLATED) as archive:
                for path in sorted(root.rglob('*')):
                    if path.is_file():
                        archive.write(path, path.relative_to(root).as_posix())
        elif args.output.name.endswith('.tar.gz'):
            with tarfile.open(args.output, 'x:gz') as archive:
                for path in sorted(root.rglob('*')):
                    if path.is_file():
                        archive.add(path, arcname=path.relative_to(root).as_posix(), recursive=False)
        else:
            parser.error('Output must be .zip or .tar.gz')
    checksum = hashlib.sha256(args.output.read_bytes()).hexdigest()
    args.output.with_name(args.output.name + '.sha256').write_text(checksum + '  ' + args.output.name + '\n', encoding='utf-8')
    print(json.dumps({'archive': args.output.name, 'sha256': checksum, 'files': FILES + [binary.name, 'README.md'], 'bundled_weights': False}, indent=2))


if __name__ == '__main__':
    main()
