"""Freeze all observed diagnoses before revealing code/test references."""
import json
from pathlib import Path
import sys

root = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(root))
from scripts.qasper.contract import canonical, sha

base = Path(__file__).resolve().parent
tasks = json.loads((base / 'tasks.json').read_text())
rows = []
for task in tasks['tasks']:
    path = base / task['id'] / 'receipt.json'
    raw = path.read_bytes()
    data = json.loads(raw)
    assert data['status'] == 'submitted' and data['source_preserved'] and not data['references_loaded_by_actor']
    assert data['task'] == task and data['helper_sha256'] == sha((root / 'scripts/code_tasks/agent_shell.py').read_bytes())
    rows.append({'id': task['id'], 'receipt_sha256': sha(raw), 'submission_sha256': canonical(data['submission'])})
path = base / 'submission-freeze.json'
assert not path.exists()
path.write_text(json.dumps({'task_identity': tasks['task_identity'], 'submissions': rows,
    'boundary': 'Saved after all three submissions, before reference patch/test columns opened by grader.'}, indent=2) + '\n', encoding='utf-8')
print('Three diagnoses/citations frozen before reference patch/test columns opened')
