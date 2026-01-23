import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "features" / "registry.yml"

REQUIRED_KEYS = {
    "id": str,
    "name": str,
    "description": str,
    "surfaces": dict,
    "status": str,
    "user_value": int,
    "differentiation": int,
    "risk": str,
    "evidence": dict,
    "tests": dict,
    "docs": list,
}

STATUS_VALUES = {"implemented", "partial", "stub", "planned"}
RISK_VALUES = {"low", "med", "high"}

PATH_LINE_RE = re.compile(r"^(?P<path>.+):(?P<line>\d+)$")


def load_registry() -> list:
    if not REGISTRY.exists():
        raise SystemExit(f"registry not found: {REGISTRY}")
    text = REGISTRY.read_text(encoding="utf-8")
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise SystemExit(
            "registry.yml must be JSON-compatible YAML (no comments). "
            f"JSON parse failed: {exc}"
        )
    if not isinstance(data, list):
        raise SystemExit("registry.yml must be a list")
    return data


def slugify(text: str) -> str:
    text = text.strip().lower()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"\s+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text


def collect_doc_anchors(path: Path) -> set:
    anchors = set()
    if not path.exists():
        return anchors
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("#"):
            title = line.lstrip("#").strip()
            if title:
                anchors.add(slugify(title))
    return anchors


def validate_path_with_line(path_with_line: str) -> list:
    errors = []
    match = PATH_LINE_RE.match(path_with_line)
    if not match:
        errors.append(f"evidence path must be 'path:line' -> {path_with_line}")
        return errors

    rel_path = match.group("path")
    line_num = int(match.group("line"))
    file_path = ROOT / rel_path
    if not file_path.exists():
        errors.append(f"evidence path does not exist: {rel_path}")
        return errors

    lines = file_path.read_text(encoding="utf-8").splitlines()
    if line_num < 1 or line_num > len(lines):
        errors.append(f"evidence line out of range: {path_with_line}")
    return errors


def validate_doc_link(doc_link: str) -> list:
    errors = []
    if "#" in doc_link:
        path_str, anchor = doc_link.split("#", 1)
    else:
        path_str, anchor = doc_link, None

    doc_path = ROOT / path_str
    if not doc_path.exists():
        errors.append(f"doc path does not exist: {path_str}")
        return errors

    if anchor:
        anchors = collect_doc_anchors(doc_path)
        if anchor not in anchors:
            errors.append(f"doc anchor not found: {doc_link}")
    return errors


def validate_test_link(test_link: str) -> list:
    errors = []
    if "#" in test_link:
        path_str, _anchor = test_link.split("#", 1)
    else:
        path_str = test_link

    if PATH_LINE_RE.match(path_str):
        errors.extend(validate_path_with_line(path_str))
        return errors

    test_path = ROOT / path_str
    if not test_path.exists():
        errors.append(f"test path does not exist: {path_str}")
    return errors


def validate_registry(data: list) -> int:
    errors = []
    ids = set()

    for idx, item in enumerate(data):
        if not isinstance(item, dict):
            errors.append(f"item {idx} is not an object")
            continue

        for key, key_type in REQUIRED_KEYS.items():
            if key not in item:
                errors.append(f"missing key '{key}' in item {idx}")
                continue
            if not isinstance(item[key], key_type):
                errors.append(f"key '{key}' has wrong type in item {idx}")

        feature_id = item.get("id")
        if isinstance(feature_id, str):
            if feature_id in ids:
                errors.append(f"duplicate id: {feature_id}")
            ids.add(feature_id)

        status = item.get("status")
        if status not in STATUS_VALUES:
            errors.append(f"invalid status '{status}' in {feature_id}")

        risk = item.get("risk")
        if risk not in RISK_VALUES:
            errors.append(f"invalid risk '{risk}' in {feature_id}")

        surfaces = item.get("surfaces", {})
        for key in ("cli", "desktop", "web_demo"):
            if key not in surfaces or not isinstance(surfaces[key], bool):
                errors.append(f"surfaces.{key} must be bool in {feature_id}")

        uv = item.get("user_value")
        if not isinstance(uv, int) or not (1 <= uv <= 5):
            errors.append(f"user_value must be int 1-5 in {feature_id}")
        dv = item.get("differentiation")
        if not isinstance(dv, int) or not (1 <= dv <= 5):
            errors.append(f"differentiation must be int 1-5 in {feature_id}")

        evidence = item.get("evidence", {})
        paths = evidence.get("paths", [])
        if not isinstance(paths, list):
            errors.append(f"evidence.paths must be list in {feature_id}")
        else:
            for p in paths:
                errors.extend(validate_path_with_line(p))

        commands = evidence.get("commands", [])
        if not isinstance(commands, list):
            errors.append(f"evidence.commands must be list in {feature_id}")

        tests = item.get("tests", {})
        for key in ("unit", "integration", "golden"):
            entries = tests.get(key, [])
            if not isinstance(entries, list):
                errors.append(f"tests.{key} must be list in {feature_id}")
                continue
            for t in entries:
                errors.extend(validate_test_link(t))

        docs = item.get("docs", [])
        if not isinstance(docs, list):
            errors.append(f"docs must be list in {feature_id}")
        else:
            for d in docs:
                errors.extend(validate_doc_link(d))

    if errors:
        for err in errors:
            print(f"ERROR: {err}")
        return 1

    print("registry.yml validation passed")
    return 0


def main() -> int:
    data = load_registry()
    return validate_registry(data)


if __name__ == "__main__":
    raise SystemExit(main())
