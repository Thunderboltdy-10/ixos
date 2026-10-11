"""Current source, helper, raw-budget and platform response proof."""
import json
from pathlib import Path
import sys

root = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(root))
from scripts.qasper.contract import sha, canonical

base = Path(__file__).resolve().parent
native = Path(r'\\wsl.localhost\Ubuntu-24.04\home\thunderboltdy\.cache\ixos-review-298088f-20261011')
sources = sorted((root / 'src').rglob('*.rs')) + [root / 'Cargo.toml', root / 'Cargo.lock', root / 'config/retrieval-models.json']
for path in sources:
    assert path.read_bytes().replace(b'\r\n', b'\n') == (native / 'source' / path.relative_to(root)).read_bytes().replace(b'\r\n', b'\n'), path
before_helper = sha((base / 'helpers/before-v1.py').read_bytes())
after_helper = sha((base / 'helpers/after-v2.py').read_bytes())
assert after_helper == sha((root / 'scripts/verify_jsonl_envelopes.py').read_bytes())
for folder in (base / 'before', base / 'linux/before'):
    record = json.loads((folder / 'receipt.json').read_text())
    assert record['status'] == 'reproduced' and record['helper_sha256'] == before_helper
    assert all(row['source_preserved'] for row in record['cases'])
windows = base / 'after-v2'
linux = base / 'linux/after-v2'
win_record = json.loads((windows / 'receipt.json').read_text())
linux_record = json.loads((linux / 'receipt.json').read_text())
assert win_record['status'] == linux_record['status'] == 'passed'
assert win_record['helper_sha256'] == linux_record['helper_sha256'] == after_helper
assert win_record['binary_sha256'] == sha((root / 'target/release/ixos.exe').read_bytes())
assert linux_record['binary_sha256'] == sha((native / 'source/target/release/ixos').read_bytes())
rows = []
for row, other in zip(win_record['cases'], linux_record['cases'], strict=True):
    assert row['profile'] == other['profile'] and row['case'] == other['case']
    assert row['model']['fingerprint'] == other['model']['fingerprint']
    assert row['source_preserved'] and other['source_preserved']
    relative = Path(row['profile']) / row['case']
    wraw = (windows / relative / 'stdout.jsonl').read_bytes()
    lraw = (linux / relative / 'stdout.jsonl').read_bytes()
    assert wraw == lraw, relative
    assert all(len(line) + 1 <= row['budget'] for line in wraw.splitlines())
    rows.append({'profile': row['profile'], 'case': row['case'], 'budget': row['budget'],
                 'stdout_sha256': sha(wraw), 'response_bytes': row['response_bytes']})
frozen = canonical({p.relative_to(root).as_posix(): sha(p.read_bytes()) for p in sorted((root / 'eval').glob('*.py'))})
assert frozen == '95afba09dd7c77e0fc56ed4e922d508116f701bb679f52c0844ed7725fc14297'
record = {'status': 'passed', 'normalized_core_source_files': len(sources),
          'before_helper_sha256': before_helper, 'after_helper_sha256': after_helper,
          'frozen_evaluator_sha256': frozen, 'exact_cross_platform_sequences': rows,
          'boundary': 'V2 adds a post-validation empty-query error to the budget-restoration case; V1 source/helper and original baseline are retained. No quality labels or timing comparison.'}
(base / 'audit.json').write_text(json.dumps(record, indent=2) + '\n', encoding='utf-8')
print('118 core source identities, original/current helper bindings, 18 exact platform sequences and response budgets passed; evaluator unchanged')
