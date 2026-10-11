import json
import os
from pathlib import Path
import sys

root = Path(os.environ['IXOS_REVIEW_ROOT'])
sys.path.insert(0, str(root / 'source'))
from scripts.profile_constrained import source_state

before = json.loads((root / 'receipts-gate14' / 'receipt.json').read_text())['sources']
after = source_state(root / 'frozen-code-gate12/src')
assert before == after, 'Native source hashes/mtime/adjacent files changed after profiling'
result = {'status': 'passed', 'sources': after, 'native_linux_mtime_ns': True,
          'source_bytes': sum(p.stat().st_size for p in (root / 'frozen-code-gate12/src').rglob('*') if p.is_file())}
Path('/mnt/c/Users/pablo/Downloads/Ixos/reports/restoration/gate14/post-source.json').write_text(json.dumps(result, indent=2)+'\n')
print(json.dumps({'status': 'passed', 'files': len(after), 'bytes': result['source_bytes']}))
