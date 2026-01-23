import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CORPUS = ROOT / "corpus_tiny"
QUERY_SET = CORPUS / "query_set.json"
EXPECTED = CORPUS / "expected_results.json"


def normalize_path(path_str: str) -> str:
    p = Path(path_str)
    try:
        rel = p.resolve().relative_to(ROOT.resolve())
    except Exception:
        rel = Path(path_str)
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


def run_query(bin_path: Path, query: str, limit: int) -> dict:
    cmd = [
        str(bin_path),
        "search",
        query,
        "--dir",
        str(CORPUS),
        "--format",
        "json",
        "--limit",
        str(limit),
        "--stub-model",
    ]
    result = subprocess.run(
        cmd,
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"search failed: {result.stderr.strip()}")
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"invalid JSON output: {exc}\n{result.stdout}")


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

    maybe_set_permission_denied()
    failures = []
    try:
        for qid, query in queries.items():
            exp = expected[qid]
            top_k = int(exp.get("top_k", 0))
            limit = max(10, top_k)
            result = run_query(bin_path, query, limit)

            results = result.get("results", [])
            paths = [normalize_path(r["path"]) for r in results]

            if top_k == 0 and not exp.get("must_include") and not exp.get("must_exclude"):
                if len(paths) != 0:
                    failures.append(f"{qid}: expected no results, got {len(paths)}")
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
