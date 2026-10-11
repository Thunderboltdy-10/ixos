"""Additional Linux read-only-folder diagnostic contract, no source mutation."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile

root = Path(os.environ['IXOS_REVIEW_ROOT'])
out = root/'receipts-gate15-readonly'
out.mkdir()
assert os.getuid() != 0, 'Root bypasses this permission contract'
with tempfile.TemporaryDirectory(dir=root/'probes', prefix='ixos-doctor-readonly-') as temporary:
    base = Path(temporary)
    corpus = base/'corpus'
    corpus.mkdir()
    source = corpus/'keep.txt'
    source.write_bytes(b'Existing read-only search source.\n')
    before = [hashlib.sha256(source.read_bytes()).hexdigest(), source.stat().st_mtime_ns]
    config = base/'chosen.toml'
    config.write_text('[retrieval]\nprofile="lexical"\n')
    argv = [str(root/'source/target/release/ixos'), '--config', str(config), 'doctor', '--dir', str(corpus), '--json']
    corpus.chmod(0o555)
    try:
        raw = subprocess.run(argv, capture_output=True, timeout=120)
    finally:
        corpus.chmod(0o755)
    (out/'readonly.stdout').write_bytes(raw.stdout)
    (out/'readonly.stderr').write_bytes(raw.stderr)
    parsed = json.loads(raw.stdout)
    assert raw.returncode == 0 and parsed['summary']['fail'] == 0 and parsed['summary']['warn'] == 1
    assert any(c['id'] == 'runtime_probe' and c['status'] == 'WARN' for c in parsed['checks'])
    assert set(p.name for p in corpus.iterdir()) == {'keep.txt'}
    assert before == [hashlib.sha256(source.read_bytes()).hexdigest(), source.stat().st_mtime_ns]
    (out/'receipt.json').write_text(json.dumps({'status': 'passed', 'argv': argv, 'uid': os.getuid(), 'exit_code': raw.returncode,
        'source_preserved': True, 'quality_benchmark': False,
        'binary_sha256': hashlib.sha256((root/'source/target/release/ixos').read_bytes()).hexdigest()}, indent=2)+'\n')
print('Readonly Linux witness warning/source-preservation contract passed')
