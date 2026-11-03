"""Release assembly must preserve verified bytes and publish one installer per platform."""
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("assemble_release", ROOT / "scripts/assemble-release.py")
ASSEMBLY = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(ASSEMBLY)


class ReleaseAssembly(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.source, self.output = self.root / "builds", self.root / "release"
        self.targets = tuple(ASSEMBLY.ASSETS)
        for target, name in ASSEMBLY.ASSETS.items():
            folder = self.source / target
            folder.mkdir(parents=True)
            payload = target.encode()
            (folder / name).write_bytes(payload)
            asset = {"file": name, "bytes": len(payload), "sha256": hashlib.sha256(payload).hexdigest()}
            (folder / "build-receipt.json").write_text(json.dumps({"tag": "v1.2.3", "platform": target, "assets": [asset]}))

    def assemble(self):
        ASSEMBLY.assemble(self.source, self.output, "v1.2.3", self.targets)

    def test_publishes_only_installers_and_a_matching_manifest(self):
        self.assemble()
        self.assertEqual({path.name for path in self.output.iterdir()}, {*ASSEMBLY.ASSETS.values(), "desktop-manifest.json"})
        manifest = json.loads((self.output / "desktop-manifest.json").read_text())
        self.assertEqual(manifest["version"], "1.2.3")
        self.assertEqual({asset["target"] for asset in manifest["assets"]}, set(self.targets))
        for asset in manifest["assets"]:
            self.assertEqual(hashlib.sha256((self.output / asset["file"]).read_bytes()).hexdigest(), asset["sha256"])

    def test_modified_artifacts_and_missing_platforms_cannot_be_assembled(self):
        (self.source / "Windows-X64" / ASSEMBLY.ASSETS["Windows-X64"]).write_bytes(b"tampered")
        with self.assertRaisesRegex(ValueError, "verification"):
            self.assemble()
        (self.source / "Windows-X64" / "build-receipt.json").unlink()
        with self.assertRaisesRegex(ValueError, "Missing verified platforms"):
            self.assemble()


if __name__ == "__main__":
    unittest.main()
