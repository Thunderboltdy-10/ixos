"""Actual-model Linux resident retrieval under explicit CPU/address limits.

Virtual address limits are not physical RAM, and CPU affinity does not emulate a
different processor. Preserve failed limits; only successful runs receive exact
output-equivalence credit. The protocol must exist before execution.
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


def source_state(root):
    return {p.relative_to(root).as_posix(): [hashlib.sha256(p.read_bytes()).hexdigest(), p.stat().st_mtime_ns]
            for p in sorted(root.rglob('*')) if p.is_file() and not p.is_symlink()}


def process_memory(pid):
    try:
        fields = {}
        for line in Path(f'/proc/{pid}/status').read_text().splitlines():
            if line.startswith(('VmRSS:', 'VmHWM:', 'VmSize:', 'Threads:')):
                key, value, *_ = line.split()
                fields[key[:-1]] = int(value)*(1 if key == 'Threads:' else 1024)
        return fields
    except FileNotFoundError:
        return None


def run(argv, condition, requests, cpus, stem):
    import resource
    environment = dict(os.environ)
    environment.pop('IXOS_MODEL_PATH', None)
    environment.pop('RAYON_NUM_THREADS', None)
    if condition['rayon_threads']:
        environment['RAYON_NUM_THREADS'] = str(condition['rayon_threads'])

    def constrain():
        resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
        os.sched_setaffinity(0, cpus if condition['affinity'].startswith('all') else {min(cpus)})
        if condition['address_limit_mib']:
            limit = condition['address_limit_mib']*1024*1024
            resource.setrlimit(resource.RLIMIT_AS, (limit, limit))

    result = {'argv':argv, 'condition':condition, 'requests':[], 'status':'failed'}
    stdout, stderr = [], []
    began = time.perf_counter()
    process = subprocess.Popen(argv, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE, env=environment, preexec_fn=constrain)
    try:
        raw = process.stderr.readline()
        stderr.append(raw)
        result['startup_wall_ms'] = (time.perf_counter()-began)*1000
        result['failure_stage'] = 'load'
        ready = json.loads(raw)
        assert ready['type'] == 'ready'
        result['ready'] = ready
        result['ready_memory'] = process_memory(process.pid)
        result['actual_affinity'] = sorted(os.sched_getaffinity(process.pid))
        for request in requests:
            result['failure_stage'] = request['id']
            began = time.perf_counter()
            process.stdin.write((json.dumps(request)+'\n').encode())
            process.stdin.flush()
            stat_raw = process.stderr.readline()
            response_raw = process.stdout.readline()
            wall = (time.perf_counter()-began)*1000
            stderr.append(stat_raw)
            stdout.append(response_raw)
            stats, response = json.loads(stat_raw), json.loads(response_raw)
            assert stats['type'] == 'stats' and response['id'] == request['id']
            result['requests'].append({'id':request['id'], 'wall_ms':wall,
                'stdout_bytes':len(response_raw), 'diagnostics':stats['diagnostics'],
                'response_sha256':hashlib.sha256(response_raw).hexdigest(),
                'memory':process_memory(process.pid)})
        assert result['requests'][1]['diagnostics']['memoryCacheHits'] > 0
        assert result['requests'][1]['diagnostics']['passagesEmbedded'] == 0
        assert result['requests'][2]['diagnostics']['feedbackConsumed']
        assert result['requests'][3]['diagnostics']['evidence']['policy'] == 'bounded-rerank'
        assert 'evidence' not in result['requests'][4]['diagnostics']
        result['status'] = 'passed'
        result.pop('failure_stage')
    except (ValueError, AssertionError, BrokenPipeError, ProcessLookupError) as error:
        result['failure'] = str(error)
    finally:
        try:
            process.stdin.close()
        except BrokenPipeError:
            pass
        try:
            code = process.wait(timeout=30)
        except subprocess.TimeoutExpired:
            process.kill()
            code = process.wait()
            result['status'] = 'failed'
            result['failure'] = 'Process did not exit after stdin closed'
        result['exit_code'] = code
        if code != 0:
            result['status'] = 'failed'
        stdout.append(process.stdout.read())
        stderr.append(process.stderr.read())
        stem.with_suffix('.stdout').write_bytes(b''.join(stdout))
        stem.with_suffix('.stderr').write_bytes(b''.join(stderr))
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--binary', type=Path, required=True)
    parser.add_argument('--code-model', type=Path, required=True)
    parser.add_argument('--documents-model', type=Path, required=True)
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--protocol', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if not sys.platform.startswith('linux') or args.output.exists():
        parser.error('Use native Linux and a new receipt directory')
    protocol_bytes = args.protocol.read_bytes()
    protocol = json.loads(protocol_bytes)
    binary_hash = hashlib.sha256(args.binary.read_bytes()).hexdigest()
    assert binary_hash == protocol['linux_binary_sha256'], 'Protocol executable changed'
    assert 1 <= protocol['repetitions'] <= 10
    before = source_state(args.root)
    cpus = os.sched_getaffinity(0)
    requests = [
        {'op':'search','id':'seed','query':'equal-length source edits invalidate cached embeddings','stats':True},
        {'op':'search','id':'repeat','query':'equal-length source edits invalidate cached embeddings','stats':True},
        {'op':'search','id':'feedback','query':'How does it detect another edit?',
         'feedback':{'query_id':'seed','accepted':[0],'rejected':[]},'stats':True},
        {'op':'search','id':'bounded','query':'equal-length source edits invalidate cached embeddings',
         'evidence_policy':'bounded-rerank','stats':True},
        {'op':'search','id':'default-again','query':'equal-length source edits invalidate cached embeddings','stats':True}]
    args.output.mkdir(parents=True)
    receipt = {'status':'running', 'quality_benchmark':False,
        'protocol_sha256':hashlib.sha256(protocol_bytes).hexdigest(), 'binary_sha256':binary_hash,
        'helper_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'initial_affinity':sorted(cpus), 'platform':sys.platform, 'sources':before,
        'requests':requests, 'models':[],
        'condition':'One unmeasured unconstrained warm-up, then rotating condition order over three fresh processes/condition. RLIMIT_AS caps virtual address space; no physical weak-device/Mac/quality claim. Failed limits retained. Only one child model process at a time.'}
    def save():
        (args.output/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
    save()
    configuration = '[retrieval]\nmode="hybrid"\nevidence_policy="global-line"\nsession="combined"\nlimit=10\ncontext=2\noutput_bytes=6000\ntypo_correction=false\n'
    receipt['configuration_toml'] = configuration
    with tempfile.TemporaryDirectory(prefix='ixos-resource-config-') as temporary:
        config = Path(temporary)/'config.toml'
        config.write_text(configuration,encoding='utf-8')
        for index, (model, representation) in enumerate([
                (args.code_model,'intro-uniform'),(args.documents_model,'whole-token-centroid')]):
            record = {'model':artifact_identity(model),'representation':representation,'runs':[]}
            receipt['models'].append(record)
            conditions = protocol['conditions']
            schedule = [(False,'warmup',conditions[0])]
            for repetition in range(protocol['repetitions']):
                order = conditions[repetition:]+conditions[:repetition]
                schedule.extend((True,str(repetition),condition) for condition in order)
            expected = None
            for measured, repetition, condition in schedule:
                argv = [str(args.binary.resolve()),'--config',str(config),'serve','--dir',str(args.root.resolve()),
                        '--model-path',str(model.resolve()),'--representation',representation,
                        '--io-workers',str(condition['io_workers']),'--jit','--quiet-stats']
                stem = args.output/f'{index}-{repetition}-{condition["name"]}'
                result = run(argv,condition,requests,cpus,stem)
                if result['status'] == 'passed':
                    signatures = [row['response_sha256'] for row in result['requests']]
                    if expected is None:
                        expected = signatures
                    assert signatures == expected, 'Resource condition changed actual response bytes'
                    result['exact_output_equal'] = True
                elif condition['name'] == 'unconstrained':
                    raise RuntimeError('Unconstrained reference failed; retained outputs: '+str(stem))
                record['runs'].append({'measured':measured,'repetition':repetition,**result})
                save()
                print(model.name+'/'+condition['name']+': '+result['status'],flush=True)
            record['summary'] = {}
            for condition in conditions:
                rows = [r for r in record['runs'] if r['measured'] and r['condition']['name']==condition['name']]
                successful = [r for r in rows if r['status']=='passed']
                summary = {'passed':len(successful),'failed':len(rows)-len(successful)}
                if successful:
                    summary.update({'startup_p50_ms':statistics.median(r['startup_wall_ms'] for r in successful),
                        'request_p50_ms':{q['id']:statistics.median(r['requests'][i]['wall_ms'] for r in successful)
                                           for i,q in enumerate(requests)},
                        'final_memory_p50':{key:statistics.median(r['requests'][-1]['memory'][key] for r in successful)
                                            for key in successful[0]['requests'][-1]['memory']}})
                record['summary'][condition['name']] = summary
            save()
    assert source_state(args.root)==before, 'Sources or adjacent files changed'
    receipt['status']='completed'
    receipt['source_preservation']=True
    save()


if __name__ == '__main__':
    main()
