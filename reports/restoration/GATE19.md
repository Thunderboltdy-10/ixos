# Gate 19 — live observed-only document retrieval

Six new complete-paper tasks were executed through the actual resident CLI. Answers and citations were frozen **before** reference scoring. This small pilot shows why evidence exposure, answer interpretation and context cost must be reported separately. It does not select a default or establish autonomous coding success.

## Prospective conditions

[Protocol](gate19/protocol.json) precedes task preparation. Papers are positions 32–37 in the existing SHA256-ID ordering of official QASPER training papers, after Gate 18's 32 families. Each uses its first supplied question, without filtering on gold, answerability or difficulty. None overlaps the earlier excerpted audit papers. All complete UTF-8 sources are retained outside Git. [Tasks](gate19/tasks.json) bind source hashes and identity `b355610b710ae453c89f6cc7334d5d68fea7c5f4e69e8ee6dbc25e66466eada0`.

The acting assistant saw title/question and actual search/grep/read output, with no direct source, web or reference lookup during solutions. One already-informed restoration assistant performed all tasks; model/agent pretraining overlap is unknown. This is label-blind execution on training data, not an independent held-out agent evaluation.

Windows binary `7aab8d7d627e98f190e3af2519b4b520722d9d23663d377bc496a3e6b4ed1418`, general model fingerprint `6966e61ba93fe416b36af3190469553e7c5447c8e3675ec034d4ee7ec0223f88`: whole-token centroid, documents profile, combined session, bounded-rerank, native persistence, context 2 / limit 5 / 6,000-byte responses. Each task permits 12 retrieval calls / 12,000 CLI stdout tokens. Timing is descriptive on this Ryzen 7 5800X Windows host, not a repeated latency experiment.

## Frozen outcomes

| Case | Task | Calls | CLI stdout tokens | Initial → observed → cited gold byte recall | Raw answer token F1 |
|---|---|---:|---:|---|---:|
| C01 | Translation datasets | 2 | 1,321 | 0 → 1 → 1 | 0.8750 |
| C02 | Posterior properties | 4 | 3,170 | 0 → 1 → 0 | 0.0870 |
| C03 | Knowledge graph tasks | 3 | 2,392 | 0 → 1 → 1 | 0.8889 |
| C04 | English-only results | 2 | 269 | No supported textual reference | 0 |
| C05 | Toolkit models | 3 | 2,790 | 0 → 1 → 1 | 0.1250 |
| C06 | Highest accuracy | 2 | 1,454 | Figure/table reference unsupported | 0.1667 |

All four cases with exact supported text references exposed the annotated passage after follow-up. C02 nevertheless chose narrower covariance/sharpness evidence after seeing the broader overview: exposure did not produce the expected answer scope. C04 submitted `not-established` after a language grep returned nothing; the reference says `Yes`. This is a false abstention against the supplied reference, retained unchanged. All six gold tasks are answerable, so true unanswerable classification is untested here.

C01 and C03 recover named facts; C06 returns the reference's exact numerical value, 82.0%, with extra explanation. C05 supplies extensive source-supported model details. Long answers reduce lexical F1 against terse references, but this is not an independent factual correctness judgment. Mean literal answer token F1 is **0.357085**; refusals are not relabeled as `Unanswerable`. [Analysis](gate19/analysis.json) retains original submissions, references after freeze, coverage denominators and costs.

The 16 calls comprise seven searches, eight greps and one read. CLI wire totals: **11,396 stdout + 2,530 diagnostic + 449 request tokens**, with ready records separate. Counts exclude inherited chat/reasoning, actor status wrappers and terminal echo; they are not complete agent context cost. No matched ripgrep, Cursor or Augment agent arm was executed, and these different papers cannot be compared as a paired improvement over Gate 18.

## Engine implications

Broad semantic searches often expose introductions rather than task evidence. Targeted lexical follow-ups were useful, including recovery from an overly broad regex in C03. One rejection-feedback call in C02 was consumed but returned another unhelpful excerpt. Protocol correctness does not imply useful adaptation.

Only **search** responses populate the current feedback history/topic state. Grep/read result IDs cannot contribute accepted or rejected evidence. The architecture, CLI guide and agent skill now state that boundary. Supporting explicit observed source inspection in future sessions needs its own freshness/vector/cost contracts and A/B evidence; this gate adds no implicit behavior or weights.

## Verification and reproduction

For each task, run the actor interactively in a new output folder and submit JSON tool requests followed by the final answer/citations. Exact requests/outputs are in each `C*/wire.jsonl`; receipts record argv, source/binary/model/helper identities and budgets.

```powershell
python -u -m scripts.qasper.agent_shell --binary target/release/ixos.exe --model .tmp/gate4/reviewer-models/potion-retrieval-32M-row-int8 --tasks reports/restoration/gate19/tasks.json --case C01 --output reports/local-qasper-agent/C01
python reports/restoration/gate19/freeze_submissions.py
python reports/restoration/gate19/grade.py
python -m unittest scripts.qasper.test_contract scripts.qasper.test_agent_shell
python reports/restoration/gate19/audit.py
python C:/Users/pablo/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/ixos-retrieval
```

The checked-in preparation/freeze/grading recipes bind this original run and refuse an existing freeze; replay them in copied report directories with new output roots. Full dataset/model artifacts are separately downloaded as described in [QASPER setup](../../scripts/qasper/README.md). The actor never imports gold. The grader checks frozen receipt hashes before opening references and imports only the pinned upstream answer-token-F1 function, SHA256 `781aba7cd8e524bef4f0a1b4bf3504e5b02cb1d8d5bf32a8f0a89dfa83e86bfe`.

Twelve QASPER contracts preceded live execution. Five additional actor guard tests were added **after** submissions: exact UTF-8 slices, original read views, invalid coordinates/paths, call-specific citation exposure, duplicates and file-only records. All 17 pass. The first test run used an invalid file-only fixture without `evidence_omitted:true`; the guard correctly rejected it. That failed output is retained, and the fixture is corrected. No actor or submission was changed. Skill validation passes. The independent audit verifies raw wire token counts, source bytes/mtime/inventory, immutable submissions/original helper/binary and frozen evaluator hash.

No production Rust, model, defaults or frozen evaluator changed; existing engine test evidence therefore remains Gate 17's 547 Windows / 545 Linux core checks. Native Mac remains deferred. Fresh human code tasks and measured evidence/session work follow.

Dataset/text attribution: Dasigi et al. (2021), [QASPER paper](https://aclanthology.org/2021.naacl-main.365/), [official CC BY 4.0 dataset](https://huggingface.co/datasets/allenai/qasper). Imported scoring source: [AllenAI Apache 2.0 baseline](https://github.com/allenai/qasper-led-baseline), pinned revision recorded in Gate 18. These adapted coverage metrics are not official QASPER leaderboard results.
