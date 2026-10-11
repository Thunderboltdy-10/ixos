"""Replay the same gold-blind follow-ups from two actual Rust search policies.

Unlike anchor_run, initial views, diagnostics and search costs are actual CLI
receipts. This is a fixed retrieval schedule, not autonomous agent success.
"""
import argparse
import json
from pathlib import Path
import statistics
import subprocess
import time

from eval.anchor_run import checked_reference, frozen_input
from eval.artifacts import artifact_identity
from eval.contract import ContractError, canonical_hash, cluster_mean_ci, digest, load_dataset, paired_family_difference, score_query
from eval.provenance import snapshot
from eval.repoqa_run import checked_preparation
from eval.trajectory import POLICIES, Task, grep_request, read_requests, score_steps, search_request
from eval.trajectory_run import extract_views


def checked_pair(control, candidate):
    if candidate.get('status') != 'passed' or candidate['binary_sha256'] != control['binary_sha256'] or candidate['datasets'] != control['datasets']:
        raise ContractError('Actual policy runs must share complete sources and the same binary')
    configuration = dict(candidate['config'])
    if configuration.pop('evidence_policy', None) != 'bounded-rerank' or configuration != control['config']:
        raise ContractError('Only the explicit evidence policy may differ')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ['preparation', 'control', 'candidate', 'binary', 'model-path', 'output', 'receipt']:
        parser.add_argument('--' + name, type=Path, required=True)
    parser.add_argument('--policy', choices=list(POLICIES), default='top3-cue')
    parser.add_argument('--selection', type=Path, help='Bound prospective selection required for held-out replay')
    args = parser.parse_args()
    if args.output.exists() or args.receipt.exists():
        parser.error('Use new output and receipt paths')
    preparation = json.loads(args.preparation.read_text(encoding='utf-8'))
    selection = json.loads(args.selection.read_text(encoding='utf-8')) if args.selection else None
    families = checked_preparation(preparation, selection)
    datasets = [load_dataset(Path(row['manifest']), Path(row['root'])) for row in families]
    model = artifact_identity(args.model_path)
    control = checked_reference(args.control, preparation, datasets, model, args.binary)
    candidate = json.loads((args.candidate / 'provenance.json').read_text(encoding='utf-8'))
    checked_pair(control, candidate)
    import tiktoken
    encoding = tiktoken.get_encoding('cl100k_base')
    def tokens(raw):
        return len(encoding.encode(raw.decode('utf-8'), disallowed_special=()))
    args.output.mkdir(parents=True)
    config = args.output / 'isolated-config.toml'
    config.write_text('[retrieval]\nsession="off"\n', encoding='utf-8')
    policy = POLICIES[args.policy]
    if selection:
        if (canonical_hash(policy) != selection.get('trajectory_policy_sha256')
                or control['config_sha256'] != canonical_hash(selection['recipes']['hybrid'])
                or candidate['config_sha256'] != canonical_hash(selection['recipes']['bounded-rerank'])):
            raise ContractError('Test evidence replay differs from the frozen methods/policy')
    provenance = {'status': 'running', 'binary_sha256': control['binary_sha256'], 'model': model,
                  'plan_sha256': preparation['plan_sha256'], 'policy': policy,
                  'control_provenance_sha256': digest((args.control / 'provenance.json').read_bytes()),
                  'candidate_provenance_sha256': digest((args.candidate / 'provenance.json').read_bytes()),
                  'source_snapshot': snapshot(args.output, args.binary),
                  'condition': 'Recorded actual fresh CLI/JIT searches plus actual fresh model-free read/grep calls; diagnostic stderr and canonical request tokens counted. One search repetition is descriptive timing, not a stable latency estimate. No lab-vector reimplementation.',
                  'limitations': 'Complete dev/validation supplied-source RepoQA families, inherited generated labels and unknown pretraining overlap. Gold-blind fixed schedule; no autonomous reasoning, official syntax score or product superiority.'}
    if selection:
        provenance.update(selection_sha256=canonical_hash(selection), split='test',
                          limitations='Frozen prospective repository families/recipes; inherited generated labels and unknown pretraining overlap. Gold-blind fixed schedule, no autonomous reasoning or official syntax score/product comparison.')
    def write_state():
        (args.output / 'provenance.json').write_text(json.dumps(provenance, indent=2) + '\n', encoding='utf-8')
    records = []
    write_state()
    try:
        for family, dataset in zip(families, datasets):
            root = Path(family['root'])
            for query in dataset.queries:
                for style, reference in [('global-line', args.control), ('bounded-rerank', args.candidate)]:
                    folder = args.output / style / digest(query.id.encode())[:12]
                    folder.mkdir(parents=True)
                    steps, actual_reads, known_eof = [], [], {}
                    def retain(request, raw, diagnostic, wall):
                        if len(steps) >= policy['max_calls'] or len(raw) > policy['response_bytes']:
                            raise ContractError('Actual evidence replay exceeded its tool/output ceiling')
                        value, views = extract_views(raw, root, dataset)
                        prefix = folder / f'{len(steps)+1:02d}'
                        prefix.with_suffix('.raw.stdout').write_bytes(raw)
                        prefix.with_suffix('.raw.stderr').write_bytes(diagnostic)
                        wire = (json.dumps(request, separators=(',', ':'), ensure_ascii=False) + '\n').encode()
                        steps.append({'request': request, 'views': views, 'wall_ms': wall,
                                      'stdout_tokens': tokens(raw), 'stderr_tokens': tokens(diagnostic),
                                      'request_tokens': tokens(wire)})
                        return value, views
                    def call(request):
                        argv = [str(args.binary.resolve()), '--config', str(config.resolve()), request['op']]
                        if request['op'] == 'read':
                            argv += ['--start', str(request['start']), '--lines', str(request['lines'])]
                            positional = request['path']
                        else:
                            argv += ['-F', '--context', str(request['context']), '--limit', str(request['limit'])]
                            positional = request['pattern']
                        argv += ['--dir', str(root.resolve()), '--max-output-bytes', str(request['output_bytes']), '--', positional]
                        begin = time.perf_counter()
                        result = subprocess.run(argv, capture_output=True, timeout=120)
                        wall = (time.perf_counter() - begin) * 1000
                        (folder / f'{len(steps)+1:02d}.command.json').write_text(json.dumps({'argv': argv, 'exit_code': result.returncode, 'wall_ms': wall}, indent=2), encoding='utf-8')
                        if result.returncode:
                            (folder / 'failure.stdout').write_bytes(result.stdout)
                            (folder / 'failure.stderr').write_bytes(result.stderr)
                            raise ContractError('Actual follow-up failed')
                        return retain(request, result.stdout, result.stderr, wall)
                    raw, stderr = frozen_input(reference, query, preparation)
                    command = json.loads((reference / (digest(query.id.encode())[:12] + '-0.command.json')).read_text(encoding='utf-8'))
                    request = search_request(Task(query.id, query.text), policy)
                    request['evidence_policy'] = style
                    observation, initial_views = retain(request, raw, stderr, command['wall_ms'])
                    initial = score_query(query, initial_views, dataset, paths=[row['path'] for row in observation['results']])
                    for read in read_requests(observation, policy['search_reads'], policy=policy):
                        value, views = call(read)
                        actual_reads.extend(views)
                        known_eof[read['path']] = value['total_lines']
                    grep = grep_request(Task(query.id, query.text), policy)
                    if grep:
                        observation, _ = call(grep)
                        for read in read_requests(observation, policy['grep_reads'], actual_reads, known_eof, policy):
                            _, views = call(read)
                            actual_reads.extend(views)
                    record = {'query_id': query.id, 'group': query.group, 'style': style, 'initial': initial,
                              **score_steps(query, steps, dataset), 'calls': len(steps), 'steps': steps,
                              **{name: sum(step[name] for step in steps) for name in ['stdout_tokens', 'stderr_tokens', 'request_tokens']}}
                    (folder / 'record.json').write_text(json.dumps(record, indent=2) + '\n', encoding='utf-8')
                    records.append(record)
                print(query.id + ': actual policy pair complete', flush=True)
        for family in families:
            load_dataset(Path(family['manifest']), Path(family['root']))
        if artifact_identity(args.model_path) != model or digest(args.binary.read_bytes()) != control['binary_sha256']:
            raise ContractError('Runtime/model identity changed')
        summaries, metrics = {}, {}
        for style in ['global-line', 'bounded-rerank']:
            selected = [row for row in records if row['style'] == style]
            if len(selected) != preparation['queries']:
                raise ContractError('A partial policy replay cannot be aggregated')
            metrics[style] = [{'query_id': r['query_id'], 'group': r['group'], **r['final']} for r in selected]
            summaries[style] = {'tasks': len(selected), 'families': len(families),
                'cumulative_span_recall': cluster_mean_ci(metrics[style], 'span_recall', seed=42),
                'cumulative_span_precision': cluster_mean_ci(metrics[style], 'span_precision', seed=42),
                'initial_span_recall': statistics.mean(r['initial']['span_recall'] for r in selected),
                'initial_ndcg': statistics.mean(r['initial']['ndcg'] for r in selected),
                'tasks_with_any_annotated_overlap': sum(r['final']['annotated_lines_displayed'] > 0 for r in selected),
                **{'mean_' + name: statistics.mean(r[name] for r in selected) for name in ['calls', 'stdout_tokens', 'stderr_tokens', 'request_tokens', 'tool_wall_ms']},
                'per_task': [{key: r[key] for key in ['query_id', 'group', 'initial', 'final', 'calls', 'stdout_tokens', 'stderr_tokens']} for r in selected]}
        provenance.update(status='passed', completed_runs=len(records))
        result = {'status': 'passed', 'provenance': {k: v for k, v in provenance.items() if k != 'source_snapshot'},
                  'styles': summaries, 'paired_cumulative_span_recall': paired_family_difference(metrics['global-line'], metrics['bounded-rerank'], 'span_recall', seed=42)}
        args.receipt.parent.mkdir(parents=True, exist_ok=True)
        args.receipt.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    except Exception as error:
        provenance.update(status='failed', failure=str(error), completed_runs=len(records))
        raise
    finally:
        write_state()


if __name__ == '__main__':
    main()
