from dataclasses import replace
import json
from pathlib import Path
import tempfile
import unittest

import numpy as np

from eval.anchors import AnchorScreen, STYLES, lexical_chunk_candidates, unit_rows
from eval.anchor_run import checked_reference, modified_response
from eval.contract import ContractError, Dataset, Source, digest, validate_view
from eval.lexical import tokens
from eval.trajectory import POLICY


class Bridge:
    def __init__(self):
        self.inputs = []

    def embed(self, texts):
        self.inputs.extend(texts)
        # Contract fixture only; production screens require the real Rust bridge.
        return np.asarray([[1, 1 if 'semantic_witness' in text else -1] for text in texts], dtype=np.float32)


class AnchorTests(unittest.TestCase):
    def screen(self, source, query='semantic_witness target'):
        bridge = Bridge()
        screen = AnchorScreen({source.path: source}, {source.path: set(tokens('\n'.join(source.lines)))},
                              query, [source.path], bridge)
        return screen, bridge

    def test_bounded_candidates_keep_intro_and_lexical_late_chunks(self):
        result = lexical_chunk_candidates(list(range(100)), [0, 14, 28, 42, 57, 71, 85, 99])
        self.assertIn(0, result)
        self.assertIn(98, result)
        self.assertLessEqual(len(result), 16)

    def test_stable_ties_and_positive_candidates_only(self):
        self.assertEqual(lexical_chunk_candidates([0, 3, 3, 0], [0], 1), [0, 1])
        self.assertEqual(lexical_chunk_candidates([0] * 10, [0, 9]), [0, 9])
        with self.assertRaises(ContractError):
            lexical_chunk_candidates([1], [4])

    def test_partial_long_line_does_not_get_unembedded_tail_terms(self):
        source = Source('file.rs', 'unused', ('x' * 6000 + ' semantic_witness target',))
        screen, _ = self.screen(source)
        file = screen.files[source.path]
        self.assertEqual(file.weights[0], 0)
        self.assertGreater(file.weights[-1], 0)
        for style in STYLES:
            self.assertEqual(screen.choose(source.path, style), 1)

    def test_all_anchors_are_real_physical_lines_with_unicode(self):
        source = Source('file.rs', 'unused', tuple('中😀 ' + ('target' if i == 1799 else 'x' * 50)
                                                  for i in range(1800)))
        screen, bridge = self.screen(source)
        for style in STYLES:
            self.assertIn(screen.choose(source.path, style), range(1, 1801))
        self.assertEqual(screen.choose(source.path, 'global-line'), 1800)
        self.assertLessEqual(screen.embedded_passages, 16)
        self.assertEqual(len(bridge.inputs), screen.embedded_passages + 1)

    def test_whitespace_query_falls_back_without_nan(self):
        source = Source('file.rs', 'unused', ('alpha', 'beta'))
        screen, _ = self.screen(source, 'the and')
        for style in STYLES:
            self.assertEqual(screen.choose(source.path, style), 1)

    def test_source_and_paths_are_only_policy_inputs(self):
        source = Source('file.rs', 'unused', ('first target', 'second target'))
        before, _ = self.screen(source)
        after, _ = self.screen(replace(source, sha256='changed metadata only'))
        self.assertEqual([before.choose(source.path, style) for style in STYLES],
                         [after.choose(source.path, style) for style in STYLES])
        self.assertEqual(before.choose(source.path, 'global-line'), 1)

    def test_invalid_embeddings_and_escaped_paths_fail_closed(self):
        with self.assertRaises(ContractError):
            unit_rows([[float('nan')]])
        self.assertTrue(np.array_equal(unit_rows([[0, 0]]), [[0, 0]]))
        source = Source('../escape.rs', 'unused', ('text',))
        with self.assertRaises(ContractError):
            self.screen(source)
        source = replace(source, path='file.rs')
        with self.assertRaises(ContractError):
            AnchorScreen({source.path: source}, {source.path: set()}, 'q', [source.path] * 11, Bridge())

    def test_rewriting_keeps_scores_order_and_exact_bounded_source(self):
        source = Source('file.rs', 'unused', ('first target', 'second semantic_witness'))
        screen, _ = self.screen(source)
        dataset = Dataset('d', {source.path: source}, (), 'source-fingerprint', {})
        rows = [{'path': source.path, 'score': .123, 'evidence_omitted': True}]
        for style in STYLES:
            raw = modified_response(rows, screen, style, dataset, POLICY)
            result = json.loads(raw)['results'][0]
            self.assertEqual((result['path'], result['score']), (source.path, .123))
            validate_view(result['view'], dataset)
            self.assertLessEqual(len(raw), POLICY['response_bytes'])
        long = replace(source, lines=('target ' + '😀' * 10000,))
        dataset = replace(dataset, sources={source.path: long})
        screen, _ = self.screen(long)
        raw = modified_response(rows, screen, 'bounded-rerank', dataset,
                                {**POLICY, 'response_bytes': 100})
        result = json.loads(raw)['results'][0]
        self.assertTrue(result['evidence_omitted'])
        self.assertNotIn('view', result)
        self.assertLessEqual(len(raw), 100)

    def test_reference_requires_complete_exact_sources_model_and_binary(self):
        dataset = Dataset('d', {}, (), 'source-fingerprint', {})
        preparation = {'plan_sha256': 'plan', 'dataset_sha256': 'data', 'coordinate_policy': 'strict'}
        model = {'fingerprint': 'model'}
        with tempfile.TemporaryDirectory() as temporary:
            folder = Path(temporary)
            binary = folder / 'binary'
            binary.write_bytes(b'actual control identity fixture')
            reference = {**preparation, 'status': 'passed', 'backend': 'hybrid',
                         'datasets': [{'id': 'd', 'fingerprint': dataset.fingerprint, 'sources': 0}],
                         'model': model, 'binary_sha256': digest(binary.read_bytes())}
            path = folder / 'provenance.json'
            path.write_text(json.dumps(reference))
            self.assertEqual(checked_reference(folder, preparation, [dataset], model, binary), reference)
            for field, value in [('status', 'failed'), ('backend', 'stub'), ('datasets', []),
                                 ('model', {'fingerprint': 'other'}), ('binary_sha256', 'other')]:
                path.write_text(json.dumps({**reference, field: value}))
                with self.assertRaises(ContractError):
                    checked_reference(folder, preparation, [dataset], model, binary)
