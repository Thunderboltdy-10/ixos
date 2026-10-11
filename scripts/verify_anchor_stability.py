"""Repeated equal-evidence lines must select the earliest physical line."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--binary', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--runs', type=int, default=20)
    parser.add_argument('--observe', action='store_true', help='Capture pre-fix variation without requiring stability')
    args = parser.parse_args()
    assert 1 <= args.runs <= 100
    args.output.mkdir(parents=True, exist_ok=False)
    anchors, identities = [], []
    with tempfile.TemporaryDirectory(prefix='ixos-line-stability-') as temporary:
        root = Path(temporary)
        corpus = root / 'corpus'
        corpus.mkdir()
        words = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta']
        (corpus / 'main.txt').write_text('\n'.join(' '.join(words[i%6:] + words[:i%6]) + f' stamp{i}' for i in range(200)), encoding='utf-8')
        for i in range(6):
            (corpus / f'background{i}.txt').write_text(' '.join(words[:i+1]), encoding='utf-8')
        config = root / 'config.toml'
        config.write_text('[retrieval]\nsession="off"\n', encoding='utf-8')
        argv = [str(args.binary.resolve()), '--config', str(config), 'search', ' '.join(words),
                '--dir', str(corpus), '--profile', 'lexical', '--context', '0', '--json']
        (args.output / 'command.json').write_text(json.dumps(argv, indent=2) + '\n', encoding='utf-8')
        for i in range(args.runs):
            result = subprocess.run(argv, capture_output=True, timeout=120)
            (args.output / f'{i:02d}.stdout').write_bytes(result.stdout)
            (args.output / f'{i:02d}.stderr').write_bytes(result.stderr)
            assert result.returncode == 0
            row = next(row for row in json.loads(result.stdout)['results'] if row['path'] == 'main.txt')
            anchors.append(row['view']['start_line'])
            identities.append(hashlib.sha256(result.stdout).hexdigest())
    receipt = {'status': 'observed' if args.observe else 'passed', 'anchors': anchors,
               'unique_anchors': sorted(set(anchors)), 'unique_output_hashes': len(set(identities)),
               'binary_sha256': hashlib.sha256(args.binary.read_bytes()).hexdigest(),
               'condition': 'Authored equal-unique-term lines with varying corpus IDFs. Model-free fresh lexical processes; not retrieval quality.'}
    (args.output / 'receipt.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(receipt, indent=2))
    if not args.observe:
        assert anchors == [1] * args.runs and len(set(identities)) == 1


if __name__ == '__main__':
    main()
