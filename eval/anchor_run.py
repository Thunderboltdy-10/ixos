"""Real-artifact, fixed-ranking development evidence A/B and bounded follow-ups.

The initial candidate rows come from a previously successful actual CLI run.
Only evidence locations change. Follow-ups use actual Ixos read/grep commands.
Shared bridge preparation is NOT end-to-end production latency. Gold is used
only to validate the corpus and score after each fixed schedule has completed.
"""
import argparse
import importlib.metadata
import json
from pathlib import Path
import platform
import statistics
import subprocess
import time

from eval.anchors import AnchorScreen, RECIPE, STYLES
from eval.artifacts import artifact_identity
from eval.bridge import EmbedBridge
from eval.contextbench_run import checked_tasks
from eval.contract import (ContractError, canonical_hash, cluster_mean_ci, digest,
                           load_dataset, paired_family_difference, score_query)
from eval.lexical import BM25, compact_response, view_at
from eval.provenance import snapshot
from eval.trajectory import POLICIES, Task, grep_request, read_requests, score_steps, search_request
from eval.trajectory_run import extract_views


def checked_reference(folder, preparation, datasets, model, binary):
    reference = json.loads((folder / 'provenance.json').read_text())
    identities = [{'id': d.id, 'fingerprint': d.fingerprint, 'sources': len(d.sources)} for d in datasets]
    if (reference.get('status') != 'passed' or reference.get('backend') != 'hybrid'
            or reference.get('datasets') != identities
            or reference.get('plan_sha256') != preparation['plan_sha256']
            or reference.get('dataset_sha256') != preparation['dataset_sha256']
            or reference.get('coordinate_policy') != preparation['coordinate_policy']
            or reference.get('model', {}).get('fingerprint') != model['fingerprint']
            or reference.get('binary_sha256') != digest(binary.read_bytes())):
        raise ContractError('Frozen initial search/model/source identity does not match the experiment')
    return reference


