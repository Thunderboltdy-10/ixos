import copy
import json
from pathlib import Path
import tempfile
import unittest

from eval.contract import ContractError, canonical_hash, digest, load_dataset
from eval.repoqa_run import BACKENDS, checked_preparation, compare
from eval.repoqa import (COMPRESSED_SHA, LANGUAGES, REVISION, make_plan, prepare,
                         verified_span)


class RepoQATests(unittest.TestCase):
    def metadata(self):
        return {'revision': REVISION, 'compressed_sha256': COMPRESSED_SHA,
                'languages': {language: {'repositories_metadata': [
                    {'repo': language + '/repo' + str(i), 'commit_sha': 'a' * 40, 'topic': 'fixture'}
                    for i in range(10)]} for language in LANGUAGES}}

    def needle(self, text, function):
        raw = text.encode()
        start = raw.index(function.encode())
        end = start + len(function.encode())
        return {'name': 'visible', 'start_byte': start, 'end_byte': end,
                'start_line': raw[:start].count(b'\n'), 'end_line': raw[:end-1].count(b'\n') + 1,
                'description': 'Verbatim upstream description fixture'}

    def test_split_is_order_independent_metadata_only(self):
        metadata = self.metadata()
        first = make_plan(metadata)
        altered = copy.deepcopy(metadata)
        for value in altered['languages'].values():
            value['repositories_metadata'].reverse()
            for row in value['repositories_metadata']:
                row['description'] = 'Deliberately ignored extra input'
                row['gold'] = 'Deliberately ignored target'
        self.assertEqual(first, make_plan(altered))
        self.assertEqual([sum(r['split'] == split for r in first['families'])
                          for split in ['dev', 'validation', 'test']], [18, 12, 30])

    def test_previously_inspected_families_never_become_heldout(self):
        metadata = self.metadata()
        metadata['languages']['java']['repositories_metadata'][0]['repo'] = 'Google/Gson'
        plan = make_plan(metadata)
        self.assertEqual(len(plan['excluded_previously_seen']), 1)
        self.assertNotIn('google/gson', [r['repository'].casefold() for r in plan['families']])

    def test_wrong_release_missing_language_duplicate_or_unpinned_revision_fails(self):
        mutations = []
        altered = self.metadata()
        altered['revision'] = 'wrong'
        mutations.append(altered)
        altered = self.metadata()
        del altered['languages']['rust']
        mutations.append(altered)
        altered = self.metadata()
        rows = altered['languages']['python']['repositories_metadata']
        rows[1]['repo'] = rows[0]['repo']
        mutations.append(altered)
        altered = self.metadata()
        altered['languages']['python']['repositories_metadata'][0]['commit_sha'] = 'main'
        mutations.append(altered)
        for metadata in mutations:
            with self.assertRaises(ContractError):
                make_plan(metadata)

    def test_utf8_local_bytes_and_lf_lines_verify_without_global_offsets(self):
        function = 'def visible():\n    return "中😀"'
        text = '# Ω\n' + function + '\n'
        needle = self.needle(text, function)
        needle['global_start_byte'] = -999
        needle['global_end_line'] = 999999
        span, audit = verified_span(needle, text, [needle])
        self.assertEqual(span, (2, 3))
        self.assertEqual(audit['function_bytes'], len(function.encode()))
        self.assertFalse(audit['description_mentions_target_name'])

    def test_crlf_and_unicode_separator_are_physical_lf_coordinates(self):
        function = 'fn visible() {\r\n  "a\u2028b";\r\n}'
        text = '// intro\r\n' + function + '\r\n'
        needle = self.needle(text, function)
        self.assertEqual(verified_span(needle, text, [needle])[0], (2, 4))

    def test_ranges_are_never_shifted_to_find_matching_code(self):
        text = 'prefix\nfn visible() { "中"; }\n'
        needle = self.needle(text, 'fn visible() { "中"; }')
        for change in [{'start_line': 0}, {'end_line': 999}, {'end_byte': len(text.encode()) + 1},
                       {'start_byte': needle['end_byte']}, {'start_byte': text.encode().index('中'.encode()) + 1}]:
            with self.assertRaises(ContractError):
                verified_span(needle | change, text, [needle | change])

    def test_catalog_missing_duplicate_and_description_errors_reject(self):
        text = 'fn visible() {}'
        needle = self.needle(text, text)
        for functions in [[], [needle, needle]]:
            with self.assertRaises(ContractError):
                verified_span(needle, text, functions)
        for description in ['', None, 'x' * 65537]:
            with self.assertRaises(ContractError):
                verified_span(needle | {'description': description}, text, [needle])

    def test_test_target_preparation_requires_a_frozen_selection(self):
        plan = make_plan(self.metadata())
        with tempfile.TemporaryDirectory() as temporary:
            folder = Path(temporary)
            with self.assertRaisesRegex(ContractError, 'Freeze exact'):
                prepare(plan, {}, 'test', folder / 'corpus', folder / 'receipt.json')
            self.assertFalse((folder / 'corpus').exists())
            with self.assertRaisesRegex(ContractError, 'Freeze exact'):
                prepare(plan, {}, 'test', folder / 'corpus', folder / 'receipt.json',
                        {'plan_sha256': canonical_hash(plan), 'config_hashes': [], 'model_fingerprints': []})

    def test_preparation_cannot_shrink_or_reassign_a_frozen_family(self):
        metadata = self.metadata()
        plan = make_plan(metadata)
        data = {language: value['repositories_metadata'] for language, value in metadata['languages'].items()}
        with tempfile.TemporaryDirectory() as temporary:
            folder = Path(temporary)
            altered = copy.deepcopy(plan)
            altered['families'][0]['split'] = 'test'
            with self.assertRaisesRegex(ContractError, 'Family assignment'):
                prepare(altered, data, 'dev', folder / 'corpus', folder / 'receipt.json')
            self.assertFalse((folder / 'corpus').exists())

    def test_utf8_aggregation_and_source_identity_guard(self):
        with tempfile.TemporaryDirectory() as temporary:
            folder = Path(temporary)
            root = folder / 'corpus'
            root.mkdir()
            raw = 'fn Ā() {}\n'.encode()
            (root / 'code.rs').write_bytes(raw)
            manifest = {'schema': 1, 'id': 'fixture',
                        'provenance': {key: 'fixture' for key in ['origin', 'revision', 'label_method', 'license', 'limitations']},
                        'sources': [{'path': 'code.rs', 'sha256': digest(raw)}],
                        'queries': [{'id': str(i), 'text': 'function Ā ' + str(i), 'group': 'repo', 'split': 'dev',
                                     'workload': 'code-agent', 'kind': 'fixture', 'answerability': 'answerable',
                                     'gold': [{'path': 'code.rs', 'grade': 2, 'spans': [[1, 1]]}]} for i in range(10)]}
            path = folder / 'manifest.json'
            path.write_text(json.dumps(manifest), encoding='utf-8')
            dataset = load_dataset(path, root)
            family = {'repository': 'repo', 'status': 'passed', 'queries': 10, 'fingerprint': dataset.fingerprint,
                      'manifest': str(path), 'root': str(root)}
            receipt = {'status': 'passed', 'split': 'dev', 'planned_families': 1, 'families': [family]}
            checked_preparation(receipt)
            output = folder / 'output'
            for backend in BACKENDS:
                target = output / backend
                target.mkdir(parents=True)
                provenance = {'status': 'passed', 'timing_condition': 'fixture', 'model': None, 'binary_sha256': 'fixture'}
                (target / 'provenance.json').write_text(json.dumps(provenance), encoding='utf-8')
                (target / 'summary.json').write_text('{}', encoding='utf-8')
                records = [{'query_id': q.id, 'group': q.group, 'metrics': {'ndcg': 0.5},
                            'evidence_failures': [], 'views': [{'text': 'Ā'}]} for q in dataset.queries]
                (target / 'records.jsonl').write_text('\n'.join(json.dumps(row, ensure_ascii=False) for row in records), encoding='utf-8')
            self.assertEqual(compare(output, [family])['status'], 'passed')
            (output / 'rg' / 'records.jsonl').write_text('', encoding='utf-8')
            with self.assertRaisesRegex(ContractError, 'partial'):
                compare(output, [family])
            family['fingerprint'] = 'changed'
            with self.assertRaisesRegex(ContractError, 'identities changed'):
                checked_preparation(receipt)
