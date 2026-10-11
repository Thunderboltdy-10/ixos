# Full-paper evidence evaluation

This is a separate harness for human information-seeking questions about known research papers. It extends the earlier abstract/function retrieval studies without modifying their frozen evaluator. Current results and limitations: [Gate18](../../reports/restoration/GATE18.md).

QASPER v0.3 is by Dasigi, Lo, Beltagy, Cohan, Smith and Gardner (2021): [paper](https://aclanthology.org/2021.naacl-main.365/), [official dataset card](https://huggingface.co/datasets/allenai/qasper), [baseline/evaluator](https://github.com/allenai/qasper-led-baseline). Dataset license: CC BY4.0. Upstream baseline source is Apache2.0; it is consulted, not executed or copied into this harness. Original source text and selected question/output receipts retain this attribution. Full downloaded data stays Git-ignored.

## Scope and integrity

Each root contains one **complete paper**, including supplied title/abstract, section names and body paragraphs. It is not one tiny file per paragraph and does not verify Ixos's PDF parser. Original LF/UTF-8 text remains unchanged. Null section names mean absent headings and retain every paragraph. Section headings can themselves be annotated evidence, so exact nonempty headings and paragraphs form text units with verified byte ranges.

Gold strings must match original units exactly. Whitespace mismatches, duplicate locations, figure/table evidence, empty evidence and answerability disagreement are exposed separately. Figures/table bodies are unavailable here; captions are not silently treated as their contents. Duplicated text counts as one evidence string, with maximum actual overlap at a valid location. Multiple references use an explicit best-reference convention rather than unioning incompatible answers.

Displayed source views must equal every complete claimed source line. File-only rows, truncated/fabricated text and incorrect coordinates receive no source credit. Metrics include UTF-8 byte recall and completely exposed text-unit F1/recall, with equal-paper uncertainty and explicit supported-reference denominators. These are not official Answer F1 or Evidence F1 leaderboard values. Candidate scores are not answerability confidence; a candidate returned for an unanswerable question is not a generated answer.

The exploratory pilot chooses32train papers by the fixed SHA256 paper-ID ordering in `prepare.py`, keeps all97questions, and scores no dev/test labels. The official281-paper dev split is reserved; only its source metadata/hashes were checked. Parent pretraining overlap is unknown. Do not use this pilot to claim unseen-test or product superiority. Do not turn adjacent independent questions into a natural conversation.

## Reproduce in new directories

Run from the repository root with Python3.12, the pinned `eval/requirements.txt` dependencies, a current release binary and the installed general document model. All output paths below must be new. Download checksums and dataset revision are pinned in `download.py`; no test archive is downloaded.

```sh
python -m pip install -r eval/requirements.txt
python -m unittest discover -s scripts/qasper -p 'test_*.py'
python -m scripts.qasper.download --data .tmp/qasper-replay --output reports/local-qasper/downloads.json
python -m scripts.qasper.prepare --data .tmp/qasper-replay --downloads reports/local-qasper/downloads.json --output reports/local-qasper/preparation.json
python -m scripts.qasper.pilot --binary target/release/ixos --model MODEL_DIRECTORY --data .tmp/qasper-replay --preparation reports/local-qasper/preparation.json --output reports/local-qasper/pilot
python -m scripts.qasper.cache_probe --binary target/release/ixos --model MODEL_DIRECTORY --data .tmp/qasper-replay --preparation reports/local-qasper/preparation.json --output reports/local-qasper/cache
```

On Windows use `target/release/ixos.exe`. Setup rejects existing receipt paths and changed upstream bytes. Preparation binds the full train input, including questions/annotations; pilot/cache checks reject changed input before model or corpus access. Their wire captures preserve exact UTF-8 request/stdout/stderr strings, process/response deadlines and source hash/mtime/no adjacent-file checks. Cache probes can write ADS/xattr or the separate application DB, never ordinary files beside papers. Native metadata capacity depends on the filesystem.

Five pilot arms share context2, limit1,6000-byte output, typo off and session off: current general centroid/global, centroid/bounded, intro-uniform/global, intro-uniform/bounded, model-free lexical/global. Every independent question resets history. A fresh process per paper/arm has a distinct startup/first-document-fill cost; later questions verify resident parsed/vector hits. One timing repetition is descriptive. Stats, ready/reset envelopes and request tokens are measured separately; routine stats are optional in actual use.

The Gate18 receipts retain the exact helpers used for the original measurements under `reports/restoration/gate18/pilot-helpers/`. Later setup changes add explicit output arguments, checksum enforcement and full input binding; they do not silently replace those historical identities. New runs use the current supported scripts and new receipts.
