import unittest
import numpy as np
from eval.retrieval import Session


class SessionAlgorithmTests(unittest.TestCase):
    def test_drift_clears_bounded_history(self):
        session=Session("combined")
        original=np.asarray([1,0],dtype=np.float32)
        for i in range(30): session.remember(str(i),original,{"a":original})
        self.assertEqual(len(session.history),16)
        query,used,reset=session.adjusted(np.asarray([0,1],dtype=np.float32),{"query_id":"29","accepted":["a"],"rejected":[]})
        self.assertTrue(reset)
        self.assertFalse(used)
        self.assertEqual(len(session.history),0)
        np.testing.assert_allclose(query,[0,1])

    def test_feedback_cannot_read_unreturned_documents(self):
        session=Session("feedback-rocchio")
        original=np.asarray([1,0],dtype=np.float32)
        session.remember("one",original,{"shown":np.asarray([.8,.6],dtype=np.float32)})
        same,used,_=session.adjusted(original,{"query_id":"one","accepted":["not-shown"],"rejected":[]})
        self.assertFalse(used)
        np.testing.assert_allclose(same,original)
        changed,used,_=session.adjusted(original,{"query_id":"one","accepted":["shown"],"rejected":[]})
        self.assertTrue(used)
        self.assertGreater(changed[1],0)
        self.assertGreater(float(changed@original),.98)

    def test_short_anaphora_retains_topic_but_explicit_switch_resets(self):
        session=Session('combined')
        topic=np.asarray([1,0],dtype=np.float32)
        follow=np.asarray([0,1],dtype=np.float32)
        session.remember('start',topic,{'shown':topic})
        changed,used,reset=session.adjusted(follow,{'query_id':'start','accepted':['shown'],'rejected':[]},'What happens when it expires?')
        self.assertFalse(reset)
        self.assertTrue(used)
        self.assertGreater(changed[0],0)
        session.remember('follow',follow,{'shown':topic})
        np.testing.assert_allclose(session.history['follow']['topic'],topic)
        _,_,reset=session.adjusted(topic,None,'compiler diagnostics')
        self.assertTrue(reset)
