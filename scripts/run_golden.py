import json
import os
import shutil
import tempfile
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CORPUS = ROOT / "corpus_tiny"
GOLDEN_DATA = ROOT / "golden_data"
QUERY_SET = GOLDEN_DATA / "query_set.json"
EXPECTED = GOLDEN_DATA / "expected_results.json"


def _strip_windows_extended_prefix(path_str: str) -> str:
    if path_str.startswith("\\\\?\\"):
        return path_str[4:]
    if path_str.startswith("//?/"):
        return path_str[4:]
    return path_str


def normalize_path(path_str: str) -> str:
    cleaned = _strip_windows_extended_prefix(path_str)
    root_clean = _strip_windows_extended_prefix(str(ROOT))
    p = Path(cleaned)
    root_path = Path(root_clean)
    try:
        rel = p.resolve().relative_to(root_path.resolve())
    except Exception:
        try:
            rel = Path(cleaned).relative_to(root_path)
        except Exception:
            rel = Path(cleaned)
    return rel.as_posix()


def get_ixos_bin() -> Path:
    env_bin = os.environ.get("IXOS_BIN")
    if env_bin:
        return Path(env_bin)

    exe_name = "ixos.exe" if os.name == "nt" else "ixos"
    debug_bin = ROOT / "target" / "debug" / exe_name
    if debug_bin.exists():
        return debug_bin

    print("building ixos binary...")
    subprocess.check_call(["cargo", "build", "--bin", "ixos"], cwd=ROOT)
    if debug_bin.exists():
        return debug_bin

    raise SystemExit("ixos binary not found after build")


def maybe_set_permission_denied() -> None:
    if os.name == "nt":
        return
    restricted = CORPUS / "restricted" / "secret.txt"
    if restricted.exists():
        try:
            os.chmod(restricted, 0)
        except OSError:
            pass


def restore_permissions() -> None:
    if os.name == "nt":
        return
    restricted = CORPUS / "restricted" / "secret.txt"
    if restricted.exists():
        try:
            os.chmod(restricted, 0o644)
        except OSError:
            pass


def run_query(bin_path: Path, query: str, limit: int, env: dict = None) -> dict:
    cmd = [
        str(bin_path),
        "search",
        query,
        "--dir",
        "corpus_tiny",
        "--format",
        "json",
        "--limit",
        str(limit),
        "--search-mode",
        "flash",
        "--cache-mode",
        "jit",
    ]
    result = subprocess.run(
        cmd,
        cwd=ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        env=env,
    )
    if result.returncode != 0:
        raise RuntimeError(f"search failed: {result.stderr.strip()}")
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"invalid JSON output: {exc}\nSTDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}")


def diff_list(label: str, expected: list, actual: list) -> list:
    lines = []
    if expected != actual:
        lines.append(f"{label} mismatch")
        lines.append(f"  expected: {expected}")
        lines.append(f"  actual:   {actual}")
    return lines


def main() -> int:
    data = json.loads(QUERY_SET.read_text(encoding="utf-8"))
    expected_data = json.loads(EXPECTED.read_text(encoding="utf-8"))

    queries = {q["id"]: q["query"] for q in data.get("queries", [])}
    expected = {e["query_id"]: e for e in expected_data.get("expected", [])}

    missing = [qid for qid in queries.keys() if qid not in expected]
    if missing:
        print("ERROR: missing expected entries for:", ", ".join(missing))
        return 1

    bin_path = get_ixos_bin()
    
    # P1: Create isolated environment for testing
    # This prevents the test from failing if the user hasn't granted consent
    # or if their personal config interferes.
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        
        # Create isolated environment
        env = os.environ.copy()
        
        # Isolate config and data (where compliance/consent lives)
        env["HOME"] = str(temp_path)
        env["XDG_CONFIG_HOME"] = str(temp_path / ".config")
        env["XDG_DATA_HOME"] = str(temp_path / ".local" / "share")
        
        # Preserve cache (where models live)
        # We inherit XDG_CACHE_HOME from os.environ by default
        
        # Windows-specific isolation
        if os.name == "nt":
            # Isolate Roaming (Config + Compliance)
            env["APPDATA"] = str(temp_path / "AppData" / "Roaming")
            
            # Preserve Local (Models usually live here in cache_dir)
            # We inherit LOCALAPPDATA from os.environ
            
        print(f"Running in isolated environment: {temp_path}")
        
        # Grant consent in the isolated environment
        print("Granting AI consent for test environment...")
        subprocess.check_call(
            [str(bin_path), "compliance", "consent", "--grant"],
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )

        # Index the corpus first to ensure consistent results (avoid cold start timeouts)
        print("Indexing corpus in test environment...")
        subprocess.check_call(
            [str(bin_path), "index", "corpus_tiny", "--clear"],
            env=env,
            cwd=ROOT,  # Ensure it finds corpus_tiny relative to ROOT
            # stdout=subprocess.DEVNULL,
            # stderr=subprocess.DEVNULL
        )


        maybe_set_permission_denied()
        failures = []
        try:
            for qid, query in queries.items():
                exp = expected[qid]
                top_k = int(exp.get("top_k", 0))
                # Keep a wider retrieval window so must_include checks are stable
                # even when semantic ordering shifts among close matches.
                limit = max(20, top_k)
                result = run_query(bin_path, query, limit, env=env)

                results = result.get("results", [])
                paths = [normalize_path(r["path"]) for r in results]

                if top_k == 0 and not exp.get("must_include") and not exp.get("must_exclude"):
                    if len(paths) != 0:
                        failures.append(f"{qid}: expected no results, got {len(paths)}: {paths}")
                    continue

                if top_k > 0:
                    expected_top = [normalize_path(p) for p in exp.get("top_paths", [])]
                    actual_top = paths[:top_k]
                    failures.extend(
                        [f"{qid}: {line}" for line in diff_list("top_k", expected_top, actual_top)]
                    )

                must_include = [normalize_path(p) for p in exp.get("must_include", [])]
                for inc in must_include:
                    if inc not in paths:
                        failures.append(f"{qid}: missing required result {inc}")

                must_exclude = [normalize_path(p) for p in exp.get("must_exclude", [])]
                for exc in must_exclude:
                    if exc in paths:
                        failures.append(f"{qid}: unexpected result {exc}")
        finally:
            restore_permissions()

    if failures:
        print("Golden test failures:")
        for item in failures:
            print("-", item)
        return 1

    print("golden tests passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
