"""Ordered retrieval replay. Feedback comes only from previously displayed results.

This evaluates tool sequences and context efficiency, not autonomous agent success.
The backend receives query text and explicit available feedback, never gold labels.
"""
from __future__ import annotations
from collections import defaultdict
import json
from eval.contract import ContractError, Dataset, intersection_length, length, score_query


def available_feedback(query, previous):
    if query.feedback is None:
        return None, []
    requested = query.feedback
    response = previous.get(requested["query_id"])
    if response is None:
        raise ContractError("Session feedback has no earlier response")
    shown = set(response.paths)
    filtered = {"query_id": requested["query_id"], **{key: [p for p in requested[key] if p in shown] for key in ["accepted", "rejected"]}}
    unavailable = [p for key in ["accepted", "rejected"] for p in requested[key] if p not in shown]
    return filtered, unavailable


def replay(dataset: Dataset, queries, backend, count_tokens, *, reset=lambda: None):
    """Return query rows and sequence summaries; reset backend at every sequence.

    backend(query_text, feedback, query_id) -> Response. Returned stdout is the
    exact visible tool response. Silence/empty feedback is never an acceptance.
    """
    groups = defaultdict(list)
    for query in queries:
        if query.sequence is None:
            raise ContractError("Ordered replay requires explicit sequences")
        groups[query.sequence].append(query)
    records, summaries = [], []
    for sequence, turns in groups.items():
        turns.sort(key=lambda q: q.turn)
        if [q.turn for q in turns] != list(range(len(turns))):
            raise ContractError("Replay cannot skip earlier sequence turns")
        reset()
        previous, viewed = {}, defaultdict(list)
        cumulative_tokens = 0
        cumulative_stderr_tokens=0
        cumulative_wall = 0.0
        first_file = first_span = None
        first_file_ms = first_span_ms = None
        for query in turns:
            feedback, unavailable = available_feedback(query, previous)
            response = backend(query.text, feedback, query.id)
            metrics = score_query(query, response.views, dataset, paths=response.paths)
            output_tokens = count_tokens(response.raw_stdout.decode("utf-8"))
            feedback_tokens = count_tokens(json.dumps(feedback, separators=(",", ":"))) if feedback is not None else 0
            # Existing CLI/rg/BM25 do not accept this optional argument; charge
            # feedback only when the backend actually submits/consumes it.
            consumed = response.diagnostics.get("feedback_consumed", False)
            submitted=response.diagnostics.get('feedback_submitted',consumed)
            input_tokens = count_tokens(query.text) + (feedback_tokens if submitted else 0)
            if 'raw_request' in response.diagnostics:input_tokens=count_tokens(response.diagnostics['raw_request'])
            stderr_tokens=count_tokens(response.raw_stderr.decode('utf-8'))
            cumulative_stderr_tokens+=stderr_tokens
            cumulative_tokens += output_tokens + input_tokens
            cumulative_wall += response.wall_ms
            if first_file is None and any(p in {g.path for g in query.gold} for p in response.paths):
                first_file = query.turn + 1
                first_file_ms = cumulative_wall
            if first_span is None and metrics["span_recall"] is not None and metrics["span_recall"] > 0:
                first_span = query.turn + 1
                first_span_ms = cumulative_wall
            for view in response.views:
                viewed[view["path"]].append((view["start_line"], view["end_line"]))
            retained_gold_lines = sum(length(g.spans) for g in query.gold)
            retained_overlap = sum(intersection_length(viewed[g.path], g.spans) for g in query.gold)
            records.append({"query_id":query.id,"group":query.group,"sequence":sequence,"turn":query.turn,"metrics":metrics,"paths":response.paths,"views":response.views,"wall_ms":response.wall_ms,"stdout_bytes":len(response.raw_stdout),"stdout_tokens":output_tokens,"input_tokens":input_tokens,"available_feedback_tokens":feedback_tokens,"feedback_consumed":consumed,"cumulative_tokens":cumulative_tokens,"cumulative_wall_ms":cumulative_wall,"tool_calls":query.turn+1,"retained_span_recall":retained_overlap/retained_gold_lines if retained_gold_lines else None,"feedback":feedback,"unavailable_feedback":unavailable,"diagnostics":response.diagnostics,"evidence_failures":response.evidence_failures})
            records[-1].update(stderr_tokens=stderr_tokens,cumulative_context_tokens=cumulative_tokens+cumulative_stderr_tokens,feedback_submitted=submitted)
            previous[query.id] = response
        summaries.append({"sequence":sequence,"group":turns[0].group,"turns":len(turns),"total_tokens":cumulative_tokens,"total_wall_ms":cumulative_wall,"calls_to_first_relevant_file":first_file,"calls_to_first_gold_span":first_span,"time_to_first_relevant_file_ms":first_file_ms,"time_to_first_gold_span_ms":first_span_ms,"label":"ordered retrieval replay; no claim of coding-agent task success"})
        summaries[-1]['total_context_tokens']=cumulative_tokens+cumulative_stderr_tokens
    return records, summaries
