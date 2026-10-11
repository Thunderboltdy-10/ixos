import json
from pathlib import Path
import sys

root = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(root/'private-process/skill-deps'))
import yaml

workflow = yaml.safe_load((root/'.github/workflows/engine-ci.yml').read_text())
assert 'minimum-rust' in workflow['jobs']
assert 'verify_session_stability.py' in (root/'.github/workflows/engine-ci.yml').read_text()
compile((root/'scripts/verify_session_stability.py').read_text(), 'verify_session_stability.py', 'exec')
identity = json.loads((root/'reports/restoration/gate17/source-identity.json').read_text())
assert identity['status']=='passed' and len(identity['files'])==118
print('Workflow YAML, Python syntax and 118 normalized source identities passed')
