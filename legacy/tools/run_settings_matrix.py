import itertools
import json
import os
import subprocess
import tempfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple

ROOT = Path(__file__).resolve().parents[1]
CORPUS = ROOT / "corpus_tiny"
REPORTS_DIR = ROOT / "reports"


@dataclass
class Combo:
    id: int
    cache_mode: str
    search_mode: str
    progressive: bool
    secure_timing: bool
    deep_search: bool


def build_combos() -> List[Combo]:
    combos: List[Combo] = []
    idx = 1
    for cache_mode, search_mode, progressive, secure_timing, deep_search in itertools.product(
        ["local", "memory"],
        ["flash", "auto", "pro"],
        [False, True],
        [False, True],
        [False, True],
    ):
        combos.append(
            Combo(
                id=idx,
                cache_mode=cache_mode,
                search_mode=search_mode,
                progressive=progressive,
                secure_timing=secure_timing,
                deep_search=deep_search,
            )
        )
        idx += 1
    return combos


COMBOS: List[Combo] = build_combos()


def get_ixos_bin() -> Path:
    env_bin = os.environ.get("IXOS_BIN")
    if env_bin:
        return Path(env_bin)

    exe_name = "ixos.exe" if os.name == "nt" else "ixos"
    debug_bin = ROOT / "target" / "debug" / exe_name
    subprocess.check_call(["cargo", "build", "--bin", "ixos"], cwd=ROOT)
    if debug_bin.exists():
        return debug_bin
    raise SystemExit("ixos binary not found after build")


def run_cmd(cmd: List[str], env: Optional[Dict[str, str]] = None) -> subprocess.CompletedProcess:
    return subprocess.run(
        cmd,
        cwd=ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        env=env,
    )


def fail_on_panic(stderr: str) -> Optional[str]:
    lowered = stderr.lower()
    if "panic" in lowered or "thread 'main' panicked" in lowered or "backtrace" in lowered:
        return "stderr contains panic/backtrace"
    return None


def parse_cache_stats(bin_path: Path, env: Dict[str, str]) -> Tuple[int, str]:
    cmd = [str(bin_path), "cache", "stats", "--dir", "corpus_tiny", "--json"]
    result = run_cmd(cmd, env=env)
    if result.returncode != 0:
        return 0, f"cache stats failed: {result.stderr.strip()}"
    try:
        payload = json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        return 0, f"cache stats invalid json: {exc}"
    return int(payload.get("cached_files", 0)), ""


def ensure_config_roundtrip(bin_path: Path, env: Dict[str, str]) -> List[str]:
    failures: List[str] = []
    checks = [
        ("search.cache_mode", "local", "native-cache"),
        ("search.cache_mode", "memory", "ephemeral"),
        ("search.cache_mode", "native-cache", "native-cache"),
        ("search.cache_mode", "ephemeral", "ephemeral"),
        ("search.search_mode", "flash", "flash"),
        ("search.search_mode", "auto", "auto"),
    ]

    for key, set_value, expect_value in checks:
        set_cmd = [str(bin_path), "config", "--set", f"{key}={set_value}"]
        get_cmd = [str(bin_path), "config", "--get", key]
        set_result = run_cmd(set_cmd, env=env)
        if set_result.returncode != 0:
            failures.append(f"config set failed for {key}={set_value}: {set_result.stderr.strip()}")
            continue

        get_result = run_cmd(get_cmd, env=env)
        if get_result.returncode != 0:
            failures.append(f"config get failed for {key}: {get_result.stderr.strip()}")
            continue

        actual = get_result.stdout.strip()
        if actual != expect_value:
            failures.append(
                f"config mismatch for {key}: set {set_value}, expected {expect_value}, got {actual}"
            )

    return failures


