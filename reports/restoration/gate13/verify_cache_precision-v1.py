"""Actual-model exact JIT/native/resident output equality, without quality gold.

Pass a fixed source snapshot. Each model is checked with default and optional
bounded evidence, then with explicit accepted-result session feedback. Baseline
mode records and requires a mismatch; normal mode rejects any mismatch.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--binary', type=Path, required=True)
    p.add_argument('--code-model', type=Path, required=True)
    p.add_argument('--documents-model', type=Path, required=True)
    p.add_argument('--root', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True)
    p.add_argument('--expect-difference', action='store_true')
    args = p.parse_args()
    if args.output.exists():
        p.error('Use a new receipt directory')
    args.output.mkdir(parents=True)
    def state():
        return {p.relative_to(args.root).as_posix(): [hashlib.sha256(p.read_bytes()).hexdigest(), p.stat().st_mtime_ns]
                for p in sorted(args.root.rglob('*')) if p.is_file() and not p.is_symlink()}
    before = state()
    env = dict(os.environ)
    env.pop('IXOS_MODEL_PATH', None)
    receipt = {'status': 'running', 'quality_benchmark': False, 'sources': before,
               'binary_sha256': hashlib.sha256(args.binary.read_bytes()).hexdigest(),
               'expect_difference': args.expect_difference, 'commands': [], 'comparisons': []}
    def save():
        (args.output/'receipt.json').write_text(json.dumps(receipt, indent=2)+'\n', encoding='utf-8')
    def call(argv, stdin=None):
        raw = subprocess.run(list(map(str, argv)), input=stdin, capture_output=True, env=env, timeout=120)
        stem = args.output/f'{len(receipt["commands"]):02d}'
        stem.with_suffix('.stdout').write_bytes(raw.stdout)
        stem.with_suffix('.stderr').write_bytes(raw.stderr)
        receipt['commands'].append({'argv':list(map(str,argv)), 'stdin':stdin.decode() if stdin else None,
                                    'exit_code':raw.returncode})
        save()
        assert raw.returncode == 0, raw.stderr.decode(errors='replace')
        return raw
    def compare(label, reference, candidate):
        same = reference == candidate
        receipt['comparisons'].append({'label':label, 'exact_output_equal':same})
        save()
        if not args.expect_difference:
            assert same, label
    query = 'equal-length source edits invalidate cached embeddings'
    with tempfile.TemporaryDirectory(prefix='ixos-cache-precision-config-') as tmp:
        config = Path(tmp)/'config.toml'
        config.write_text('[retrieval]\nsession="off"\ntypo_correction=false\n', encoding='utf-8')
        for model, representation in [(args.code_model,'intro-uniform'), (args.documents_model,'whole-token-centroid')]:
            prefix = [args.binary.resolve(), '--config', config]
            common = ['--dir',args.root.resolve(),'--model-path',model.resolve(),'--representation',representation]
            for policy in ['global-line','bounded-rerank']:
                options = common+['--evidence-policy',policy]
                words = prefix+['search',query,*options,'--json','--stats']
                jit = call(words+['--cache-mode','ephemeral'])
                filled = call(words)
                cached = call(words)
                work = json.loads(cached.stderr)['diagnostics']
                assert work['nativeCacheHits'] > 0 and work['passagesEmbedded'] == 0
                expected = json.loads(jit.stdout)
                compare(f'{model.name}/{policy}/native-first', expected, json.loads(filled.stdout))
                compare(f'{model.name}/{policy}/native-warm', expected, json.loads(cached.stdout))
                assert expected['results'], 'Probe must have displayed evidence'
                accepted = expected['results'][0]['path']
                requests = [{'op':'search','id':'seed','query':query,'stats':True},
                            {'op':'search','id':'repeat','query':query,'stats':True},
                            {'op':'search','id':'follow','query':'How does it detect another edit?',
                             'feedback':{'query_id':'seed','accepted':[accepted],'rejected':[]},'stats':True}]
                stdin = ('\n'.join(json.dumps(r) for r in requests)+'\n').encode()
                sessions = []
                for condition in ['jit','native']:
                    argv = prefix+['serve',*options,'--quiet-stats','--session-policy','combined']
                    if condition == 'jit':
                        argv += ['--jit']
                    raw = call(argv,stdin)
                    rows = [json.loads(r) for r in raw.stdout.splitlines()]
                    stats = [json.loads(r)['diagnostics'] for r in raw.stderr.splitlines() if json.loads(r)['type']=='stats']
                    assert len(rows) == len(stats) == 3
                    assert stats[1]['memoryCacheHits'] > 0 and stats[1]['passagesEmbedded'] == 0
                    assert stats[2]['feedbackConsumed']
                    seed = dict(rows[0]); seed.pop('id')
                    compare(f'{model.name}/{policy}/{condition}-resident-first',expected,seed)
                    sessions.append(rows)
                compare(f'{model.name}/{policy}/resident-feedback-trajectory',*sessions)
    assert state() == before, 'Source bytes/mtime or ordinary adjacent inventory changed'
    mismatches = sum(not r['exact_output_equal'] for r in receipt['comparisons'])
    assert mismatches > 0 if args.expect_difference else mismatches == 0
    receipt['mismatches'] = mismatches
    receipt['status'] = 'reproduced' if args.expect_difference else 'passed'
    save()
    print(json.dumps({'status':receipt['status'],'comparisons':len(receipt['comparisons']),'mismatches':mismatches},indent=2))


if __name__ == '__main__':
    main()
