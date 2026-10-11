from dataclasses import replace
from pathlib import Path
import unittest

from eval.contract import ContractError, Dataset, Gold, Query, Source
from eval.trajectory import (POLICY, POLICIES, Task, cumulative_coverage, grep_request,
                             inline_cue, read_requests, score_steps, search_request)
from eval.trajectory_run import extract_views


class TrajectoryTests(unittest.TestCase):
    def setUp(self):
        self.source = Source('visible.rs', 'unused', tuple(str(i) for i in range(1, 101)))
        self.other = Source('secret.rs', 'unused', self.source.lines)
        self.query = Query('q', 'Fix `parse_args`', 'repo', 'dev', 'code-agent', 'issue',
                           (Gold('visible.rs', 2, ((40, 60),)),), 'answerable', None, None, None)
        self.dataset = Dataset('d', {s.path: s for s in [self.source, self.other]}, (self.query,), 'fixture', {})
        self.observation = {'results': [{'path': 'visible.rs', 'view': self.view(48, 52)}]}

    def view(self, start, end, path='visible.rs'):
        return {'path': path, 'start_line': start, 'end_line': end,
                'text': '\n'.join(self.source.lines[start-1:end])}

    def test_gold_only_path_cannot_enter_policy(self):
        # Changing the scoring target to a source never returned by tools
        # changes the score, but cannot alter a single follow-up request.
        before = read_requests(self.observation, 3)
        altered = replace(self.query, gold=(Gold('secret.rs', 2, ((1, 100),)),))
        self.assertEqual(before, read_requests(self.observation, 3))
        self.assertEqual([r['path'] for r in before], ['visible.rs'])
        self.assertGreater(cumulative_coverage(self.query, [self.view(40, 60)], self.dataset)['span_recall'], 0)
        self.assertEqual(cumulative_coverage(altered, [self.view(40, 60)], self.dataset)['span_recall'], 0)

    def test_query_and_cue_have_no_source_or_label_fields(self):
        task = Task('q', 'Fix `parse_args` then `other`')
        self.assertEqual(search_request(task)['query'], task.issue)
        self.assertEqual(grep_request(task)['pattern'], 'parse_args')
        self.assertIsNone(inline_cue('```python\n`secret_symbol`\n```\nnormal issue'))
        self.assertEqual(inline_cue('~~~\n`wrong`\n~~~\nplease use `--repo`'), '--repo')
        self.assertIsNone(inline_cue('A vague natural language issue'))

    def test_reads_only_returned_ranked_files_and_skip_duplicates(self):
        value = {'results': self.observation['results'] * 2 + [{'path': 'secret.rs', 'evidence_omitted': True}]}
        self.assertEqual([(r['path'], r['start'], r['lines']) for r in read_requests(value, 2)],
                         [('visible.rs', 20, 61), ('secret.rs', 1, 61)])
        with self.assertRaises(ContractError):
            read_requests({'results': [{'path': '../escape.rs'}]}, 1)

    def test_actual_read_coverage_not_requested_range_controls_skip(self):
        self.assertEqual(read_requests(self.observation, 2, [self.view(20, 80)]), [])
        self.assertEqual(len(read_requests(self.observation, 2, [self.view(20, 30)])), 1)
        near_eof = {'results': [{'path': 'visible.rs', 'view': self.view(95, 100)}]}
        self.assertEqual(read_requests(near_eof, 2, [self.view(67, 100)], {'visible.rs': 100}), [])

    def test_all_views_count_and_overlaps_are_unioned(self):
        views = [self.view(1, 5)] * 11 + [self.view(40, 60), self.view(50, 70)]
        result = cumulative_coverage(self.query, views, self.dataset)
        self.assertEqual(result['span_recall'], 1)
        self.assertEqual(result['unique_displayed_lines'], 36)
        self.assertEqual(result['annotated_lines_displayed'], 21)
        self.assertGreater(result['duplicate_displayed_lines'], 0)

    def test_only_exact_displayed_source_gets_credit(self):
        bad = self.view(40, 60)
        bad['text'] = 'model generated reconstruction'
        with self.assertRaises(ContractError):
            cumulative_coverage(self.query, [bad], self.dataset)
        with self.assertRaises(ContractError):
            extract_views(b'{"results":[{"path":"visible.rs"}]}', Path('.'), self.dataset)

    def test_first_overlap_and_all_steps_survive_early_hit(self):
        steps = [{'request': {'op': op}, 'views': [self.view(a, b)], 'wall_ms': ms}
                 for op, a, b, ms in [('search', 1, 5, 100), ('read', 40, 50, 10), ('read', 51, 60, 20)]]
        result = score_steps(self.query, steps, self.dataset)
        self.assertEqual(result['first_annotated_overlap_call'], 2)
        self.assertEqual(result['tool_ms_to_first_annotated_overlap'], 110)
        self.assertEqual(result['tool_wall_ms'], 130)
        self.assertEqual(len(result['coverage_by_call']), 3)
        self.assertEqual(result['final']['span_recall'], 1)

    def test_missing_overlap_is_censored_not_fast_success(self):
        result = score_steps(self.query, [{'request': {'op': 'search'}, 'views': [], 'wall_ms': 20}], self.dataset)
        self.assertIsNone(result['tool_ms_to_first_annotated_overlap'])
        self.assertIsNone(result['first_annotated_overlap_call'])
        self.assertEqual(result['final']['span_recall'], 0)

    def test_policy_bound_is_shared_across_backends(self):
        self.assertEqual(POLICY['max_calls'], 1 + POLICY['search_reads'] + 1 + POLICY['grep_reads'])
        self.assertEqual(POLICY['response_bytes'], 6000)

    def test_broader_inspection_keeps_call_ceiling_without_cues(self):
        policy = POLICIES['top6']
        self.assertEqual(1 + policy['search_reads'], POLICY['max_calls'])
        self.assertIsNone(grep_request(Task('q', 'Fix `parse_args`'), policy))
        observation = {'results': [{'path': f'file{i}.rs'} for i in range(10)]}
        self.assertEqual([r['path'] for r in read_requests(observation, policy['search_reads'], policy=policy)],
                         [f'file{i}.rs' for i in range(6)])


if __name__ == '__main__':
    unittest.main()