def modified_response(rows, screen, style, dataset, policy):
    rewritten = []
    for original in rows:
        row = dict(original)
        anchor = screen.choose(row['path'], style)
        row.update(view=view_at(dataset, row['path'], anchor, policy['context']),
                   evidence_omitted=False, _anchor=anchor)
        rewritten.append(row)
    return compact_response(rewritten, policy['response_bytes'])[0]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--preparation', type=Path, required=True)
    parser.add_argument('--reference', type=Path, required=True)
    parser.add_argument('--binary', type=Path, required=True)
    parser.add_argument('--bridge', type=Path, required=True)
    parser.add_argument('--model-path', type=Path, required=True)
    parser.add_argument('--policy', choices=list(POLICIES), default='top3-cue')
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--receipt', type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists() or args.receipt.exists():
        parser.error('Use fresh paths; previous receipts and raw outputs are immutable')
    policy = POLICIES[args.policy]
    preparation = json.loads(args.preparation.read_text())
    tasks = checked_tasks(preparation)
    datasets = [load_dataset(Path(task['manifest']), Path(task['root'])) for task in tasks]
    if any(len(d.queries) != 1 or d.queries[0].split != 'dev' or d.queries[0].sequence is not None for d in datasets):
        parser.error('Evidence screens accept independent DEVELOPMENT queries only')
    if [d.queries[0].id for d in datasets] != [t['instance_id'] for t in tasks]:
        parser.error('Preparation/query identities disagree')
    model = artifact_identity(args.model_path)
    reference = checked_reference(args.reference, preparation, datasets, model, args.binary)
    import tiktoken
    encoding = tiktoken.get_encoding('cl100k_base')
    def token_count(raw):
        return len(encoding.encode(raw.decode('utf-8'), disallowed_special=()))
    args.output.mkdir(parents=True)
    config = args.output / 'isolated-config.toml'
    config.write_text('[retrieval]\nsession="off"\n', encoding='utf-8')
    provenance = {'status': 'running', 'argv': vars(args) | {'recipe': RECIPE},
                  'recipe_sha256': canonical_hash(RECIPE), 'policy': policy,
                  'reference_provenance_sha256': digest((args.reference / 'provenance.json').read_bytes()),
                  'reference_binary_sha256': reference['binary_sha256'], 'model': model,
                  'bridge_binary_sha256': digest(args.bridge.read_bytes()),
                  'plan_sha256': preparation['plan_sha256'], 'dataset_sha256': preparation['dataset_sha256'],
                  'coordinate_policy': preparation['coordinate_policy'], 'datasets': reference['datasets'],
                  'platform': platform.platform(), 'source_snapshot': snapshot(args.output, args.bridge),
                  'tokenizer': {'name': 'cl100k_base', 'version': importlib.metadata.version('tiktoken')},
                  'condition': 'Frozen actual hybrid candidate order/scores; source-only evidence selection, shared real Rust bridge preparation, actual fresh Ixos read/grep follow-ups. Initial original diagnostics tokens charged equally as a frozen reference. Only follow-up tool wall time is reported; no production search latency claim.',
                  'limitations': 'Eight already-inspected development issues; upstream-compatible broad/mismatched source annotations. Fixed schedule, no LLM reasoning or success. No held-out/default promotion. Output fitting can change retained trailing candidates; file ranking metrics are rescored honestly.'}
    def write_provenance():
        (args.output / 'provenance.json').write_text(json.dumps(provenance, indent=2, default=str) + '\n')
    records, input_receipts, preparations = [], [], []
    write_provenance()
    try:
        with EmbedBridge(args.bridge, args.model_path, args.output) as bridge:
            provenance['bridge_ready'] = bridge.ready
            write_provenance()
            for task, dataset in zip(tasks, datasets):
                query, root = dataset.queries[0], Path(task['root'])
                reference_folder = args.reference / digest(query.id.encode())[:12]
                reference_record = json.loads((reference_folder / 'record.json').read_text())
                if (reference_record['query_id'] != query.id
                        or reference_record['steps'][0]['request'] != search_request(Task(query.id, query.text))):
                    raise ContractError('Frozen initial request is not the verbatim issue under the fixed contract')
                original = (reference_folder / '01.raw.stdout').read_bytes()
                stderr = (reference_folder / '01.raw.stderr').read_bytes()
                observation, original_views = extract_views(original, root, dataset)
                rows = observation['results']
                input_receipts.append({'query_id': query.id, 'stdout_sha256': digest(original),
                                       'stderr_sha256': digest(stderr), 'ranked_paths': [r['path'] for r in rows]})
                index = BM25(dataset)
                began = time.perf_counter()
                screen = AnchorScreen(dataset.sources, index.tf, query.text, [r['path'] for r in rows], bridge)
                preparations.append({'query_id': query.id, 'shared_screen_ms': (time.perf_counter()-began)*1000,
                                     'lexical_prepare_ms': index.prepare_ms, 'embedded_passages': screen.embedded_passages,
                                     'extra_passages_vs_stored': screen.extra_passages_vs_stored,
                                     'embedded_characters': screen.embedded_characters})
                # Control is byte-identical to the actual recorded CLI output,
                # not a floating-point reimplementation of its lexical anchor.
                for style in STYLES:
                    folder = args.output / style / digest(query.id.encode())[:12]
                    folder.mkdir(parents=True)
                    steps, actual_reads, known_eof = [], [], {}
                    def retain(request, raw, diagnostic, wall):
                        if len(steps) >= policy['max_calls'] or len(raw) > policy['response_bytes']:
                            raise ContractError('Evidence experiment exceeded its tool/output ceiling')
                        value, views = extract_views(raw, root, dataset)
                        prefix = folder / f'{len(steps)+1:02d}'
                        prefix.with_suffix('.raw.stdout').write_bytes(raw)
                        prefix.with_suffix('.raw.stderr').write_bytes(diagnostic)
                        wire = (json.dumps(request, separators=(',', ':'), ensure_ascii=False) + '\n').encode()
                        steps.append({'request': request, 'views': views, 'wall_ms': wall,
                                      'stdout_tokens': token_count(raw), 'stderr_tokens': token_count(diagnostic),
                                      'request_tokens': token_count(wire)})
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
                        began = time.perf_counter()
                        try:
                            result = subprocess.run(argv, capture_output=True, timeout=120)
                        except subprocess.TimeoutExpired as error:
                            (folder / 'failure.stdout').write_bytes(error.stdout or b'')
                            (folder / 'failure.stderr').write_bytes(error.stderr or b'')
                            raise ContractError('Actual evidence follow-up timed out') from error
                        wall = (time.perf_counter()-began)*1000
                        (folder / f'{len(steps)+1:02d}.command.json').write_text(json.dumps({'argv': argv, 'exit_code': result.returncode, 'wall_ms': wall}, indent=2))
                        if result.returncode:
                            (folder / 'failure.stdout').write_bytes(result.stdout)
                            (folder / 'failure.stderr').write_bytes(result.stderr)
                            raise ContractError('Actual evidence follow-up failed')
                        return retain(request, result.stdout, result.stderr, wall)
                    raw = original if style == 'global-line' else modified_response(rows, screen, style, dataset, policy)
                    observation, initial_views = retain(search_request(Task(query.id, query.text), policy), raw, stderr, 0)
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
                    scored = score_steps(query, steps, dataset)
                    record = {'query_id': query.id, 'group': query.group, 'style': style,
                              'initial': score_query(query, initial_views, dataset, paths=[r['path'] for r in json.loads(raw)['results']]),
                              **scored, 'calls': len(steps), 'steps': steps,
                              'stdout_tokens': sum(s['stdout_tokens'] for s in steps),
                              'stderr_tokens': sum(s['stderr_tokens'] for s in steps),
                              'request_tokens': sum(s['request_tokens'] for s in steps)}
                    (folder / 'record.json').write_text(json.dumps(record, indent=2) + '\n')
                    records.append(record)
                print(query.id + ': four evidence styles complete', flush=True)
        for task in tasks:
            load_dataset(Path(task['manifest']), Path(task['root']))
        if artifact_identity(args.model_path) != model:
            raise ContractError('Model changed during evidence screening')
        summaries, metrics = {}, {}
        for style in STYLES:
            selected = [r for r in records if r['style'] == style]
            if len(selected) != len(tasks):
                raise ContractError('Partial evidence experiment cannot be aggregated')
            metrics[style] = [{'query_id': r['query_id'], 'group': r['group'], **r['final']} for r in selected]
            summaries[style] = {'tasks': len(selected), 'families': len({r['group'] for r in selected}),
                'cumulative_span_recall': cluster_mean_ci(metrics[style], 'span_recall', seed=42),
                'cumulative_span_precision': cluster_mean_ci(metrics[style], 'span_precision', seed=42),
                'initial_span_recall': statistics.mean(r['initial']['span_recall'] for r in selected),
                'initial_ndcg': statistics.mean(r['initial']['ndcg'] for r in selected),
                'mean_stdout_tokens': statistics.mean(r['stdout_tokens'] for r in selected),
                'mean_stderr_tokens': statistics.mean(r['stderr_tokens'] for r in selected),
                'mean_request_tokens': statistics.mean(r['request_tokens'] for r in selected),
                'mean_calls': statistics.mean(r['calls'] for r in selected),
                'mean_followup_tool_wall_ms': statistics.mean(r['tool_wall_ms'] for r in selected),
                'tasks_with_any_annotated_overlap': sum(r['final']['annotated_lines_displayed'] > 0 for r in selected),
                'per_task': [{k: r[k] for k in ['query_id', 'group', 'initial', 'final', 'stdout_tokens', 'calls']} for r in selected]}
        result = {'status': 'passed', 'provenance': {k: v for k, v in provenance.items() if k != 'source_snapshot'},
                  'styles': summaries, 'inputs': input_receipts, 'shared_preparation': preparations,
                  'paired_cumulative_span_recall_minus_control': {
                      style: paired_family_difference(metrics['global-line'], metrics[style], 'span_recall', seed=42)
                      for style in STYLES[1:]}}
        result['provenance']['status'] = 'passed'
        args.receipt.parent.mkdir(parents=True, exist_ok=True)
        args.receipt.write_text(json.dumps(result, indent=2, default=str) + '\n')
        provenance.update(status='passed', completed_runs=len(records), inputs=input_receipts)
    except Exception as error:
        provenance.update(status='failed', failure=str(error), completed_runs=len(records))
        raise
    finally:
        write_provenance()


if __name__ == '__main__':
    main()
