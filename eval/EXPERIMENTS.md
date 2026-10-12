# Code snippets

Hypothesis: up to three short snippets per file, aligned to function, class and impl definition lines, improve RepoQA development line recall at an equal output byte ceiling.

Use all 180 queries in the 18 previously assigned development families. Preserve file ranking, the code model, hybrid mode, limit 10 and context 2. Compare the existing snippets with one prototype: keep the passage chosen by Ixos, align it to the nearest preceding definition within 24 lines, and add up to two non-overlapping definition snippets ranked by query-term overlap. Use simple language-specific line patterns; no tree-sitter. Each snippet contains at most five physical source lines. Neither selection nor alignment reads relevance labels.

Both responses use the same compact JSON envelope and a 6,000-byte ceiling, including paths, scores and snippet coordinates. Omit snippets before omitting ranked files when space runs out. Count only exact source lines actually serialized within that ceiling. Measure mean development line recall and total `cl100k_base` tokens from these responses.

Keep the prototype only if line recall rises by at least 3 percentage points and token cost is no more than 10% higher. Run development data only, with no revision attempt planned. If rejected, delete the prototype and keep the existing single-snippet algorithm. Evaluate the held-out suites once after this decision.

The prototype raised development line recall from 13.95% to 25.77% at the same 6,000-byte ceiling, but used 50.57% more tokens; one revision fixed output allocation so all ranked files were preserved. It failed the token threshold, so the prototype was deleted and the existing single-snippet algorithm remains.
