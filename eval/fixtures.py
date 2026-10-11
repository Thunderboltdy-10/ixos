"""Deterministic source-anchored stress cases; never a public quality leaderboard."""
from __future__ import annotations
import argparse
import json
from pathlib import Path
from eval.contract import digest, load_dataset


def prepare(folder: Path):
    root = folder / "corpus"
    if root.exists():
        raise ValueError("Use a new fixture directory")
    root.mkdir(parents=True)
    texts = {
        "engine/cache.py": "# File-vector storage and invalidation\nSCHEMA_VERSION = 3\ndef valid_cache(source_digest, stored_digest):\n    # Recompute after any content edit, including equal-length edits.\n    return source_digest == stored_digest\n",
        "engine/lease.py": "# Unrelated queue scheduling\ndef renew_worker_lease(worker, deadline):\n    worker.deadline = deadline\n",
        "engine/traversal.py": "# Source discovery\ndef walk_sources(root, ignore_rules):\n    # Skip ignored dependency directories before opening files.\n    for path in root.walk():\n        if not ignore_rules.matches(path):\n            yield path\n",
        "engine/output.py": "# Bounded structured source evidence\ndef emit_context(lines, start, end):\n    # Coordinates are physical source lines; remove terminal escape codes.\n    return dict(start_line=start, end_line=end, text='\\n'.join(lines[start-1:end]))\n",
        "engine/ranking.py": "# Reciprocal rank fusion\ndef fuse(lexical_rank, semantic_rank):\n    # Combine ordinal ranks rather than treating cosine as a probability.\n    return 1 / (60 + lexical_rank) + 1 / (60 + semantic_rank)\n",
        "notes/chemistry.txt": "Chemistry revision\nA catalyst speeds a reaction without being consumed in the overall reaction.\nAn equilibrium shifts toward the side that opposes an imposed concentration change.\n",
        "notes/history.txt": "History revision\nThe source evaluation checklist asks who wrote the document and why.\nCompare its purpose, audience, date, and limitations before using the evidence.\n",
        "notes/transport.txt": "Transport revision\nPublic buses follow routes and use scheduled stops.\nA station connects several routes so passengers can transfer.\n",
        "notes/unicode.txt": "Unicode source evidence\n缓存🦀 describes stored vectors beside their source.\nAn em dash — and a separator \u2028 remain part of this physical line.\n",
    }
    for i in range(8):
        texts[f"distractors/topic-{i}.txt"] = f"Topic {i} classroom diary\nHomework, weekly tasks, and plans for the next lesson.\n" * 8
    late = ["# Mixed engineering notebook", "The introduction discusses source discovery and caching."]
    late.extend(f"Entry {i}: recurring scheduling notes about queues, tasks, routing, and routine maintenance in this notebook." for i in range(1600))
    late.append("The ZEPHYR_RETRY_WINDOW constant is 73 seconds; failed transfers wait this interval before another attempt.")
    late.append("This final section describes retry timing rather than the introduction's cache topics.")
    texts["notes/mixed-long.txt"] = "\n".join(late) + "\n"
    for path, text in texts.items():
        target = root/path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(text.encode("utf-8"))
    sources = [{"path":p,"sha256":digest((root/p).read_bytes())} for p in sorted(texts)]
    queries = []
    def query(qid, text, path=None, spans=(), group=None, workload="code-agent", kind="concept", **extra):
        row = {"id":qid,"text":text,"group":group or qid,"split":"dev","workload":workload,"kind":kind,"answerability":"answerable" if path else "unanswerable","gold":[{"path":path,"grade":3,"spans":list(spans)}] if path else []}
        row.update(extra)
        return row
    queries.extend([
        query("fixture-cache-symbol","valid_cache","engine/cache.py",[[3,5]],kind="exact-symbol"),
        query("fixture-cache-concept","Where are stored vectors invalidated when a document changes?","engine/cache.py",[[3,5]]),
        query("fixture-ignore","Exclude dependency directories before opening source files","engine/traversal.py",[[2,6]]),
        query("fixture-output","Return source coordinates without terminal escape codes","engine/output.py",[[2,4]]),
        query("fixture-fusion","Combine ordinal ranks instead of treating cosine as probability","engine/ranking.py",[[2,4]]),
        query("fixture-late-symbol","ZEPHYR_RETRY_WINDOW","notes/mixed-long.txt",[[1603,1603]],kind="late-exact"),
        query("fixture-late-concept","How long should failed transfers wait before attempting again?","notes/mixed-long.txt",[[1603,1604]],kind="late-concept"),
        query("fixture-intro","source discovery and caching in the mixed engineering notebook","notes/mixed-long.txt",[[1,2]],kind="introduction"),
        query("fixture-chemistry","What accelerates a reaction while remaining unconsumed?","notes/chemistry.txt",[[2,2]],workload="document-agent"),
        query("fixture-human","who wrote a historical document and why","notes/history.txt",[[2,3]],workload="human"),
        query("fixture-unicode","缓存🦀","notes/unicode.txt",[[2,2]],kind="unicode-exact"),
        query("fixture-missing","NONEXISTENT_QUASAR_94721",kind="absent-literal"),
        query("fixture-no-answer","Which file implements quantum teleportation calibration?",kind="absent-concept"),
    ])
    turns = [
        query("sequence-cache-0","cached source vectors","engine/cache.py",[[1,5]],group="sequence-cache",sequence="cache-followup",turn=0),
        query("sequence-cache-1","equal-length edits content digest","engine/cache.py",[[3,5]],group="sequence-cache",sequence="cache-followup",turn=1,feedback={"query_id":"sequence-cache-0","accepted":["engine/cache.py"],"rejected":[]}),
        query("sequence-cache-2","source lines terminal codes","engine/output.py",[[2,4]],group="sequence-cache",sequence="cache-followup",turn=2),
        query("sequence-cache-3","equilibrium concentration change","notes/chemistry.txt",[[3,3]],group="sequence-cache",workload="document-agent",sequence="cache-followup",turn=3),
        query("sequence-retry-0","failed transfers wait interval","notes/mixed-long.txt",[[1603,1604]],group="sequence-retry",sequence="late-followup",turn=0),
        query("sequence-retry-1","ZEPHYR_RETRY_WINDOW seconds","notes/mixed-long.txt",[[1603,1603]],group="sequence-retry",sequence="late-followup",turn=1,feedback={"query_id":"sequence-retry-0","accepted":["notes/mixed-long.txt"],"rejected":[]}),
        query("sequence-retry-2","renew_worker_lease","engine/lease.py",[[2,3]],group="sequence-retry",sequence="late-followup",turn=2),
        query("sequence-reset-0","source lines terminal codes","engine/output.py",[[2,4]],group="sequence-reset",sequence="independent-reset",turn=0),
    ]
    provenance = {"origin":"Ixos explicitly authored controlled fixtures","revision":"restoration-fixtures-v1","label_method":"Authored target lines fixed before experiments; labels not derived from model outputs","license":"MIT OR Apache-2.0","limitations":"Small synthetic correctness/replay cases. Not representative real-world quality, not an autonomous agent task benchmark."}
    receipts = []
    for name, rows in [("independent",queries),("sessions",turns)]:
        raw = {"schema":1,"id":f"ixos-controlled-{name}","provenance":provenance,"sources":sources,"queries":rows}
        path = folder/f"{name}.json"
        path.write_text(json.dumps(raw,indent=2,ensure_ascii=False),encoding="utf-8")
        dataset = load_dataset(path,root)
        receipts.append({"manifest":str(path),"sha256":dataset.fingerprint,"sources":len(sources),"queries":len(rows)})
    return receipts


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--destination",type=Path,required=True)
    args = parser.parse_args()
    print(json.dumps(prepare(args.destination),indent=2))
