import json
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
manifest_path = ROOT / "models" / "lab" / "manifest.json"

new_ids = [
    "ixos-flash-v2a",
    "ixos-flash-v2b",
    "ixos-flash-v2c",
    "ixos-flash-v2d",
    "ixos-flash-v2e",
    "ixos-flash-v2f-hardneg",
    "ixos-flash-v2g-mpnet",
    "ixos-flash-v2h-fullvocab",
]

if not manifest_path.exists():
    raise SystemExit(f"Manifest not found: {manifest_path}")

data = json.loads(manifest_path.read_text(encoding="utf-8"))
candidates = data.get("candidates", [])
existing = {c.get("id") for c in candidates}

timestamp = datetime.utcnow().replace(microsecond=0).isoformat()

added = []
for model_id in new_ids:
    if model_id in existing:
        continue
    model_dir = ROOT / "models" / "lab" / model_id
    if not model_dir.exists():
        print(f"[WARN] Missing model dir: {model_dir}")
        continue
    size_bytes = sum(p.stat().st_size for p in model_dir.rglob("*") if p.is_file())
    size_mb = round(size_bytes / (1024 * 1024), 2)
    entry = {
        "id": model_id,
        "type": "embedder",
        "tier": "flash",
        "backend": "model2vec",
        "license": "unknown",
        "source": "local",
        "local_path": f"models/lab/{model_id}",
        "path": f"models\\lab\\{model_id}",
        "size_mb": size_mb,
        "downloaded_at": timestamp,
    }
    candidates.append(entry)
    added.append(model_id)

if added:
    data["candidates"] = candidates
    manifest_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    print("[OK] Added:", ", ".join(added))
else:
    print("[OK] No new candidates added")
