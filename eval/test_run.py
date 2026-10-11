import copy
from pathlib import Path
import unittest
from eval import test_contract as fixtures
from eval.contract import ContractError
from eval.run import artifact_identity, bundle_check, percentile


class RunTests(unittest.TestCase):
    setUp = fixtures.ContractTests.setUp
    load = fixtures.ContractTests.load

    def test_bundle_rejects_repeated_ids(self):
        dataset = self.load()
        with self.assertRaises(ContractError):
            bundle_check([dataset, dataset])

    def test_bundle_rejects_cross_manifest_leakage(self):
        first = self.load()
        raw = copy.deepcopy(self.raw)
        raw["queries"][0].update(id="q2", group="new-family", split="test", text="new query")
        second = self.load(raw)
        with self.assertRaisesRegex(ContractError, "content leaks"):
            bundle_check([first, second])

    def test_artifact_identity_tracks_content_not_directory_label(self):
        folder = self.root/"model"
        folder.mkdir()
        for name in ["model.safetensors", "tokenizer.json", "config.json"]:
            (folder/name).write_bytes(name.encode())
        (folder/'tokenizer.json').write_text('{"truncation":null,"padding":null}',encoding='utf-8')
        first = artifact_identity(folder)
        (folder/"config.json").write_bytes(b"changed recipe")
        second = artifact_identity(folder)
        self.assertNotEqual(first["fingerprint"], second["fingerprint"])

    def test_percentiles(self):
        self.assertIsNone(percentile([], .95))
        self.assertEqual(percentile([7], .95), 7)
        self.assertEqual(percentile([0, 10], .5), 5)
        self.assertEqual(percentile([0, 10], .95), 9.5)
