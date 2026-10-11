# AGENT SKILLS AND WORKFLOWS

## OPERATING CONTRACT

Agent work in this repository is governed by:

- `AGENTS.md` (top-level contract)
- `PLAN.md` (current state and next actions)
- `RUNLOG.md` (append-only experiment log)
- `DECISIONS.md` (decision outcomes and rationale)

## REQUIRED LOOP

Observe -> Hypothesize -> Implement -> Measure -> Decide -> Document -> Repeat

Each iteration should end with updated PLAN/RUNLOG and, when needed, DECISIONS.

## SKILL DISCOVERY

Session-local skills are provided outside the repo in Codex home.
Currently available examples in this environment:

- `skill-creator`
- `skill-installer`

## REPO SKILLS GUIDELINES

If adding project-specific skills later:

- Store under a clear docs path (for discoverability).
- Keep each skill scoped and executable.
- Include usage examples and failure fallbacks.

## DOCUMENTATION EXPECTATIONS FOR AGENT WORK

- Reference exact commands.
- Store benchmark/profiling outputs under `reports/` or `models/lab/`.
- Keep naming policy and privacy constraints explicit in every rollout.

