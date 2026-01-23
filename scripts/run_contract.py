import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CORPUS = ROOT / "corpus_tiny"
SCHEMA = ROOT / "scripts" / "contract_schema.json"

QUERIES = ["project_plan_2025", "privacy policy", "q1 financial report"]


def get_ixos_bin() -> Path:
    env_bin = os.environ.get("IXOS_BIN")
    if env_bin:
        return Path(env_bin)

    exe_name = "ixos.exe" if os.name == "nt" else "ixos"
    debug_bin = ROOT / "target" / "debug" / exe_name
    if debug_bin.exists():
        return debug_bin

    subprocess.check_call(["cargo", "build", "--bin", "ixos"], cwd=ROOT)
    if debug_bin.exists():
        return debug_bin

    raise SystemExit("ixos binary not found after build")


def run_query(bin_path: Path, query: str) -> dict:
    cmd = [
        str(bin_path),
        "search",
        query,
        "--dir",
        str(CORPUS),
        "--format",
        "json",
        "--limit",
        "10",
        "--stub-model",
    ]
    result = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"search failed: {result.stderr.strip()}")
    return json.loads(result.stdout)


def validate_schema(obj: dict, schema: dict) -> list:
    errors = []
    required = schema.get("required", [])
    for key in required:
        if key not in obj:
            errors.append(f"missing required field: {key}")

    props = schema.get("properties", {})
    for key, spec in props.items():
        if key not in obj:
            continue
        t = spec.get("type")
        if t == "string" and not isinstance(obj[key], str):
            errors.append(f"field {key} should be string")
        if t == "number" and not isinstance(obj[key], (int, float)):
            errors.append(f"field {key} should be number")
        if t == "boolean" and not isinstance(obj[key], bool):
            errors.append(f"field {key} should be boolean")
        if t == "array" and not isinstance(obj[key], list):
            errors.append(f"field {key} should be array")
        if t == "object" and not isinstance(obj[key], dict):
            errors.append(f"field {key} should be object")

    # Validate results items if present
    results_spec = props.get("results", {})
    item_spec = results_spec.get("items", {})
    if isinstance(obj.get("results"), list):
        for idx, item in enumerate(obj["results"]):
            if not isinstance(item, dict):
                errors.append(f"results[{idx}] should be object")
                continue
            for key in item_spec.get("required", []):
                if key not in item:
                    errors.append(f"results[{idx}] missing required field: {key}")
            for key, spec in item_spec.get("properties", {}).items():
                if key not in item:
                    continue
                t = spec.get("type")
                if t == "string" and not isinstance(item[key], str):
                    errors.append(f"results[{idx}].{key} should be string")
                if t == "number" and not isinstance(item[key], (int, float)):
                    errors.append(f"results[{idx}].{key} should be number")
                if t == "boolean" and not isinstance(item[key], bool):
                    errors.append(f"results[{idx}].{key} should be boolean")
                if t == "object" and not isinstance(item[key], dict):
                    errors.append(f"results[{idx}].{key} should be object")

    return errors


def main() -> int:
    schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
    bin_path = get_ixos_bin()

    failures = []
    for q in QUERIES:
        payload = run_query(bin_path, q)
        errors = validate_schema(payload, schema)
        if errors:
            failures.append(f"query '{q}' failed schema check")
            failures.extend(["  " + e for e in errors])

    if failures:
        print("Contract test failures:")
        for line in failures:
            print(line)
        return 1

    print("contract tests passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
