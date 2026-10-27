"""Exercise the real installer/CLI against an isolated local release server.

Run cargo build -p ixos-cli -p ixos-install first. No user PATH/config is changed.
"""
import contextlib
import hashlib
import importlib.util
import http.server
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import threading
import time
import unittest

ROOT = Path(__file__).resolve().parents[1]
SUFFIX = ".exe" if os.name == "nt" else ""
CLI = ROOT / "target/debug" / f"ixos{SUFFIX}"
INSTALL = ROOT / "target/debug" / f"ixos-install{SUFFIX}"


@unittest.skipUnless(CLI.is_file() and INSTALL.is_file(), "Build CLI and installer first")
class Installation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import platform
        cls.target = {"Windows": "Windows-X64", "Linux": "Linux-X64", "Darwin": "macOS-ARM64" if platform.machine() == "arm64" else "macOS-X64"}[platform.system()]
        cls.binary = CLI.read_bytes()
        cls.version = subprocess.check_output([CLI, "--version"], text=True).split()[1]

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.home = Path(self.temp.name)
        self.env = dict(os.environ, IXOS_HOME=str(self.home), IXOS_SKILL_HOME=str(self.home / "agents"), IXOS_NO_UPDATE_CHECK="1")
        self.tag = f"engine-v{self.version}"
        self.asset = f"ixos-{self.target}{SUFFIX}"
        self.payload = self.binary
        self.probes = 0
        self.delay = 0
        self.manifest = {"version": self.version, "protocol_major": 1, "assets": [{"target": self.target, "file": self.asset, "sha256": hashlib.sha256(self.payload).hexdigest()}]}
        self.releases = [{"tag_name": self.tag, "draft": False, "prerelease": False}]
        test = self

        class Handler(http.server.BaseHTTPRequestHandler):
            def do_GET(self):
                if self.path.startswith("/releases?"):
                    test.probes += 1
                    time.sleep(test.delay)
                    data = json.dumps(test.releases).encode()
                elif self.path.endswith("runtime-manifest.json"):
                    data = json.dumps(test.manifest).encode()
                elif self.path.endswith(test.asset):
                    data = test.payload
                else:
                    self.send_error(404)
                    return
                self.send_response(200)
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                with contextlib.suppress(ConnectionError):
                    self.wfile.write(data)

            def log_message(self, *_):
                pass

        self.server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.addCleanup(self.server.server_close)
        self.addCleanup(self.server.shutdown)
        self.env["IXOS_RELEASES_TEST_SERVER"] = f"http://127.0.0.1:{self.server.server_port}"

    def command(self, executable, *args):
        return subprocess.run([str(executable), *args], env=self.env, capture_output=True, text=True, timeout=120)

    def managed(self):
        path = self.home / "bin" / f"ixos{SUFFIX}"
        path.parent.mkdir(exist_ok=True)
        shutil.copy2(CLI, path)
        return path

    def seed_models(self):
        if (ROOT / "models/code/model.safetensors").is_file():
            shutil.copytree(ROOT / "models", self.home / "data/models")
        else:
            result = self.command(CLI, "setup")
            self.assertEqual(result.returncode, 0, result.stderr)

    def test_checksum_failure_preserves_existing_engine(self):
        path = self.managed()
        self.payload = b"corrupt release bytes"
        result = self.command(INSTALL, "--no-desktop")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("SHA256 mismatch", result.stderr)
        self.assertEqual(path.read_bytes(), self.binary)

    def test_protocol_failure_happens_before_install(self):
        self.manifest["protocol_major"] = 99
        result = self.command(INSTALL, "--no-desktop")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("protocol", result.stderr)
        self.assertFalse((self.home / "bin/ixos").exists())

    def test_desktop_preflight_prevents_partial_default_install(self):
        result = self.command(INSTALL)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("No published stable", result.stderr)
        self.assertFalse((self.home / "bin").exists())

    def test_real_setup_shared_engine_and_mcp_then_repeat_install(self):
        self.seed_models()
        # An existing running worker must survive the atomic executable replacement.
        path = self.managed()
        worker = subprocess.Popen([path, "runtime", "serve"], env=self.env, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        self.addCleanup(worker.wait)
        self.addCleanup(worker.kill)
        result = self.command(INSTALL, "--no-desktop")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue((self.home / "agents/.agents/skills/ixos/SKILL.md").is_file())
        self.assertEqual(self.command(path, "--version").stdout.strip(), f"ixos {self.version}")
        result = self.command(INSTALL, "--no-desktop")
        # The old image can still be in use on Windows; failure is explicit and safe.
        if result.returncode:
            self.assertIn("Previous engine is still running", result.stderr)
        self.assertEqual(path.read_bytes(), self.binary)
        worker.stdin.write(b'{"id":1,"op":"hello","params":{}}\n')
        worker.stdin.flush()
        self.assertEqual(json.loads(worker.stdout.readline())["result"]["protocol_major"], 1)
        worker.stdin.close()
        worker.wait(timeout=10)
        worker.stdout.close()

    def test_model_setup_failure_retains_previous_engine(self):
        path = self.managed()
        # Keep the failure offline and deterministic: an edited, user-managed skill
        # makes setup return failure after validating the existing local models.
        self.seed_models()
        skill = self.home / "agents/.agents/skills/ixos"
        skill.mkdir(parents=True)
        (skill / "SKILL.md").write_text("user-owned custom skill")
        result = self.command(INSTALL, "--no-desktop")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("skill", result.stderr.lower())
        self.assertEqual(path.read_bytes(), self.binary)
        self.assertEqual((skill / "SKILL.md").read_text(), "user-owned custom skill")

    def test_corrupt_model_is_repaired_from_verified_local_artifacts(self):
        self.seed_models()
        model = self.home / "data/models/code"
        source = self.home / "replacement-model"
        shutil.copytree(model, source)
        (model / "config.json").write_text("corrupt cached config")
        result = self.command(CLI, "model", "install", "code", "--from", str(source))
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((model / "config.json").read_bytes(), (source / "config.json").read_bytes())

    def test_update_notice_reaches_cli_and_mcp_without_polluting_json(self):
        path = self.managed()
        future = "999.0.0"
        self.releases[0]["tag_name"] = f"engine-v{future}"
        self.manifest["version"] = future
        result = self.command(path, "update", "--check")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("ixos update", result.stdout)
        self.env.pop("IXOS_NO_UPDATE_CHECK")
        result = self.command(path, "grep", "unused", "--dir", str(self.home), "--json")
        json.loads(result.stdout)
        self.assertIn("Ixos update available", result.stderr)
        source = self.home / "sample.txt"
        source.write_text("local source")
        requests = [{"jsonrpc": "2.0", "id": 1, "method": "initialize"}, {"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "read", "arguments": {"path": "sample.txt"}}}]
        output = subprocess.run([path, "mcp", "--dir", str(self.home)], env=self.env, input="\n".join(map(json.dumps, requests)) + "\n", text=True, capture_output=True, timeout=30)
        response = json.loads(output.stdout.splitlines()[-1])["result"]
        self.assertIn("Ask the user", response["content"][-1]["text"])
        # Metadata advertises a newer version but serves the old binary: reject it.
        result = self.command(path, "update")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("version mismatch", result.stderr)
        self.assertEqual(path.read_bytes(), self.binary)

    def test_offline_or_slow_update_check_does_not_delay_cli(self):
        path = self.managed()
        self.delay = 2
        source = self.home / "corpus"
        source.mkdir()
        (source / "sample.txt").write_text("local source")
        self.assertEqual(self.command(path, "grep", "local", "--dir", str(source), "--json").returncode, 0)
        self.env.pop("IXOS_NO_UPDATE_CHECK")
        started = time.monotonic()
        result = self.command(path, "grep", "local", "--dir", str(source), "--json")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertLess(time.monotonic() - started, 1.5)
        result = self.command(path, "grep", "local", "--dir", str(source), "--json")
        self.assertEqual(result.returncode, 0, result.stderr)
        deadline = time.monotonic() + 10
        while not (self.home / "cache/updates.json").exists() and time.monotonic() < deadline:
            time.sleep(0.1)
        self.assertTrue((self.home / "cache/updates.json").exists())
        self.assertEqual(self.probes, 1)


class ReleaseManifests(unittest.TestCase):
    def test_all_platform_assets_hashes_and_signed_update_urls(self):
        spec = importlib.util.spec_from_file_location("release_manifest", ROOT / "scripts/runtime-manifest.py")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for target in module.TARGETS:
                name = module.desktop_name(target)
                (root / name).write_bytes(target.encode())
                update = f"Ixos-{target}.app.tar.gz" if target.startswith("macOS") else name
                (root / update).write_bytes(target.encode())
                (root / (update + ".sig")).write_text("fixture-signature")
            manifest = module.manifest(root, "1.2.3", 1, "desktop")
            self.assertEqual(len(manifest["assets"]), 4)
            for asset in manifest["assets"]:
                self.assertEqual(asset["sha256"], hashlib.sha256((root / asset["file"]).read_bytes()).hexdigest())
            update = module.desktop_update(root, "1.2.3")
            self.assertEqual(set(update["platforms"]), {"windows-x86_64", "linux-x86_64", "darwin-aarch64", "darwin-x86_64"})
            self.assertTrue(all("/desktop-v1.2.3/" in value["url"] for value in update["platforms"].values()))
            (root / "Ixos-Windows-X64-setup.exe.sig").unlink()
            with self.assertRaises(FileNotFoundError):
                module.desktop_update(root, "1.2.3")


if __name__ == "__main__":
    unittest.main()
