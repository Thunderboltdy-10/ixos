"""Bind prepared source identities to a prospective, immutable RepoQA recipe.

Preparation supplies dataset hashes after the recipe freeze, never new tuning
parameters. The original freeze and all public evaluator sources are verified.
"""
import json
from pathlib import Path

from eval.contract import ContractError, canonical_hash, digest


SUITE = 'repoqa-heldout-v1'


def harness_hash():
    return canonical_hash({path.as_posix(): digest(path.read_bytes())
                           for path in sorted(Path('eval').glob('*.py'))})


def bind_selection(freeze, preparation, freeze_file, preparation_file):
    if (freeze.get('suite') != SUITE or preparation.get('split') != 'test'
            or preparation.get('status') != 'passed'
            or preparation.get('plan_sha256') != freeze.get('plan_sha256')
            or preparation.get('selection_sha256') != canonical_hash(freeze)):
        raise ContractError('Prepared test sources do not belong to the prospective recipe freeze')
    recipes = freeze.get('recipes', {})
    if not recipes or sorted(canonical_hash(recipe) for recipe in recipes.values()) != sorted(freeze.get('config_hashes', [])):
        raise ContractError('Frozen configuration hashes differ from their recipes')
    families = preparation.get('families', [])
    if (len(families) != freeze.get('test_families') or len(families) != preparation.get('planned_families')
            or preparation.get('queries') != freeze.get('test_queries')
            or any(row.get('status') != 'passed' or row.get('queries') != 10 for row in families)
            or len({row['repository'] for row in families}) != len(families)):
        raise ContractError('Every frozen test family and description must prepare successfully')
    return {**freeze, 'dataset_hashes': [row['fingerprint'] for row in families],
            'frozen_selection_sha256': canonical_hash(freeze),
            'preparation_sha256': canonical_hash(preparation),
            'freeze_file': str(freeze_file), 'preparation_file': str(preparation_file)}


def checked_bound_selection(selection):
    try:
        freeze_path = Path(selection['freeze_file'])
        preparation_path = Path(selection['preparation_file'])
        freeze = json.loads(freeze_path.read_text(encoding='utf-8'))
        preparation = json.loads(preparation_path.read_text(encoding='utf-8'))
        expected = bind_selection(freeze, preparation, freeze_path, preparation_path)
    except (KeyError, OSError, ValueError) as error:
        raise ContractError('Cannot verify original freeze/preparation records') from error
    if selection != expected or harness_hash() != freeze.get('harness_sha256'):
        raise ContractError('Frozen recipe, prepared identities or evaluator source changed')
    return freeze, preparation
