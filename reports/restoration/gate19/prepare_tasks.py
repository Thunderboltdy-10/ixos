import json
from pathlib import Path
import sys

root=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(root))
from scripts.qasper.contract import render,sha,canonical
from scripts.qasper.download import EXPECTED

data=root/'.tmp/gate18/replay-qasper'
raw=(data/'qasper-train-v0.3.json').read_bytes()
assert sha(raw)==EXPECTED['qasper-train-v0.3.json']
train=json.loads(raw)
selected=sorted(train,key=lambda pid:sha(('ixos-qasper-pilot-v1:'+pid).encode()))[32:38]
exposed=json.loads((root/'reports/restoration/gate18/unmatched-audit.json').read_text())['bounded_training_samples']
prior={r['paper_id'] for r in exposed}
out=root/'.tmp/gate19/tasks'
out.mkdir(parents=True,exist_ok=False)
tasks=[]
for index,pid in enumerate(selected,1):
    paper=render(pid,train[pid])
    question=train[pid]['qas'][0]
    directory=out/f'C{index:02d}'
    directory.mkdir()
    (directory/'paper.txt').write_bytes(paper.raw)
    tasks.append({'id':f'C{index:02d}','paper_id':pid,'question_id':question['question_id'],
                  'title':train[pid]['title'],'question':question['question'],'root':str(directory),
                  'source_sha256':paper.fingerprint,'source_bytes':len(paper.raw),
                  'prior_audit_excerpt_of_paper':pid in prior})
manifest={'task':'known-paper question','tasks':tasks,'train_sha256':sha(raw),'task_identity':canonical(tasks),
          'reference_input':str(data/'qasper-train-v0.3.json'),'reference_exposed':False}
(root/'reports/restoration/gate19/tasks.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'tasks':tasks,'task_identity':manifest['task_identity']},indent=2))
