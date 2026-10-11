import unittest
import numpy as np
from eval.contract import Source
from eval.representations import chunks,diverse_indices,lexical_diverse_indices,quantize,representative_count,uniform_indices


class RepresentationTests(unittest.TestCase):
    def test_full_coverage_unicode_locators(self):
        source=Source("a.txt","",("intro 缓存🦀","α"*4000,"tail target"))
        result=chunks(source,characters=64)
        text="\n".join(source.lines)
        self.assertEqual("".join(p.text for p in result),text)
        data=text.encode("utf-8")
        for part in result:
            self.assertEqual(data[part.start_byte:part.end_byte].decode(),part.text)
            self.assertLessEqual(part.start_line,part.end_line)
        self.assertIn("tail target",result[-1].text)

    def test_dynamic_count_and_uniform_intro_end(self):
        self.assertEqual([representative_count(n) for n in [1,2,3,8,9,100]],[1,2,3,4,8,8])
        self.assertEqual(uniform_indices(20,4),[0,6,13,19])

    def test_vector_diversity_anchors_intro_and_rare_topic(self):
        vectors=np.asarray([[1,0],[1,0],[0,1],[1,0]],dtype=np.float32)
        self.assertEqual(diverse_indices(vectors,2),[0,2])

    def test_lexical_diversity_anchors_intro_and_rare_topic(self):
        source=Source("a.txt","",("cache entry\n"*100+"retry quantum orchard",))
        parts=chunks(source,characters=64)
        picks=lexical_diverse_indices(parts,2)
        self.assertEqual(picks[0],0)
        self.assertIn("quantum",parts[picks[1]].text)

    def test_quantization_preserves_dimensions_and_zero_vectors(self):
        vectors=np.asarray([[0,0,0],[.4,-.6,.1]],dtype=np.float32)
        for precision,expected in [("f32",24),("f16",12),("int8",14)]:
            result,size=quantize(vectors,precision)
            self.assertEqual(result.shape,vectors.shape)
            self.assertTrue(np.isfinite(result).all())
            self.assertEqual(size,expected)
            self.assertLessEqual(np.max(np.abs(result-vectors)),.006)
