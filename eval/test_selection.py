import copy
import json
from pathlib import Path
import tempfile
import unittest

from eval.contract import ContractError, canonical_hash
from eval.repoqa_run import checked_preparation
from eval.selection import SUITE, bind_selection, checked_bound_selection, harness_hash
from eval.repoqa_test_run import METHODS, compare


class SelectionBindingTests(unittest.TestCase):
    def fixture(self):
        recipe = {'backend': 'ixos', 'limit': 10}
        freeze = {'suite': SUITE, 'plan_sha256': 'plan', 'recipes': {'hybrid': recipe},
                  'config_hashes': [canonical_hash(recipe)], 'harness_sha256': harness_hash(),
                  'test_families': 1, 'test_queries': 10}
        preparation = {'status': 'passed', 'split': 'test', 'plan_sha256': 'plan',
                       'selection_sha256': canonical_hash(freeze), 'planned_families': 1, 'queries': 10,
                       'families': [{'repository': 'fixture/repo', 'status': 'passed', 'queries': 10, 'fingerprint': 'source'}]}
        return freeze, preparation

    def test_binding_adds_source_identities_without_changing_recipes(self):
        freeze, preparation = self.fixture()
        with tempfile.TemporaryDirectory() as temporary:
            folder = Path(temporary)
            freeze_path, preparation_path = folder / 'freeze.json', folder / 'preparation.json'
            freeze_path.write_text(json.dumps(freeze), encoding='utf-8')
            preparation_path.write_text(json.dumps(preparation), encoding='utf-8')
            bound = bind_selection(freeze, preparation, freeze_path, preparation_path)
            checked_bound_selection(bound)
            self.assertEqual(bound['recipes'], freeze['recipes'])
            self.assertEqual(bound['dataset_hashes'], ['source'])
            for key, value in [('dataset_hashes', ['other']), ('test_queries', 9), ('harness_sha256', 'changed')]:
                altered = copy.deepcopy(bound)
                altered[key] = value
                with self.assertRaises(ContractError):
                    checked_bound_selection(altered)
            altered = copy.deepcopy(freeze)
            altered['recipes']['hybrid']['limit'] = 9
            freeze_path.write_text(json.dumps(altered), encoding='utf-8')
            with self.assertRaises(ContractError):
                checked_bound_selection(bound)

    def test_no_partial_or_reassigned_test_preparation(self):
        freeze, preparation = self.fixture()
        for key, value in [('status', 'running'), ('plan_sha256', 'other'), ('queries', 9),
                           ('selection_sha256', 'other'), ('families', [])]:
            altered = copy.deepcopy(preparation)
            altered[key] = value
            with self.assertRaises(ContractError):
                bind_selection(freeze, altered, 'freeze.json', 'preparation.json')
        with self.assertRaisesRegex(ContractError, 'frozen bound'):
            checked_preparation(preparation)

    def test_test_aggregate_requires_every_arm_and_identity(self):
        from eval.contract import digest, load_dataset
        with tempfile.TemporaryDirectory() as temporary:
            folder = Path(temporary)
            root = folder / 'corpus'
            root.mkdir()
            source = 'fn Ā() {}\n'.encode()
            (root / 'code.rs').write_bytes(source)
            manifest = {'schema': 1, 'id': 'fixture',
                'provenance': {key: 'fixture' for key in ['origin', 'revision', 'label_method', 'license', 'limitations']},
                'sources': [{'path': 'code.rs', 'sha256': digest(source)}],
                'queries': [{'id': str(i), 'text': 'function Ā ' + str(i), 'group': 'fixture/repo', 'split': 'test',
                             'workload': 'code-agent', 'kind': 'fixture', 'answerability': 'answerable',
                             'gold': [{'path': 'code.rs', 'grade': 2, 'spans': [[1, 1]]}]} for i in range(10)]}
            manifest_path = folder / 'manifest.json'
            manifest_path.write_text(json.dumps(manifest), encoding='utf-8')
            dataset = load_dataset(manifest_path, root)
            recipes = {name: {'backend': name, 'limit': 10} for name in METHODS}
            freeze = {'suite': SUITE, 'plan_sha256': 'plan', 'recipes': recipes,
                      'config_hashes': [canonical_hash(row) for row in recipes.values()],
                      'harness_sha256': harness_hash(), 'test_families': 1, 'test_queries': 10}
            family = {'repository': 'fixture/repo', 'status': 'passed', 'queries': 10,
                      'fingerprint': dataset.fingerprint, 'manifest': str(manifest_path), 'root': str(root)}
            preparation = {'status': 'passed', 'split': 'test', 'plan_sha256': 'plan',
                           'selection_sha256': canonical_hash(freeze), 'planned_families': 1, 'queries': 10,
                           'families': [family]}
            freeze_path, preparation_path = folder / 'freeze.json', folder / 'preparation.json'
            freeze_path.write_text(json.dumps(freeze), encoding='utf-8')
            preparation_path.write_text(json.dumps(preparation), encoding='utf-8')
            bound = bind_selection(freeze, preparation, freeze_path, preparation_path)
            output = folder / 'output'
            for method in METHODS:
                target = output / method
                target.mkdir(parents=True)
                provenance = {'status': 'passed', 'config_sha256': canonical_hash(recipes[method]),
                    'selection_sha256': canonical_hash(bound), 'timing_condition': 'contract fixture',
                    'model': None, 'binary_sha256': None}
                (target / 'provenance.json').write_text(json.dumps(provenance), encoding='utf-8')
                (target / 'summary.json').write_text('{}', encoding='utf-8')
                records = [{'query_id': str(i), 'group': 'fixture/repo', 'split': 'test',
                            'evidence_failures': [], 'metrics': {'ndcg': .5}} for i in range(10)]
                (target / 'records.jsonl').write_text('\n'.join(json.dumps(row) for row in records), encoding='utf-8')
            self.assertEqual(compare(output, [family], bound)['queries'], 10)
            (output / 'rg' / 'records.jsonl').write_text('', encoding='utf-8')
            with self.assertRaisesRegex(ContractError, 'partial'):
                compare(output, [family], bound)


if __name__ == '__main__':
    unittest.main()
