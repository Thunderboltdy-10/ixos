from pathlib import Path
import tempfile
import unittest
from eval.fixtures import prepare


class FixtureTests(unittest.TestCase):
    def test_fixture_manifests_validate_and_are_reproducible(self):
        with tempfile.TemporaryDirectory(prefix="ixos-fixture-test-") as folder:
            root=Path(folder)
            first=prepare(root/"first")
            second=prepare(root/"second")
            self.assertEqual([r["sha256"] for r in first],[r["sha256"] for r in second])
            self.assertEqual([r["queries"] for r in first],[13,8])
            with self.assertRaisesRegex(ValueError,"new fixture directory"):
                prepare(root/"first")
