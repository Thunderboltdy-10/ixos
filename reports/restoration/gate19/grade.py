"""Read expected references only after every live submission is frozen."""
from collections import Counter
import importlib.util
import json
from pathlib import Path
import statistics
import sys

root=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(root))
from scripts.qasper.contract import sha,canonical,render,references,score,union,intersection,answerability
from scripts.qasper.agent_shell import citation_ranges

base=Path(__file__).resolve().parent
freeze=json.loads((base/'submission-freeze.json').read_text())
manifest=json.loads((base/'tasks.json').read_text())
assert freeze['task_identity']==manifest['task_identity']
receipts={}
for row in freeze['submissions']:
    path=base/row['id']/'receipt.json'
    assert sha(path.read_bytes())==row['receipt_sha256'],'Submission changed after freeze'
    receipts[row['id']]=json.loads(path.read_text())
    assert canonical(receipts[row['id']]['submission'])==row['submission_sha256']
# Only now open the complete source question/answer input.
raw=Path(manifest['reference_input']).read_bytes()
assert sha(raw)==manifest['train_sha256']
train=json.loads(raw)
reference_script=root/'.tmp/gate18/qasper/upstream-scoring/evaluator.py'
upstream=json.loads((root/'reports/restoration/gate18/references.json').read_text())
expected=next(row['sha256'] for row in upstream['files'] if row['url'].endswith('/scripts/evaluator.py'))
assert sha(reference_script.read_bytes())==expected
spec=importlib.util.spec_from_file_location('qasper_pinned_official_evaluator',reference_script)
official=importlib.util.module_from_spec(spec)
spec.loader.exec_module(official)
rows=[]
for task in manifest['tasks']:
    data=receipts[task['id']]
    paper=render(task['paper_id'],train[task['paper_id']])
    assert paper.fingerprint==task['source_sha256']
    question=next(q for q in train[task['paper_id']]['qas'] if q['question_id']==task['question_id'])
    refs=references(question,paper)
    initial=data['calls'][0]['exposed_ranges']
    observed=union(r for call in data['calls'] for r in call['exposed_ranges'])
    cited=citation_ranges(data['submission']['citations'],data['calls'],paper)
    assert cited==[tuple(r) for r in data['submission']['source_ranges']]
    answer=official.get_answers_and_evidence({task['paper_id']:{'qas':[question]}},True)[task['question_id']]
    answer_f1=max(official.token_f1_score(data['submission']['answer'],ref['answer']) for ref in answer)
    metrics={label:score(refs,paper,ranges) for label,ranges in [('initial',initial),('observed',observed),('cited',cited)]}
    rows.append({'case':task['id'],'paper_id':task['paper_id'],'question':task['question'],
                 'answerability':answerability(refs),'submission':data['submission'],
                 'raw_submitted_answer_token_f1':answer_f1,
                 'reference_answers_after_freeze':[{'answer':r['answer'],'type':r['type']} for r in answer],
                 'coverage':metrics,'calls':len(data['calls']),'call_types':dict(Counter(c['request']['op'] for c in data['calls'])),
                 'cli_stdout_tokens':data['stdout_tokens'],'diagnostic_tokens':data['diagnostic_tokens'],
                 'request_tokens':data['request_tokens'],'ready_tokens':data['ready_tokens'],
                 'request_wall_ms':sum(c['wall_ms'] for c in data['calls']),'startup_ms':data['startup_ms'],
                 'feedback_consumed':sum(c['diagnostics'].get('feedbackConsumed',False) for c in data['calls'])})
summary={'status':'passed','cases':len(rows),'rows':rows,
         'official_token_f1_function_sha256':expected,'mean_raw_answer_token_f1':statistics.mean(r['raw_submitted_answer_token_f1'] for r in rows),
         'total_calls':sum(r['calls'] for r in rows),'cli_stdout_tokens':sum(r['cli_stdout_tokens'] for r in rows),
         'diagnostic_tokens':sum(r['diagnostic_tokens'] for r in rows),'request_tokens':sum(r['request_tokens'] for r in rows),
         'boundary':'Six train known-paper cases, one already-informed restoration assistant, no matched product comparator or statistical generalization. Literal submitted answer token F1 is lexical overlap, not independently judged correctness; no relabeling of not-established refusal as Unanswerable. CLI wire counts exclude inherited reasoning/chat context, actor status wrappers and terminal echo.'}
(base/'analysis.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8')
for row in rows:
    print(row['case'],'gold',row['answerability'],'status',row['submission']['status'],'F1',row['raw_submitted_answer_token_f1'],
          'coverage',{key:value['byte_recall'] for key,value in row['coverage'].items()},'calls',row['calls'])
print('CLI stdout',summary['cli_stdout_tokens'],'diagnostics',summary['diagnostic_tokens'],'requests',summary['request_tokens'])
