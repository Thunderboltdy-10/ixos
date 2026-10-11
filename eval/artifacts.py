"""Standard-library artifact identity shared by installation and evaluation."""
import hashlib
import json
from pathlib import Path


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def artifact_identity(folder: Path) -> dict:
    hashes = {name: digest((folder / name).read_bytes()) for name in ['model.safetensors', 'tokenizer.json', 'config.json']}
    payload = bytearray(b'ixos:model2vec-rs:0.1.4:unit-normalization-v1')
    for name, checksum in hashes.items():
        payload.extend(name.encode())
        payload.extend(bytes.fromhex(checksum))
    tokenizer = json.loads((folder / 'tokenizer.json').read_text(encoding='utf-8'))
    return {'path': str(folder.resolve()), 'files': hashes, 'fingerprint': digest(payload),
            'file_bytes': sum((folder / name).stat().st_size for name in hashes),
            'tokenizer_settings': {key: tokenizer.get(key) for key in ['truncation', 'padding']}}
