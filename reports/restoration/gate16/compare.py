"""Exact same-host cross-toolchain response contract; no quality labels."""
import hashlib
import json
import os
from pathlib import Path

root = Path(os.environ['IXOS_REVIEW_ROOT'])
before = root/'receipts-gate15/precision'
after = root/'receipts-gate16/precision'
control = json.loads((before/'receipt.json').read_text())
candidate = json.loads((after/'receipt.json').read_text())
assert control['status']==candidate['status']=='passed'
assert control['sources']==candidate['sources']
assert control['mismatches']==candidate['mismatches']==0
assert sorted(p.name for p in before.glob('*.stdout')) == sorted(p.name for p in after.glob('*.stdout'))
rows = []
for path in sorted(before.glob('*.stdout')):
    other = after/path.name
    assert path.read_bytes()==other.read_bytes(), path.name
    rows.append({'path':path.name, 'exact_bytes_equal':True, 'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
protocol = json.loads(Path('/mnt/c/Users/pablo/Downloads/Ixos/reports/restoration/gate16/protocol.json').read_text())
assert hashlib.sha256((root/'source/target/release/ixos').read_bytes()).hexdigest()==protocol['control_linux_binary_sha256']
source_lock = root/'source/Cargo.lock'
windows_lock = Path('/mnt/c/Users/pablo/Downloads/Ixos/Cargo.lock')
assert source_lock.read_bytes().replace(b'\r\n',b'\n')==windows_lock.read_bytes().replace(b'\r\n',b'\n')
receipt = {'status':'passed','quality_benchmark':False,'control_toolchain':'1.92.0','candidate_toolchain':'1.89.0',
           'same_source_and_models':True,'source_preserved':True,'responses':rows,
           'candidate_binary_sha256':hashlib.sha256((root/'target-msrv-g16/release/ixos').read_bytes()).hexdigest()}
(root/'receipts-gate16/comparison.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({'status':'passed','exact_process_stdout_comparisons':len(rows),'candidate_binary_sha256':receipt['candidate_binary_sha256']}))
