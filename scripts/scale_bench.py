#!/usr/bin/env python3
import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from collections import Counter
import random

try:
    import tomllib
except Exception:
    tomllib = None

EXCLUDE_DIR_NAMES = {
    'models', 'dataset', 'node_modules', 'target', '.git', '.hg', '.svn',
    '.venv', 'venv', 'dist', 'build', '.next', '.cargo', '.rustup',
    'AppData', 'Program Files', 'Program Files (x86)', 'Windows',
    'Library', 'Caches', 'Cache', '__pycache__',
    '$Recycle.Bin', 'System Volume Information', 'Recovery'
}

EXCLUDE_FILE_EXT = {'.exe', '.dll', '.so', '.dylib', '.bin'}

TOKEN_RE = re.compile(r"[a-z0-9]{3,}")


def is_excluded_dir(name: str) -> bool:
    return name in EXCLUDE_DIR_NAMES


def is_probable_dir(path_str: str) -> bool:
    try:
        p = Path(path_str)
    except Exception:
        return False
    return p.exists() and p.is_dir()


def is_drive_root(path: Path) -> bool:
    try:
        anchor = Path(path.anchor)
        return path.resolve() == anchor.resolve()
    except Exception:
        return False


def read_toml(path: Path):
    if tomllib is None:
        return {}
    try:
        with path.open('rb') as f:
            return tomllib.load(f)
    except Exception:
        return {}


def read_json(path: Path):
    try:
        return json.loads(path.read_text(encoding='utf-8', errors='ignore'))
    except Exception:
        return {}


def extract_dirs_from_obj(obj):
    dirs = set()
    if isinstance(obj, dict):
        for v in obj.values():
            dirs.update(extract_dirs_from_obj(v))
    elif isinstance(obj, list):
        for v in obj:
            dirs.update(extract_dirs_from_obj(v))
    elif isinstance(obj, str):
        if is_probable_dir(obj):
            dirs.add(str(Path(obj)))
    return dirs


def find_config_paths():
    paths = []
    appdata = os.environ.get('APPDATA')
    localapp = os.environ.get('LOCALAPPDATA')
    home = Path.home()

    candidates = []
    if appdata:
        candidates.append(Path(appdata) / 'Ixos')
    if localapp:
        candidates.append(Path(localapp) / 'Ixos')
    candidates.append(home / '.config' / 'ixos')

    for base in candidates:
        if not base.exists():
            continue
        for name in ('config.toml', 'config.json', 'settings.json', 'state.json'):
            p = base / name
            if p.exists():
                paths.append(p)
        # scan for any json/toml in base
        for p in base.rglob('*'):
            if p.is_file() and p.suffix.lower() in ('.json', '.toml'):
                paths.append(p)
    return list(dict.fromkeys(paths))


def try_cli_config_path():
    exe = Path('target') / 'release' / 'ixos.exe'
    if not exe.exists():
        return None
    try:
        out = subprocess.check_output([str(exe), 'config', '--path'], text=True, stderr=subprocess.DEVNULL)
        path = out.strip().splitlines()[-1].strip()
        if path:
            return Path(path)
    except Exception:
        return None
    return None


def discover_candidate_dirs():
    dirs = set()

    # CLI config path (if available)
    cli_path = try_cli_config_path()
    if cli_path and cli_path.exists():
        dirs.update(extract_dirs_from_obj(read_toml(cli_path)))

    # Search known config locations
    for cfg in find_config_paths():
        if cfg.suffix.lower() == '.toml':
            data = read_toml(cfg)
        else:
            data = read_json(cfg)
        dirs.update(extract_dirs_from_obj(data))

    # Fallbacks
    home = Path.home()
    for fallback in (home / 'Documents', home / 'Desktop', home / 'Downloads'):
        if fallback.exists():
            dirs.add(str(fallback))

    # Always include home if nothing else
    if not dirs:
        dirs.add(str(home))

    return [Path(d) for d in dirs]


def scan_dir_stats(root: Path):
    total_files = 0
    total_size = 0
    file_types = Counter()

    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if not is_excluded_dir(d)]
        for name in filenames:
            p = Path(dirpath) / name
            if p.suffix.lower() in EXCLUDE_FILE_EXT:
                continue
            try:
                stat = p.stat()
            except Exception:
                continue
            total_files += 1
            total_size += stat.st_size
            file_types[p.suffix.lower() or ''] += 1

    return {
        'files': total_files,
        'size_bytes': total_size,
        'file_types': file_types,
    }


