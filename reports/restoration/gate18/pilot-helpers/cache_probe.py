"""Exact JIT/native/resident responses on complete known papers; no quality tuning."""
import argparse
import json
import os
from pathlib import Path
import tempfile
import threading

from eval.artifacts import artifact_identity
from scripts.qasper.contract import canonical, render, checked_views, sha
from scripts.qasper.runtime import Runtime


def state(root):
    return {p.relative_to(root).as_posix():[sha(p.read_bytes()),p.stat().st_mtime_ns]
            for p in sorted(root.rglob('*')) if p.is_file()}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    for name in ('binary','model','data','preparation','output'):
        parser.add_argument('--'+name,type=Path,required=True)
    args=parser.parse_args()
    if args.output.exists():
        parser.error('Use a new receipt directory')
    prep=json.loads(args.preparation.read_text())
    assert prep['status']=='passed' and canonical(prep['pilot'])==prep['pilot_identity']
    train=json.loads((args.data/'qasper-train-v0.3.json').read_text())
    corpus=args.data/'corpus'
    before=state(corpus)
    args.output.mkdir(parents=True)
    receipt={'status':'running','purpose':'Actual model cache equivalence, not additional quality labels or a timing study',
             'binary_sha256':sha(args.binary.read_bytes()),'model':artifact_identity(args.model),
             'pilot_identity':prep['pilot_identity'],'cases':[],'sources':before,
             'helper_sha256':sha(Path(__file__).read_bytes()),'runtime_sha256':sha((Path(__file__).parent/'runtime.py').read_bytes())}
    def save():
        (args.output/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
    save()
    env=dict(os.environ)
    env.pop('IXOS_MODEL_PATH',None)
    lock=threading.Lock()
    with (args.output/'wire.jsonl').open('w',encoding='utf-8',newline='\n') as wire, tempfile.TemporaryDirectory(prefix='ixos-qasper-cache-config-') as scratch:
        def log(value):
            with lock:
                wire.write(json.dumps(value,ensure_ascii=False,separators=(',',':'))+'\n')
                wire.flush()
        config=Path(scratch)/'config.toml'
        config.write_text('[retrieval]\ncontext=2\nlimit=1\noutput_bytes=6000\ntypo_correction=false\nsession="off"\npersist=true\n',encoding='utf-8')
        for source in prep['pilot'][:6]:
            pid=source['paper_id']
            paper=render(pid,train[pid])
            assert (corpus/pid/'paper.txt').read_bytes()==paper.raw and paper.fingerprint==source['sha256']
            question=train[pid]['qas'][0]
            for representation in ('whole-token-centroid','intro-uniform'):
                for policy in ('global-line','bounded-rerank'):
                    expected=None
                    for mode in ('jit','native-fill','native-warm'):
                        argv=[str(args.binary.resolve()),'--config',str(config),'serve','--dir',str((corpus/pid).resolve()),
                              '--profile','documents','--model-path',str(args.model.resolve()),'--representation',representation,
                              '--evidence-policy',policy,'--quiet-stats']
                        if mode=='jit':
                            argv.append('--jit')
                        with Runtime(argv,env,log,pid) as engine:
                            responses=[]
                            for repeat in range(2):
                                value,raw,_,stats,_,_=engine.call({'op':'search','id':'cache','query':question['question'],'stats':True})
                                checked_views(value,paper)
                                assert len(raw)<=6000 and stats['discoveredFiles']==stats['searchableFiles']==1
                                assert stats['modelFingerprint']==receipt['model']['fingerprint']
                                if expected is None:
                                    expected=raw
                                assert expected==raw,'Actual JIT/native/resident response changed'
                                if repeat:
                                    assert stats['memoryCacheHits']==1 and stats['passagesEmbedded']==0
                                if mode=='native-warm' and not repeat:
                                    assert stats['nativeCacheHits']+stats['applicationCacheHits']==1 and stats['passagesEmbedded']==0
                                responses.append({'sha256':sha(raw),'diagnostics':stats})
                        receipt['cases'].append({'paper_id':pid,'representation':representation,'policy':policy,'mode':mode,'argv':argv,'responses':responses})
                        save()
            print(pid+': cache equivalence passed',flush=True)
    assert state(corpus)==before,'Primary source bytes/mtime or adjacent files changed'
    receipt['source_preserved']=True
    receipt['status']='passed'
    save()
    print('72fresh processes/144searches passed; first6pilot papers, actual model, exact source preservation',flush=True)


if __name__=='__main__':
    main()