def run_combo(combo: Combo, bin_path: Path, env: Dict[str, str]) -> Tuple[bool, List[str]]:
    issues: List[str] = []

    cached_before, cache_before_err = parse_cache_stats(bin_path, env)
    if cache_before_err:
        issues.append(cache_before_err)

    cmd = [
        str(bin_path),
        "search",
        "project plan",
        "--dir",
        "corpus_tiny",
        "--limit",
        "5",
        "--stub-model",
        "--cache-mode",
        combo.cache_mode,
        "--search-mode",
        combo.search_mode,
        "--format",
        "json",
    ]

    if combo.progressive:
        cmd.append("--progressive")
    if combo.secure_timing:
        cmd.append("--secure-timing")
    if combo.deep_search:
        cmd.append("--deep-search")

    result = run_cmd(cmd, env=env)
    if result.returncode != 0:
        issues.append(f"search exited {result.returncode}: {result.stderr.strip()}")

    panic_issue = fail_on_panic(result.stderr)
    if panic_issue:
        issues.append(panic_issue)

    if combo.progressive:
        objects = []
        for line in result.stdout.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                objects.append(json.loads(line))
            except json.JSONDecodeError as exc:
                issues.append(f"invalid ndjson line: {exc}")
                break

        if objects:
            has_results = False
            for obj in objects:
                if isinstance(obj, dict):
                    items = obj.get("results")
                    if isinstance(items, list) and len(items) > 0:
                        has_results = True
                        break
            if not has_results:
                issues.append("progressive output had no non-empty results payload")
    else:
        payload = None
        try:
            payload = json.loads(result.stdout)
        except json.JSONDecodeError as exc:
            issues.append(f"invalid json output: {exc}")

        if isinstance(payload, dict):
            items = payload.get("results", [])
            if not isinstance(items, list):
                issues.append("json payload missing results array")
            elif len(items) == 0:
                issues.append("results array empty")

    cached_after, cache_after_err = parse_cache_stats(bin_path, env)
    if cache_after_err:
        issues.append(cache_after_err)

    if combo.deep_search and not cache_before_err and not cache_after_err:
        if cached_after > cached_before:
            issues.append(
                f"deep search wrote cache entries unexpectedly ({cached_before} -> {cached_after})"
            )

    if (
        combo.cache_mode in ("local", "native-cache")
        and not combo.deep_search
        and not cache_after_err
        and cached_after == 0
    ):
        issues.append("local mode produced zero cached files")

    return (len(issues) == 0), issues


def create_isolated_env(temp_path: Path) -> Dict[str, str]:
    env = os.environ.copy()
    env["HOME"] = str(temp_path)
    env["XDG_CONFIG_HOME"] = str(temp_path / ".config")
    env["XDG_DATA_HOME"] = str(temp_path / ".local" / "share")
    if os.name == "nt":
        env["APPDATA"] = str(temp_path / "AppData" / "Roaming")
    return env


def grant_consent(bin_path: Path, env: Dict[str, str]) -> None:
    result = run_cmd([str(bin_path), "compliance", "consent", "--grant"], env=env)
    if result.returncode != 0:
        raise RuntimeError(f"failed to grant consent: {result.stderr.strip()}")


def markdown_report(rows: List[Tuple[Combo, bool, List[str]]], extra_failures: List[str]) -> str:
    lines: List[str] = []
    lines.append("# Settings Matrix Report")
    lines.append("")
    lines.append(f"- Generated: {datetime.now(timezone.utc).isoformat()}")
    lines.append("- Corpus: `corpus_tiny`")
    lines.append(f"- Combinations: `{len(rows)}`")
    lines.append("- Dimensions: cache_mode x search_mode x progressive x secure_timing x deep_search")
    lines.append("")
    lines.append(
        "| # | Cache | Search | Progressive | SecureTiming | DeepSearch | Status | Notes |"
    )
    lines.append("|---|---|---|---|---|---|---|---|")

    for combo, ok, issues in rows:
        notes = "; ".join(issues) if issues else "OK"
        lines.append(
            f"| {combo.id} | {combo.cache_mode} | {combo.search_mode} | "
            f"{'on' if combo.progressive else 'off'} | {'on' if combo.secure_timing else 'off'} | "
            f"{'on' if combo.deep_search else 'off'} | {'PASS' if ok else 'FAIL'} | {notes} |"
        )

    if extra_failures:
        lines.append("")
        lines.append("## Additional Failures")
        for item in extra_failures:
            lines.append(f"- {item}")

    return "\n".join(lines) + "\n"


def main() -> int:
    if not CORPUS.exists():
        print(f"ERROR: corpus not found at {CORPUS}")
        return 1

    bin_path = get_ixos_bin()
    rows: List[Tuple[Combo, bool, List[str]]] = []
    extra_failures: List[str] = []

    with tempfile.TemporaryDirectory() as td:
        temp_path = Path(td)
        env = create_isolated_env(temp_path)

        try:
            grant_consent(bin_path, env)
        except Exception as exc:
            print(f"ERROR: {exc}")
            return 1

        for combo in COMBOS:
            ok, issues = run_combo(combo, bin_path, env)
            rows.append((combo, ok, issues))

        extra_failures.extend(ensure_config_roundtrip(bin_path, env))

    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    report_name = f"settings_matrix_{datetime.now(timezone.utc).strftime('%Y-%m-%d')}.md"
    report_path = REPORTS_DIR / report_name
    report_path.write_text(markdown_report(rows, extra_failures), encoding="utf-8")

    failed = [f"combo {combo.id}" for combo, ok, _ in rows if not ok]
    if extra_failures:
        failed.extend(extra_failures)

    if failed:
        print("Settings matrix failed:")
        for item in failed:
            print(f"- {item}")
        print(f"Report: {report_path}")
        return 1

    print("Settings matrix passed")
    print(f"Report: {report_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
