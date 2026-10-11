"""Actor guards added after the six Gate 19 submissions; no rescoring changes."""
import unittest
from scripts.qasper.agent_shell import citation_ranges, exposed
from scripts.qasper.contract import Paper


class AgentExposureTests(unittest.TestCase):
    def setUp(self):
        self.paper = Paper('fixture', 'first\n🙂 café\nlast\n'.encode(), [], [])

    def test_character_slice_uses_original_utf8_bytes(self):
        value = {'slice': {'path': 'paper.txt', 'start_byte': 6,
                           'end_byte': 16, 'text': '🙂 café'}}
        self.assertEqual(exposed(value, self.paper), [(6, 16)])
        value['slice']['text'] = 'fabricated'
        with self.assertRaises(ValueError):
            exposed(value, self.paper)

    def test_invalid_path_and_slice_coordinates_rejected(self):
        for part in (
            {'path': 'other.txt', 'start_byte': 0, 'end_byte': 5, 'text': 'first'},
            {'path': 'paper.txt', 'start_byte': False, 'end_byte': 5, 'text': 'first'},
            {'path': 'paper.txt', 'start_byte': 0, 'end_byte': 999, 'text': 'first'},
        ):
            with self.assertRaises(ValueError):
                exposed({'slice': part}, self.paper)

    def test_read_view_verified_against_original(self):
        value = {'view': {'path': 'paper.txt', 'start_line': 2, 'end_line': 2,
                          'text': '🙂 café'}}
        self.assertEqual(exposed(value, self.paper), [(6, 16)])
        value['view']['text'] = '🙂'
        with self.assertRaises(ValueError):
            exposed(value, self.paper)

    def test_citation_requires_its_referenced_call_to_show_every_byte(self):
        calls = [{'request': {'id': 'q1'}, 'exposed_ranges': [(0, 5)]},
                 {'request': {'id': 'r1'}, 'exposed_ranges': [(6, 16)]}]
        self.assertEqual(citation_ranges(
            [{'call_id': 'r1', 'start_line': 2, 'end_line': 2}], calls, self.paper), [(6, 16)])
        for citation in (
            {'call_id': 'q1', 'start_line': 2, 'end_line': 2},
            {'call_id': 'q1', 'start_line': 1, 'end_line': 2},
            {'call_id': 'r1', 'start_line': 2, 'end_line': 3},
            {'call_id': 'q1', 'start_line': True, 'end_line': 1},
        ):
            with self.assertRaises(ValueError):
                citation_ranges([citation], calls, self.paper)

    def test_unknown_call_duplicates_and_file_only_results(self):
        calls = [{'request': {'id': 'q1'}, 'exposed_ranges': [(0, 5)]}]
        citation = {'call_id': 'q1', 'start_line': 1, 'end_line': 1}
        self.assertEqual(citation_ranges([citation, citation], calls, self.paper), [(0, 5)])
        with self.assertRaises(StopIteration):
            citation_ranges([{**citation, 'call_id': 'unseen'}], calls, self.paper)
        self.assertEqual(exposed({'results': [{'path': 'paper.txt',
                                               'evidence_omitted': True}]}, self.paper), [])
        with self.assertRaises(ValueError):
            exposed({'results': [{'path': 'paper.txt'}]}, self.paper)


if __name__ == '__main__':
    unittest.main()
