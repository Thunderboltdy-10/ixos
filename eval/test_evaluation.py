import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from eval.backends import bounded
from eval.dataset import Dataset, score
from eval.lexical import BM25


class EvaluationTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.folder = Path(self.temporary.name)
        self.root = self.folder / "corpus"
        self.root.mkdir()
        text = "缓存 cache\nreturn cached_vector\n"
        (self.root / "cache.rs").write_bytes(text.encode("utf-8"))
        self.query = {
            "id": "cache",
            "text": "cached vector",
            "group": "example",
            "split": "dev",
            "gold": [{"path": "cache.rs", "grade": 2, "spans": [[2, 2]]}],
        }
        self.manifest = self.folder / "manifest.json"
        self.manifest.write_text(
            json.dumps(
                {
                    "sources": [
                        {
                            "path": "cache.rs",
                            "sha256": hashlib.sha256(text.encode()).hexdigest(),
                        }
                    ],
                    "queries": [self.query],
                }
            )
        )
        self.dataset = Dataset(self.manifest, self.root)

    def tearDown(self):
        self.temporary.cleanup()

    def test_scores_exact_displayed_source_and_file_only_results(self):
        response = {
            "results": [
                {
                    "path": "cache.rs",
                    "snippet": {
                        "path": "cache.rs",
                        "start_line": 2,
                        "end_line": 2,
                        "text": "return cached_vector",
                    },
                }
            ]
        }
        metrics = score(self.dataset, self.query, response)
        self.assertEqual(metrics, dict(ndcg=1, mrr=1, recall=1, line_recall=1))
        response["results"][0].pop("snippet")
        self.assertEqual(score(self.dataset, self.query, response)["line_recall"], 0)

    def test_rejects_invented_lines_and_duplicate_ranked_files(self):
        with self.assertRaises(ValueError):
            self.dataset.validate_snippet(
                {"path": "cache.rs", "start_line": 1, "end_line": 1, "text": "invented"}
            )
        with self.assertRaises(ValueError):
            score(
                self.dataset,
                self.query,
                {"results": [{"path": "cache.rs"}, {"path": "cache.rs"}]},
            )

    def test_changed_sources_and_unlisted_sources_are_rejected(self):
        (self.root / "unlisted.rs").write_text("text")
        with self.assertRaises(ValueError):
            Dataset(self.manifest, self.root)
        (self.root / "unlisted.rs").unlink()
        (self.root / "cache.rs").write_text("changed")
        with self.assertRaises(ValueError):
            Dataset(self.manifest, self.root)

    def test_bm25_unicode_snippet_and_byte_ceiling(self):
        raw = BM25(self.dataset).search("cache")
        response = json.loads(raw)
        self.assertEqual(response["results"][0]["path"], "cache.rs")
        self.dataset.validate_snippet(response["results"][0]["snippet"])
        raw = bounded(
            [{"path": "cache.rs", "snippet": {"text": "缓存" * 100}}], budget=70
        )
        self.assertLessEqual(len(raw), 70)
        self.assertEqual(json.loads(raw)["results"][0]["path"], "cache.rs")


if __name__ == "__main__":
    unittest.main()
