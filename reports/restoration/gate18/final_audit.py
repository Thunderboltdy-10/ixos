"""Check measured helper snapshots, immutable evaluator and complete input binding."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile

root=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(root))
from scripts.qasper.contract import sha, canonical
from scripts.qasper.download import EXPECTED

base=Path(__file__).resolve().parent
original=json.loads((base/'preparation.json').read_text())
bound=json.loads((base/'bound-preparation.json').read_text())
measured=json.loads((base/'pilot/receipt.json').read_text())
for path,digest in measured['harness_files'].items():
    assert sha((base/'pilot-helpers'/Path(path).name).read_bytes())==digest,path
assert measured['train_sha256']==bound['train_sha256']==EXPECTED['qasper-train-v0.3.json']
for key in ('pilot','pilot_identity','train_audit','pilot_audit','dev_reserved'):
    assert original[key]==bound[key]
assert bound['dev_sha256']==EXPECTED['qasper-dev-v0.3.json']
evaluator=canonical({p.relative_to(root).as_posix():sha(p.read_bytes()) for p in sorted((root/'eval').glob('*.py'))})
assert evaluator=='95afba09dd7c77e0fc56ed4e922d508116f701bb679f52c0844ed7725fc14297'
assert not subprocess.check_output(['git','diff','HEAD','--','eval'],cwd=root)
with tempfile.TemporaryDirectory(prefix='ixos-qasper-binding-',dir=root/'.tmp/gate18') as directory:
    data=Path(directory)
    # No model needs to load: even a well-formed input with changed question/gold
    # bytes must fail against its prepared binding before corpus/model access.
    (data/'qasper-train-v0.3.json').write_text('{}',encoding='utf-8')
    output=data/'unexpected-output'
    argv=[sys.executable,'-m','scripts.qasper.pilot','--binary',str(root/'target/release/ixos.exe'),
          '--model',str(root/'.tmp/gate4/reviewer-models/potion-retrieval-32M-row-int8'),
          '--data',str(data),'--preparation',str(base/'bound-preparation.json'),'--output',str(output)]
    raw=subprocess.run(argv,cwd=root,capture_output=True,timeout=30)
    (base/'changed-input.stdout').write_bytes(raw.stdout)
    (base/'changed-input.stderr').write_bytes(raw.stderr)
    assert raw.returncode!=0 and b'Prepared queries/gold changed' in raw.stderr and not output.exists()
for path in (root/'scripts/qasper').glob('*.py'):
    compile(path.read_text(encoding='utf-8'),str(path),'exec')
print('Original helper hashes, replay identities, frozen evaluator and changed-input rejection passed')
