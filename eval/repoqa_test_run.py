"""Complete a prospectively frozen five-arm RepoQA held-out retrieval study."""
import argparse
import json
from pathlib import Path
import subprocess
import sys

from eval.artifacts import artifact_identity
from eval.contract import ContractError, canonical_hash, digest, load_dataset, paired_family_difference
from eval.repoqa_run import checked_preparation
from eval.selection import bind_selection, checked_bound_selection


METHODS = ('hybrid', 'bounded-rerank', 'lexical', 'bm25', 'rg')


def compare(output, families, selection):
    checked_bound_selection(selection)
    expected = {q.id for row in families for q in load_dataset(Path(row['manifest']), Path(row['root'])).queries}
    rows, summaries = {}, {}
    for method in METHODS:
        folder = output / method
        provenance = json.loads((folder / 'provenance.json').read_text(encoding='utf-8'))
        records = [json.loads(line) for line in (folder / 'records.jsonl').read_text(encoding='utf-8').splitlines()]
        if (provenance['status'] != 'passed' or provenance['config_sha256'] != canonical_hash(selection['recipes'][method])
                or provenance.get('selection_sha256') != canonical_hash(selection)
                or len(records) != len(expected) or {row['query_id'] for row in records} != expected
                or any(row['split'] != 'test' or row['evidence_failures'] for row in records)):
            raise ContractError('A partial, changed or invalid-evidence test arm cannot be aggregated')
        rows[method] = [{'query_id': row['query_id'], 'group': row['group'], **row['metrics']} for row in records]
        summaries[method] = {'summary': json.loads((folder / 'summary.json').read_text(encoding='utf-8')),
                             'condition': provenance['timing_condition'], 'model': provenance['model'],
                             'config_sha256': provenance['config_sha256'], 'binary_sha256': provenance['binary_sha256']}
    return {'status': 'passed', 'selection_sha256': canonical_hash(selection), 'families': len(families),
            'queries': len(expected), 'results': summaries,
            'paired_ndcg_hybrid_minus_baseline': {method: paired_family_difference(rows[method], rows['hybrid'], 'ndcg', seed=42)
                                                 for method in ['lexical', 'bm25', 'rg']},
            'condition': 'All prospectively reserved supplied-source descriptions; inherited generated labels and unknown pretraining overlap. Fresh CLI/JIT, fresh ranked rg with loaded source windows, prepared BM25 differ. One repetition is descriptive timing; not real-agent success, official syntax scoring or a commercial product comparison.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ['freeze', 'preparation', 'binary', 'model-path', 'output', 'receipts']:
        parser.add_argument('--' + name, type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists() or args.receipts.exists():
        parser.error('Use new output and receipt directories')
    freeze = json.loads(args.freeze.read_text(encoding='utf-8'))
    preparation = json.loads(args.preparation.read_text(encoding='utf-8'))
    selection = bind_selection(freeze, preparation, args.freeze, args.preparation)
    checked_bound_selection(selection)
    families = checked_preparation(preparation, selection)
    if (tuple(freeze['recipes']) != METHODS or digest(args.binary.read_bytes()) != freeze['binary_sha256']
            or artifact_identity(args.model_path)['fingerprint'] not in freeze['model_fingerprints']):
        parser.error('Methods, actual binary or model differ from the prospective freeze')
    args.receipts.mkdir(parents=True)
    selection_path = args.receipts / 'run-selection.json'
    selection_path.write_text(json.dumps(selection, indent=2) + '\n', encoding='utf-8')
    base = [sys.executable, '-m', 'eval.run']
    for row in families:
        base += ['--manifest', row['manifest'], '--root', row['root']]
    commands = []
    for method in METHODS:
        recipe = freeze['recipes'][method]
        argv = base + ['--backend', recipe['backend'], '--split', 'test', '--selection', str(selection_path),
                       '--repetitions', '1', '--limit', str(recipe['limit']), '--context', str(recipe['context']),
                       '--output-bytes', str(recipe['output_bytes']), '--cache', recipe['cache'],
                       '--output', str(args.output / method)]
        if recipe['backend'] == 'ixos':
            argv += ['--binary', str(args.binary), '--model-path', str(args.model_path),
                     '--retrieval', recipe['retrieval'], '--representation', recipe['representation'],
                     '--io-workers', str(recipe['io_workers'])]
            if recipe.get('evidence_policy'):
                argv += ['--evidence-policy', recipe['evidence_policy']]
        commands.append(argv)
        (args.receipts / 'commands.json').write_text(json.dumps(commands, indent=2) + '\n', encoding='utf-8')
        with (args.receipts / (method + '.stdout')).open('wb') as stdout, (args.receipts / (method + '.stderr')).open('wb') as stderr:
            result = subprocess.run(argv, stdout=stdout, stderr=stderr)
        print(method + ': exit ' + str(result.returncode), flush=True)
        if result.returncode:
            raise SystemExit(result.returncode)
    result = compare(args.output, families, selection)
    (args.receipts / 'comparison.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
