# CPU, memory and diagnostics

Ixos executes embeddings on CPU. The current CLI owns encoded model rows and decodes the token rows it uses rather than expanding the entire static table into f32. This reduces measured startup/resident memory with the selected artifacts; [Gate 12](../../reports/restoration/GATE12.md) compares it with the retained eager loader. Source/extraction limits bound input bytes, **not process RAM**: text, term statistics, passages, vectors, tokenization batches and runtime threads also consume memory.

Persistent ADS/xattr records avoid unchanged document inference; resident `serve` additionally reuses extraction and representations in RAM. Both still read/hash bounded source bytes to detect edits. Warm queries on a small corpus do not predict preparation time/memory for a large corpus. Ordinary agent requests can omit stats; `serve --quiet-stats` plus request `"stats":true` is useful for investigation. Count diagnostic stderr as context whenever it is shown to the agent.

[Gate 14](../../reports/restoration/GATE14.md) measures current actual-model retrieval on 113 Rust files, with three fresh processes per scenario. On Ubuntu/glibc, one CPU/Rayon1/I/O1 passed without a virtual cap. A 256 MiB **address-space** cap caused a severe intermittent embedding slowdown and one allocation abort with the default allocator. This is distinct from a physical RAM cap. Default multi-core virtual reservations were much larger than resident memory.

An optional glibc arena limit of one or two reduced virtual reservations and passed these constrained repetitions. Arena1 also made unrestricted multi-core preparation four to five times slower, so it is **not an Ixos default**. Only consider explicit settings for a constrained Linux/glibc environment after measuring your workload. Example (replace `CPU` with a CPU permitted by the process's affinity):

```sh
RAYON_NUM_THREADS=1 MALLOC_ARENA_MAX=2 taskset -c CPU \
  ixos serve --dir PATH --profile code --io-workers 1 --quiet-stats
```

This command does not impose a memory cap. `MALLOC_ARENA_MAX` is glibc-specific, not a Windows/macOS setting; it controls allocator arenas as described in [GNU's documentation](https://sourceware.org/glibc/manual/latest/html_node/Memory-Allocation-Tunables.html). Reduced parallelism trades fresh preparation speed for resource use. Native caching may be preferable for repeated processes; resident service may be preferable for repeated calls, provided its in-memory corpus is appropriate for the device.

To reproduce resource contracts from source, `python scripts/profile_constrained.py --help` accepts a Linux binary, both actual model paths, corpus, prospective protocol and new output directory. Exact Gate 14 recipes/conditions/identities and failures are retained in its report. These checks are not a guarantee for low-end hardware, large dense documents, native Mac or all allocation ceilings. Core dumps are disabled by the probe; searched source hashes and modification times must remain unchanged.
