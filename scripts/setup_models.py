"""Install pinned free CPU models; preserve attribution and verify exact derivatives.

Run from a source checkout. Code preparation needs Python 3.11+ only. Document
storage conversion additionally needs numpy==2.3.5. Large artifacts stay outside Git.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile
import urllib.request

ROOT = Path(__file__).resolve().parents[1]  # final location: scripts/setup_models.py
sys.path.insert(0, str(ROOT))


def sha(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def default_destination():
    if sys.platform == 'win32':
        base = Path(os.environ['LOCALAPPDATA'])
    elif sys.platform == 'darwin':
        base = Path.home() / 'Library/Application Support'
    else:
        base = Path(os.environ.get('XDG_DATA_HOME', Path.home() / '.local/share'))
    return base / 'ixos/models'


def verify(folder, expected):
    for name, checksum in expected.items():
        path = folder / name
        if not path.is_file() or sha(path) != checksum:
            raise ValueError(f'Artifact verification failed: {path}')


def install(entry, destination, source_root):
    target = destination / entry['folder']
    if target.exists():
        verify(target, entry['expected'])
        print(f'Already verified: {target}')
        return
    with tempfile.TemporaryDirectory(prefix='.ixos-model-', dir=destination) as temporary:
        work = Path(temporary)
        source = work / 'source'
        source.mkdir()
        parent = entry['source']
        for item in parent['files']:
            name = item['name']
            if name not in ['model.safetensors', 'tokenizer.json', 'config.json', 'README.md']:
                raise ValueError('Unexpected pinned artifact filename')
            path = source / name
            if source_root:
                shutil.copyfile(source_root / parent['id'].split('/')[-1] / name, path)
            else:
                url = f"https://huggingface.co/{parent['id']}/resolve/{parent['revision']}/{name}"
                request = urllib.request.Request(url, headers={'User-Agent': 'Ixos-model-setup/1'})
                with urllib.request.urlopen(request, timeout=120) as response, path.open('xb') as output:
                    count = 0
                    while chunk := response.read(1024 * 1024):
                        count += len(chunk)
                        if count > item['bytes']:
                            raise ValueError('Downloaded artifact exceeds pinned size')
                        output.write(chunk)
            if path.stat().st_size != item['bytes'] or sha(path) != item['sha256']:
                raise ValueError(f'Pinned parent size/hash differs: {name}')
        output = work / 'prepared'
        if entry['transform'] == 'tokenizer-unbounded':
            from eval.normalize_tokenizer import prepare
            receipt = prepare(source, output)
        elif entry['transform'] == 'row-int8':
            from eval.compress_model import read_tensors, quantized_rows, write_tensors
            rows = read_tensors(source / 'model.safetensors')
            if set(rows) - {'embeddings', 'weights'}:
                raise ValueError('Unsupported additional model tensors')
            packed, scales = quantized_rows(rows['embeddings'], rows.get('weights'))
            output.mkdir()
            write_tensors(output / 'model.safetensors', {'embeddings': packed, 'weights': scales})
            for name in ['tokenizer.json', 'config.json']:
                shutil.copyfile(source / name, output / name)
            shutil.copyfile(source / 'README.md', output / 'UPSTREAM_MODEL_CARD.md')
            (output / 'README.md').write_text('---\nlicense: mit\n---\n\nStorage derivative of ' + parent['id'] +
                '. See UPSTREAM_MODEL_CARD.md for original authorship, license and training. I8 vocabulary rows plus F32 row scales. No new training or integer inference; Rust pools in F32. The current CLI retains encoded rows and decodes used tokens; the eager reference expands the full table.\n', encoding='utf-8')
            receipt = {'operation': 'row-int8', 'new_training': False}
        else:
            raise ValueError('Unknown pinned transform')
        verify(output, entry['expected'])
        from eval.artifacts import artifact_identity
        if artifact_identity(output)['fingerprint'] != entry['fingerprint']:
            raise ValueError('Prepared runtime fingerprint differs')
        (output / 'INSTALL_RECEIPT.json').write_text(json.dumps({'source': parent, 'expected': entry['expected'],
            'fingerprint': entry['fingerprint'], 'transform': entry['transform'], 'new_training': False}, indent=2), encoding='utf-8')
        # Same-filesystem rename publishes only a completely verified folder.
        output.rename(target)
        print(f'Installed {entry["profile"]}: {target}')


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--profile', choices=['code', 'documents', 'all'], default='code')
    p.add_argument('--destination', type=Path, default=default_destination())
    p.add_argument('--source-root', type=Path, help='Offline pinned parent folders instead of downloads')
    a = p.parse_args()
    catalog = json.loads((ROOT / 'config/retrieval-models.json').read_text(encoding='utf-8-sig'))
    if catalog['schema'] != 1:
        p.error('Unsupported model catalog')
    a.destination.mkdir(parents=True, exist_ok=True)
    for entry in catalog['models']:
        if a.profile in ['all', entry['profile']]:
            install(entry, a.destination, a.source_root)


if __name__ == '__main__':
    main()
