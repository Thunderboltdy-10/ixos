"""Interactive actual CLI task; references are never loaded by this actor helper."""
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
from scripts.qasper.contract import Paper, checked_views, sha, canonical, union, intersection
from scripts.qasper.cache_probe import state
from scripts.qasper.runtime import Runtime


def exposed(value,paper):
    if 'results' in value:
        return checked_views(value,paper)
    if 'view' in value:
        view=value['view']
        return checked_views({'results':[{'path':view['path'],'view':view}]},paper)
    if 'slice' in value:
        part=value['slice']
        start,end=part['start_byte'],part['end_byte']
        if part['path']!='paper.txt' or type(start) is not int or type(end) is not int or not 0<=start<=end<=len(paper.raw):
            raise ValueError('Character slice has invalid source coordinates')
        if paper.raw[start:end].decode()!=part['text']:
            raise ValueError('Character slice differs from original source')
        return union([(start,end)])
    return []


def citation_ranges(citations,calls,paper):
    lines=paper.raw.decode().split('\n')[:-1]
    offsets=[]
    offset=0
    for line in lines:
        offsets.append(offset)
        offset+=len(line.encode())+1
    out=[]
    for citation in citations:
        source=next(row for row in calls if row['request']['id']==citation['call_id'])
        a,b=citation['start_line'],citation['end_line']
        if type(a) is not int or type(b) is not int or not 1<=a<=b<=len(lines):
            raise ValueError('Citation outside source')
        start=offsets[a-1]
        end=start+len('\n'.join(lines[a-1:b]).encode())
        if intersection(source['exposed_ranges'],start,end)!=end-start:
            raise ValueError('Citation not fully exposed by its referenced tool call')
        out.append((start,end))
    return union(out)


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
    assert len(before)==1 and before['paper.txt'][0]==task['source_sha256']
    paper=Paper(task['paper_id'],(root/'paper.txt').read_bytes(),[],[])
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
                  '--profile','documents','--model-path',str(args.model.resolve()),'--representation','whole-token-centroid',
                  '--session','combined','--evidence-policy','bounded-rerank','--quiet-stats']
            receipt['argv']=argv
            began=time.perf_counter()
            with Runtime(argv,env,log,task['id']) as engine:
                receipt['startup_ms']=(time.perf_counter()-began)*1000
                receipt['ready_tokens']=tokens(engine.ready_raw)
                print(json.dumps({'type':'agent_task','case':task['id'],'title':task['title'],'question':task['question'],
                                  'source_bytes':len(paper.raw),'instructions':'Up to12calls /12000stdout tokens. Submit answer/status/citations from observed calls; no labels.'}),flush=True)
                def call(request):
                    if request.get('op') not in ('search','grep','read','reset') or len(receipt['calls'])>=12:
                        raise ValueError('Invalid task call or exhausted call budget')
                    if any(row['request']['id']==request['id'] for row in receipt['calls']):
                        raise ValueError('Task call IDs must be unique')
                    value,stdout,stderr,stats,wall,encoded=engine.call(request)
                    ranges=exposed(value,paper)
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
                    if receipt['stdout_tokens']>12000:
                        raise ValueError('Exceeded task stdout token budget')
                call({'op':'search','id':'q1','query':task['question'],'stats':True})
                for line in sys.stdin:
                    request=json.loads(line)
                    if request.get('op')=='submit':
                        if request.get('status') not in ('answered','not-established') or not isinstance(request.get('answer'),str):
                            raise ValueError('Explicit answer/status required')
                        citations=request.get('citations',[])
                        ranges=citation_ranges(citations,receipt['calls'],paper)
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
