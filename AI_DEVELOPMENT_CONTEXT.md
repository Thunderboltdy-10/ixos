# IXOS AI DEVELOPMENT CONTEXT

> **Last Updated:** 2026-01-20
> **Purpose:** Provide complete context to AI assistants for implementing missing features and improvements.

---

## 1. Project Overview

**Ixos** is a privacy-first semantic file search tool that combines:
- Fast lexical search (ripgrep-based)
- Semantic understanding (Model2Vec embeddings)
- Intelligent routing (Flash/Auto/Pro modes)

**Stack:**
- **Backend:** Rust (ixos_protocol lib + Tauri commands)
- **Frontend:** React + TypeScript + Vite + Tailwind
- **Desktop:** Tauri v2
- **Embeddings:** Model2Vec (distilled, int8/float16)

---

## 2. Current Architecture

### Search Pipeline (The Hybrid Cascade)

```
Query → [Intent Parser] → [Candidate Generation] → [Semantic Rerank] → [Evidence Extraction] → Results
         0-5ms             20-300ms                 200-2000ms           Parallel/Lazy
```

1. **Intent + Filters:** Parse operators (ext:, before:, after:), detect intent
2. **Candidate Generation:** Produce 200-2000 candidates via:
   - Path/filename scoring (no disk reads)
   - Ripgrep lexical scan (streamed)
   - Metadata priors (recency, file type)
3. **Semantic Rerank:** Embed candidates in batches, fuse scores
4. **Evidence Extraction:** Show WHY it matched (top results only)

### Key Modules

| Module | Location | Purpose |
|--------|----------|---------|
| `ixos_embed` | `src/ixos_embed/` | Model2Vec embeddings, augmented embeddings |
| `ixos_rank` | `src/ixos_rank/` | Candidate generation, semantic engine, ranking |
| `candidate_generator` | `src/ixos_rank/candidate_generator/` | Path scorer, ripgrep funnel, metadata priors |
| `progressive` | `src/ixos_rank/progressive.rs` | Progressive search, evidence extraction |
| `query_preprocess` | `src/ixos_rank/candidate_generator/query_preprocess.rs` | Typo correction, synonym expansion |
| Commands | `src-tauri/src/commands/` | Tauri IPC handlers |
| UI Components | `ui/src/components/search/` | React search interface |

---

## 3. Model System

### Available Models

| Model | Type | Dimensions | Speed | Quality (MRR@10) |
|-------|------|------------|-------|------------------|
| **Ixos Flash v2** | Model2Vec, mpnet-distilled | 512 (f16) | ~170-420ms/1k | 0.766 |
| **Ixos Pro v1** | Flash + lexical fusion | N/A | Flash + ~200ms | 0.883 |
| **Potion 8M** | Model2Vec, int8 | 256 | ~22-200ms/1k | 0.727 |
| **Qwen (v1)** | Distilled student | 512 | ~480ms/1k | 0.435 (not competitive) |

### Auto Mode Routing Logic

```rust
// Trigger Pro refinement when:
// - Score gap < 0.05 (ambiguity)
// - Lexical max < 0.15 (weak keyword match)
// - Entropy > 0.9 (uncertain ranking)
// - Query length <= 2 tokens
```

### Model Preloading

Models are preloaded via `preload_model` Tauri command. In Auto mode, BOTH Flash and Pro are preloaded.

---

## 4. Missing Features (Gaps)

### HIGH PRIORITY

#### 4.1 PDF/DOCX/XLSX Parsing

**Current State:**
- Excluded from candidate generation (`ripgrep_funnel.rs:57`)
- Have low type priors (0.3 penalty)
- Lazy extraction for top-K results mentioned but not fully implemented

**Implementation Needed:**
1. Add PDF text extraction (e.g., `pdf-extract` crate)
2. Add DOCX extraction (e.g., `docx-rs` crate)
3. Add XLSX extraction (e.g., `calamine` crate)
4. Integrate into `PassageExtractor` for evidence display
5. Keep extraction OUT of hot path (lazy, top-K only)

**Files to Modify:**
- `src/ixos_rank/progressive.rs` (evidence extraction)
- `src/ixos_rank/candidate_generator/` (optional path-only matching)
- New `src/parsers/` module for extraction

#### 4.2 Question-Based Search (LLM Query Rewriting)

**Current State:**
- Users must type keywords
- No intent parsing for natural language questions
- Typo correction exists but not question understanding

**Implementation Options:**

**Option A: Pattern-Based (No LLM)**
```rust
// Transform questions to keywords:
// "Where is my 2023 tax return?" → "2023 tax return ext:pdf"
// "What did John send about the project?" → "John project"
```

**Option B: Local LLM (Recommended)**
- Use small local model (e.g., Phi-3, Llama-3.2 1B)
- Query expansion: generate related keywords
- Intent extraction: detect file type hints, date ranges

