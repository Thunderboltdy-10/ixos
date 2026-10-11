import unittest
from eval.robustness import typo_variant


class RobustnessTests(unittest.TestCase):
    def test_identifier_and_quoted_syntax_remain_exact(self):
        self.assertIsNone(typo_variant('"cached vectors" foo_bar HTTPException path/to/file.rs ext:txt'))
        changed=typo_variant('where is "cached vectors" foo_bar implemented')
        self.assertIn('"cached vectors" foo_bar',changed)
        self.assertNotEqual(changed,'where is "cached vectors" foo_bar implemented')

    def test_deterministic_single_transposition(self):
        self.assertEqual(typo_variant("document cache"),"dcoument cache")
        self.assertEqual(typo_variant("document cache"),typo_variant("document cache"))
