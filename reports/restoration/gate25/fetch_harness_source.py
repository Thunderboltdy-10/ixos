"""Pin upstream SWE-smith runtime source; do not inspect dataset task rows."""
import argparse
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import tarfile
import urllib.request

base = Path(__file__).resolve().parent
root = base.parents[2]
headers = {'User-Agent': 'Ixos-benchmark-runtime-provenance'}
parser = argparse.ArgumentParser()
parser.add_argument('--commit', required=True, help='Exact recorded upstream source SHA; never resolve mutable main during replay')
args = parser.parse_args()
commit = args.commit
assert len(commit) == 40 and all(c in '0123456789abcdef' for c in commit)
url = f'https://codeload.github.com/SWE-bench/SWE-smith/tar.gz/{commit}'
raw = urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=60).read()
data = root / '.tmp/gate25/data'
(data / 'swesmith-harness.tar.gz').write_bytes(raw)
target = data / 'swesmith-harness'
target.mkdir(exist_ok=True)
files, links = 0, []
with tarfile.open(fileobj=io.BytesIO(raw), mode='r:gz') as archive:
    prefix = 'SWE-smith-' + commit
    for member in archive.getmembers():
        name = PurePosixPath(member.name)
        assert not name.is_absolute() and '..' not in name.parts and name.parts[0] == prefix
        relative = PurePosixPath(*name.parts[1:])
        if member.issym() or member.islnk():
            links.append(str(relative))
            continue
        if not member.isfile():
            continue
        assert str(relative) != '.'
        destination = target.joinpath(*relative.parts)
        destination.parent.mkdir(parents=True, exist_ok=True)
        content = archive.extractfile(member).read()
        if destination.exists():
            assert destination.read_bytes() == content
        else:
            destination.write_bytes(content)
        files += 1
receipt = {'commit': commit, 'url': url, 'archive_sha256': hashlib.sha256(raw).hexdigest(),
           'bytes': len(raw), 'source_files': files, 'excluded_links': links,
           'boundary': 'Runtime/profile source only; no task dataset problem/patch rows opened or emitted.'}
(base / 'harness-source.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
print(json.dumps(receipt))
