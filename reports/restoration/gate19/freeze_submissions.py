import json
from pathlib import Path
import sys

root=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(root))
from scripts.qasper.contract import sha,canonical

base=Path(__file__).resolve().parent
assert not (base/'submission-freeze.json').exists()
manifest=json.loads((base/'tasks.json').read_text())
rows=[]
for task in manifest['tasks']:
    path=base/task['id']/'receipt.json'
    data=json.loads(path.read_text())
    assert data['status']=='submitted' and data['source_preserved'] and not data['references_loaded_by_actor']
    assert data['task']==task and data['task_identity']==manifest['task_identity']
    assert data['helper_sha256']==sha((root/'scripts/qasper/agent_shell.py').read_bytes())
    assert len(data['calls'])<=12 and data['stdout_tokens']<=12000
    rows.append({'id':task['id'],'receipt_sha256':sha(path.read_bytes()),'submission_sha256':canonical(data['submission'])})
record={'task_identity':manifest['task_identity'],'submissions':rows,
        'boundary':'Saved before grading helper reads expected references. Answers/citations remain unchanged after scoring.'}
(base/'submission-freeze.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')
print('Six submitted answers/citations bound before reference scoring')
