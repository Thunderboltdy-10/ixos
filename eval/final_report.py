"""Summarize completed frozen runs without selecting or modifying recipes."""
import argparse
from collections import defaultdict
import json
from pathlib import Path
import statistics
from eval.contract import cluster_mean_ci, paired_family_difference


def unique_rows(folder):
    groups = defaultdict(list)
    for line in (folder / 'records.jsonl').read_text(encoding='utf-8').split('\n'):
        if line:
            row = json.loads(line)
            groups[row['query_id']].append(row)
    result = []
    for qid, rows in groups.items():
        row = {key: rows[0][key] for key in ['group', 'kind', 'dataset']}
        row['query_id'] = qid
        for metric in ['mrr', 'recall', 'ndcg', 'span_recall', 'span_precision', 'false_positive']:
            values = [r['metrics'][metric] for r in rows if r['metrics'][metric] is not None]
            row[metric] = statistics.mean(values) if values else None
        result.append(row)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run', action='append', required=True, help='LABEL=directory')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        parser.error('Use a new report path')
    runs, rows = {}, {}
    for value in args.run:
        label, directory = value.split('=', 1)
        if label in runs:
            parser.error('Duplicate run label')
        folder = Path(directory)
        provenance = json.loads((folder / 'provenance.json').read_text(encoding='utf-8'))
        if provenance['status'] != 'passed':
            parser.error(f'{label}: run did not pass')
        rows[label] = unique_rows(folder)
        entry = {'directory': directory, 'summary': json.loads((folder / 'summary.json').read_text(encoding='utf-8')),
                 'config': provenance['config'], 'binary_sha256': provenance['binary_sha256'],
                 'timing_condition': provenance['timing_condition'], 'datasets': provenance['datasets']}
        entry['by_dataset'] = {}
        entry['by_kind'] = {}
        for field in ['dataset', 'kind']:
            for group in sorted({r[field] for r in rows[label]}):
                selected = [r for r in rows[label] if r[field] == group]
                entry['by_' + field][group] = {m: cluster_mean_ci(selected, m, seed=42) for m in ['ndcg', 'mrr', 'recall']}
        runs[label] = entry
    comparisons = []
    labels = list(runs)
    for i, left in enumerate(labels):
        for right in labels[i + 1:]:
            if {r['query_id'] for r in rows[left]} != {r['query_id'] for r in rows[right]}:
                continue
            comparisons.append({'left': left, 'right': right,
                                'difference_right_minus_left': paired_family_difference(rows[left], rows[right], 'ndcg', seed=42)})
    report = {'schema': 1, 'runs': runs, 'paired_comparisons': comparisons,
              'limits': ['Restricted public code subset; upstream labels are LLM generated and span annotations incomplete.',
                         'Two held-out code repositories give weak uncertainty estimates.',
                         'SciFact retrieval is clean text, not a PDF/Office parser benchmark.',
                         'Fresh CLI, fresh rg with loaded-source windows, and persistent BM25 timing conditions differ.',
                         'No end-to-end agent task success or matched Cursor/Augment superiority claim.']}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2), encoding='utf-8')
    for label, entry in runs.items():
        s = entry['summary']
        print(f"{label}: nDCG={s['quality']['ndcg']['mean']:.6f}, MRR={s['quality']['mrr']['mean']:.6f}, "
              f"p50/p95={s['wall_ms']['p50']:.2f}/{s['wall_ms']['p95']:.2f}ms, "
              f"stdout/total={s['output']['mean_tokens']:.1f}/{s['output']['mean_total_response_tokens']:.1f} tokens")


if __name__ == '__main__':
    main()
