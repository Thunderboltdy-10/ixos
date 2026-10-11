import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parents[3]
linux = Path(r'\\wsl.localhost\Ubuntu-24.04\home\thunderboltdy\.cache\ixos-review-298088f-20261011\source')
paths = [*sorted((root/'src').rglob('*.rs')), root/'Cargo.toml', root/'Cargo.lock', root/'config/retrieval-models.json']
rows = []
for path in paths:
    relative = path.relative_to(root)
    win = path.read_bytes().replace(b'\r\n', b'\n')
    native = (linux/relative).read_bytes().replace(b'\r\n', b'\n')
    assert win == native, relative
    rows.append({'path':relative.as_posix(), 'normalized_sha256':hashlib.sha256(win).hexdigest()})
(Path(__file__).resolve().parent/'source-identity.json').write_text(json.dumps({'status':'passed', 'files':rows,
    'condition':'All current core Rust files/manifests/catalog match normalized LF bytes. Native executable build recipe copied the changed files before Cargo.'},indent=2)+'\n',encoding='utf-8')
print(f'{len(rows)} normalized core/manifests/catalog identities match')
