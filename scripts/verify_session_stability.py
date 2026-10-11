"""Actual-model feedback set invariance across resets, permutations and caches.

Synthetic acceptance/rejection is a correctness contract, not relevance gold.
Input order, duplicate indices and equivalent displayed paths should not change
the intended accepted/rejected sets. Capture a varying old control explicitly.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import queue
import subprocess
import sys
import tempfile
import threading

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from eval.artifacts import artifact_identity


def source_state(root):
    return {p.relative_to(root).as_posix():[hashlib.sha256(p.read_bytes()).hexdigest(),p.stat().st_mtime_ns]
            for p in sorted(root.rglob('*')) if p.is_file()}


def collect(stream, target, buffer):
    for raw in iter(stream.readline, b''):
        buffer.append(raw)
        target.put(raw)
    target.put(b'')


def run(argv, repetitions, environment, stem):
    process = subprocess.Popen(argv,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=environment)
    stdout, stderr, outq, errq = [], [], queue.Queue(), queue.Queue()
    threads = [threading.Thread(target=collect,args=(process.stdout,outq,stdout),daemon=True),
               threading.Thread(target=collect,args=(process.stderr,errq,stderr),daemon=True)]
    for thread in threads:
        thread.start()
    requests, seeds, follows = [], [], []
    def read(target):
        raw = target.get(timeout=120)
        assert raw, 'Model process ended before its response'
        return raw
    def call(request, stats=False):
        requests.append(request)
        process.stdin.write((json.dumps(request)+'\n').encode())
        process.stdin.flush()
        diagnostics = json.loads(read(errq))['diagnostics'] if stats else None
        raw = read(outq)
        parsed = json.loads(raw)
        assert parsed['id']==request['id'] and 'error' not in parsed, parsed
        return raw, parsed, diagnostics
    try:
        ready = json.loads(read(errq))
        assert ready['type']=='ready'
        seed_expected = None
        selected = None
        for repetition in range(repetitions):
            call({'op':'reset','id':'reset'})
            raw, seed, stats = call({'op':'search','id':'seed','query':'equal-length source edits invalidate cached embeddings','stats':True},True)
            if seed_expected is None:
                seed_expected = raw
                paths = [r['path'] for r in seed['results']]
                assert len(paths)>=3
                selected = {'accepted':list(range(min(6,len(paths)))), 'rejected':list(range(6,min(10,len(paths)))), 'paths':paths}
            assert raw == seed_expected, 'Seed itself varied independently of feedback'
            if repetition:
                assert stats['memoryCacheHits']>0 and stats['passagesEmbedded']==0
            seeds.append(hashlib.sha256(raw).hexdigest())
            feedback = {'query_id':'seed'}
            for key in ('accepted','rejected'):
                values = selected[key][:]
                if repetition%2:
                    values.reverse()
                if values:
                    values += values[:2]
                if repetition%3==2:
                    values = [selected['paths'][i] for i in values]
                feedback[key] = values
            raw, follow, stats = call({'op':'search','id':'follow','query':'How does it detect another edit?','feedback':feedback,'stats':True},True)
            assert stats['feedbackConsumed']
            follows.append({'repetition':repetition,'sha256':hashlib.sha256(raw).hexdigest(),
                            'scores':[(r['path'],r['score']) for r in follow['results']]})
        return {'ready':ready,'selected':selected,'seed_sha256':seeds,'follows':follows,
                'distinct_follow_outputs':len(set(r['sha256'] for r in follows)), 'requests':requests}
    finally:
        try:
            process.stdin.close()
            process.wait(timeout=30)
        except (BrokenPipeError, subprocess.TimeoutExpired):
            process.kill()
            process.wait()
        for thread in threads:
            thread.join(timeout=5)
        stem.with_suffix('.stdout').write_bytes(b''.join(stdout))
        stem.with_suffix('.stderr').write_bytes(b''.join(stderr))
        stem.with_suffix('.requests').write_text('\n'.join(json.dumps(r) for r in requests)+'\n',encoding='utf-8')
        assert process.returncode == 0, f'Process failed: {process.returncode}'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--binary',type=Path,required=True)
    parser.add_argument('--code-model',type=Path,required=True)
    parser.add_argument('--documents-model',type=Path,required=True)
    parser.add_argument('--root',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--expect-variation',action='store_true')
    parser.add_argument('--repetitions',type=int,default=20)
    args = parser.parse_args()
    if args.output.exists() or not 5<=args.repetitions<=100:
        parser.error('Use a new receipt directory and 5–100 repetitions')
    args.output.mkdir(parents=True)
    environment = dict(os.environ)
    environment.pop('IXOS_MODEL_PATH',None)
    before = source_state(args.root)
    receipt = {'status':'running','quality_benchmark':False,'expect_variation':args.expect_variation,
        'binary_sha256':hashlib.sha256(args.binary.read_bytes()).hexdigest(),
        'helper_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'runs':[],'sources':before}
    def save():
        (args.output/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
    save()
    with tempfile.TemporaryDirectory(prefix='ixos-session-stability-config-') as temporary:
        config = Path(temporary)/'config.toml'
        config.write_text('[retrieval]\nsession="combined"\ncontext=0\nlimit=10\noutput_bytes=6000\ntypo_correction=false\n',encoding='utf-8')
        for model, representation in [(args.code_model,'intro-uniform'),(args.documents_model,'whole-token-centroid')]:
            previous = None
            for condition in ('jit','native'):
                argv = [str(args.binary.resolve()),'--config',str(config),'serve','--dir',str(args.root.resolve()),
                        '--model-path',str(model.resolve()),'--representation',representation,'--quiet-stats']
                if condition=='jit':
                    argv.append('--jit')
                stem = args.output/(model.name+'-'+condition)
                result = run(argv,args.repetitions,environment,stem)
                receipt['runs'].append({'model':artifact_identity(model),'condition':condition,'argv':argv,**result})
                save()
                if not args.expect_variation:
                    assert result['distinct_follow_outputs']==1, 'Equivalent feedback sets changed output'
                    signature = result['follows'][0]['sha256']
                    assert previous is None or previous==signature, 'JIT/native multi-feedback outputs differ'
                    previous = signature
                print(model.name+'/'+condition+': '+str(result['distinct_follow_outputs'])+' distinct follow outputs',flush=True)
    assert source_state(args.root)==before, 'Sources or adjacent files changed'
    if args.expect_variation:
        assert any(r['distinct_follow_outputs']>1 for r in receipt['runs']), 'Hypothesis not reproduced'
    receipt['status']='reproduced' if args.expect_variation else 'passed'
    receipt['source_preserved']=True
    save()


if __name__=='__main__':
    main()
