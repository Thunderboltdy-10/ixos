import io
from pathlib import Path
import tarfile
import tempfile
import unittest

from scripts.code_tasks.contract import citation_ranges, exposed
from scripts.code_tasks.prepare import archive_files
from scripts.code_tasks.patch_reference import old_changed_lines


class CodeTaskContracts(unittest.TestCase):
    def test_normalized_line_view_matches_utf8_and_crlf(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'a.py').write_bytes('first\r\n🙂 café\r\nlast\r\n'.encode())
            view = {'path': 'a.py', 'start_line': 2, 'end_line': 2, 'text': '🙂 café'}
            self.assertEqual(exposed({'view': view}, root), [['a.py', 6, 16]])
            with self.assertRaises(ValueError):
                exposed({'view': {**view, 'text': '🙂'}}, root)
            with self.assertRaises(ValueError):
                exposed({'results': [{'path': 'b.py', 'view': view}]}, root)

    def test_citation_requires_exact_path_and_referenced_call(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name in ('a.py', 'b.py'):
                (root / name).write_bytes(b'first\nsecond\n')
            calls = [{'request': {'id': 'q1'}, 'exposed_ranges': [['a.py', 0, 5]]}]
            citation = {'call_id': 'q1', 'path': 'a.py', 'start_line': 1, 'end_line': 1}
            self.assertEqual(citation_ranges([citation, citation], calls, root), {'a.py': [(0, 5)]})
            for wrong in ({**citation, 'path': 'b.py'}, {**citation, 'end_line': 2},
                          {**citation, 'path': '../a.py'}):
                with self.assertRaises(ValueError):
                    citation_ranges([wrong], calls, root)

    def test_slice_and_file_only_records_cannot_invent_coverage(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'a.py').write_bytes('🙂 text\n'.encode())
            part = {'path': 'a.py', 'start_byte': 0, 'end_byte': 4, 'text': '🙂'}
            self.assertEqual(exposed({'slice': part}, root), [['a.py', 0, 4]])
            with self.assertRaises(ValueError):
                exposed({'slice': {**part, 'start_byte': False}}, root)
            self.assertEqual(exposed({'results': [{'path': 'a.py', 'evidence_omitted': True}]}, root), [])
            with self.assertRaises(ValueError):
                exposed({'results': [{'path': 'a.py'}]}, root)

    def archive(self, names):
        stream = io.BytesIO()
        with tarfile.open(fileobj=stream, mode='w:gz') as archive:
            for name in names:
                member = tarfile.TarInfo(name)
                member.size = 4
                archive.addfile(member, io.BytesIO(b'data'))
        return stream.getvalue()

    def test_patch_context_must_match_original_and_insertions_have_explicit_anchor(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'a.py').write_bytes(b'first\nsecond\nlast\n')
            patch = 'diff --git a/a.py b/a.py\n--- a/a.py\n+++ b/a.py\n@@ -1,3 +1,4 @@\n first\n-second\n+replacement\n+inserted\n last\n'
            self.assertEqual(old_changed_lines(patch, root), {'a.py': [2, 3]})
            with self.assertRaises(ValueError):
                old_changed_lines(patch.replace('-second', '-fabricated'), root)

    def test_archive_traversal_multiple_roots_and_duplicate_files_rejected(self):
        for names in (['root/../escape'], ['/absolute'], ['root/a', 'other/b'], ['root/a', 'root/a']):
            with self.assertRaises(ValueError):
                archive_files(self.archive(names))
        files, links = archive_files(self.archive(['root/a', 'root/nested/b']))
        self.assertEqual(files, {'a': b'data', 'nested/b': b'data'})
        self.assertEqual(links, [])


if __name__ == '__main__':
    unittest.main()
