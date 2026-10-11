"""Real-model CLI correctness probes. These are not retrieval-quality benchmarks.

Run after building: python scripts/verify_cli_contract.py --binary target/release/ixos.exe
All searched fixtures are disposable. Native metadata is inspected without logging keys.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--binary", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=Path("reports/restoration/gate1-cli-contract.json"))
    args = parser.parse_args()
    binary = args.binary.resolve()
    records = []
    args.output.parent.mkdir(parents=True, exist_ok=True)
    binary_hash = hashlib.sha256(binary.read_bytes()).hexdigest()

    def save():
        args.output.write_text(json.dumps(dict(binary_sha256=binary_hash,
            note="Real production Flash, controlled correctness fixtures; not a quality or throughput benchmark.",
            records=records), indent=2, ensure_ascii=False), encoding="utf-8")
    with tempfile.TemporaryDirectory(prefix="ixos-contract-") as temporary:
        root = Path(temporary)
        config = root / "config.toml"
        config.write_text('''version = 1
[search]
default_limit = 1
context_lines = 0
cache_mode = "ephemeral"
search_mode = "flash"
enable_secure_ranking = false
min_score_threshold = 0.0
[output]
default_format = "json"
color = false
''', encoding="utf-8")

        def run(label, query, directory, *flags, expect_success=True):
            argv = [str(binary), "--config", str(config), "search", query, "--retrieval", "legacy", "--dir", str(directory), *flags]
            started = time.perf_counter()
            result = subprocess.run(argv, capture_output=True, timeout=60)
            elapsed = round((time.perf_counter() - started) * 1000, 3)
            payloads = []
            for line in result.stdout.decode("utf-8").split("\n"):
                if line.strip():
                    payloads.append(json.loads(line))
            statistics = [json.loads(line) for line in result.stderr.decode("utf-8").split("\n") if line.startswith('{"')]
            row = dict(label=label, argv=argv, exit_code=result.returncode, wall_ms=elapsed,
                       stdout_bytes=len(result.stdout), payloads=payloads, stats=statistics,
                       stderr=result.stderr.decode("utf-8"))
            records.append(row)
            save()  # Preserve raw evidence even if the next assertion fails.
            assert (result.returncode == 0) == expect_success, row
            print(f"{label}: exit={result.returncode}, bytes={len(result.stdout)}, wall={elapsed}ms", flush=True)
            return payloads, statistics

        def utility(label, *arguments):
            argv = [str(binary), "--config", str(config), *map(str, arguments)]
            result = subprocess.run(argv, capture_output=True, timeout=60)
            stdout = result.stdout.decode("utf-8")
            records.append(dict(label=label, argv=argv, exit_code=result.returncode,
                                stdout=stdout, stderr=result.stderr.decode("utf-8")))
            save()
            assert result.returncode == 0, records[-1]
            print(f"{label}: exit={result.returncode}", flush=True)
            return json.loads(stdout) if "--json" in arguments else stdout

        corpus = root / "cache"
        corpus.mkdir()
        source = corpus / "botany.md"
        source.write_text("Photosynthesis converts light into glucose inside chlorophyll-containing leaves.\n", encoding="utf-8")
        (corpus / "network.md").write_text("Encryption authenticates network packets and transport keys.\n", encoding="utf-8")
        before_names = sorted(p.name for p in corpus.iterdir())
        source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
        cold, cold_stats = run("native-cold", "photosynthesis light chlorophyll", corpus,
                              "--cache-mode", "native-cache", "--stats", "--limit", "5")
        warm, warm_stats = run("native-warm", "photosynthesis light chlorophyll", corpus,
                              "--cache-mode", "native-cache", "--stats", "--limit", "5")
        assert cold[-1]["results"] and warm[-1]["results"]
        assert cold_stats[-1]["diagnostics"]["embedding"]["candidates_embedded"] > 0
        assert warm_stats[-1]["diagnostics"]["embedding"]["candidates_embedded"] == 0
        assert warm_stats[-1]["diagnostics"]["embedding"]["cache_hits"] > 0
        assert abs(cold[-1]["results"][0]["score"] - warm[-1]["results"][0]["score"]) < 0.001
        assert sorted(p.name for p in corpus.iterdir()) == before_names
        assert hashlib.sha256(source.read_bytes()).hexdigest() == source_hash
        if os.name == "nt":
            metadata = Path(str(source) + ":ixos_embed").read_bytes()
        elif hasattr(os, "getxattr"):
            metadata = os.getxattr(source, "user.ixos.embed")
        else:
            metadata = None
        if metadata is not None:
            dimensions = int.from_bytes(metadata[1:5], "little")
            assert metadata[0] == 3 and dimensions == 512
            assert len(metadata) == 69 + dimensions * 2 + 32
            records.append(dict(label="native-metadata", schema=metadata[0], dimensions=dimensions, bytes=len(metadata)))

        initial_stats = utility("cache-stats-initial", "cache", "stats", "--legacy", "--dir", corpus, "--json")
        assert initial_stats["present_entries"] == 1 and initial_stats["cached_files"] == 1, initial_stats
        # Edit the existing stream: CREATE_ALWAYS can drop ADS on Windows and would
        # test cache removal rather than validation of a surviving stale entry.
        with source.open("r+b") as stream:
            stream.write(b"Photosynthesis light chlorophyll: changed facts and a different source version.\n")
            stream.truncate()
        stale = utility("cache-stats-stale", "cache", "stats", "--legacy", "--dir", corpus, "--json")
        assert stale["present_entries"] == 1 and stale["cached_files"] == 0, stale
        _, changed_stats = run("native-edited", "photosynthesis light chlorophyll", corpus,
                               "--cache-mode", "native-cache", "--stats", "--limit", "5")
        assert changed_stats[-1]["diagnostics"]["embedding"]["candidates_embedded"] > 0
        valid = utility("cache-stats-valid", "cache", "stats", "--legacy", "--dir", corpus, "--json")
        assert valid["cached_files"] == 1 and valid["cache_size_bytes"] == 1125, valid
        changed_hash = hashlib.sha256(source.read_bytes()).hexdigest()
        utility("cache-clear-targeted", "cache", "clear", "--dir", corpus, "--force")
        assert hashlib.sha256(source.read_bytes()).hexdigest() == changed_hash
        cleared = utility("cache-stats-cleared", "cache", "stats", "--legacy", "--dir", corpus, "--json")
        assert cleared["present_entries"] == 0 and cleared["cached_files"] == 0, cleared
        utility("index-warmup", "index", corpus, "--use-xattr")
        indexed = utility("cache-stats-indexed", "cache", "stats", "--legacy", "--dir", corpus, "--json")
        assert indexed["cached_files"] == 2 and indexed["cache_size_bytes"] == 2250, indexed
        assert sorted(p.name for p in corpus.iterdir()) == before_names
        assert hashlib.sha256(source.read_bytes()).hexdigest() == changed_hash

        jit = root / "jit"
        jit.mkdir()
        jit_source = jit / "code.tsx"
        jit_source.write_text("export const witness_embedding = 'CPU retrieval';\n", encoding="utf-8")
        for number in range(2):
            _, stats = run(f"jit-{number}", "witness_embedding", jit, "--cache-mode", "ephemeral", "--stats")
            assert stats[-1]["diagnostics"]["embedding"]["cache_hits"] == 0
            assert stats[-1]["diagnostics"]["embedding"]["candidates_embedded"] == 1
        if os.name == "nt":
            assert not Path(str(jit_source) + ":ixos_embed").exists()
        assert sorted(p.name for p in jit.iterdir()) == ["code.tsx"]

        coverage = root / "coverage"
        coverage.mkdir()
        (coverage / "mixed.md").write_text("Gardening introduction.\n" + "Unrelated introductory notes.\n" * 900 +
                                           "\nTAIL_WITNESS_7391: cache freshness checks modified content.\n", encoding="utf-8")
        tail, _ = run("late-lexical-witness", "TAIL_WITNESS_7391", coverage, "--evidence", "--limit", "5")
        witness = tail[-1]["results"][0]
        assert "TAIL_WITNESS_7391" in witness["snippet"], witness
        assert witness["context"]["line_number"] == 903, witness

        ignored = root / "ignored"
        ignored.mkdir()
        (ignored / ".gitignore").write_text("excluded/**\n", encoding="utf-8")
        for folder in ["excluded", "node_modules", ".hidden", "source"]:
            (ignored / folder).mkdir()
            (ignored / folder / "code.rs").write_text("lexical_witness\n", encoding="utf-8")
        visible, _ = run("ignore-consistency", "lexical_witness", ignored, "--limit", "10")
        assert len(visible[-1]["results"]) == 1
        assert "source" in visible[-1]["results"][0]["path"]

        choices = root / "choices"
        choices.mkdir()
        for number in range(25):
            (choices / f"notes-{number}.md").write_text("embedding retrieval notes\n" + "context line\n" * 8, encoding="utf-8")
        defaults, _ = run("configured-defaults", "embedding", choices)
        assert defaults[-1]["count"] == 1
        bounded, stats = run("bounded-valid-json", "embedding", choices, "--limit", "20", "--context", "5",
                             "--max-output-bytes", "1800", "--snippet-chars", "20", "--stats")
        assert stats[-1]["outputBytes"] <= 1800
        assert stats[-1]["resultCount"] == bounded[-1]["count"]
        streaming, _ = run("progressive-limits", "embedding", choices, "--limit", "5", "--progressive")
        assert all(len(payload.get("results", [])) <= 5 for payload in streaming)

        failure, _ = run("missing-directory-exit", "embedding", root / "missing", expect_success=False)
        assert failure[-1]["type"] == "error"

    save()
    print(f"Saved {args.output}")


if __name__ == "__main__":
    main()
