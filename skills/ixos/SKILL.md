---
name: ixos
description: Search local code and documents with Ixos, then inspect exact source text.
---

# Ixos

Use Ixos when a local folder contains relevant code or documents.
Choose `code` for source repositories and `documents` for prose.
Install the profile's model before hybrid or semantic search.

Use search for concepts or when the filename is unknown:

```sh
ixos search "invalidate stale cached vectors" --dir /project --profile code --json
```

Use grep for identifiers, literal strings or regular expressions:

```sh
ixos grep "source_hash" --dir /project --fixed --json
```

Use read to inspect a known result and its surrounding lines:

```sh
ixos read src/cache.rs --dir /project --start 20 --lines 40 --json
```

MCP exposes the same search, grep and read tools through `ixos mcp --dir /project`.
Scores are rankings, not probabilities. Verify snippets and read the source before drawing conclusions.
Ignore rules apply; a missing result does not prove the file is absent. Output is bounded, so read again when an excerpt is omitted.
