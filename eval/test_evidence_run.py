import copy
import unittest

from eval.contract import ContractError
from eval.evidence_run import checked_pair


class PairIdentityTests(unittest.TestCase):
    def test_refuses_model_binary_corpus_and_recipe_drift(self):
        control = {'status': 'passed', 'binary_sha256': 'binary', 'datasets': [{'id': 'source'}],
                   'config': {'model_fingerprint': 'model', 'limit': 10, 'cache': 'jit'}}
        candidate = copy.deepcopy(control)
        candidate['config']['evidence_policy'] = 'bounded-rerank'
        checked_pair(control, candidate)
        for key, value in [('binary_sha256', 'other'), ('datasets', []), ('status', 'running')]:
            changed = copy.deepcopy(candidate)
            changed[key] = value
            with self.assertRaises(ContractError):
                checked_pair(control, changed)
        for key, value in [('model_fingerprint', 'other'), ('limit', 9), ('cache', 'native-warm')]:
            changed = copy.deepcopy(candidate)
            changed['config'][key] = value
            with self.assertRaises(ContractError):
                checked_pair(control, changed)


if __name__ == '__main__':
    unittest.main()
