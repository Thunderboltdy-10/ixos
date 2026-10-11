"""Train-only, actual CLI evidence pilot; no gold-guided follow-up calls."""
import argparse
from collections import defaultdict
import importlib.metadata
import json
import os
from pathlib import Path
import platform
import subprocess
import tempfile
import threading
import time

import tiktoken
from eval.artifacts import artifact_identity
from scripts.qasper.contract import render, references, checked_views, score, sha, canonical
from scripts.qasper.runtime import Runtime

ROOT = Path(__file__).resolve().parents[2]
ARMS = [
    ('documents-global','whole-token-centroid','global-line'),
    ('documents-bounded','whole-token-centroid','bounded-rerank'),
    ('documents-passages-global','intro-uniform','global-line'),
    ('documents-passages-bounded','intro-uniform','bounded-rerank'),
    ('lexical-global',None,'global-line'),
]


def source_state(root):
    return {p.relative_to(root).as_posix():[sha(p.read_bytes()),p.stat().st_mtime_ns]
            for p in sorted(root.rglob('*')) if p.is_file()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--binary',type=Path,required=True)
    parser.add_argument('--model',type=Path,required=True)
    parser.add_argument('--data',type=Path,default=ROOT/'.tmp/gate18/qasper')
    parser.add_argument('--preparation',type=Path,default=ROOT/'reports/restoration/gate18/preparation.json')
    parser.add_argument('--output',type=Path,required=True)
    args = parser.parse_args()
    if args.output.exists():
        parser.error('Use a new output directory')
    prep = json.loads(args.preparation.read_text())
    assert prep['status']=='passed' and canonical(prep['pilot'])==prep['pilot_identity']
    train_path = args.data/'qasper-train-v0.3.json'
    train = json.loads(train_path.read_text())
    sources = args.data/'corpus'
    before = source_state(sources)
    for row in prep['pilot']:
        paper = render(row['paper_id'],train[row['paper_id']])
        assert paper.fingerprint==row['sha256'] and [q['question_id'] for q in train[row['paper_id']]['qas']]==row['question_ids']
        assert (sources/row['paper_id']/'paper.txt').read_bytes()==paper.raw
    assert len(before)==len(prep['pilot'])
    args.output.mkdir(parents=True)
    encoding = tiktoken.get_encoding('cl100k_base')
    def tokens(raw):
        return len(encoding.encode(raw.decode('utf-8'),disallowed_special=()))
    receipt = {'status':'running','split':'official train exploratory','task':'known-paper text evidence',
               'binary':str(args.binary.resolve()),'binary_sha256':sha(args.binary.read_bytes()),
               'model':artifact_identity(args.model),'pilot_identity':prep['pilot_identity'],
               'train_sha256':sha(train_path.read_bytes()),'source_state':before,
               'harness_files':{p.relative_to(ROOT).as_posix():sha(p.read_bytes()) for p in sorted(Path(__file__).parent.glob('*.py'))},
               'protocol_files':{p.name:sha(p.read_bytes()) for p in sorted((ROOT/'reports/restoration/gate18').glob('protocol*.json'))},
               'git_head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
               'platform':platform.platform(),'python':platform.python_version(),
               'tokenizer':{'name':'cl100k_base','version':importlib.metadata.version('tiktoken')},
               'arms':ARMS,'completed_arms':[], 'commands':[],
               'timing_condition':'Sequential same-host exploratory, one process per paper/arm. JIT first document fill, then resident parsed/vector hits; history reset for every independent question. One repetition, no stable product latency claim.'}
    def save():
        (args.output/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
    save()
    environment = dict(os.environ)
    environment.pop('IXOS_MODEL_PATH',None)
    records = []
    with tempfile.TemporaryDirectory(prefix='ixos-qasper-pilot-config-') as scratch:
        config = Path(scratch)/'config.toml'
        config.write_text('[retrieval]\ncontext=2\nlimit=1\noutput_bytes=6000\ntypo_correction=false\nsession="off"\npersist=false\n',encoding='utf-8')
        for arm,representation,policy in ARMS:
            lock = threading.Lock()
            with (args.output/(arm+'.wire.jsonl')).open('w',encoding='utf-8',newline='\n') as wire:
                def log(value):
                    with lock:
                        wire.write(json.dumps(value,ensure_ascii=False,separators=(',',':'))+'\n')
                        wire.flush()
                for index,source in enumerate(prep['pilot']):
                    pid = source['paper_id']
                    paper = render(pid,train[pid])
                    argv = [str(args.binary.resolve()),'--config',str(config),'serve','--dir',str((sources/pid).resolve()),
                            '--profile','documents' if representation else 'lexical','--evidence-policy',policy,'--quiet-stats','--jit']
                    if representation:
                        argv += ['--model-path',str(args.model.resolve()),'--representation',representation]
                    receipt['commands'].append({'arm':arm,'paper_id':pid,'argv':argv})
                    save()
                    startup = time.perf_counter()
                    with Runtime(argv,environment,log,pid) as engine:
                        startup_ms = (time.perf_counter()-startup)*1000
                        for qi,question in enumerate(train[pid]['qas']):
                            _,reset_raw,_,_,_,reset_request = engine.call({'op':'reset','id':'reset'})
                            message,stdout,stderr,stats,wall,encoded = engine.call({'op':'search','id':question['question_id'],
                                                                                   'query':question['question'],'stats':True})
                            assert len(stdout)<=6000 and len(message['results'])<=1
                            assert stats['discoveredFiles']==stats['searchableFiles']==1
                            assert not stats['feedbackConsumed']
                            if representation:
                                assert stats['modelFingerprint']==receipt['model']['fingerprint']
                                if qi:
                                    assert stats['memoryCacheHits']==1 and stats['passagesEmbedded']==0
                            ranges = checked_views(message,paper)
                            metrics = score(references(question,paper),paper,ranges)
                            scores = [r['score'] for r in message['results']]
                            row = {'arm':arm,'paper_id':pid,'query_id':question['question_id'],'metrics':metrics,
                                   'candidate_returned':bool(message['results']),'view_returned':bool(ranges),
                                   'max_score':max(scores) if scores else None,'wall_ms':wall,'first_in_process':qi==0,
                                   'startup_wall_ms':startup_ms if qi==0 else None,
                                   'stdout_tokens':tokens(stdout),'diagnostic_tokens':tokens(stderr),'request_tokens':tokens(encoded),
                                   'reset_stdout_tokens':tokens(reset_raw),'reset_request_tokens':tokens(reset_request),
                                   'ready_tokens':tokens(engine.ready_raw) if qi==0 else 0,
                                   'source_ranges':ranges,'diagnostics':stats}
                            records.append(row)
                            with (args.output/'rows.jsonl').open('a',encoding='utf-8',newline='\n') as stream:
                                stream.write(json.dumps(row,ensure_ascii=False,separators=(',',':'))+'\n')
                    print(f'{arm}: paper {index+1}/{len(prep["pilot"])} complete',flush=True)
            receipt['completed_arms'].append(arm)
            save()
    assert source_state(sources)==before,'Source bytes/mtime or adjacent files changed'
    receipt['source_preserved']=True
    receipt['status']='passed'
    receipt['searches']=len(records)
    receipt['requests']=len(records)*2
    save()
    print(f'All {len(records)} searches completed; source corpus preserved',flush=True)


if __name__=='__main__':
    main()