**Option C: Hybrid**
- Pattern matching for common structures
- LLM fallback for complex queries

**Files to Modify:**
- `src/ixos_rank/candidate_generator/query_preprocess.rs`
- New `src/llm/` module for local inference

### MEDIUM PRIORITY

#### 4.3 Semantic Search Enhancement

- Add query-document similarity explanations
- Improve disambiguation with directory centroids
- Consider FSTD (topology distillation) from P8

#### 4.4 Multiple Match Display

- Currently shows "3 matches" pill + best passage
- Could add match navigation (next/prev)
- Scrolling highlight in file preview

### LOW PRIORITY

#### 4.5 P10 Differentiators

Choose ONE:
- **Semantic Grep:** Pipeable meaning search for CLI
- **Project Spaces:** Per-project ephemeral caches
- **Forensic Canary:** Tamper detection mode

---

## 5. Key Design Constraints

1. **Never embed full corpus per query** — fatal for performance
2. **Hard caps enforced:**
   - `MAX_CANDIDATES_FOR_EMBEDDING = 3000`
   - `MAX_BYTES_READ_PER_FILE = 64KB`
   - `MAX_TEXT_CHARS_PER_FILE = 20k`
3. **Heavy formats (PDF/DOCX) stay OUT of hot path**
4. **Stream results early** — flush every 50ms or 20 results
5. **Batch embeddings** — 32-128 at a time, int8 preferred

---

## 6. File Structure Reference

```
Ixos/
├── src/                          # Rust library
│   ├── ixos_embed/               # Embedding models
│   │   ├── mod.rs
│   │   ├── augmented.rs          # Path-augmented embeddings
│   │   └── mmap_model2vec.rs     # Model2Vec loader
│   ├── ixos_rank/                # Search & ranking
│   │   ├── candidate_generator/  # Candidate funnel
│   │   │   ├── query_preprocess.rs  # Typo/synonym
│   │   │   ├── ripgrep_funnel.rs    # Lexical search
│   │   │   └── metadata_priors.rs   # Recency/type scoring
│   │   ├── semantic_engine.rs    # Embedding-based rerank
│   │   ├── progressive.rs        # Progressive search
│   │   └── secure_ranker.rs      # Score fusion
│   └── storage/                  # Cache (ADS/xattr)
├── src-tauri/                    # Tauri app
│   └── src/commands/             # IPC handlers
│       ├── search.rs             # Search command
│       ├── system.rs             # preload_model, etc.
│       └── config.rs             # Settings
├── ui/                           # React frontend
│   └── src/components/search/    # Search UI
│       ├── SearchInput.tsx       # Main search bar
│       ├── QualitySwitcher.tsx   # Flash/Auto/Pro
│       └── ModeSwitcher.tsx      # JIT/Cache/Journalist
├── models/                       # Trained models
│   └── lab/                      # Experiment outputs
├── scripts/                      # Python tooling
│   ├── ixos_eval.py              # Model evaluation
│   ├── distill_lab.py            # Distillation experiments
│   └── fetch_models.py           # Model downloader
└── FEATURES.md                   # User documentation
```

---

## 7. Development Commands

```bash
# Run dev server
npm run tauri dev

# Build production
npm run tauri build

# Run Rust tests
cargo test --lib

# Run benchmarks
cargo bench --bench directory_centroids_boost

# Model evaluation (Python)
python scripts/ixos_eval.py --suite both

# Distill new model
python scripts/distill_lab.py --mode teacher
```

---

## 8. Configuration Reference

Settings are stored via Tauri config commands. Key search settings:

| Key | Default | Description |
|-----|---------|-------------|
| `search.searchMode` | `auto` | Flash/Auto/Pro |
| `search.timeoutSeconds` | `5` | Search timeout |
| `search.defaultLimit` | `20` | Max results |
| `search.minScoreThreshold` | `0.1` | Hide below this score |
| `search.proModelType` | `ixos-pro-v1` | Pro model selection |

---

## 9. Quick Wins for AI Assistant

When implementing features:

1. **PDF Parsing:** Start with `src/ixos_rank/progressive.rs` → `extract_best_passage` function
2. **Query Rewriting:** Start with `src/ixos_rank/candidate_generator/query_preprocess.rs`
3. **LLM Integration:** Create `src/llm/mod.rs` with `candle` or `llama.cpp` bindings
4. **UI Changes:** Components in `ui/src/components/search/`

---

## 10. Testing Expectations

- **TTFR (Time to First Result):** < 200ms on 30k files
- **Semantic interaction:** < 2s P95
- **Main thread:** > 55fps during streaming
- **Cache hit:** < 500ms repeat query

---

*End of AI Context Document*
