"""Source-only evidence-location experiments; file ranking is supplied unchanged.

This module receives text, query words and returned paths, never relevance labels.
Embeddings come from the real Rust bridge. Shared preparation is a quality screen,
not a production latency measurement or a proposed new embedding-cache format.
"""
from dataclasses import dataclass
import math

import numpy as np

from eval.contract import ContractError, relative_path
from eval.lexical import tokens, terms
from eval.representations import chunks, representative_count, uniform_indices


STYLES = ('global-line', 'winning-local', 'stored-fusion', 'bounded-rerank')
RECIPE = {
    'id': 'bounded-evidence-anchors-v1', 'styles': STYLES,
    'chunk_characters': 1800, 'lexical_candidates': 8,
    'representatives': 'Existing introduction/uniform 4-or-8 recipe; ties to even.',
    'candidate_ceiling': 16, 'fusion_semantic_weight': .5,
    'lexical': 'Maximum unique-query-term corpus IDF weight of a line within a chunk; normalized by the maximum across the whole returned file.',
    'fallback': 'No positive lexical match: selected passage start. Global control falls back to the strongest stored passage start.',
    'ties': 'Earliest chunk, then earliest lexical line.',
    'ranking': 'Fixed input candidate order and scores; bounded serialization can still change which trailing rows fit.',
}


def unit_rows(vectors):
    vectors = np.asarray(vectors, dtype=np.float32)
    if vectors.ndim != 2 or not np.isfinite(vectors).all():
        raise ContractError('Invalid actual embedding matrix')
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    return np.divide(vectors, norms, out=np.zeros_like(vectors), where=norms > 0)


def query_idfs(query, source_terms):
    if not source_terms:
        raise ContractError('An evidence screen needs a nonempty source inventory')
    count = len(source_terms)
    return {term: math.log(1 + (count - sum(term in row for row in source_terms.values()) + .5)
                          / (sum(term in row for row in source_terms.values()) + .5))
            for term in terms(query)}


@dataclass
class FileAnchors:
    parts: list
    weights: list
    line_anchors: list
    representatives: list
    candidates: list
    similarities: dict
    global_anchor: int
    global_weight: float


def lexical_chunk_candidates(weights, representatives, lexical_budget=8):
    if not weights or lexical_budget < 1:
        raise ContractError('Invalid bounded chunk candidate request')
    if any(i < 0 or i >= len(weights) for i in representatives):
        raise ContractError('Representative is outside the file')
    lexical = sorted((i for i, value in enumerate(weights) if value > 0),
                     key=lambda i: (-weights[i], i))[:lexical_budget]
    return sorted(set(lexical) | set(representatives))


class AnchorScreen:
    """One query, at most ten returned files and sixteen embedded chunks/file."""
    def __init__(self, sources, source_terms, query, paths, bridge):
        if len(paths) > 10 or len(set(paths)) != len(paths):
            raise ContractError('Expected at most ten distinct ranked paths')
        self.idfs = query_idfs(query, source_terms)
        self.files = {}
        inputs, locations = [query], []
        for path in paths:
            relative_path(path)
            if path not in sources:
                raise ContractError('Returned path is outside the source inventory')
            source = sources[path]
            parts = chunks(source)
            if not parts:
                raise ContractError('A ranked source has no text')
            lines = [sum(self.idfs.get(term, 0) for term in set(tokens(line)))
                     for line in source.lines]
            weights, anchors = [], []
            for part in parts:
                # Score only text inside the chunk. A partial physical line must
                # not inherit lexical evidence from its unembedded remainder.
                local = [sum(self.idfs.get(term, 0) for term in set(tokens(line)))
                         for line in part.text.split('\n')]
                if part.text.endswith('\n'):
                    local.pop()
                offset = max(range(len(local)), key=lambda i: (local[i], -i))
                weights.append(local[offset])
                anchors.append(part.start_line + offset)
            representatives = uniform_indices(len(parts), representative_count(len(parts)))
            candidates = lexical_chunk_candidates(weights, representatives)
            if len(candidates) > RECIPE['candidate_ceiling']:
                raise ContractError('Evidence embedding ceiling violated')
            self.files[path] = FileAnchors(parts, weights, anchors, representatives, candidates, {},
                                          max(range(len(lines)), key=lambda i: (lines[i], -i)) + 1, max(lines))
            for index in candidates:
                inputs.append(parts[index].text)
                locations.append((path, index))
        vectors = unit_rows(bridge.embed(inputs))
        if len(vectors) != len(inputs):
            raise ContractError('Embedding bridge dropped an evidence candidate')
        for (path, index), vector in zip(locations, vectors[1:]):
            self.files[path].similarities[index] = float(vector @ vectors[0])
        self.embedded_passages = len(locations)
        self.embedded_characters = sum(len(value) for value in inputs[1:])
        self.extra_passages_vs_stored = sum(len(file.candidates) - len(file.representatives)
                                            for file in self.files.values())

    def choose(self, path, style):
        if style not in STYLES:
            raise ContractError('Unknown evidence style')
        file = self.files[path]
        winner = max(file.representatives, key=lambda i: (file.similarities[i], -i))
        if style == 'global-line':
            return file.global_anchor if file.global_weight > 0 else file.parts[winner].start_line
        if style == 'winning-local':
            chosen = winner
        else:
            options = file.candidates if style == 'bounded-rerank' else file.representatives
            chosen = max(options, key=lambda i: (
                .5 * max(file.similarities[i], 0)
                + .5 * file.weights[i] / max(file.global_weight, 1e-12), -i))
        return file.line_anchors[chosen] if file.weights[chosen] > 0 else file.parts[chosen].start_line
