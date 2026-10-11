from __future__ import annotations

import copy
import json
from pathlib import Path
import tempfile
import unittest

from eval.contract import ContractError, canonical_hash, cluster_mean_ci, digest, intersection_length, length, load_dataset, paired_family_difference, score_query, union, validate_view


class ContractTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="ixos-eval-contract-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / "corpus"
        self.root.mkdir()
        (self.root / "a.rs").write_text("intro\nα缓存\nexact evidence\ntail\n", encoding="utf-8")
        (self.root / "b.md").write_text("other\nwrong answer\n", encoding="utf-8")
        self.raw = {
            "schema": 1, "id": "test-contract",
            "provenance": {"origin": "controlled fixtures", "revision": "v1", "label_method": "explicit source intervals", "license": "MIT", "limitations": "Contract tests, never quality claims"},
            "sources": [{"path": p.name, "sha256": digest(p.read_bytes())} for p in sorted(self.root.iterdir())],
            "queries": [{"id": "q1", "text": "where is the evidence", "group": "family-a", "split": "dev", "workload": "code-agent", "kind": "concept", "answerability": "answerable", "gold": [{"path": "a.rs", "grade": 2, "spans": [[2, 3]]}]}],
        }

    def load(self, raw=None):
        manifest = Path(self.temp.name) / "manifest.json"
        manifest.write_text(json.dumps(raw or self.raw, ensure_ascii=False), encoding="utf-8")
        return load_dataset(manifest, self.root)

    def view(self, path="a.rs", start=2, end=3):
        return {"path": path, "start_line": start, "end_line": end, "text": "\n".join((self.root / path).read_text(encoding="utf-8").splitlines()[start-1:end])}

    def test_perfect_retrieval(self):
        dataset = self.load()
        result = score_query(dataset.queries[0], [self.view()], dataset)
        for metric in ["mrr", "recall", "ndcg", "span_recall", "span_precision"]:
            self.assertEqual(result[metric], 1)
        self.assertTrue(result["span_metrics_complete"])

    def test_wrong_first_rank_and_partial_evidence(self):
        dataset = self.load()
        result = score_query(dataset.queries[0], [self.view("b.md", 1, 2), self.view(start=3, end=4)], dataset)
        self.assertEqual(result["mrr"], .5)
        self.assertEqual(result["recall"], 1)
        self.assertAlmostEqual(result["ndcg"], 1 / __import__("math").log2(3))
        self.assertEqual(result["span_recall"], .5)
        self.assertEqual(result["span_precision"], .25)

    def test_duplicate_views_do_not_inflate_quality(self):
        dataset = self.load()
        result = score_query(dataset.queries[0], [self.view(), self.view(), self.view(start=1, end=3)], dataset)
        self.assertEqual(result["ndcg"], 1)
        self.assertEqual(result["span_recall"], 1)
        self.assertAlmostEqual(result["span_precision"], 2 / 3)
        self.assertEqual(result["unique_viewed_lines"], 3)
        self.assertEqual(result["duplicate_views"], 1)

    def test_empty_answerable_results_are_zero(self):
        dataset = self.load()
        result = score_query(dataset.queries[0], [], dataset)
        for metric in ["mrr", "recall", "ndcg", "span_recall", "span_precision"]:
            self.assertEqual(result[metric], 0)

    def test_unanswerable_is_not_added_to_recall_denominator(self):
        row = self.raw["queries"][0]
        row.update(answerability="unanswerable", gold=[])
        dataset = self.load()
        abstention = score_query(dataset.queries[0], [], dataset)
        false_positive = score_query(dataset.queries[0], [self.view()], dataset)
        self.assertFalse(abstention["false_positive"])
        self.assertTrue(false_positive["false_positive"])
        self.assertIsNone(abstention["mrr"])
        self.assertIsNone(false_positive["recall"])

    def test_file_labels_do_not_fabricate_span_metrics(self):
        self.raw["queries"][0]["gold"][0]["spans"] = []
        dataset = self.load()
        result = score_query(dataset.queries[0], [self.view()], dataset)
        self.assertEqual(result["recall"], 1)
        self.assertIsNone(result["span_recall"])
        self.assertFalse(result["span_metrics_complete"])

    def test_file_only_false_positive_is_not_abstention(self):
        self.raw["queries"][0].update(answerability="unanswerable", gold=[])
        dataset = self.load()
        result = score_query(dataset.queries[0], [], dataset, paths=["a.rs"])
        self.assertTrue(result["false_positive"])
        self.assertFalse(result["abstained"])

    def test_fabricated_or_wrongly_located_text_rejected(self):
        dataset = self.load()
        for changes in [{"text": "invented"}, {"start_line": 1}, {"end_line": 200}, {"start_line": True}, {"path": "../outside"}, {"path": "missing.rs"}, {"score": .5}]:
            with self.subTest(changes=changes), self.assertRaises(ContractError):
                validate_view(self.view() | changes, dataset)

    def test_source_mutation_rejected(self):
        (self.root / "a.rs").write_text("changed", encoding="utf-8")
        with self.assertRaisesRegex(ContractError, "changed source"):
            self.load()

    def test_paired_comparison_requires_identical_eligible_queries(self):
        baseline=[{"query_id":"a","group":"one","ndcg":.2},{"query_id":"b","group":"two","ndcg":.4}]
        candidate=[{**r,"ndcg":r["ndcg"]+.1} for r in baseline]
        self.assertAlmostEqual(paired_family_difference(baseline,candidate,"ndcg")["mean"],.1)
        for rows in [candidate[:1],candidate+[candidate[0]],[candidate[0],{**candidate[1],"group":"other"}],[candidate[0],{**candidate[1],"ndcg":None}]]:
            with self.assertRaises(ContractError):
                paired_family_difference(baseline,rows,"ndcg")

    def test_unmanifested_source_rejected_even_when_hidden(self):
        for path in ["extra.rs", ".hidden.md"]:
            extra = self.root / path
            extra.write_text("unfrozen source", encoding="utf-8")
            with self.assertRaisesRegex(ContractError, "inventory differs"):
                self.load()
            extra.unlink()

    def test_directory_symlink_rejected(self):
        target = self.root / "alias"
        try:
            target.symlink_to(self.root, target_is_directory=True)
        except OSError:
            self.skipTest("Host cannot create directory symlinks")
        self.addCleanup(target.unlink)
        with self.assertRaisesRegex(ContractError, "symlink"):
            self.load()

    def test_unicode_separators_are_not_physical_source_lines(self):
        data = "alpha\u2028beta\nline two\r\n".encode("utf-8")
        (self.root / "a.rs").write_bytes(data)
        self.raw["sources"][0]["sha256"] = digest(data)
        self.raw["queries"][0]["gold"][0]["spans"] = [[1, 2]]
        dataset = self.load()
        self.assertEqual(dataset.sources["a.rs"].lines, ("alpha\u2028beta", "line two"))

    def test_unexpected_fields_rejected(self):
        for row in [self.raw, self.raw["sources"][0], self.raw["queries"][0], self.raw["queries"][0]["gold"][0]]:
            row["typo_field"] = 1
            with self.assertRaises(ContractError):
                self.load()
            del row["typo_field"]

    def test_source_paths_rejected(self):
        for path in ["../a.rs", "C:/a.rs", "/a.rs", "a//b.rs", "./a.rs", "a\\b.rs", "a.rs/.."]:
            with self.subTest(path=path), self.assertRaises(ContractError):
                changed = copy.deepcopy(self.raw)
                changed["sources"][0]["path"] = path
                self.load(changed)

    def test_duplicate_ids_rejected(self):
        self.raw["queries"].append(copy.deepcopy(self.raw["queries"][0]))
        with self.assertRaises(ContractError):
            self.load()

    def second_query(self):
        second = copy.deepcopy(self.raw["queries"][0])
        second.update(id="q2", text="other question")
        self.raw["queries"].append(second)
        return second

    def test_family_split_leakage_rejected(self):
        self.second_query()["split"] = "test"
        with self.assertRaisesRegex(ContractError, "family leaks"):
            self.load()

    def test_source_content_split_leakage_rejected(self):
        self.second_query().update(group="other-family", split="test")
        with self.assertRaisesRegex(ContractError, "source content leaks"):
            self.load()

    def test_query_text_split_leakage_rejected(self):
        self.second_query().update(text=" WHERE IS THE EVIDENCE ", group="other-family", split="test", gold=[{"path": "b.md", "grade": 1, "spans": [[1, 1]]}])
        with self.assertRaisesRegex(ContractError, "query text leaks"):
            self.load()

    def test_gold_spans_rejected(self):
        for spans in [[[0, 1]], [[2, 1]], [[1, 99]], [[True, 2]], [[1]], "wrong"]:
            with self.subTest(spans=spans), self.assertRaises(ContractError):
                self.raw["queries"][0]["gold"][0]["spans"] = spans
                self.load()

    def test_invalid_answerability_rejected(self):
        self.raw["queries"][0]["answerability"] = "unanswerable"
        with self.assertRaises(ContractError):
            self.load()

    def test_sequence_feedback_only_after_earlier_turn(self):
        self.raw["queries"][0].update(sequence="s1", turn=0)
        second = self.second_query()
        second.update(turn=1, feedback={"query_id": "q1", "accepted": ["a.rs"], "rejected": []})
        self.assertEqual(len(self.load().queries), 2)
        second["feedback"]["query_id"] = "q2"
        with self.assertRaisesRegex(ContractError, "future"):
            self.load()

    def test_non_sequence_feedback_rejected(self):
        self.second_query()["feedback"] = {"query_id": "q1", "accepted": [], "rejected": []}
        with self.assertRaises(ContractError):
            self.load()

    def test_overlapping_feedback_rejected(self):
        self.raw["queries"][0].update(sequence="s1", turn=0)
        self.second_query().update(turn=1, feedback={"query_id": "q1", "accepted": ["a.rs"], "rejected": ["a.rs"]})
        with self.assertRaises(ContractError):
            self.load()

    def test_sequence_turn_gap_rejected(self):
        self.raw["queries"][0].update(sequence="s1", turn=1)
        with self.assertRaises(ContractError):
            self.load()

    def test_interval_algebra(self):
        self.assertEqual(union([(4, 5), (1, 3), (2, 6), (8, 9)]), [(1, 6), (8, 9)])
        self.assertEqual(length([(1, 4), (3, 6)]), 6)
        self.assertEqual(intersection_length([(1, 4), (3, 6)], [(4, 8), (5, 5)]), 3)

    def test_macro_family_weighting_and_determinism(self):
        rows = [{"query_id": f"a{i}", "group": "a", "mrr": 1.0} for i in range(100)] + [{"query_id": "b1", "group": "b", "mrr": 0.0}]
        result = cluster_mean_ci(rows, "mrr", seed=7)
        self.assertEqual(result["mean"], .5)
        self.assertEqual(result["queries"], 101)
        self.assertEqual(result, cluster_mean_ci(rows, "mrr", seed=7))

    def test_repetitions_do_not_inflate_quality_sample(self):
        with self.assertRaises(ContractError):
            cluster_mean_ci([{"query_id": "q", "group": "g", "mrr": 1}] * 2, "mrr")

    def test_single_family_does_not_claim_cluster_confidence(self):
        result = cluster_mean_ci([{"query_id": "q", "group": "g", "mrr": 1}], "mrr")
        self.assertIsNone(result["ci95"])

    def test_manifest_identity_ignores_key_order(self):
        self.assertEqual(canonical_hash({"a": 1, "b": 2}), canonical_hash({"b": 2, "a": 1}))
        self.assertNotEqual(canonical_hash({"a": 1}), canonical_hash({"a": 2}))


if __name__ == "__main__":
    unittest.main()
