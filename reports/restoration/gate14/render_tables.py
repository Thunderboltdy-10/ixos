"""Render every measured condition from the audited receipts."""
import json
from pathlib import Path

root = Path(__file__).resolve().parent
analysis = json.loads((root / 'analysis.json').read_text())
lines = ['# Gate 14 complete condition tables', '', 'Medians of successful measured runs only. Address limits are virtual, not physical RAM. MiB = 1,048,576 bytes; three repetitions per row unless explicitly failed. First fill excludes startup. Exact phase and per-run data remain in receipt.json.', '']
for label, experiment in analysis['resource'].items():
    lines += [f'## {label}', '', '| Model | Condition | Pass / fail | Startup ms | Fill ms | Repeat ms | Feedback ms | Bounded ms | Default again ms | Final RSS MiB | Peak RSS MiB | Virtual MiB | Threads |', '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|']
    for index, model in enumerate(experiment['models']):
        for name, row in model['summary'].items():
            request, memory = row['request_p50_ms'], row['final_memory_p50']
            values = [('Code' if index == 0 else 'Documents'), name, f'{row["passed"]} / {row["failed"]}', f'{row["startup_p50_ms"]:.3f}']
            values += [f'{request[k]:.3f}' for k in ['seed', 'repeat', 'feedback', 'bounded', 'default-again']]
            values += [f'{memory[k]/1048576:.3f}' for k in ['VmRSS', 'VmHWM', 'VmSize']]
            values += [str(memory['Threads'])]
            lines.append('| ' + ' | '.join(values) + ' |')
    lines += ['']
(root / 'TABLES.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
