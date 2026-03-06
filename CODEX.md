# Ralph v6 — Genuine Novelty Hunt for Ixos

You are running an autonomous long-horizon novelty search for Ixos.

Your objective is to find a genuinely novel research object that could support:
- an IB Computer Science Extended Essay
- a research paper
- a real improvement to Ixos

The preferred target is novelty inside the current system:
- retrieval
- ranking
- progressive search
- accuracy
- speed
- trust
- premium-exposed engine behavior

You may explore graph / workstreams / today / ask mode / premium features only if they produce a sharper novelty object than the current-system path.

## Core standard

Be brutally truthful.

Assume every idea is NOT novel until it survives repeated attack.

You are not a novelty generator.
You are a novelty prosecutor.

Do not optimize for producing documents.
Do not optimize for sounding clever.
Do not optimize for finishing quickly.
Optimize for discovering whether something is actually novel.

## Allowed novelty shape

Preferred:
- new X

Allowed:
- new X for Y

Forbidden:
- new X for Y in Z
- novelty that depends mainly on a niche wrapper, application domain, or third qualifier
- “novel because combined”
- “novel because adapted”
- “novel because local-first” unless the core object itself is new

If a candidate is only interesting after adding a third dimension, reject it.

## Hard exclusions

Never read, use, summarize, quote, count, or inspect anything in:
- `report/ralph_v0/**`
- `report/ralph_v1/**`
- `report/ralph_v2/**`
- `report/ralph_v3/**`
- `report/ralph_v4/**`
- `report/ralph_v5/**`
- `reports/ralph_v0/**`
- `reports/ralph_v1/**`
- `reports/ralph_v2/**`
- `reports/ralph_v3/**`
- `reports/ralph_v4/**`
- `reports/ralph_v5/**`

Treat them as contaminated by previous loops.
Do not use them even for comparison or inspiration.

## Working style

Operate autonomously and continuously.

Do real work instead of narrating.
Keep chat updates minimal.
Store state in files so work survives compaction.

Do not stop after:
- writing a summary
- making a shortlist
- finding one “maybe”
- producing polished markdown
- hitting one dead end
- completing one batch of web research

Continue into the next cycle immediately unless the hard stop condition is satisfied.

## State files

Create and maintain:
- `reports/ralph_v6/STATE.md`
- `reports/ralph_v6/PLAN.md`
- `reports/ralph_v6/LEDGER.md`
- `reports/ralph_v6/BANLIST.md`
- `reports/ralph_v6/SHORTLIST.md`
- `reports/ralph_v6/EVIDENCE.md`
- `reports/ralph_v6/EXPERIMENTS.md`
- `reports/ralph_v6/QUESTIONS.md`

If they already exist, resume from them.

### Required meanings

`STATE.md`
- exact current position
- what was just learned
- exact next action

`PLAN.md`
- cycle list
- current hypotheses
- active attack angles

`LEDGER.md`
For every candidate:
- name
- irreducible object
- novelty shape
- closest known family
- kill argument
- why it might survive
- falsification path
- empirical probe
- verdict
- confidence

`BANLIST.md`
- dead families
- why they collapse
- what pattern to avoid

`SHORTLIST.md`
- only live candidates
- no filler

`EVIDENCE.md`
- only real sources actually used
- what each source contributed
- no inflated counts

`EXPERIMENTS.md`
- scripts
- prototypes
- benchmark changes
- observations
- failures

`QUESTIONS.md`
- only open questions that matter

## Search priorities

Priority order:
1. current Ixos engine
2. improving accuracy, trust, or speed in the current engine
3. narrow novelty objects inside ranking / retrieval / progression
4. product-surface ideas only if they host a stronger novelty object

Prefer:
- certificates
- contracts
- invariants
- conflict objects
- displacement logic
- transition semantics
- proof-carrying retrieval behavior
- counterfactual tests
- explanation objects
- new measurable failure objects

Be skeptical of:
- generic rerankers
- generic confidence gates
- generic uncertainty routing
- generic graph memory
- generic agent workflows
- generic evidence-aware retrieval
- generic trust-aware ranking
- generic “proactive” systems

## Candidate test

For each candidate, reduce it to one sentence:

“This is a new ______”
or
“This is a new ______ for ______”

If you cannot do that cleanly, reject it.

Then attack it:
1. Is it just a renamed old family?
2. Is it only interesting in a special niche?
3. Does it collapse to constrained ranking / routing / retrieval / graph orchestration / calibration / explanation?
4. Is the novelty in the wrapper rather than the object?
5. Could a simpler existing term describe it?

If yes, downgrade it.

## Verdict labels

Use only:
- SURVIVES
- MAYBE
- INCREMENTAL
- KNOWN
- INVALID

Do not use “novel” casually.
A candidate is `SURVIVES` only if:
- it is 1D or 2D, not 3D
- it solves or clarifies a real Ixos problem
- it survives at least two distinct kill attempts
- it has a plausible empirical path in this repo
- the claim remains sharp without hype

## Empirical freedom

You may:
- inspect the codebase deeply
- read architecture and benchmark files
- run searches
- write scripts
- test prototypes
- instrument ranking logic
- benchmark alternatives
- create temporary experiments
- aggressively explore because the repo is already committed

Prefer cheap falsification over big storytelling.

## Loop

Run repeated cycles.

Each cycle must:
1. identify 1–5 candidate objects
2. reduce each to irreducible form
3. classify as `new X`, `new X for Y`, or reject
4. search and prosecute against prior art
5. inspect relevant Ixos code or docs
6. run a cheap empirical probe if useful
7. write results to `LEDGER.md`
8. update `BANLIST.md` and `SHORTLIST.md`
9. write the exact next action to `STATE.md`
10. continue immediately

## Hard stop condition

Do not stop until:
- at least 20 distinct candidate objects have been evaluated
AND
- either:
  - two full prosecutor passes produce no `SURVIVES`
  - or only 1–3 robust survivors remain with clear next experiments

If no survivor exists, say so clearly and finish with:
- the strongest dead ends
- what was learned
- the best remaining maybe-novel directions

## Recovery

After compaction or interruption:
1. read `AGENTS.md`
2. read `CODEX.md`
3. read `reports/ralph_v6/STATE.md`
4. load only the minimum extra context needed
5. continue from the recorded next action

Never restart from scratch if the state files exist.

## Start protocol

Immediately:
1. create or resume `reports/ralph_v6/`
2. map the allowed search space
3. confirm forbidden Ralph folders are excluded
4. begin Cycle 1
5. keep going