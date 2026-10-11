"""Sequential development comparisons after all selected context tasks validate.

The code recipe is the existing Gate 3 selection. This wrapper never tunes it or
reads solution patches, and refuses partial preparation or partial comparisons.
"""
import argparse
import json
from pathlib import Path
import subprocess
import sys

from eval.contract import ContractError, paired_family_difference


def checked_tasks(receipt):
    tasks = receipt.get('tasks', [])
    if receipt.get('status') != 'passed' or len(tasks) != receipt.get('planned_tasks') or not tasks:
        raise ContractError('Every preselected task must validate before comparing retrieval')
    ids = [task['instance_id'] for task in tasks]
    if len(set(ids)) != len(ids) or any(task.get('status') != 'passed' for task in tasks):
        raise ContractError('Partial/duplicate task preparation cannot be scored')
    return tasks


def compare(output_root, tasks):
    results, rows = {}, {}
    expected = {task['instance_id'] for task in tasks}
    for backend in ['ixos', 'bm25', 'rg']:
        folder = output_root / backend
        provenance = json.loads((folder / 'provenance.json').read_text())
        records = [json.loads(line) for line in (folder / 'records.jsonl').read_text().splitlines()]
        if provenance['status'] != 'passed' or {row['query_id'] for row in records} != expected or len(records) != len(expected):
            raise ContractError('Comparison must include one successful run of every selected task')
        if any(row['evidence_failures'] for row in records):
            raise ContractError('Invalid displayed evidence cannot enter the comparison')
        results[backend] = {'summary': json.loads((folder / 'summary.json').read_text()),
                            'timing_condition': provenance['timing_condition'],
                            'binary_sha256': provenance['binary_sha256'],
                            'model': provenance['model'], 'source_snapshot': provenance['source_snapshot'],
                            'per_task': [{'query_id': row['query_id'], 'repository': row['group'],
                                          'metrics': row['metrics'], 'stdout_tokens': row['stdout_tokens'],
                                          'stderr_tokens': row['stderr_tokens'], 'wall_ms': row['wall_ms']}
                                         for row in records]}
        rows[backend] = [{'query_id': row['query_id'], 'group': row['group'], **row['metrics']} for row in records]
    return {'results': results,
            'paired_ndcg_hybrid_minus_baseline': {backend: paired_family_difference(rows[backend], rows['ixos'], 'ndcg', seed=42)
                                                  for backend in ['bm25', 'rg']},
            'condition': f"{len(tasks)} inspected development issues / {len({task['repository'] for task in tasks})} repositories / {len({task['language'] for task in tasks})} languages, one query and repetition each. Verbatim issue text; base-source ranges with the declared coordinate policy/content audits. Restricted text inventory, line metrics and fresh/prepared timing differences. Not official ContextBench byte/symbol/trajectory scores, held-out generalization, product superiority or agent task success."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--preparation', type=Path, required=True)
    parser.add_argument('--model-path', type=Path, required=True)
    parser.add_argument('--binary', type=Path, required=True)
    parser.add_argument('--output-root', type=Path, required=True)
    parser.add_argument('--receipts', type=Path, required=True)
    args = parser.parse_args()
    preparation = json.loads(args.preparation.read_text())
    tasks = checked_tasks(preparation)
    if args.output_root.exists() or args.receipts.exists():
        parser.error('Use fresh output/receipt folders; never overwrite earlier comparisons')
    args.receipts.mkdir(parents=True)
    base = [sys.executable, '-m', 'eval.run']
    for task in tasks:
        base += ['--manifest', task['manifest'], '--root', task['root']]
    commands = []
    for backend in ['ixos', 'bm25', 'rg']:
        argv = base + ['--backend', backend, '--split', 'dev', '--repetitions', '1',
                      '--limit', '10', '--context', '2', '--output-bytes', '6000',
                      '--output', str(args.output_root / backend)]
        if backend == 'ixos':
            argv += ['--binary', str(args.binary), '--retrieval', 'hybrid', '--representation', 'intro-uniform',
                     '--model-path', str(args.model_path), '--io-workers', '4', '--cache', 'jit']
        commands.append(argv)
        (args.receipts / 'commands.json').write_text(json.dumps(commands, indent=2) + '\n')
        with (args.receipts / (backend + '.stdout')).open('wb') as stdout, (args.receipts / (backend + '.stderr')).open('wb') as stderr:
            completed = subprocess.run(argv, stdout=stdout, stderr=stderr)
        print(backend + ': exit ' + str(completed.returncode), flush=True)
        if completed.returncode:
            raise SystemExit(completed.returncode)
    result = compare(args.output_root, tasks)
    result.update(preparation=str(args.preparation), output_root=str(args.output_root),
                  coordinate_policy=preparation['coordinate_policy'],
                  plan_sha256=preparation['plan_sha256'], dataset_sha256=preparation['dataset_sha256'])
    (args.receipts / 'comparison.json').write_text(json.dumps(result, indent=2) + '\n')


if __name__ == '__main__':
    main()
