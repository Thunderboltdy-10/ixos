"""Release assembly must preserve verified bytes and satisfy the website's links."""
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
        self.targets = ASSEMBLY.RUNTIME.TARGETS
        for target in self.targets:
            folder = self.source / target
            folder.mkdir(parents=True)
            names = set(ASSEMBLY.RUNTIME.DESKTOP_ASSETS[target].values())
            assets = []
            for name in names:
                payload = (target + ":" + name).encode()
                (folder / name).write_bytes(payload)
                assets.append({"file": name, "bytes": len(payload), "sha256": hashlib.sha256(payload).hexdigest()})
            (folder / "build-receipt.json").write_text(json.dumps({"tag": "desktop-v0.1.0", "platform": target, "signed_updates": False, "assets": assets}))

    def assemble(self):
        ASSEMBLY.assemble(self.source, self.output, "desktop-v0.1.0", "desktop", self.targets, False)

    def test_saved_installers_match_every_landing_page_platform(self):
        self.assemble()
        for target in self.targets:
            name = ASSEMBLY.RUNTIME.DESKTOP_ASSETS[target]["download"]
            self.assertEqual((self.output / name).read_bytes(), (self.source / target / name).read_bytes())
        for line in (self.output / "SHA256SUMS").read_text().splitlines():
            digest, name = line.split("  ", 1)
            self.assertEqual(hashlib.sha256((self.output / name).read_bytes()).hexdigest(), digest)
        self.assertFalse((self.output / "desktop-update.json").exists())

    def test_modified_artifacts_and_missing_platforms_cannot_be_assembled(self):
        name = ASSEMBLY.RUNTIME.DESKTOP_ASSETS["Windows-X64"]["download"]
        (self.source / "Windows-X64" / name).write_bytes(b"tampered")
        with self.assertRaisesRegex(ValueError, "verification"):
            self.assemble()
        (self.source / "Windows-X64" / "build-receipt.json").unlink()
        with self.assertRaisesRegex(ValueError, "Missing verified platforms"):
            self.assemble()

    def test_linux_download_is_required_in_addition_to_its_update_image(self):
        path = self.source / "Linux-X64" / "build-receipt.json"
        receipt = json.loads(path.read_text())
        receipt["assets"] = [asset for asset in receipt["assets"] if not asset["file"].endswith(".deb")]
        path.write_text(json.dumps(receipt))
        with self.assertRaisesRegex(ValueError, "landing page's installer"):
            self.assemble()
