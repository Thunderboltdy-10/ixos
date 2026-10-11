"""Adapters preserve displayed text; they never fill missing evidence from gold."""
from __future__ import annotations
from dataclasses import dataclass
import json
from pathlib import Path
import subprocess
import time
from eval.contract import ContractError, Dataset, validate_view


@dataclass
class Response:
    paths: list[str]
    views: list[dict]
    raw_stdout: bytes
    raw_stderr: bytes
    argv: list[str]
    exit_code: int
    wall_ms: float
    diagnostics: dict
    evidence_failures: list[dict]


def source_path(value: str, root: Path, dataset: Dataset) -> str:
    if value.startswith("\\\\?\\UNC\\"):
        value = "\\\\" + value[8:]
    elif value.startswith("\\\\?\\"):
        value = value[4:]
    candidate=Path(value)
    target = candidate.resolve() if candidate.is_absolute() else (root/candidate).resolve()
    resolved = root.resolve()
    if not target.is_relative_to(resolved):
        raise ContractError("Backend returned a path outside the root")
    relative = target.relative_to(resolved).as_posix()
    if relative not in dataset.sources:
        raise ContractError(f"Backend discovery differs from frozen corpus: {relative}")
    return relative


def decode_ixos(stdout: bytes, root: Path, dataset: Dataset) -> tuple[list[str], list[dict], list[dict]]:
    messages = [json.loads(line) for line in stdout.decode("utf-8").split("\n") if line.strip()]
    errors = [m for m in messages if m.get("type") == "error"]
    if errors:
        raise ContractError("Ixos returned a search error")
    batches = [m for m in messages if "results" in m]
    if not batches:
        raise ContractError("Ixos produced no final result payload")
    paths, views, failures = [], [], []
    for result in batches[-1]["results"]:
        path = source_path(result["path"], root, dataset)
        paths.append(path)
        if result.get("view") is not None:
            view=dict(result["view"])
            view["path"]=source_path(view["path"],root,dataset)
            try:
                if view['path']!=path: raise ContractError('Result/view paths disagree')
                validate_view(view,dataset)
            except ContractError as error:
                failures.append({'path':path,'reason':str(error)})
            else:
                views.append(view)
            continue
        if result.get('evidence_omitted') is True:
            continue # Explicit file-only result gets no displayed-span credit.
        context = result.get("context")
        if not context:
            failures.append({"path": path, "reason": "missing displayed source coordinates"})
            continue
        before, matched, after = (context.get(key, []) for key in ["before", "matched", "after"])
        start = context["line_number"] - len(before)
        lines = before + matched + after
        view = {"path": path, "start_line": start, "end_line": start + len(lines) - 1, "text": "\n".join(lines)}
        try:
            validate_view(view, dataset)
        except ContractError as error:
            # Credit the returned file, but no lines not actually shown/verified.
            failures.append({"path": path, "reason": str(error)})
        else:
            views.append(view)
    return paths, views, failures


def run_ixos(binary: Path, config: Path, root: Path, dataset: Dataset, query: str, *, cache_mode="ephemeral", limit=10, context=2, output_bytes=12000, extra_args=(), capture=None) -> Response:
    extras=list(extra_args)
    measured='--model-path' in extras or ('--retrieval' in extras and extras[extras.index('--retrieval')+1]!='legacy')
    if not measured and '--retrieval' not in extras:extras+=['--retrieval','legacy']
    snippets=[] if measured else ['--snippet-chars','4000']
    argv = [str(binary.resolve()), "--config", str(config.resolve()), "search", query, "--dir", str(root.resolve()), "--json", "--stats", "--limit", str(limit), "--context", str(context), *snippets, "--max-output-bytes", str(output_bytes), "--cache-mode", cache_mode, *extras]
    started = time.perf_counter()
    try:
        raw = subprocess.run(argv, capture_output=True, timeout=120)
    except subprocess.TimeoutExpired as error:
        if capture:
            capture(argv, None, error.stdout or b"", error.stderr or b"", (time.perf_counter()-started)*1000)
        raise ContractError("Ixos command timed out") from error
    elapsed = (time.perf_counter()-started)*1000
    if capture:
        capture(argv, raw.returncode, raw.stdout, raw.stderr, elapsed)
    if raw.returncode:
        raise ContractError(f"Ixos command failed with exit {raw.returncode}; retain raw logs before retrying")
    if len(raw.stdout) > output_bytes:
        raise ContractError("Ixos output budget violation")
    paths, views, failures = decode_ixos(raw.stdout, root, dataset)
    if len(paths) > limit:
        raise ContractError("Ixos result limit violation")
    statistics = [json.loads(line) for line in raw.stderr.decode("utf-8").split("\n") if line.startswith('{"')]
    diagnostics = next((row for row in reversed(statistics) if "diagnostics" in row), {})
    if not diagnostics:
        raise ContractError("Requested Ixos diagnostics are missing")
    if diagnostics.get('engine')=='document-v1' and (diagnostics['diagnostics']['discoveredFiles']!=len(dataset.sources) or diagnostics['diagnostics']['searchableFiles']!=len(dataset.sources)):
        raise ContractError('Production discovery/extraction differs from the frozen eligible source inventory')
    return Response(paths, views, raw.stdout, raw.stderr, argv, raw.returncode, elapsed, diagnostics, failures)
