import copy
import unittest
from eval import test_contract as fixtures
from eval.backends import Response
from eval.sessions import replay


class SessionTests(unittest.TestCase):
    setUp = fixtures.ContractTests.setUp
    load = fixtures.ContractTests.load
    view = fixtures.ContractTests.view

    def sequence(self):
        self.raw["queries"][0].update(sequence="one", turn=0)
        second = copy.deepcopy(self.raw["queries"][0])
        second.update(id="q2",text="follow up",turn=1,feedback={"query_id":"q1","accepted":["a.rs"],"rejected":["b.md"]})
        self.raw["queries"].append(second)
        return self.load()

    def response(self, paths, views):
        return Response(paths,views,b'{"results":[]}\n',b"",[],0,3.0,{},[])

    def test_feedback_does_not_reveal_unseen_result(self):
        dataset = self.sequence()
        calls = []
        def backend(text, feedback, query_id):
            calls.append((text,feedback,query_id))
            return self.response(["a.rs"],[self.view()])
        rows, sessions = replay(dataset,dataset.queries,backend,len)
        self.assertIsNone(calls[0][1])
        self.assertEqual(calls[1][1]["accepted"],["a.rs"])
        self.assertEqual(calls[1][1]["rejected"],[])
        self.assertEqual(rows[1]["unavailable_feedback"],["b.md"])
        self.assertEqual(sessions[0]["calls_to_first_gold_span"],1)
        self.assertEqual(rows[1]["retained_span_recall"],1)
        self.assertGreater(rows[1]["cumulative_tokens"],rows[0]["cumulative_tokens"])

    def test_silence_does_not_become_acceptance(self):
        dataset = self.sequence()
        self.raw["queries"][1].pop("feedback")
        dataset = self.load()
        seen = []
        def backend(text, feedback, query_id):
            seen.append(feedback)
            return self.response([],[])
        _, summaries = replay(dataset,dataset.queries,backend,len)
        self.assertEqual(seen,[None,None])
        self.assertIsNone(summaries[0]["calls_to_first_gold_span"])

    def test_sequence_reset_and_no_gold_parameters(self):
        dataset = self.sequence()
        third = copy.deepcopy(self.raw["queries"][0])
        third.update(id="q3",sequence="two",text="new task")
        self.raw["queries"].append(third)
        dataset = self.load()
        resets = []
        replay(dataset,dataset.queries,lambda text,feedback,qid:self.response([],[]),len,reset=lambda:resets.append(1))
        self.assertEqual(len(resets),2)

    def test_unused_feedback_does_not_charge_baseline_input(self):
        dataset = self.sequence()
        rows,_=replay(dataset,dataset.queries,lambda text,feedback,qid:self.response(["a.rs"],[self.view()]),len)
        self.assertGreater(rows[1]["available_feedback_tokens"],0)
        self.assertEqual(rows[1]["input_tokens"],len(dataset.queries[1].text))
