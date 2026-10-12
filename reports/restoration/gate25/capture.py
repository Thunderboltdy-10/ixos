"""Preserve exact raw receipts from the excluded synthetic environment control."""
import hashlib
import json
from pathlib import Path
import urllib.request

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
    manifest[target.relative_to(base).as_posix()] = {'sha256': sha(raw), 'bytes': len(raw), 'source': str(source)}


for name in ('venv.stdout', 'venv.stderr', 'requirements.lock.txt', 'resolve.stderr',
             'install.stdout', 'install.stderr', 'harness-install.stdout', 'harness-install.stderr',
             'installed.txt', 'help.stdout', 'help.stderr', 'image-pull.stdout', 'image-pull.stderr',
             'image-before.json', 'image-after.json', 'smoke-inputs.json',
             'base.stdout', 'base.stderr', 'gold.stdout', 'gold.stderr'):
    copy(native / 'gate25' / name, base / 'linux' / name)
assert (native / 'gate25/resolve.stdout').read_bytes() == (base / 'linux/requirements.lock.txt').read_bytes()
instance = json.loads((base / 'control-selection.json').read_text())['control_metadata']['instance_id']
for arm in ('base', 'gold'):
    folder = native / 'gate25-smoke/logs/run_evaluation' / f'ixos-g25-{arm}-20261012-v1'
    copy(folder / 'report.json', base / 'linux' / arm / 'summary.json')
    for name in ('report.json', 'eval.sh', 'run_instance.log', 'test_output.txt', 'patch.diff'):
        copy(folder / instance / name, base / 'linux' / arm / name)
copy(root / '.tmp/gate25/data/swesmith-harness/LICENSE', base / 'licenses/SWE-SMITH-MIT.txt')
copy(root / 'reports/restoration/gate24/licenses/SWE-BENCH-MIT.txt', base / 'licenses/SWE-BENCH-MIT.txt')
url = 'https://raw.githubusercontent.com/oauthlib/oauthlib/1fd5253630c03e3f12719dd8c13d43111f66a8d2/LICENSE'
raw = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Ixos-source-notice'}), timeout=60).read()
source = root / '.tmp/gate25/data/OAUTHLIB-LICENSE'
source.write_bytes(raw)
copy(source, base / 'licenses/OAUTHLIB-BSD-3-CLAUSE.txt')
result = {'files': manifest, 'oauthlib_notice_url': url,
          'boundary': 'Excluded synthetic environment controls only; no actor task success. Complete source/model/data/runtime binaries remain ignored.'}
(base / 'capture.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'captured_files': len(manifest)}))
