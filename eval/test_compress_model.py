import tempfile
from pathlib import Path
import unittest
import numpy as np
from eval.compress_model import quantized_rows,write_tensors,read_tensors


class StorageQuantizationTests(unittest.TestCase):
    def test_pooling_preserves_different_token_magnitudes(self):
        source=np.array([[100,50,0],[.01,.02,.03],[0,0,0]],dtype=np.float32)
        weights=np.array([.2,4,1],dtype=np.float32)
        packed,scales=quantized_rows(source,weights)
        original=(source*weights[:,None]).mean(axis=0)
        decoded=(packed.astype(np.float32)*scales[:,None]).mean(axis=0)
        np.testing.assert_allclose(decoded,original,rtol=.009,atol=.001)
        self.assertTrue(np.isfinite(decoded).all())
        # Dropping per-row scales would massively overvalue the small row.
        self.assertGreater(np.linalg.norm(original-packed.astype(np.float32).mean(axis=0)),10)

    def test_artifact_roundtrip_and_refuse_overwrite(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'model.safetensors'
            arrays={'embeddings':np.array([[1,-2]],dtype=np.int8),'weights':np.array([.25],dtype=np.float32)}
            write_tensors(path,arrays)
            loaded=read_tensors(path)
            for name,array in arrays.items(): np.testing.assert_array_equal(loaded[name],array)
            with self.assertRaises(FileExistsError): write_tensors(path,arrays)
