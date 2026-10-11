"""Cross-platform current source/default-output and independent token audit."""
import json
from pathlib import Path
import sys
import tiktoken

root = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(root))
from scripts.qasper.contract import sha, canonical

base = Path(__file__).resolve().parent
linux_root = Path(r'\\wsl.localhost\Ubuntu-24.04\home\thunderboltdy\.cache\ixos-review-298088f-20261011')
paths = sorted((root / 'src').rglob('*.rs')) + [root / 'Cargo.toml', root / 'Cargo.lock', root / 'config/retrieval-models.json']
sources = {}
for path in paths:
    relative = path.relative_to(root).as_posix()
    data = path.read_bytes().replace(b'\r\n', b'\n')
    assert data == (linux_root / 'source' / relative).read_bytes().replace(b'\r\n', b'\n'), relative
    sources[relative] = sha(data)
win = base / 'windows-v2'
linux = base / 'linux/linux-probe'
encoding = tiktoken.get_encoding('cl100k_base')
tokens = lambda data: len(encoding.encode(data.decode(), disallowed_special=()))
rows = []
for name in ('control', 'default', 'cap1', 'cap2'):
    for repetition in range(7):
        filename = f'{repetition}-{name}'
        wraw, lraw = (win / (filename + '.stdout')).read_bytes(), (linux / (filename + '.stdout')).read_bytes()
        assert wraw == lraw, filename
        rows.append({'arm': name, 'repetition': repetition, 'stdout_sha256': sha(lraw),
                     'linux_stdout_tokens': tokens(lraw),
                     'linux_diagnostic_tokens': tokens((linux / (filename + '.stderr')).read_bytes())})
for folder in (win, linux):
    receipt = json.loads((folder / 'receipt.json').read_text())
    assert receipt['status'] == 'passed' and receipt['source_preserved']
tasks = json.loads((base.parent / 'gate20/tasks.json').read_text())
inventory = json.loads(Path(tasks['tasks'][0]['inventory_path']).read_text())
native = {p.relative_to(linux_root / 'gate21-real-source').as_posix(): {'sha256': sha(p.read_bytes()), 'bytes': p.stat().st_size}
          for p in (linux_root / 'gate21-real-source').rglob('*') if p.is_file()}
assert native == inventory
frozen = canonical({p.relative_to(root).as_posix(): sha(p.read_bytes()) for p in sorted((root / 'eval').glob('*.py'))})
assert frozen == '95afba09dd7c77e0fc56ed4e922d508116f701bb679f52c0844ed7725fc14297'
result = {'status': 'passed', 'normalized_core_source_files': len(sources), 'sources': sources,
          'cross_platform_exact_stdout': True, 'independently_scored_linux_tokens': rows,
          'native_original_corpus_files': len(native), 'frozen_evaluator_sha256': frozen,
          'token_boundary': 'Linux probe had no tokenizer installed and recorded null counts; these counts are scored independently from its preserved original raw bytes.'}
(base / 'audit.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print('Current core sources, 28 exact platform outputs, native original corpus and frozen evaluator verified; Linux wire tokens independently scored')
