"""Compare actual CLI output and sequential costs, without relevance labels.

Use an unchanged source snapshot, actual model artifacts and two binaries. The
reference fills native records once; both binaries must then reuse those same
records. Resident JIT measures one fill and repeated requests separately. Raw
responses, diagnostics and process identities are retained in a new directory.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import statistics
import subprocess
import sys
import tempfile
import time

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from eval.artifacts import artifact_identity
from scripts.compare_encoded_loader import memory


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sources(root):
    return {p.relative_to(root).as_posix(): [digest(p), p.stat().st_mtime_ns]
            for p in sorted(root.rglob('*')) if p.is_file() and not p.is_symlink()}


def signature(raw):
    return hashlib.sha256(raw).hexdigest()


def resident(argv, query, runs, folder, environment):
    began = time.perf_counter()
    process = subprocess.Popen(argv, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE, env=environment)
    samples, stdout, stderr = [], [], []
    try:
        ready_raw = process.stderr.readline()
        ready = json.loads(ready_raw)
        assert ready['type'] == 'ready'
        startup = (time.perf_counter()-began)*1000
        model_memory = memory(process.pid)
        stderr.append(ready_raw)
        for index in range(runs+1):
            request = {'op': 'search', 'id': str(index), 'query': query, 'stats': True}
            began = time.perf_counter()
            process.stdin.write((json.dumps(request)+'\n').encode())
            process.stdin.flush()
            stat_raw = process.stderr.readline()
            raw = process.stdout.readline()
            wall = (time.perf_counter()-began)*1000
            stats, response = json.loads(stat_raw), json.loads(raw)
            assert stats['type'] == 'stats' and response['id'] == str(index)
            response.pop('id')
            samples.append({'condition': 'fill' if index == 0 else 'resident-warm',
                            'wall_ms': wall, 'stdout_bytes': len(raw),
                            'result_sha256': signature(json.dumps(response, sort_keys=True).encode()),
                            'diagnostics': stats['diagnostics'], 'memory': memory(process.pid)})
            stdout.append(raw)
            stderr.append(stat_raw)
        process.stdin.close()
        assert process.wait(timeout=30) == 0
        stderr.append(process.stderr.read())
        folder.with_suffix('.stdout').write_bytes(b''.join(stdout))
        folder.with_suffix('.stderr').write_bytes(b''.join(stderr))
        return {'argv': argv, 'startup_wall_ms': startup,
                'model_only_memory': model_memory, 'samples': samples,
                'warm_p50_ms': statistics.median(s['wall_ms'] for s in samples[1:])}
    finally:
        if process.poll() is None:
            process.kill()
            process.wait()


def fresh(argv, folder, environment):
    began = time.perf_counter()
    raw = subprocess.run(argv, capture_output=True, timeout=120, env=environment)
    elapsed = (time.perf_counter()-began)*1000
    folder.with_suffix('.stdout').write_bytes(raw.stdout)
    folder.with_suffix('.stderr').write_bytes(raw.stderr)
    assert raw.returncode == 0, raw.stderr.decode(errors='replace')
    result, stats = json.loads(raw.stdout), json.loads(raw.stderr)['diagnostics']
    return {'argv': argv, 'wall_ms': elapsed, 'stdout_bytes': len(raw.stdout),
            'result_sha256': signature(json.dumps(result, sort_keys=True).encode()),
            'diagnostics': stats}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--reference-binary', type=Path, required=True)
    parser.add_argument('--binary', type=Path, required=True)
    parser.add_argument('--code-model', type=Path, required=True)
    parser.add_argument('--documents-model', type=Path, required=True)
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--runs', type=int, default=5)
    parser.add_argument('--warm-runs', type=int, default=10)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists() or not 1 <= args.runs <= 20 or not 1 <= args.warm_runs <= 100:
        parser.error('Use a new output directory and bounded repetition counts')
    args.output.mkdir(parents=True)
    before = sources(args.root)
    environment = dict(os.environ)
    environment.pop('IXOS_MODEL_PATH', None)
    config_text = '[retrieval]\nmode="hybrid"\nevidence_policy="global-line"\nsession="off"\nlimit=10\ncontext=2\noutput_bytes=6000\nio_workers=4\ntypo_correction=false\n'
    query = 'equal-length source edits invalidate cached embeddings'
    receipt = {'status': 'running', 'quality_benchmark': False,
               'platform': sys.platform, 'sources': before, 'query': query,
               'configuration_toml': config_text,
               'binary_sha256': digest(args.binary),
               'reference_binary_sha256': digest(args.reference_binary),
               'helper_sha256': digest(Path(__file__)), 'models': [],
               'condition': 'Sequential warm-up then alternating fresh processes; same fixed source, config, query and model. Source cache records are shared. OS memory at ready and after each resident request; not a quality, low-end or Mac benchmark.'}

    def save():
        (args.output/'receipt.json').write_text(json.dumps(receipt, indent=2)+'\n', encoding='utf-8')

    save()
    with tempfile.TemporaryDirectory(prefix='ixos-cli-loader-config-') as temporary:
        config = Path(temporary)/'config.toml'
        config.write_text(config_text, encoding='utf-8')
        for index, (model, representation) in enumerate([
                (args.code_model, 'intro-uniform'),
                (args.documents_model, 'whole-token-centroid')]):
            record = {'model': artifact_identity(model), 'representation': representation, 'runs': []}
            receipt['models'].append(record)
            record['condition_result_hashes'] = {}
            for condition in ['resident-jit', 'fresh-jit', 'fresh-native-warm']:
                expected = None
                arms = [('eager-warmup', args.reference_binary), ('encoded-warmup', args.binary)]
                for repetition in range(args.runs):
                    arms.extend([(f'{arm}-{repetition}', binary) for arm, binary in
                                 ([('eager', args.reference_binary), ('encoded', args.binary)]
                                  if repetition % 2 == 0 else
                                  [('encoded', args.binary), ('eager', args.reference_binary)])])
                if condition == 'fresh-native-warm':
                    argv = [str(args.reference_binary.resolve()), '--config', str(config),
                            'search', query, '--dir', str(args.root.resolve()),
                            '--model-path', str(model.resolve()), '--representation', representation,
                            '--json', '--stats']
                    native_fill = fresh(argv, args.output/f'{index}-native-fill', environment)
                    record['native_fill'] = native_fill
                for label, binary in arms:
                    argv = [str(binary.resolve()), '--config', str(config)]
                    common = ['--dir', str(args.root.resolve()), '--model-path', str(model.resolve()),
                              '--representation', representation]
                    path = args.output/f'{index}-{condition}-{label}'
                    if condition == 'resident-jit':
                        value = resident(argv+['serve', *common, '--jit', '--quiet-stats'],
                                         query, args.warm_runs, path, environment)
                        signatures = {row['result_sha256'] for row in value['samples']}
                        assert len(signatures) == 1
                        got = signatures.pop()
                        assert value['samples'][0]['diagnostics']['passagesEmbedded'] > 0
                        assert all(row['diagnostics']['passagesEmbedded'] == 0 and
                                   row['diagnostics']['memoryCacheHits'] > 0 for row in value['samples'][1:])
                    else:
                        words = argv+['search', query, *common, '--json', '--stats']
                        if condition == 'fresh-jit':
                            words += ['--cache-mode', 'ephemeral']
                        value = fresh(words, path, environment)
                        got = value['result_sha256']
                        work = value['diagnostics']
                        if condition == 'fresh-jit':
                            assert work['passagesEmbedded'] > 0
                        else:
                            assert work['passagesEmbedded'] == 0 and work['nativeCacheHits'] > 0
                    if expected is None:
                        expected = got
                    assert got == expected, (condition, label, 'CLI response changed')
                    record['runs'].append({'condition': condition, 'arm': label.split('-')[0],
                                           'measured': 'warmup' not in label, **value})
                    save()
                record['condition_result_hashes'][condition] = expected
            # Do not hide an existing cache serialization rounding difference.
            # Exact equality is required between loaders within each condition;
            # cross-condition hashes and all raw scores remain in the receipt.
            record['jit_native_bitwise_equal'] = (
                record['condition_result_hashes']['fresh-jit'] ==
                record['condition_result_hashes']['fresh-native-warm'])
            record['summary'] = {}
            for condition in ['resident-jit', 'fresh-jit', 'fresh-native-warm']:
                record['summary'][condition] = {}
                for arm in ['eager', 'encoded']:
                    rows = [r for r in record['runs'] if r['condition'] == condition and
                            r['arm'] == arm and r['measured']]
                    keys = ['startup_wall_ms', 'warm_p50_ms'] if condition == 'resident-jit' else ['wall_ms']
                    value = {key: statistics.median(r[key] for r in rows) for key in keys}
                    if condition == 'resident-jit':
                        value['fill_p50_ms'] = statistics.median(r['samples'][0]['wall_ms'] for r in rows)
                        value['model_memory_p50'] = {key: statistics.median(r['model_only_memory'][key] for r in rows)
                                                    for key in rows[0]['model_only_memory']}
                        value['resident_memory_p50'] = {key: statistics.median(r['samples'][-1]['memory'][key] for r in rows)
                                                       for key in rows[0]['samples'][-1]['memory']}
                    record['summary'][condition][arm] = value
            print(model.name+': '+json.dumps(record['summary']), flush=True)
            save()
    assert sources(args.root) == before, 'Source bytes/mtime or adjacent files changed'
    receipt['status'] = 'passed'
    receipt['identical_responses'] = True
    save()


if __name__ == '__main__':
    main()
