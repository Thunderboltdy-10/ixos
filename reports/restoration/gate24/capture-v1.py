"""Copy the excluded harness-control receipts without downloading actor tasks."""
import hashlib
import json
from pathlib import Path
import urllib.request

base = Path(__file__).resolve().parent
root = base.parents[2]
native = Path(r'\\wsl.localhost\Ubuntu-24.04\home\thunderboltdy\.cache\ixos-review-298088f-20261011')
sha = lambda raw: hashlib.sha256(raw).hexdigest()
manifest = {}


def capture(source, destination):
    raw = source.read_bytes()
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists():
        assert destination.read_bytes() == raw, destination
    else:
        destination.write_bytes(raw)
    assert destination.read_bytes() == raw
    manifest[destination.relative_to(base).as_posix()] = {
        'sha256': sha(raw), 'bytes': len(raw), 'source': str(source)}


for name in ('requirements.lock.txt', 'resolve.stderr', 'install.stdout', 'install.stderr',
             'harness-install.stdout', 'harness-install.stderr', 'harness-help.stdout',
             'harness-help.stderr', 'installed.txt', 'uv-version.stdout',
             'uv-venv.stdout', 'uv-venv.stderr', 'image-pull.stdout', 'image-pull.stderr',
             'image.json', 'smoke-inputs.json', 'base.stdout', 'base.stderr',
             'gold.stdout', 'gold.stderr'):
    capture(native / 'gate24' / name, base / 'linux' / name)
assert (native / 'gate24/resolve.stdout').read_bytes() == (base / 'linux/requirements.lock.txt').read_bytes()

for arm, run in [('base', 'ixos-g24-base-20261012-v1'),
                 ('gold', 'ixos-g24-gold-20261012-v1')]:
    folder = native / 'gate24-smoke/logs/evaluation' / run
    capture(folder / 'results.json', base / 'linux' / arm / 'results.json')
    capture(folder / 'run.json', base / 'linux' / arm / 'run.json')
    reports = list(folder.rglob('report.json'))
    assert len(reports) == 1
    for name in ('run_instance.log', 'eval.sh', 'report.json', 'test_output.txt', 'patch.diff'):
        capture(reports[0].parent / name, base / 'linux' / arm / name)

capture(native / 'gate24-harness-source/LICENSE', base / 'licenses/SWE-BENCH-MIT.txt')
license_url = 'https://raw.githubusercontent.com/marshmallow-code/marshmallow/5a10e83c557d2ee97799c2b85bec49fc90381656/LICENSE'
request = urllib.request.Request(license_url, headers={'User-Agent': 'Ixos-benchmark-provenance'})
license_raw = urllib.request.urlopen(request, timeout=60).read()
target = root / '.tmp/gate24/data/marshmallow-LICENSE'
target.write_bytes(license_raw)
capture(target, base / 'licenses/MARSHMALLOW-MIT.txt')
card_url = 'https://huggingface.co/datasets/SWE-bench/SWE-bench/raw/c6fe717fd7a4c3ac1daa4055a4fd082c6a1d28a2/README.md'
request = urllib.request.Request(card_url, headers={'User-Agent': 'Ixos-benchmark-provenance'})
card = urllib.request.urlopen(request, timeout=60).read()
(root / '.tmp/gate24/data/canonical-card.md').write_bytes(card)
metadata = card.decode('utf-8').split('---', 2)[1]
licenses = [line.strip() for line in metadata.splitlines() if line.startswith('license:')]
assert len(licenses) == 1
result = {'files': manifest, 'dataset_card': {'url': card_url, 'sha256': sha(card),
          'license_metadata': licenses[0]}, 'marshmallow_license_url': license_url,
          'boundary': 'Excluded environment control only. No actor task, model or corpus artifact is redistributed. Resolve stdout duplicates the exact committed hash lock.'}
(base / 'capture.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'captured_files': len(manifest), 'dataset_license': licenses[0]}))
