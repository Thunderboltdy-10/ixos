"""Complete sequential development/validation baselines on prepared RepoQA.

This is Ixos file/line retrieval, not RepoQA's generated-function leaderboard.
All selected families/queries must complete before an aggregate is produced.
"""
import argparse
import json
from pathlib import Path
import subprocess
import sys

from eval.contract import ContractError, load_dataset, paired_family_difference


BACKENDS = {'hybrid': 'ixos', 'lexical': 'ixos', 'bm25': 'bm25', 'rg': 'rg'}


def checked_preparation(receipt):
    families = receipt.get('families', [])
    if (receipt.get('status') != 'passed' or receipt.get('split') not in {'dev', 'validation'}
            or len(families) != receipt.get('planned_families') or not families
            or any(row.get('status') != 'passed' or row.get('queries') != 10 for row in families)
            or len({row['repository'] for row in families}) != len(families)):
        raise ContractError('Every metadata-selected dev/validation family and target must validate')
    for row in families:
        dataset = load_dataset(Path(row['manifest']), Path(row['root']))
        if (dataset.fingerprint != row['fingerprint'] or len(dataset.queries) != 10
                or any(q.group != row['repository'] or q.split != receipt['split'] for q in dataset.queries)):
            raise ContractError('Prepared family/source/query identities changed')
    return families


def compare(output, families):
    expected = {q.id for row in families for q in load_dataset(Path(row['manifest']), Path(row['root'])).queries}
    rows, result = {}, {}
    for backend in BACKENDS:
        folder = output / backend
        provenance = json.loads((folder / 'provenance.json').read_text(encoding='utf-8'))
        records = [json.loads(line) for line in (folder / 'records.jsonl').read_text(encoding='utf-8').splitlines()]
        if (provenance['status'] != 'passed' or len(records) != len(expected)
                or {row['query_id'] for row in records} != expected
                or any(row['evidence_failures'] for row in records)):
            raise ContractError('A partial or invalid-evidence baseline cannot enter the comparison')
        rows[backend] = [{'query_id': row['query_id'], 'group': row['group'], **row['metrics']} for row in records]
        result[backend] = {'summary': json.loads((folder / 'summary.json').read_text(encoding='utf-8')),
                           'condition': provenance['timing_condition'],
                           'model': provenance['model'], 'binary_sha256': provenance['binary_sha256']}
    return {'status': 'passed', 'results': result,
            'paired_ndcg_hybrid_minus_baseline': {name: paired_family_difference(rows[name], rows['hybrid'], 'ndcg', seed=42)
                                                 for name in BACKENDS if name != 'hybrid'},
            'condition': 'Prepared supplied-source function descriptions; every selected needle kept. Line/rank metrics; generated labels and unknown pretraining overlap. Fresh CLI/JIT, fresh rg plus loaded windows, prepared BM25 differ. One repetition is not stable latency. Not official RepoQA syntax scoring, real agent success or product superiority.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--preparation', type=Path, required=True)
    parser.add_argument('--binary', type=Path, required=True)
    parser.add_argument('--model-path', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--receipts', type=Path, required=True)
    parser.add_argument('--aggregate-only', action='store_true', help='Validate/aggregate existing successful raw runs into a new receipt folder without rerunning numerical work')
    args = parser.parse_args()
    preparation = json.loads(args.preparation.read_text(encoding='utf-8'))
    families = checked_preparation(preparation)
    if (args.output.exists() != args.aggregate_only) or args.receipts.exists():
        parser.error('Use new baseline/receipt folders; prior outputs remain immutable')
    args.receipts.mkdir(parents=True)
    if args.aggregate_only:
        result = compare(args.output, families)
        result.update(plan_sha256=preparation['plan_sha256'], preparation=str(args.preparation),
                      output=str(args.output), families=len(families), queries=preparation['queries'],
                      aggregate_only=True, command=sys.argv)
        (args.receipts / 'comparison.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
        return
    base = [sys.executable, '-m', 'eval.run']
    for row in families:
        base += ['--manifest', row['manifest'], '--root', row['root']]
    commands = []
    for name, backend in BACKENDS.items():
        argv = base + ['--backend', backend, '--split', preparation['split'], '--repetitions', '1',
                       '--limit', '10', '--context', '2', '--output-bytes', '6000', '--cache', 'jit',
                       '--output', str(args.output / name)]
        if backend == 'ixos':
            argv += ['--binary', str(args.binary), '--retrieval', name, '--representation', 'intro-uniform',
                     '--model-path', str(args.model_path), '--io-workers', '4']
        commands.append(argv)
        (args.receipts / 'commands.json').write_text(json.dumps(commands, indent=2) + '\n')
        with (args.receipts / (name + '.stdout')).open('wb') as stdout, (args.receipts / (name + '.stderr')).open('wb') as stderr:
            completed = subprocess.run(argv, stdout=stdout, stderr=stderr)
        print(name + ': exit ' + str(completed.returncode), flush=True)
        if completed.returncode:
            raise SystemExit(completed.returncode)
    result = compare(args.output, families)
    result.update(plan_sha256=preparation['plan_sha256'], preparation=str(args.preparation),
                  output=str(args.output), families=len(families), queries=preparation['queries'])
    (args.receipts / 'comparison.json').write_text(json.dumps(result, indent=2) + '\n')


if __name__ == '__main__':
    main()
