import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "features" / "registry.yml"
OUTPUT = ROOT / "docs" / "capability-matrix.md"


def load_registry() -> list:
    text = REGISTRY.read_text(encoding="utf-8")
    return json.loads(text)


def tests_summary(tests: dict) -> str:
    parts = []
    if tests.get("unit"):
        parts.append("unit")
    if tests.get("integration"):
        parts.append("integration")
    if tests.get("golden"):
        parts.append("golden")
    return ", ".join(parts) if parts else "-"


def docs_summary(docs: list) -> str:
    return f"yes ({len(docs)})" if docs else "-"


def bool_cell(value: bool) -> str:
    return "yes" if value else "no"


def build_table(rows: list) -> str:
    header = "| Feature | CLI | Desktop | Web demo | Tests | Docs | Status | Notes |"
    sep = "|---|---|---|---|---|---|---|---|"
    lines = [header, sep]
    for row in rows:
        lines.append("| " + " | ".join(row) + " |")
    return "\n".join(lines)


def main() -> int:
    data = load_registry()
    rows = []
    for item in data:
        tests = tests_summary(item.get("tests", {}))
        docs = docs_summary(item.get("docs", []))
        status = item.get("status", "-")
        notes = "-" if status == "implemented" else f"status={status}"
        surfaces = item.get("surfaces", {})
        rows.append([
            item.get("name", "-"),
            bool_cell(surfaces.get("cli", False)),
            bool_cell(surfaces.get("desktop", False)),
            bool_cell(surfaces.get("web_demo", False)),
            tests,
            docs,
            status,
            notes,
        ])

    content = "\n".join([
        "# Capability matrix",
        "",
        "Generated from `features/registry.yml`.",
        "",
        build_table(rows),
        "",
    ])

    OUTPUT.write_text(content, encoding="utf-8")
    print(f"wrote {OUTPUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
