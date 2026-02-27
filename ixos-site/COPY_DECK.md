# Ixos Copy Deck

Phase 5 deliverable — full marketing copy for the `/5` Director's Cut landing page.
Tone: cool, surgical, confident. Every claim is tied to a source path.

---

## Page Title & Meta

**Title:** Ixos — Search your files. No cloud. No index.
**Description:** Local-first semantic file search. Hybrid lexical + embedding, progressive streaming, ephemeral mode. Runs entirely on your machine.

---

## Navigation

- Search
- Pipeline
- Context
- Privacy
- Download *(CTA)*

---

## Chapter 0: FIND

### Eyebrow
`/ search`

### Headline
```
Find it.
No cloud.
No index.
```

### Subhead
Semantic + lexical hybrid search, running entirely on your machine.
First result in under 800ms on 1,000 files. Nothing leaves your disk.

Source: `CLAUDE.md` (performance benchmarks), `src/ixos_rank/hybrid_engine.rs`

### CTAs
- **Primary:** Download for Mac
- **Secondary:** CLI reference →

### Bullets
1. **Hybrid search:** Lexical candidate scoring fused with semantic embedding similarity in one pass. Best of both engines, zero tradeoff.
   Source: `src/ixos_rank/hybrid_engine.rs`

2. **Three speed tiers:** Flash, Auto, Pro — trade search depth for latency. Flash for instant recall, Pro for deep document comprehension.
   Source: `ui/src/components/search/QualitySwitcher.tsx`

3. **Progressive streaming:** Results surface as the pipeline processes, not after it finishes. Momentum, not waiting.
   Source: `src/cli/commands.rs` (--progressive flag)

---

## Chapter 1: SEE

### Eyebrow
`/ pipeline`

### Headline
```
Every step,
visible.
```

### Subhead
Ixos doesn't hide its work.
Watch the pipeline scan, embed, and rank — stage by stage, in real time.

### Bullets
1. **Four pipeline stages:** Lexical → semantic → refining → locked. Per-stage progress bar with live percentage.
   Source: `packages/ixos-ui/src/components/SearchSurface.tsx`

2. **Evidence panel:** Per-result rationale explaining which signal dominated the match. Never a black box.
   Source: `ui/src/components/search/WhyMatched.tsx` + `ExplainPanel.tsx`

3. **Live scan trail:** Every file path touched, in sequence, as search happens. Full auditability.
   Source: `src/ixos_rank/hybrid_engine.rs` + `src/ixos_watcher/resilience.rs`

---

## Chapter 2: KNOW

### Eyebrow
`/ context`

### Headline
```
Your work,
remembered.
```

### Subhead
Today and Workstreams keep momentum between sessions.
Resume exactly where you left off — no re-searching, no reconstruction.

### Bullets
1. **Today dashboard:** Resume active streams, see recently touched files, get next-file predictions from local activity signals.
   Source: `ui/src/components/today/`

2. **Workstreams:** Auto-clustered task threads built from your local open and search actions. No manual tagging.
   Source: `ui/src/components/workstreams/`

3. **Inspector:** Stream health, file count, action count, last-active timestamp. Instant context recovery.
   Source: `packages/ixos-ui/src/components/WorkstreamsSurface.tsx`

---

## Chapter 3: PROTECT

### Eyebrow
`/ privacy`

### Headline
```
No cloud.
No trace.
Your data.
```

### Subhead
Offline-first by default. Ephemeral mode, journalist mode, HMAC-signed embedding cache, mlock memory protection.
For sensitive work, Ixos leaves no trail.

### Bullets
1. **Zero network calls.** Embeddings cached locally via NTFS ADS (Windows) or xattr (macOS/Linux). Never uploaded, never indexed remotely.
   Source: `src/storage/ads_windows.rs` + `src/storage/xattr_unix.rs`

2. **Journalist mode:** No cache writes, no history, no filesystem trace. Maximum privacy search. One flag.
   Source: `src/journalist_mode.rs` + `src/cli/commands.rs` (--journalist-mode)

3. **HMAC-SHA256 signed cache:** Every embedding cache entry is signed. Tamper detection on every read. Integrity guaranteed.
   Source: `src/storage/validator.rs`

4. **mlock + zeroize:** Embedding vectors are memory-locked and zeroed on drop. No data survives to swap.
   Source: `src/ixos_embed/memory_protection.rs`

---

## Loader Copy (Sequenced)

1. Initializing local graph
2. Scanning embedding cache
3. Verifying HMAC signatures
4. Ixos ready

---

## Footer

**Tagline:** Local-first. Privacy by design.

**Links:** Privacy · Terms · Docs · Support

---

## Voice Guidelines

| DO | DON'T |
|----|-------|
| Cool, surgical, confident | Breathless, hype-driven |
| "First result in under 800ms" (sourced) | "Blazing fast" (vague) |
| "HMAC-SHA256 signed cache" (specific) | "Enterprise security" (hollow) |
| "No network calls" (concrete) | "Privacy-first" (unclaimed) |
| Show the mechanism | Claim the outcome |
| Shorter sentences | Run-on explanations |

Every claim in this deck ties to a source path in `FEATURE_MASTERLIST.md`.
If you add new copy, add the source path. If no source path exists, remove the claim.
