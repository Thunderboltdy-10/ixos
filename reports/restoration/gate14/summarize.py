"""Audit saved resource receipts; no search reruns or quality-label changes."""
import hashlib
import json
from pathlib import Path

import tiktoken

BASE = Path(__file__).resolve().parent


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def syscall_rows(path):
    rows = {}
    for line in path.read_text().splitlines():
        fields = line.split()
        if len(fields) in (5, 6) and fields[-1] in ('mmap', 'munmap', 'mremap', 'brk', 'mprotect', 'madvise', 'futex'):
            rows[fields[-1]] = {'calls': int(fields[3]), 'errors': int(fields[4]) if len(fields) == 6 else 0}
    return rows


def main():
    encoding = tiktoken.get_encoding('cl100k_base')
    output = {'schema': 1, 'quality_benchmark': False, 'tokenizer': 'cl100k_base',
              'tiktoken_version': tiktoken.__version__, 'resource': {}, 'trace': [],
              'limits': 'Descriptive resource contracts on one fixed 113-file source corpus; virtual-address caps are not physical RAM limits. No independent quality labels.'}
    for label in ('runtime', 'allocator'):
        receipt = json.loads((BASE / label / 'receipt.json').read_text())
        assert receipt['status'] == 'completed' and receipt['source_preservation']
        models = []
        for index, model in enumerate(receipt['models']):
            reference = None
            for run in model['runs']:
                stem = BASE / label / f'{index}-{run["repetition"]}-{run["condition"]["name"]}'
                stdout = stem.with_suffix('.stdout').read_bytes()
                if run['status'] == 'passed':
                    assert run['exit_code'] == 0 and run['exact_output_equal']
                    signatures = [hashlib.sha256(line).hexdigest() for line in stdout.splitlines(keepends=True)]
                    assert signatures == [r['response_sha256'] for r in run['requests']]
                    reference = reference or signatures
                    assert signatures == reference
            sample = BASE / label / f'{index}-warmup-unconstrained'
            stdout = sample.with_suffix('.stdout').read_text(encoding='utf-8')
            stderr = sample.with_suffix('.stderr').read_text(encoding='utf-8')
            tokens = {'stdout': len(encoding.encode(stdout)), 'stderr_ready_and_stats': len(encoding.encode(stderr)),
                      'input_requests': len(encoding.encode('\n'.join(json.dumps(q) for q in receipt['requests']) + '\n')),
                      'per_response_stdout': [len(encoding.encode(line)) for line in stdout.splitlines(keepends=True)]}
            tokens['stdout_and_stderr'] = tokens['stdout'] + tokens['stderr_ready_and_stats']
            models.append({'model': model['model'], 'summary': model['summary'], 'tokens_reference': tokens,
                           'failures': [r for r in model['runs'] if r['status'] != 'passed'],
                           'process_count': len(model['runs']),
                           'completed_request_count': sum(len(r['requests']) for r in model['runs'])})
        output['resource'][label] = {'receipt_sha256': sha(BASE / label / 'receipt.json'), 'models': models}
    trace = json.loads((BASE / 'trace' / 'receipt.json').read_text())
    assert trace['status'] == 'completed'
    for run in trace['runs']:
        assert run['exit_code'] == 0 and run['exact_output_equal'] and not run['timed_out']
        stem = BASE / 'trace' / f'{run["model_index"]}-{run["repetition"]}-{run["condition"]}'
        assert sha(stem.with_suffix('.stdout')) == run['output_sha256']
        output['trace'].append({**run, 'syscalls': syscall_rows(stem.with_suffix('.summary'))})
    # The raw v1 and v2 runs already checked source preservation independently.
    # Check it again after the separate profiler process series.
    post = json.loads((BASE / 'post-source.json').read_text())
    assert post['status'] == 'passed' and post['native_linux_mtime_ns']
    current = post['sources']
    original = json.loads((BASE / 'runtime' / 'receipt.json').read_text())['sources']
    assert current == original
    output['source_preservation_after_trace'] = True
    output['source_files'] = len(current)
    output['source_bytes'] = post['source_bytes']
    output['identities'] = {p.relative_to(BASE).as_posix(): sha(p) for p in sorted(BASE.rglob('*'))
                            if p.is_file() and p.name not in ('analysis.json', 'analysis.stdout', 'analysis.stderr')
                            and '__pycache__' not in p.parts}
    (BASE / 'analysis.json').write_text(json.dumps(output, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'status': 'passed', 'source_files': len(current), 'source_bytes': output['source_bytes'],
                      'resource_processes': sum(m['process_count'] for r in output['resource'].values() for m in r['models']),
                      'resource_responses': sum(m['completed_request_count'] for r in output['resource'].values() for m in r['models']),
                      'trace_processes': len(output['trace']),
                      'tokens': {k: [m['tokens_reference'] for m in v['models']] for k, v in output['resource'].items()}}, indent=2))


if __name__ == '__main__':
    main()
