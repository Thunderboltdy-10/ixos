import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CORPORA = ["corpus_tiny", "corpus_medium", "corpus_edgecases"]


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def validate_corpus(name: str) -> list:
    errors = []
    corpus_dir = ROOT / name
    if not corpus_dir.exists():
        return [f"missing corpus directory: {name}"]

    q_path = corpus_dir / "query_set.json"
    e_path = corpus_dir / "expected_results.json"

    if not q_path.exists():
        errors.append(f"missing {q_path}")
    if not e_path.exists():
        errors.append(f"missing {e_path}")

    if errors:
        return errors

    q_data = load_json(q_path)
    e_data = load_json(e_path)

    if q_data.get("corpus") != name:
        errors.append(f"query_set.json corpus mismatch in {name}")
    if e_data.get("corpus") != name:
        errors.append(f"expected_results.json corpus mismatch in {name}")

    if not isinstance(q_data.get("queries"), list):
        errors.append(f"query_set.json queries must be list in {name}")
    if not isinstance(e_data.get("expected"), list):
        errors.append(f"expected_results.json expected must be list in {name}")

    return errors


def main() -> int:
    errors = []
    for corpus in CORPORA:
        errors.extend(validate_corpus(corpus))

    if errors:
        for err in errors:
            print(f"ERROR: {err}")
        return 1

    print("golden stub checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
