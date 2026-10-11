import io
import json
from pathlib import Path
import tarfile
import tempfile
import subprocess
import unittest
from unittest.mock import patch

from eval.contextbench import check_plan, gold_rows, isolate_parent_ignores, normalize_gold_path, prepare_corpus, source_lines
from eval.contract import ContractError
from eval.contextbench_run import checked_tasks


def archive(rows):
    stream = io.BytesIO()
    with tarfile.open(fileobj=stream, mode='w:gz') as tar:
        for name, data in rows:
            member = tarfile.TarInfo('repository-commit/' + name)
            if data is None:
                member.type = tarfile.SYMTYPE
                member.linkname = '../../outside.py'
                tar.addfile(member)
            else:
                member.size = len(data)
                tar.addfile(member, io.BytesIO(data))
    return stream.getvalue()


class ContextBenchContractTests(unittest.TestCase):
    def test_known_prefixes_without_path_guessing_or_escape(self):
        self.assertEqual(normalize_gold_path('/testbed/src/app.py'), 'src/app.py')
        self.assertEqual(normalize_gold_path('/workspace/owner__repo__0.1/src/app.py'), 'src/app.py')
        self.assertEqual(normalize_gold_path('./src/app.py'), 'src/app.py')
        for name in ['/app/src/app.py', '/workspace/no-file', '../app.py', 'src/../app.py', 'C:/app.py']:
            with self.subTest(name=name), self.assertRaises(ContractError):
                normalize_gold_path(name)

    def test_physical_lines_preserve_unicode_separator(self):
        self.assertEqual(source_lines('a\r\nb\u2028c\n'.encode()), ['a', 'b\u2028c'])

    def test_gold_merge_and_numbered_view_content_checks(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / 'file.rs').write_bytes(b'fn a() {}\n  call();\nlast\n')
            rows = [{'file': '/testbed/file.rs', 'start_line': 1, 'end_line': 2,
                     'content': '1\tfn a() {}\n2\t  call();'},
                    {'file': 'file.rs', 'start_line': 2, 'end_line': 3, 'content': 'call();\nlast'}]
            gold, checks = gold_rows(json.dumps(rows), root, {'file.rs'})
            self.assertEqual(gold, [{'path': 'file.rs', 'grade': 1, 'spans': [[1, 3]]}])
            self.assertEqual(checks, {'exact_or_numbered': 1, 'line_whitespace_presentation_only': 1})

    def test_gold_mismatch_missing_and_invalid_spans_fail(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / 'file.py').write_bytes(b'original\n')
            base = {'file': 'file.py', 'start_line': 1, 'end_line': 1, 'content': 'original'}
            for update in [{'content': 'different'}, {'end_line': 2}, {'start_line': 0}, {'file': 'other.py'}]:
                with self.subTest(update=update), self.assertRaises(ContractError):
                    gold_rows(json.dumps([{**base, **update}]), root, {'file.py'})

    def test_independent_inventory_keeps_build_sources_omits_dependencies(self):
        data = archive([('src/build/app.rs', b'fn build() {}\n'), ('LICENSE', b'license witness\n'),
                        ('node_modules/dependency.js', b'dependency'), ('.hidden.rs', b'hidden'),
                        ('unsafe.py', None), ('binary.py', b'\xff'), ('empty.py', b''), ('photo.png', b'png')])
        with tempfile.TemporaryDirectory() as temporary:
            folder = Path(temporary) / 'task'
            sources, receipt = prepare_corpus(data, folder)
            self.assertEqual({r['path'] for r in sources}, {'src/build/app.rs', 'LICENSE'})
            self.assertTrue((folder / 'UPSTREAM-LICENSE').is_file())
            self.assertEqual(receipt['skipped']['hidden_or_dependency'], 2)
            self.assertEqual(receipt['skipped']['non_regular'], 1)
            self.assertFalse((Path(temporary) / 'outside.py').exists())
            with self.assertRaises(ContractError):
                prepare_corpus(data, folder)

    def test_upstream_compatibility_clips_eof_and_audits_without_inventing_content(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            original = b'first\nsecond\n'
            (root / 'file.py').write_bytes(original)
            annotations = [{'file': 'file.py', 'start_line': 1, 'end_line': 4,
                            'content': 'first\nsecond\nedited extra line'},
                           {'file': 'file.py', 'start_line': 10, 'end_line': 20}]
            gold, audit = gold_rows(json.dumps(annotations), root, {'file.py'}, 'upstream-compatible')
            self.assertEqual(gold, [{'path': 'file.py', 'grade': 1, 'spans': [[1, 2]]}])
            self.assertEqual(audit['coordinates_normalized_as_upstream'], 1)
            self.assertEqual(audit['content_differs_from_base_source'], 1)
            self.assertEqual(audit['span_outside_base_source'], 1)
            self.assertEqual((root / 'file.py').read_bytes(), original)
            with self.assertRaises(ContractError):
                gold_rows(json.dumps(annotations), root, {'file.py'}, 'strict')

    def test_upstream_outside_span_keeps_file_relevance(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / 'file.py').write_bytes(b'line\n')
            gold, audit = gold_rows(json.dumps([{'file': 'file.py', 'start_line': 8, 'end_line': 9}]),
                                    root, {'file.py'}, 'upstream-compatible')
            self.assertEqual(gold, [{'path': 'file.py', 'grade': 1, 'spans': []}])
            self.assertEqual(audit['span_outside_base_source'], 1)

    def test_archive_escape_case_collision_and_byte_limits_fail(self):
        cases = [archive([('../escape.py', b'bad')]),
                 archive([('src/A.py', b'a'), ('src/a.py', b'b')]),
                 archive([('large.py', b'12345')])]
        for data in cases:
            with tempfile.TemporaryDirectory() as temporary, patch('eval.contextbench.MAX_FILE', 4):
                with self.assertRaises(ContractError):
                    prepare_corpus(data, Path(temporary) / 'task')

    def test_frozen_development_plan_rejects_unpinned_or_test_mutations(self):
        plan = json.loads(Path('eval/contextbench-dev-v1.json').read_text())
        check_plan(plan)
        for update in [{'revision': 'main'}, {'sha256': 'incorrect'}, {'rows': 500},
                       {'instances': [{**plan['instances'][0], 'split': 'test'}]},
                       {'instances': [{**plan['instances'][0], 'repository': '../../escape'}]},
                       {'instances': [plan['instances'][0], plan['instances'][0]]}]:
            with self.subTest(update=update), self.assertRaises(ContractError):
                check_plan({**plan, **update})

    def test_container_boundary_isolates_host_ignores_without_corpus_metadata(self):
        with tempfile.TemporaryDirectory() as temporary:
            host = Path(temporary)
            subprocess.run(['git', 'init', '--quiet', str(host)], check=True, capture_output=True)
            (host / '.gitignore').write_text('build/\n')
            destination = host / 'evaluations'
            isolate_parent_ignores(destination)
            source = destination / 'task/corpus/src/build/file.py'
            source.parent.mkdir(parents=True)
            source.write_text('source\n')
            result = subprocess.run(['git', 'check-ignore', str(source)], cwd=destination, capture_output=True)
            self.assertEqual(result.returncode, 1)
            self.assertFalse((destination / 'task/corpus/.git').exists())
            with self.assertRaises(FileExistsError):
                isolate_parent_ignores(destination)

    def test_partial_and_duplicate_preparations_cannot_enter_comparison(self):
        task = {'instance_id': 'one', 'status': 'passed'}
        self.assertEqual(checked_tasks({'status': 'passed', 'planned_tasks': 1, 'tasks': [task]}), [task])
        for receipt in [{'status': 'failed', 'planned_tasks': 1, 'tasks': [task]},
                        {'status': 'passed', 'planned_tasks': 2, 'tasks': [task]},
                        {'status': 'passed', 'planned_tasks': 2, 'tasks': [task, task]},
                        {'status': 'passed', 'planned_tasks': 1, 'tasks': [{**task, 'status': 'failed'}]}]:
            with self.subTest(receipt=receipt), self.assertRaises(ContractError):
                checked_tasks(receipt)


if __name__ == '__main__':
    unittest.main()
