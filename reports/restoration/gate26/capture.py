"""Preserve exact native exports, controls, actor grading and source notices."""
import hashlib
import json
from pathlib import Path

base = Path(__file__).resolve().parent
root = base.parents[2]
native = Path(r'\\wsl.localhost\Ubuntu-24.04\home\thunderboltdy\.cache\ixos-review-298088f-20261011')
sha = lambda raw: hashlib.sha256(raw).hexdigest()
manifest = {}


def copy(source, target):
    raw = source.read_bytes()
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists():
        assert target.read_bytes() == raw
    else:
        target.write_bytes(raw)
    assert target.read_bytes() == raw
    manifest[target.relative_to(base).as_posix()] = {
        'sha256': sha(raw), 'bytes': len(raw), 'source': str(source)}


for name in ('export.stdout', 'export.stderr', 'grading.stdout', 'grading.stderr',
             'preflight.json', 'images-after.json', 'grading-source.json'):
    copy(native / 'gate26' / name, base / 'linux' / name)
copy(native / 'gate26/exports/exports.json', base / 'linux/exports.json')
for arm in ('base', 'gold', 'actor'):
    folder = native / 'gate26-grading/logs/run_evaluation' / f'ixos-g26-{arm}-20261012-v2'
    copy(folder / 'report.json', base / 'linux' / arm / 'summary.json')
    for case in json.loads((base / 'freeze.json').read_text())['cases']:
        for name in ('report.json', 'eval.sh', 'run_instance.log', 'test_output.txt', 'patch.diff'):
            copy(folder / case['instance_id'] / name, base / 'linux' / arm / case['case'] / name)
for source, target in (
    (root / '.tmp/gate26/sources/S01/LICENSE.txt', 'LINE-PROFILER-BSD-3-CLAUSE.txt'),
    (root / '.tmp/gate26/sources/S01/LICENSE_Python.txt', 'LINE-PROFILER-PYTHON-NOTICE.txt'),
    (root / '.tmp/gate26/sources/S03/LICENSE', 'DRF-NESTED-ROUTERS-APACHE-2.0.txt'),
    (root / 'reports/restoration/gate25/licenses/SWE-SMITH-MIT.txt', 'SWE-SMITH-MIT.txt'),
    (root / 'reports/restoration/gate25/licenses/SWE-BENCH-MIT.txt', 'SWE-BENCH-MIT.txt'),
):
    copy(source, base / 'licenses' / target)
(base / 'capture.json').write_text(json.dumps({'files': manifest,
    'boundary': 'Frozen synthetic actor pilot and official controls; full corpora, archives, images, weights and runtimes remain excluded.'}, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'captured_files': len(manifest)}))
