# Gate 18 — full-paper evidence and native cache baseline

The new human-question/full-paper pilot exposes a current weakness: a single compact preview finds only a small fraction of annotated evidence. The default general-model preview covers10.06% of supported evidence bytes; bounded reranking covers15.57%, with substantial uncertainty. Storing4/8document passages gives no clear additional benefit here and moves larger records into the application DB on this Linux filesystem. No model, architecture or default is promoted from this exploratory result.

## Source, task and validation

[Prospective protocol](gate18/protocol.json) was written before downloading/scoring. [QASPER](https://huggingface.co/datasets/allenai/qasper) supplies human information-seeking questions and answer/evidence annotations over full NLP papers. [Dasigi et al.,2021](https://aclanthology.org/2021.naacl-main.365/) describe the original known-paper QA/evidence task. This adapter preserves that known-paper scope: one complete supplied-text paper/root, not a paragraph/file corpus or pooled-paper leaderboard. It verifies text retrieval, not PDF parsing, image/table understanding or generated answers. Dataset CC BY4.0; pinned upstream baseline source Apache2.0, consulted without executing it. [Download identities](gate18/downloads.json), [scoring reference identities](gate18/references.json).

Official v0.3 train/dev archive SHA256 `a28fdf966db827bcee3d873107d6b6669864fb7ca8fbf73a192f5e39191bdb5a`; pinned dataset revision `fdc9d8214fbab5dd782958601db4d678e6934a54`. Train input31,969,387bytes /888papers /2,593questions. The281dev papers are reserved: only source schema/hashes and cross-split identity overlap are checked, with no question/answer inspection or model scoring. Test archive is not downloaded. Upstream parent training overlap is unknown.

The adapter passes12meaningful synthetic contracts covering UTF-8 byte ranges, partial versus whole evidence, fabricated views, duplicate locations/references, mismatches, floats, missing headings, best references, no-answer/negative boolean/disagreement and source path boundaries. Actual train audit precedes model execution. It initially discovers10null section headings and289evidence strings not equal to body paragraphs.147match other exact source text, including section headings;119have edge-whitespace differences and23internal-whitespace differences. Missing headings preserve their paragraphs; exact nonempty headings gain explicit source coordinates through a [pre-inference protocol addendum](gate18/protocol-addendum-v1.json). The142whitespace mismatches remain unsupported, never normalized into invented matches. Initial failed preparation and paragraph-only audit remain preserved.

Train final audit:47,687body paragraphs/12,434nonempty headings;2675answer annotations,271uniformly unanswerable questions and7with mixed answerability;86answerable annotations without evidence,383float evidence strings and6ambiguous text locations. These cases are retained separately. A negative boolean answer without evidence does not become “unanswerable.”

Pilot selection is label-independent: first32papers by SHA256(`ixos-qasper-pilot-v1:`+paperID), every question retained. Corpus892,521bytes/1,853body paragraphs/500headings;97questions,91answerable and6unanswerable. Eighty questions/29papers have a fully exact, float-free textual reference for primary coverage metrics; eleven other answerable questions remain visible with unsupported/empty/float annotations, not silently dropped from outputs. [Preparation](gate18/preparation.json).

## Actual CLI comparison

Control engine source `e52bb55`; Windows actual binary `7aab8d7d627e98f190e3af2519b4b520722d9d23663d377bc496a3e6b4ed1418`.

General parent fingerprint **`6966e61ba93fe416b36af3190469553e7c5447c8e3675ec034d4ee7ec0223f88`**, model.safetensors SHA256 `f3a9a9297a228914ca7cd0dc9601616ccb81a198676172ff6ff52658f5251ee2`. No newly trained/distilled model. Five arms use context2, limit1,6000bytes, typo/session off.160fresh resident processes,485searches/970requests including resets; these are97unique questions/32papers, not485independent labels. Source bytes/mtime and inventory remain exact. [Raw wire/receipt](gate18/pilot/), [analysis](gate18/analysis.json).

| Arm | Evidence byte recall | Completely exposed text-unit F1 | Mean stdout tokens | Mean diagnostic tokens |
|---|---:|---:|---:|---:|
| General centroid / default global-line |0.10060|0.05529|327.38|331.75|
| General centroid / bounded-rerank |0.15574|0.08312|335.80|372.58|
| General intro-uniform / global-line |0.10060|0.05529|327.39|332.00|
| General intro-uniform / bounded-rerank |0.15082|0.08066|340.91|372.51|
| Current lexical / global-line, no model |0.10060|0.05529|327.18|284.11|

Metrics are best fully mappable text reference, equal-paper means,2000paper-cluster bootstrap. Centroid bounded minus default byte recall +0.05514,95%CI[0,0.14135]. Intro-uniform bounded minus its global control +0.05022,CI[−0.00643,0.13300]. These intervals do not establish a reliable general gain. Section headings are explicit units, so text-unit F1 is **not exact official paragraph Evidence F1**; there is no comparison to published LED/TF-IDF scores or Cursor/Augment products. A file ranking score would be trivial in this known-paper task and is not reported as success.

Global previews agree across models/lexical because the same within-file lexical line wins in these cases. Bounded vectors can change the selected local anchor but still expose only one contiguous view. All six unanswerable questions return candidates/views in every arm. Centroid-hybrid answerable scores span 0.5–0.81837 while unanswerable scores overlap their range; this does not calibrate a reliable answerability threshold. No-answer outputs are candidates, not generated hallucinated answers.

Token cost counts full JSON envelopes, source text and actual diagnostics with cl100k_base0.12.0. Search requests, ready/reset overhead and complete study totals are separate in the analysis. Diagnostics roughly double search-visible context in this pilot; quiet ordinary operation avoids them. Bounded centroid adds about8.4stdout/40.8diagnostic tokens per query on average.

Timing is one sequential same-host exploratory repetition, with no competing compiler: centroid/default median startup166.85ms, first-document fill17.63ms, later resident query3.68ms; bounded162.70/21.22/7.38ms; lexical20.69/4.99/3.41ms. These small one-paper roots are not1k-file/worst-device/product latency measurements. First fill is separate from cached queries, and a fresh process still pays model startup. [Exact per-query timings/counters](gate18/pilot/rows.jsonl).

## Native/resident precision and metadata capacity

First six pilot papers, both representations × two evidence policies × JIT/first-native/native-warm × two repeated searches:72processes/144searches per OS. Windows/Linux responses match byte-for-byte; actual model hits and unchanged source bytes/mtime/inventory are required. Linux uses transferred identical official-data bytes on ext4 and its existing isolated model/toolchain, not a new independent download. “native-fill” names the first native case; it can hit a preceding evidence policy's compatible record and is not always cold. [Windows](gate18/native-windows/), [Linux](gate18/native-linux/), [comparison](gate18/cache-audit.json).

| Representation | Native warm Windows,12cases | Native warm Linux,12cases |
|---|---|---|
| One512-dimensional centroid |12ADS hits|12xattr hits|
| Eight512-dimensional passages |12ADS hits|12application-DB hits|

The eight-passage record is4423bytes (`103+8×(28+512)`), versus643for one centroid. A Windows ADS record is measured at4423bytes. An isolated same-filesystem Linux metadata-capacity witness stores643/2375bytes but4423fails with errno28; bytes/mtime preserved and witness removed. This explains the observed DB fallback on this filesystem; it is not a universal xattr/Mac size limit. No ordinary sidecars are created beside papers. Both modes remain exact even when native storage falls back.

## Diagnosis and next experiments

This pilot makes long-document evidence the next substantive issue. A cache can correctly hold a compact semantic representation while its returned preview misses most of the useful source. More stored representatives alone do not fix that here. Useful next comparisons are within-document lexical statistics/length normalization, selecting complementary excerpts inside the existing byte budget, and label-blind agent follow-ups that inspect/accept evidence rather than using gold to pick read offsets. Any improvement must retain code-task controls, cost accounting and fresh validation/test boundaries. Training/quantization experiments follow reliable evaluation; they cannot compensate for an unmeasured evidence-selection failure.

An actual already-informed self-navigation trace uses current semantic search, unified grep and bounded read to inspect the output fallback. `retrieval/mod.rs` appears fourth among five displayed candidates; exact grep/read verifies complete-context → anchor-only → explicit file-only fallback. No truncated line is presented as complete source evidence. Three commands use770stdout+342diagnostic tokens, sources preserved. [Trace](gate18/own-trace/). This is usable tool interaction, not blind autonomous task success.

**KEEP** the validated adapter and negative baseline; retain current presets. Next work is fresh label-blind multi-call tasks and development evidence experiments, with official dev/test still reserved. Current supported scripts add new output paths/pinned checksums and full question/gold input binding; [replay/final audit](gate18/final-audit.stdout) confirms identical corpus/labels, measured helper hashes and unchanged frozen evaluator. Exact original helpers remain in `gate18/pilot-helpers/`; preserved setup/encoding/audit failures do not alter successful raw CLI runs. The first cache summarizer's nonexistent field defaults are marked invalid and replaced with required real counters.

Commands and reproduction: [harness README](../../scripts/qasper/README.md), [Linux recipe](gate18/linux_cache.sh), [capacity recipe](gate18/xattr_capacity.sh), [analysis recipe](gate18/analyze.py). No production Rust/model/default changes, public release, native Mac verification, history rewrite or private-note staging.
