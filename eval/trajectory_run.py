"""Development-only matched search/read/grep replay with a gold-blind policy.

Actual hybrid/lexical CLI, prepared BM25 or ranked rg supplies the first search.
Every arm uses the same Ixos read/grep primitives thereafter. This isolates the
first retrieval method; it does not compare complete autonomous agents/products.
"""
import argparse
import importlib.metadata
import json
from pathlib import Path
import platform
import statistics
import subprocess
import time

from eval.artifacts import artifact_identity
from eval.backends import decode_ixos, run_ixos
from eval.contextbench_run import checked_tasks
from eval.contract import (ContractError, canonical_hash, cluster_mean_ci, digest,
                           load_dataset, score_query, validate_view)
from eval.lexical import BM25, run_rg
from eval.provenance import snapshot
from eval.trajectory import (POLICIES, Task, grep_request, read_requests,
                             score_steps, search_request)


def extract_views(raw, root, dataset):
    value = json.loads(raw)
    if value.get('type') == 'error':
        raise ContractError('Tool returned an error')
    if 'results' in value:
        _, views, failures = decode_ixos(raw, root, dataset)
        if failures:
            raise ContractError('Invalid displayed trajectory evidence: ' + str(failures))
        return value, views
    if 'view' not in value:
        raise ContractError('Read produced no complete line view')
    view = value['view']
    validate_view(view, dataset)
    return value, [view]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--preparation', type=Path, required=True)
    parser.add_argument('--binary', type=Path, required=True)
    parser.add_argument('--model-path', type=Path, required=True)
    parser.add_argument('--backend', choices=['hybrid', 'lexical', 'bm25', 'rg'], required=True)
    parser.add_argument('--policy', choices=list(POLICIES), default='top3-cue')
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--receipt', type=Path, required=True)
    args = parser.parse_args()
    policy = POLICIES[args.policy]
    if args.output.exists() or args.receipt.exists():
        parser.error('Use new output/receipt paths; earlier evidence is immutable')
    preparation = json.loads(args.preparation.read_text())
    tasks = checked_tasks(preparation)
    # Loading labels validates sources; the policy only receives Task(id, text)
    # and tool JSON. Scoring occurs after all follow-ups have finished.
    datasets = [load_dataset(Path(task['manifest']), Path(task['root'])) for task in tasks]
    if any(len(d.queries) != 1 or d.queries[0].split != 'dev' or d.queries[0].sequence is not None for d in datasets):
        parser.error('This pilot accepts one independent DEVELOPMENT query per task')
    if [d.queries[0].id for d in datasets] != [t['instance_id'] for t in tasks]:
        parser.error('Preparation and query identities disagree')
    import tiktoken
    encoding = tiktoken.get_encoding('cl100k_base')
    def tokens(raw):
        return len(encoding.encode(raw.decode('utf-8'), disallowed_special=()))
    args.output.mkdir(parents=True)
    config = args.output / 'isolated-config.toml'
    config.write_text('[retrieval]\nsession="off"\n', encoding='utf-8')
    identity = artifact_identity(args.model_path) if args.backend == 'hybrid' else None
    provenance = {'status': 'running', 'backend': args.backend, 'policy': policy,
                  'policy_sha256': canonical_hash(policy), 'platform': platform.platform(),
                  'binary_sha256': digest(args.binary.read_bytes()), 'model': identity,
                  'plan_sha256': preparation['plan_sha256'], 'dataset_sha256': preparation['dataset_sha256'],
                  'coordinate_policy': preparation['coordinate_policy'],
                  'datasets': [{'id': d.id, 'fingerprint': d.fingerprint, 'sources': len(d.sources)} for d in datasets],
                  'tokenizer': {'name': 'cl100k_base', 'version': importlib.metadata.version('tiktoken')},
                  'source_snapshot': snapshot(args.output, args.binary),
                  'condition': 'Fresh CLI calls, hybrid JIT, session off. BM25 initial search is prepared memory; rg initial search uses fresh rg plus loaded-source windows. All follow-up read/grep calls use the same fresh model-free Ixos CLI.',
                  'limitations': 'Inspected eight-task development pilot, deterministic schedule, upstream-compatible line annotations. Not held-out, real LLM reasoning, symbol/byte ContextBench leaderboard, coding success or product superiority. Request tokens use canonical tool JSON, not a vendor wrapper. Preparation/read indexing costs and controller overhead reported separately/excluded from tool timing.'}
    records = []
    def write_provenance():
        (args.output / 'provenance.json').write_text(json.dumps(provenance, indent=2) + '\n')
    write_provenance()
    try:
        for task, dataset in zip(tasks, datasets):
            root = Path(task['root'])
            query = dataset.queries[0]
            visible_task = Task(query.id, query.text)
            folder = args.output / digest(query.id.encode())[:12]
            folder.mkdir()
            steps, actual_reads, known_eof = [], [], {}
            def capture(argv, code, stdout, stderr, wall):
                prefix = folder / f'{len(steps)+1:02d}'
                prefix.with_suffix('.raw.stdout').write_bytes(stdout)
                prefix.with_suffix('.raw.stderr').write_bytes(stderr)
                prefix.with_suffix('.command.json').write_text(json.dumps({'argv': argv, 'exit_code': code, 'wall_ms': wall}, indent=2))
            def retain(request, stdout, stderr, wall):
                if len(steps) >= policy['max_calls'] or len(stdout) > policy['response_bytes']:
                    raise ContractError('Trajectory call/output ceiling violated')
                observation, views = extract_views(stdout, root, dataset)
                wire = (json.dumps(request, separators=(',', ':'), ensure_ascii=False) + '\n').encode()
                steps.append({'request': request, 'views': views, 'wall_ms': wall,
                              'stdout_tokens': tokens(stdout), 'stderr_tokens': tokens(stderr),
                              'request_tokens': tokens(wire), 'stdout_bytes': len(stdout),
                              'stderr_bytes': len(stderr)})
                return observation, views
            def call(request):
                argv = [str(args.binary.resolve()), '--config', str(config.resolve()), request['op']]
                if request['op'] == 'read':
                    argv += ['--start', str(request['start']), '--lines', str(request['lines'])]
                    positional = request['path']
                else:
                    argv += ['-F', '--context', str(request['context']), '--limit', str(request['limit'])]
                    positional = request['pattern']
                argv += ['--dir', str(root.resolve()), '--max-output-bytes', str(request['output_bytes'])]
                argv += ['--', positional]
                began = time.perf_counter()
                try:
                    raw = subprocess.run(argv, capture_output=True, timeout=120)
                except subprocess.TimeoutExpired as error:
                    capture(argv, None, error.stdout or b'', error.stderr or b'', (time.perf_counter()-began)*1000)
                    raise ContractError('Trajectory tool timed out; raw failure retained') from error
                wall = (time.perf_counter()-began)*1000
                capture(argv, raw.returncode, raw.stdout, raw.stderr, wall)
                if raw.returncode:
                    raise ContractError('Trajectory tool failed; raw failure retained')
                return retain(request, raw.stdout, raw.stderr, wall)
            request = search_request(visible_task, policy)
            prepare_ms = 0.0
            if args.backend in {'hybrid', 'lexical'}:
                extras = ['--retrieval', args.backend, '--representation', 'intro-uniform', '--io-workers', '4']
                if identity:
                    extras += ['--model-path', str(args.model_path.resolve())]
                response = run_ixos(args.binary, config, root, dataset, query.text,
                                    limit=policy['search_limit'], context=policy['context'],
                                    output_bytes=policy['response_bytes'], extra_args=extras, capture=capture)
                if identity and response.diagnostics['diagnostics']['modelFingerprint'] != identity['fingerprint']:
                    raise ContractError('Loaded model differs from the pinned identity')
            elif args.backend == 'bm25':
                index = BM25(dataset)
                prepare_ms = index.prepare_ms
                response = index.search(query.text, limit=policy['search_limit'], context=policy['context'], output_bytes=policy['response_bytes'])
                capture(response.argv, response.exit_code, response.raw_stdout, response.raw_stderr, response.wall_ms)
            else:
                response = run_rg('rg', root, dataset, query.text, limit=policy['search_limit'], context=policy['context'], output_bytes=policy['response_bytes'], capture=capture)
            observation, _ = retain(request, response.raw_stdout, response.raw_stderr, response.wall_ms)
            for read in read_requests(observation, policy['search_reads'], policy=policy):
                read_result, views = call(read)
                actual_reads.extend(views)
                known_eof[read['path']] = read_result['total_lines']
            grep = grep_request(visible_task, policy)
            if grep:
                observation, _ = call(grep)
                for read in read_requests(observation, policy['grep_reads'], actual_reads, known_eof, policy):
                    _, views = call(read)
                    actual_reads.extend(views)
            scored = score_steps(query, steps, dataset)
            initial = score_query(query, response.views, dataset, k=10, paths=response.paths)
            record = {'query_id': query.id, 'group': query.group, 'initial': initial,
                      **scored, 'calls': len(steps), 'steps': steps, 'prepare_ms': prepare_ms,
                      'request_tokens': sum(s['request_tokens'] for s in steps),
                      'stdout_tokens': sum(s['stdout_tokens'] for s in steps),
                      'stderr_tokens': sum(s['stderr_tokens'] for s in steps),
                      'stdout_bytes': sum(s['stdout_bytes'] for s in steps)}
            (folder / 'record.json').write_text(json.dumps(record, indent=2) + '\n')
            records.append(record)
            print(query.id + ': ' + str(len(steps)) + ' calls', flush=True)
        for task in tasks:
            load_dataset(Path(task['manifest']), Path(task['root']))
        if identity and artifact_identity(args.model_path) != identity:
            raise ContractError('Model changed during the pilot')
        rows = [{'query_id': r['query_id'], 'group': r['group'], **r['final']} for r in records]
        summary = {'backend': args.backend, 'tasks': len(records), 'families': len({r['group'] for r in records}),
                   'cumulative_span_recall': cluster_mean_ci(rows, 'span_recall', seed=42),
                   'cumulative_span_precision': cluster_mean_ci(rows, 'span_precision', seed=42),
                   'initial_span_recall_mean': statistics.mean(r['initial']['span_recall'] for r in records),
                   'mean_calls': statistics.mean(r['calls'] for r in records),
                   'mean_stdout_tokens': statistics.mean(r['stdout_tokens'] for r in records),
                   'mean_stderr_tokens': statistics.mean(r['stderr_tokens'] for r in records),
                   'mean_request_tokens': statistics.mean(r['request_tokens'] for r in records),
                   'mean_tool_wall_ms': statistics.mean(r['tool_wall_ms'] for r in records),
                   'mean_prepare_ms': statistics.mean(r['prepare_ms'] for r in records),
                   'tasks_with_any_annotated_overlap': sum(r['first_annotated_overlap_call'] is not None for r in records),
                   'per_task': [{key: r[key] for key in ['query_id', 'group', 'initial', 'final', 'calls', 'tool_wall_ms', 'first_annotated_overlap_call', 'tool_ms_to_first_annotated_overlap', 'stdout_tokens', 'stderr_tokens', 'request_tokens']} for r in records],
                   'provenance': {k: v for k, v in provenance.items() if k != 'source_snapshot'}}
        provenance.update(status='passed', completed_tasks=len(records))
        summary['provenance']['status'] = 'passed'
        args.receipt.parent.mkdir(parents=True, exist_ok=True)
        args.receipt.write_text(json.dumps(summary, indent=2) + '\n')
    except Exception as error:
        provenance.update(status='failed', failure=str(error), completed_tasks=len(records))
        raise
    finally:
        write_provenance()


if __name__ == '__main__':
    main()
