# Evidence-location development protocol

File ranking and the location of displayed evidence are different decisions. The current CLI takes the highest-IDF lexical line anywhere in a returned file. Only a file with no positive lexical line uses the strongest semantic representative's start. A correct file can therefore return an unrelated part of it.

`eval.anchors` / `eval.anchor_run` compare four source-only locator rules. They retain the actual successful Gate 6 hybrid search candidate order and scores. The original control response is byte-identical, checked by SHA256. Alternative views are exact source lines under the same context2 /6000-byte ceiling; serialization may change whether trailing rows fit, so file metrics are rescored rather than assumed constant.

| Rule | Evidence anchor | Additional query-time embedding requirement if implemented |
|---|---|---|
| `global-line` | Original current CLI output | None |
| `winning-local` | Highest-IDF line inside the strongest stored semantic passage | None; stored vectors already exist |
| `stored-fusion` | Stored passage maximizing .5×positive cosine +.5×local lexical weight/file maximum; then its best lexical line | None |
| `bounded-rerank` | Same fusion over the union of stored representatives and up to8 lexical candidate chunks | At most8 additional passage embeddings per returned file;16 total candidates/file |

The code model, 1800-character chunks and introduction/uniform 4-or-8 representatives remain unchanged. Ties select the earliest passage/line. Partial physical lines receive lexical weight only from the text actually inside that chunk. There are no labels, expected paths, patches, hints or acceptance signals in the locator policy. It receives source records, query terms and returned paths. Test-only mock vectors verify contracts; **all numeric screening uses safetensors loaded by the Rust bridge**.

Both prior follow-up schedules run unchanged: three ranked reads plus an optional exact inline-cue grep/two reads, or six ranked reads without grep. Follow-ups execute the actual model-free Ixos `read`/`grep` commands. The screen validates exact displayed text, call/byte ceilings, complete task preparation, reference binary/model/corpus identities and unchanged inputs after execution. Relevance scoring happens after each fixed schedule finishes. Silence and inspection never become positive feedback.

```powershell
python -m unittest eval.test_anchors eval.test_trajectory
python -m eval.anchor_run --preparation reports/restoration/gate5/gate5-contextbench-isolated.json --reference models/lab/restoration/contextbench-trajectories-v2/hybrid --binary target/release/ixos.exe --bridge target/release/ixos-lab-embed.exe --model-path .tmp/gate4/reviewer-models/potion-code-16M-v2-unbounded --policy top3-cue --output models/lab/restoration/contextbench-anchors-top3-cue-v1 --receipt reports/restoration/gate7/top3-cue-v1/comparison.json
```

Use `--policy top6` and new output/receipt paths for the second schedule. Prior ContextBench preparation and Gate 6 actual search captures are prerequisites; these are reproducible research commands, not a normal source-install requirement. Real files, raw tool traffic and bridge logs stay in ignored lab folders. Public reports retain protocol/identity/aggregate/per-task numbers and commands.

Shared preparation embeds the union of all candidates once per query for all four styles. It reports passage count, characters and wall time separately; these are **not production query latency**. The original search diagnostics token count is charged equally as a frozen reference. Only subsequent actual tool time is measured anew. Model startup/full-corpus read/extraction, shared lexical indexing and source validation are not hidden inside a reported end-to-end improvement.

These eight already-inspected development issues have broad annotations and known captured-content/base-source inconsistencies. Results are not held-out generalization, real agent success, an official ContextBench score or a comparison against commercial products. Gate 7's small gains preserve promising alternatives for clean function-span and fresh-family evaluation; they do not change the CLI default. See `reports/restoration/GATE7.md`.