def pick_largest_dir(candidates):
    best = None
    best_stats = None

    for root in candidates:
        try:
            if not root.exists() or not root.is_dir():
                continue
        except Exception:
            continue
        if root.name in EXCLUDE_DIR_NAMES or is_drive_root(root):
            continue
        stats = scan_dir_stats(root)
        if stats['files'] == 0:
            continue
        if best is None or stats['size_bytes'] > best_stats['size_bytes']:
            best = root
            best_stats = stats
    return best, best_stats


def build_queries(root: Path, max_files=5000, min_queries=50):
    rng = random.Random(1337)
    token_counts = Counter()
    stems = []
    files_seen = 0

    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if not is_excluded_dir(d)]
        for name in filenames:
            p = Path(dirpath) / name
            if p.suffix.lower() in EXCLUDE_FILE_EXT:
                continue
            files_seen += 1
            if len(stems) < max_files:
                stems.append(p.stem)
            else:
                if rng.random() < max_files / max(1, files_seen):
                    stems[rng.randint(0, max_files - 1)] = p.stem

    for stem in stems:
        tokens = TOKEN_RE.findall(stem.lower())
        for tok in tokens:
            if any(ch.isalpha() for ch in tok):
                token_counts[tok] += 1

    top_tokens = [t for t, _ in token_counts.most_common(40)]
    queries = []

    # Single-token queries
    queries.extend(top_tokens[:20])

    # Bigrams from top tokens
    for i in range(min(10, len(top_tokens) - 1)):
        queries.append(f"{top_tokens[i]} {top_tokens[i+1]}")

    # Random token combos
    for _ in range(20):
        if len(top_tokens) < 3:
            break
        tokens = rng.sample(top_tokens, k=3)
        queries.append(' '.join(tokens[: rng.randint(2, 3)]))

    # Full stems as long queries
    rng.shuffle(stems)
    for stem in stems[:20]:
        q = re.sub(r"[_\-\.]+", " ", stem).strip()
        if len(q.split()) >= 2:
            queries.append(q)

    # Deduplicate and pad
    seen = set()
    out = []
    for q in queries:
        qn = q.strip().lower()
        if not qn or qn in seen:
            continue
        seen.add(qn)
        out.append(q.strip())

    while len(out) < min_queries and top_tokens:
        token = rng.choice(top_tokens)
        out.append(token)

    return out[:max(min_queries, len(out))]


def main():
    parser = argparse.ArgumentParser(description='Run Ixos scale bench')
    parser.add_argument('--search-mode', default='auto', choices=['flash', 'auto', 'pro'])
    parser.add_argument(
        '--cache-mode',
        default='local',
        choices=['local', 'memory', 'native-cache', 'ephemeral'],
        help='Cache mode: local or memory (native-cache/ephemeral accepted for config compatibility)',
    )
    parser.add_argument('--model', default='ixos-flash-v2')
    parser.add_argument('--pro-model', default='ixos-pro-v2')
    parser.add_argument('--max-queries', type=int, default=50)
    parser.add_argument('--queries-file', default='reports/scale_bench_queries.txt')
    parser.add_argument('--out-json', default='reports/scale_bench.json')
    parser.add_argument('--out-md', default='reports/SCALE_BENCH.md')
    parser.add_argument('--timeout-seconds', type=int, default=15)
    args = parser.parse_args()

    candidates = discover_candidate_dirs()
    root, stats = pick_largest_dir(candidates)

    if root is None:
        print('No suitable directory found for scale bench', file=sys.stderr)
        sys.exit(1)

    queries = build_queries(root, min_queries=args.max_queries)
    qpath = Path(args.queries_file)
    qpath.parent.mkdir(parents=True, exist_ok=True)
    qpath.write_text('\n'.join(queries), encoding='utf-8')

    exe = Path('target') / 'release' / 'ixos-scale-bench.exe'
    if not exe.exists():
        subprocess.run(['cargo', 'build', '--release', '--bin', 'ixos-scale-bench'], check=True)

    cmd = [
        str(exe),
        '--dir', str(root),
        '--queries-file', str(qpath),
        '--max-queries', str(args.max_queries),
        '--search-mode', args.search_mode,
        '--cache-mode', ('native-cache' if args.cache_mode in ('local', 'native-cache') else 'ephemeral'),
        '--model', args.model,
        '--pro-model', args.pro_model,
        '--out-json', args.out_json,
        '--out-md', args.out_md,
        '--timeout-seconds', str(args.timeout_seconds),
    ]

    print(f"[scale-bench] Directory: {root}")
    if stats:
        print(f"[scale-bench] Files: {stats['files']} Size: {stats['size_bytes'] / (1024**3):.2f} GB")
    subprocess.run(cmd, check=True)


if __name__ == '__main__':
    main()
