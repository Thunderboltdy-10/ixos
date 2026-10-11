import json
import unittest
from eval import test_contract as fixtures
from eval.backends import decode_ixos
from eval.contract import ContractError, digest, score_query


class BackendTests(unittest.TestCase):
    setUp = fixtures.ContractTests.setUp
    load = fixtures.ContractTests.load
    view = fixtures.ContractTests.view
    def payload(self, **updates):
        result = {"path": str(self.root / "a.rs"), "context": {"line_number": 2, "before": ["intro"], "matched": ["α缓存", "exact evidence"], "after": ["tail"]}}
        result.update(updates)
        return json.dumps({"type": "semantic", "results": [result]}, ensure_ascii=False).encode("utf-8")

    def test_real_context_is_preserved(self):
        dataset = self.load()
        paths, views, errors = decode_ixos(self.payload(), self.root, dataset)
        self.assertEqual(paths, ["a.rs"])
        self.assertEqual(views[0], self.view(start=1, end=4))
        self.assertEqual(errors, [])

    def test_jsonl_unicode_separator_remains_inside_string(self):
        data="one\u2028two\nexact evidence\n".encode("utf-8")
        (self.root/"a.rs").write_bytes(data)
        self.raw["sources"][0]["sha256"]=digest(data)
        self.raw["queries"][0]["gold"][0]["spans"]=[[1,2]]
        paths,views,errors=decode_ixos(self.payload(context={"line_number":1,"before":[],"matched":["one\u2028two"],"after":["exact evidence"]}),self.root,self.load())
        self.assertEqual(paths,["a.rs"])
        self.assertEqual(len(views),1)
        self.assertEqual(errors,[])

    def test_truncated_context_is_not_completed_by_adapter(self):
        dataset = self.load()
        paths, views, errors = decode_ixos(self.payload(context={"line_number": 2, "before": [], "matched": ["α…"], "after": []}), self.root, dataset)
        self.assertEqual(paths, ["a.rs"])
        self.assertEqual(views, [])
        self.assertEqual(len(errors), 1)
        metrics = score_query(dataset.queries[0], views, dataset, paths=paths)
        self.assertEqual(metrics["recall"], 1)
        self.assertEqual(metrics["span_recall"], 0)

    def test_missing_context_is_file_retrieval_only(self):
        paths, views, errors = decode_ixos(self.payload(context=None), self.root, self.load())
        self.assertEqual(paths, ["a.rs"])
        self.assertEqual(views, [])
        self.assertEqual(len(errors), 1)

    def test_explicit_omitted_evidence_does_not_fabricate_span_credit(self):
        dataset=self.load()
        paths,views,errors=decode_ixos(self.payload(context=None,evidence_omitted=True),self.root,dataset)
        self.assertEqual(paths,['a.rs'])
        self.assertEqual(views,[])
        self.assertEqual(errors,[])
        self.assertEqual(score_query(dataset.queries[0],views,dataset,paths=paths)['span_recall'],0)

    def test_relative_document_view_is_validated_without_completion(self):
        paths,views,errors=decode_ixos(self.payload(path='a.rs',context=None,view=self.view(start=1,end=4)),self.root,self.load())
        self.assertEqual(paths,['a.rs'])
        self.assertEqual(views,[self.view(start=1,end=4)])
        self.assertEqual(errors,[])
        paths,views,errors=decode_ixos(self.payload(path='a.rs',view=dict(self.view(start=1,end=4),text='invented')),self.root,self.load())
        self.assertEqual(views,[])
        self.assertEqual(len(errors),1)

    def test_last_batch_is_final_ranking(self):
        dataset = self.load()
        initial = json.dumps({"type": "lexical", "results": []}).encode()
        paths, views, errors = decode_ixos(initial+b"\n"+self.payload(), self.root, dataset)
        self.assertEqual(paths, ["a.rs"])

    def test_error_payload_and_unknown_source_rejected(self):
        dataset = self.load()
        for raw in [b'{"type":"error","error":"model unavailable"}', self.payload(path=str(self.root.parent / "outside")), b'{"type":"complete"}']:
            with self.assertRaises(ContractError):
                decode_ixos(raw, self.root, dataset)

    @unittest.skipUnless(__import__("os").name == "nt", "Windows extended-length path")
    def test_windows_extended_path_is_same_frozen_source(self):
        paths, views, errors = decode_ixos(self.payload(path="\\\\?\\"+str(self.root / "a.rs")), self.root, self.load())
        self.assertEqual(paths, ["a.rs"])
        self.assertEqual(errors, [])
