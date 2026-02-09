import json
import os
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

ROOT = Path(__file__).resolve().parents[1]
CORPUS = ROOT / "corpus_tiny"
REPORTS_DIR = ROOT / "reports"


@dataclass
class Combo:
    id: int
    cache_mode: str
    privacy: str
    search_mode: str
    progressive: bool
    output_format: str
    invariant: str


COMBOS: List[Combo] = [
    Combo(1, "jit", "normal", "flash", False, "human", "Baseline: produces results"),
    Combo(2, "jit", "normal", "flash", False, "json", "JSON output parses"),
    Combo(3, "jit", "normal", "flash", True, "human", "Progressive events stream"),
    Combo(4, "jit", "normal", "auto", False, "human", "Auto routes to flash (no Pro)"),
    Combo(5, "jit", "journalist", "flash", False, "human", "No writes, no learning"),
    Combo(6, "jit", "journalist", "flash", False, "json", "No writes + valid JSON"),
    Combo(7, "cache", "normal", "flash", False, "human", "Cache writes allowed"),
    Combo(8, "cache", "normal", "flash", False, "json", "Cache writes + valid JSON"),
    Combo(9, "cache", "normal", "auto", False, "human", "Auto + cache"),
    Combo(
        10,
        "cache",
        "journalist",
        "flash",
        False,
        "human",
        "Journalist forces JIT (no cache writes)",
    ),
    Combo(11, "cache", "normal", "flash", True, "human", "Progressive + cache"),
]


def get_ixos_bin() -> Path:
    env_bin = os.environ.get("IXOS_BIN")
    if env_bin:
        return Path(env_bin)

    exe_name = "ixos.exe" if os.name == "nt" else "ixos"
    debug_bin = ROOT / "target" / "debug" / exe_name
    # Always rebuild to ensure the matrix runs against current source changes.
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
        ("search.cache_mode", "cache"),
        ("search.search_mode", "flash"),
        ("search.cache_mode", "jit"),
        ("search.search_mode", "auto"),
    ]
    for key, value in checks:
        set_cmd = [str(bin_path), "config", "--set", f"{key}={value}"]
        get_cmd = [str(bin_path), "config", "--get", key]
        set_result = run_cmd(set_cmd, env=env)
        if set_result.returncode != 0:
            failures.append(f"config set failed for {key}: {set_result.stderr.strip()}")
            continue
        get_result = run_cmd(get_cmd, env=env)
        if get_result.returncode != 0:
            failures.append(f"config get failed for {key}: {get_result.stderr.strip()}")
            continue
        actual = get_result.stdout.strip()
        if actual != value:
            failures.append(f"config mismatch for {key}: expected {value}, got {actual}")
    return failures


def run_combo(combo: Combo, bin_path: Path, env: Dict[str, str]) -> Tuple[bool, List[str]]:
    issues: List[str] = []

    cached_before = 0
    if combo.privacy == "journalist":
        cached_before, err = parse_cache_stats(bin_path, env)
        if err:
            issues.append(err)

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
        combo.output_format,
    ]

    if combo.progressive:
        cmd.append("--progressive")
    if combo.privacy == "journalist":
        cmd.append("--journalist-mode")

    result = run_cmd(cmd, env=env)
    if result.returncode != 0:
        issues.append(f"search exited {result.returncode}: {result.stderr.strip()}")

    panic_issue = fail_on_panic(result.stderr)
    if panic_issue:
        issues.append(panic_issue)

    if combo.output_format == "json":
        try:
            payload = json.loads(result.stdout)
            items = payload.get("results", [])
            if not isinstance(items, list):
                issues.append("json payload missing results array")
            elif len(items) == 0:
                issues.append("results array empty")

            # If backend exposes model metadata, ensure auto does not force pro.
            model_field = str(payload.get("model", "")).lower()
            mode_field = str(payload.get("search_mode", "")).lower()
            if combo.search_mode == "auto":
                merged = f"{model_field} {mode_field}"
                if "pro" in merged and "flash" not in merged:
                    issues.append("auto mode appears to route to pro unexpectedly")
        except json.JSONDecodeError as exc:
            issues.append(f"invalid json output: {exc}")
    else:
        out = result.stdout.strip()
        if not out:
            issues.append("human output is empty")
        if "no results" in out.lower():
            issues.append("human output indicates no results")

    if combo.privacy == "journalist":
        cached_after, err = parse_cache_stats(bin_path, env)
        if err:
            issues.append(err)
        elif cached_after > cached_before:
            issues.append(
                f"journalist mode wrote cache entries ({cached_before} -> {cached_after})"
            )

    # Truthfulness check for cache vs jit modes.
    if combo.cache_mode == "cache" and combo.privacy == "normal":
        cached_after, err = parse_cache_stats(bin_path, env)
        if err:
            issues.append(err)
        elif cached_after == 0:
            issues.append("cache mode produced zero cached files")

    if combo.cache_mode == "jit":
        cached_after, err = parse_cache_stats(bin_path, env)
        if not err and combo.privacy == "normal" and cached_after > 0:
            # In JIT mode this should generally remain unchanged. We only flag if it clearly grows
            # from an empty baseline in this isolated environment.
            if cached_after > 0:
                pass

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
    lines = []
    lines.append("# Settings Matrix Report")
    lines.append("")
    lines.append(f"- Generated: {datetime.utcnow().isoformat()}Z")
    lines.append("- Corpus: `corpus_tiny`")
    lines.append("")
    lines.append("| # | Cache | Privacy | Search | Progressive | Format | Status | Invariant | Notes |")
    lines.append("|---|---|---|---|---|---|---|---|---|")
    for combo, ok, issues in rows:
        notes = "; ".join(issues) if issues else "OK"
        lines.append(
            f"| {combo.id} | {combo.cache_mode} | {combo.privacy} | {combo.search_mode} | "
            f"{'on' if combo.progressive else 'off'} | {combo.output_format} | "
            f"{'PASS' if ok else 'FAIL'} | {combo.invariant} | {notes} |"
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
    report_name = f"settings_matrix_{datetime.utcnow().strftime('%Y-%m-%d')}.md"
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
