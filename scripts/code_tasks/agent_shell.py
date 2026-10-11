"""Interactive human code-issue diagnosis through the actual CLI; never loads solutions."""
import argparse
import json
import os
from pathlib import Path
import sys
import tempfile
import threading
import time

import tiktoken
from eval.artifacts import artifact_identity
from scripts.qasper.contract import sha, canonical
from scripts.qasper.cache_probe import state
from scripts.qasper.runtime import Runtime
from scripts.code_tasks.contract import citation_ranges, exposed


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    parser=argparse.ArgumentParser(description=__doc__)
    for name in ('binary','model','tasks','output'):
        parser.add_argument('--'+name,type=Path,required=True)
    parser.add_argument('--case',required=True)
    args=parser.parse_args()
    if args.output.exists():
        parser.error('Use a new task receipt directory')
    manifest=json.loads(args.tasks.read_text())
    assert canonical(manifest['tasks'])==manifest['task_identity']
    task=next(row for row in manifest['tasks'] if row['id']==args.case)
    root=Path(task['root'])
    before=state(root)
    inventory=json.loads(Path(task['inventory_path']).read_text())
    assert canonical(inventory)==task['inventory_identity']
    assert {name:value[0] for name,value in before.items()}=={name:value['sha256'] for name,value in inventory.items()}
    args.output.mkdir(parents=True)
    receipt={'status':'running','task':task,'task_identity':manifest['task_identity'],
             'binary_sha256':sha(args.binary.read_bytes()),'model':artifact_identity(args.model),
             'helper_sha256':sha(Path(__file__).read_bytes()),'sources':before,'calls':[],
             'references_loaded_by_actor':False,'stdout_tokens':0,'diagnostic_tokens':0,'request_tokens':0}
    encoding=tiktoken.get_encoding('cl100k_base')
    def tokens(raw):
        return len(encoding.encode(raw.decode(),disallowed_special=()))
    def save():
        (args.output/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
    save()
    lock=threading.Lock()
    submitted=False
    env=dict(os.environ)
    env.pop('IXOS_MODEL_PATH',None)
    try:
        with (args.output/'wire.jsonl').open('w',encoding='utf-8',newline='\n') as wire, tempfile.TemporaryDirectory(prefix='ixos-agent-config-') as scratch:
            def log(value):
                with lock:
                    wire.write(json.dumps(value,ensure_ascii=False,separators=(',',':'))+'\n')
                    wire.flush()
            config=Path(scratch)/'config.toml'
            config.write_text('[retrieval]\ncontext=2\nlimit=5\noutput_bytes=6000\ntypo_correction=false\nsession="combined"\npersist=true\n',encoding='utf-8')
            argv=[str(args.binary.resolve()),'--config',str(config),'serve','--dir',str(root),
                  '--profile','code','--model-path',str(args.model.resolve()),'--representation','intro-uniform',
                  '--session','combined','--evidence-policy','bounded-rerank','--quiet-stats']
            receipt['argv']=argv
            began=time.perf_counter()
            with Runtime(argv,env,log,task['id']) as engine:
                receipt['startup_ms']=(time.perf_counter()-began)*1000
                receipt['ready_tokens']=tokens(engine.ready_raw)
                print(json.dumps({'type':'agent_task','case':task['id'],'repo':task['repo'],'instance_id':task['instance_id'],'issue':task['problem_statement'],
                                  'source_bytes':task['source_bytes'],'instructions':'Up to16calls /18000stdout tokens. Submit diagnosis/proposed_change/status/citations from observed calls; no solutions. Citations require path.'}),flush=True)
                def call(request):
                    if request.get('op') not in ('search','grep','read','reset') or len(receipt['calls'])>=16:
                        raise ValueError('Invalid task call or exhausted call budget')
                    if any(row['request']['id']==request['id'] for row in receipt['calls']):
                        raise ValueError('Task call IDs must be unique')
                    value,stdout,stderr,stats,wall,encoded=engine.call(request)
                    ranges=exposed(value,root)
                    receipt['stdout_tokens']+=tokens(stdout)
                    receipt['diagnostic_tokens']+=tokens(stderr)
                    receipt['request_tokens']+=tokens(encoded)
                    receipt['calls'].append({'request':request,'wall_ms':wall,'exposed_ranges':ranges,
                                             'stdout_tokens':tokens(stdout),'diagnostic_tokens':tokens(stderr),'diagnostics':stats})
                    save()
                    print(stdout.decode(),end='',flush=True)
                    if stderr:
                        print(stderr.decode(),end='',flush=True)
                    print(json.dumps({'type':'agent_budget','calls':len(receipt['calls']),'stdout_tokens':receipt['stdout_tokens']}),flush=True)
                    if receipt['stdout_tokens']>18000:
                        raise ValueError('Exceeded task stdout token budget')
                call({'op':'search','id':'q1','query':task['problem_statement'],'stats':True})
                for line in sys.stdin:
                    request=json.loads(line)
                    if request.get('op')=='submit':
                        if request.get('status') not in ('answered','not-established') or not isinstance(request.get('diagnosis'),str) or not isinstance(request.get('proposed_change'),str):
                            raise ValueError('Explicit diagnosis/proposed_change/status required')
                        citations=request.get('citations',[])
                        ranges=citation_ranges(citations,receipt['calls'],root)
                        if request['status']=='answered' and not ranges:
                            raise ValueError('Answered submission needs observed source citations')
                        receipt['submission']={**request,'source_ranges':ranges}
                        submitted=True
                        break
                    call(request)
            if not submitted:
                raise ValueError('Task input ended without submission')
        receipt['status']='submitted'
        print(json.dumps({'type':'submitted','case':task['id'],'calls':len(receipt['calls'])}),flush=True)
    finally:
        receipt['source_preserved']=state(root)==before
        if not submitted:
            receipt['status']='incomplete'
        save()
        assert receipt['source_preserved'],'Task source bytes/mtime/inventory changed'


if __name__=='__main__':
    main()
