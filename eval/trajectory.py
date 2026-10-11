"""A frozen tool-follow-up policy and post-run cumulative evidence metrics.

The policy's input contains only issue text and tool observations. It has no
dataset, source catalog, annotations, answerability, patch or score access.
This deterministic retrieval diagnostic is not an autonomous coding agent.
"""
from collections import defaultdict
from dataclasses import dataclass
import re

from eval.contract import (ContractError, intersection_length, length,
                           relative_path, validate_view)


POLICY = {
    'id': 'inspect-top3-inline-cue-top2-v1',
    'search_limit': 10, 'context': 2, 'response_bytes': 6000,
    'read_lines': 61, 'search_reads': 3, 'grep_limit': 10, 'grep_reads': 2,
    'max_calls': 7,
    'cue': 'First single-line inline-backtick identifier/option, length3..80, outside fenced blocks; exact case-sensitive literal.',
    'reads': 'Ranked returned files/anchors only; center requested61-line window on the shown interval. File-only results begin at line1. Skip fully covered read intervals, clipped at EOF only when a previous read reported it.',
    'feedback': 'None. Returned/inspected does not imply usefulness or acceptance.',
    'stopping': 'Fixed schedule/limits only. Never use annotation overlap or success to stop.',
}
POLICIES = {'top3-cue': POLICY, 'top6': {**POLICY,
    'id': 'inspect-top6-no-cue-v1', 'search_reads': 6, 'grep_reads': 0,
    'cue': 'Disabled. Inspect up to six ranked initial results under the same seven-call ceiling.',
}}


@dataclass(frozen=True)
class Task:
    id: str
    issue: str


def inline_cue(issue):
    # Fenced reproduction snippets are not silently promoted into grep queries.
    visible = re.sub(r'(?ms)^\s*(```|~~~).*?^\s*\1[^\n]*$', '', issue)
    for match in re.finditer(r'(?<!`)`([^`\n]+)`(?!`)', visible):
        value = match.group(1)
        if 3 <= len(value) <= 80 and re.fullmatch(r'(?:--?)?[A-Za-z_][A-Za-z0-9_.:-]*', value):
            return value
    return None


def search_request(task, policy=POLICY):
    return {'op': 'search', 'query': task.issue, 'limit': policy['search_limit'],
            'context': policy['context'], 'output_bytes': policy['response_bytes']}


def read_requests(observation, limit, previously_read=(), known_eof=None, policy=POLICY):
    """Decide from returned rows only. Gold paths never enter this function."""
    planned, paths = [], set()
    for row in observation.get('results', []):
        path = relative_path(row['path'])
        if path in paths:
            continue
        paths.add(path)
        view = row.get('view')
        anchor = (view['start_line'] + view['end_line']) // 2 if view else row.get('line', 1)
        if type(anchor) is not int or anchor < 1:
            raise ContractError('Invalid returned read anchor')
        start = max(1, anchor - policy['read_lines'] // 2)
        end = start + policy['read_lines'] - 1
        if known_eof and path in known_eof:
            end = min(end, known_eof[path])
        # Check actual earlier read coverage, not the amount we requested.
        bounds = [(v['start_line'], v['end_line']) for v in previously_read if v['path'] == path]
        if intersection_length(bounds, [(start, end)]) == end - start + 1:
            continue
        planned.append({'op': 'read', 'path': path, 'start': start,
                        'lines': policy['read_lines'], 'output_bytes': policy['response_bytes']})
        if len(planned) == limit:
            break
    return planned


def grep_request(task, policy=POLICY):
    if policy['grep_reads'] == 0:
        return None
    cue = inline_cue(task.issue)
    if cue is None:
        return None
    return {'op': 'grep', 'pattern': cue, 'fixed': True, 'context': policy['context'],
            'limit': policy['grep_limit'], 'output_bytes': policy['response_bytes']}


def cumulative_coverage(query, views, dataset):
    """Use ALL validated displayed views, union overlaps and never synthesize text."""
    by_path = defaultdict(list)
    for view in views:
        path, bounds = validate_view(view, dataset)
        by_path[path].append(bounds)
    relevant = sum(length(entry.spans) for entry in query.gold)
    shown = sum(length(bounds) for bounds in by_path.values())
    overlap = sum(intersection_length(by_path.get(entry.path, []), entry.spans) for entry in query.gold)
    return {'span_recall': overlap / relevant if relevant else None,
            'span_precision': overlap / shown if relevant and shown else (0.0 if relevant else None),
            'unique_displayed_lines': shown, 'annotated_lines_displayed': overlap,
            'annotated_lines': relevant,
            'relevant_files_with_displayed_lines': sum(bool(intersection_length(by_path.get(entry.path, []), entry.spans)) for entry in query.gold),
            'duplicate_displayed_lines': sum(v['end_line']-v['start_line']+1 for v in views)-shown}


def score_steps(query, steps, dataset):
    """Called only after the schedule ends. No gold-driven stopping or feedback."""
    views, curve, elapsed, first_ms, first_call = [], [], 0.0, None, None
    for number, step in enumerate(steps, 1):
        views.extend(step['views'])
        elapsed += step['wall_ms']
        metrics = cumulative_coverage(query, views, dataset)
        if metrics['annotated_lines_displayed'] and first_call is None:
            first_call, first_ms = number, elapsed
        curve.append({'call': number, 'op': step['request']['op'], **metrics})
    return {'final': cumulative_coverage(query, views, dataset), 'coverage_by_call': curve,
            'first_annotated_overlap_call': first_call,
            'tool_ms_to_first_annotated_overlap': first_ms,
            'tool_wall_ms': elapsed,
            'note': 'Annotation overlap, not proved usefulness or task completion. Time sums tool execution only; source preparation, controller validation/logging and model reasoning excluded.'}
