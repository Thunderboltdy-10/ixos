import json
import unittest
from eval import test_contract as fixtures
from eval.contract import ContractError
from eval.lexical import BM25, compact_response, terms, tokens, view_at
from eval.lexical import run_rg


class LexicalTests(unittest.TestCase):
    setUp = fixtures.ContractTests.setUp
    load = fixtures.ContractTests.load

    def test_identifier_and_query_terms(self):
        self.assertEqual(tokens("EmbeddingCache file_hash"), ["embedding", "cache", "file", "hash"])
        self.assertEqual(terms("where is the exact evidence"), ["exact", "evidence"])

    def test_bm25_retrieves_actual_evidence(self):
        response = BM25(self.load()).search("exact evidence", context=0)
        self.assertEqual(response.paths[0], "a.rs")
        self.assertEqual(response.views[0]["start_line"], 3)
        self.assertEqual(response.views[0]["text"], "exact evidence")

    def test_no_matching_terms_returns_empty(self):
        response = BM25(self.load()).search("ABSENT_73941_LITERAL")
        self.assertEqual(response.paths, [])

    @unittest.skipUnless(__import__("shutil").which("rg"), "ripgrep not installed")
    def test_actual_ripgrep_uses_the_same_frozen_sources(self):
        response = run_rg("rg", self.root, self.load(), "exact evidence", context=0)
        self.assertEqual(response.paths[0], "a.rs")
        self.assertEqual(response.views[0]["start_line"], 3)
        self.assertEqual(response.views[0]["text"], "exact evidence")

    def test_context_window_clips_at_actual_file_bounds(self):
        self.assertEqual(view_at(self.load(), "a.rs", 1, 2)["start_line"], 1)
        self.assertEqual(view_at(self.load(), "a.rs", 4, 2)["end_line"], 4)

    def test_budget_counts_utf8_metadata_and_keeps_valid_json(self):
        rows = [{"path": "a.rs", "text": "缓存"*100}, {"path": "b.md", "text": "other"}]
        raw, retained = compact_response(rows, 100)
        self.assertLessEqual(len(raw), 100)
        self.assertEqual(json.loads(raw)["results"], retained)
        self.assertEqual(retained, [])
        with self.assertRaises(ContractError):
            compact_response([], 5)
