"""Separate actual fresh/JIT, disk warm, and resident-request phase costs."""
import argparse,json,statistics,subprocess,time
from pathlib import Path
from eval.provenance import snapshot
from eval.run import percentile
from eval.serve_backend import ServeBackend

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--binary',type=Path,default=Path('target/release/ixos.exe'))
    p.add_argument('--model',type=Path,required=True)
    p.add_argument('--root',type=Path,required=True)
    p.add_argument('--representation',default='whole-token-centroid')
    p.add_argument('--query',default='Does a treatment improve patient survival?')
    p.add_argument('--runs',type=int,default=5)
    p.add_argument('--io-workers',type=int,default=1)
    p.add_argument('--output',type=Path,required=True)
    a=p.parse_args()
    if a.output.exists() or a.runs<1:p.error('New output and positive runs required')
    a.output.mkdir(parents=True)
    records=[]
    source=snapshot(a.output,a.binary)
    for condition in ['fresh-jit','fresh-native-warm']:
        for i in range(a.runs):
            argv=[str(a.binary.resolve()),'search',a.query,'--dir',str(a.root.resolve()),'--retrieval','hybrid','--representation',a.representation,'--model-path',str(a.model.resolve()),'--json','--stats','--cache-mode','ephemeral' if condition=='fresh-jit' else 'native-cache']
            begin=time.perf_counter()
            argv.extend(['--io-workers',str(a.io_workers)])
            r=subprocess.run(argv,capture_output=True,timeout=120)
            elapsed=(time.perf_counter()-begin)*1000
            (a.output/f'{condition}-{i}.stdout').write_bytes(r.stdout)
            (a.output/f'{condition}-{i}.stderr').write_bytes(r.stderr)
            if r.returncode:raise RuntimeError(r.stderr.decode())
            d=json.loads(r.stderr)
            if condition=='fresh-native-warm' and d['diagnostics']['passagesEmbedded']:raise RuntimeError('Native corpus not warmed with this recipe')
            records.append(dict(condition=condition,argv=argv,wall_ms=elapsed,**d))
    with ServeBackend(a.binary,a.model,a.root,None,a.output,representation=a.representation,budget=12000,io_workers=a.io_workers) as server:
        startup=server.ready
        for i in range(a.runs+1):
            _,_,stats,wall,request=server.request({'op':'search','id':str(i),'query':a.query})
            records.append(dict(condition='resident-first' if i==0 else 'resident-warm',wall_ms=wall,diagnostics=stats,request=request.decode()))
    summary=[]
    for condition in dict.fromkeys(r['condition'] for r in records):
        rows=[r for r in records if r['condition']==condition]
        phases={k:statistics.median(r['diagnostics'][k] for r in rows) for k in rows[0]['diagnostics'] if k.endswith('Ms')}
        summary.append(dict(condition=condition,runs=len(rows),p50=percentile([r['wall_ms'] for r in rows],.5),p95=percentile([r['wall_ms'] for r in rows],.95),median_phases=phases))
    (a.output/'report.json').write_text(json.dumps(dict(argv=vars(a),source_snapshot=source,ready=startup,records=records,summary=summary),indent=2,default=str),encoding='utf-8')
    print(json.dumps(summary,indent=2))

if __name__=='__main__':main()
