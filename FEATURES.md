# Ixos Protocol - Features Documentation

> **Version**: 0.2.0
> **Last Updated**: January 2026

---

## Overview

Ixos is a privacy-first semantic file search tool that uses Model2Vec embeddings for intelligent document retrieval. It combines fast lexical search with semantic understanding while maintaining strong security and privacy guarantees.

Available as both a CLI tool and a Tauri-based desktop application.

---

## Desktop Application

The Ixos desktop app provides a rich graphical interface built with Tauri, React, and Three.js.

### Window Features

| Feature | Description |
|---------|-------------|
| **Minimize** | Hides window to system tray |
| **Maximize** | Toggles fullscreen/windowed mode |
| **Close** | Hides to tray (app keeps running) |
| **Global Hotkey** | `Ctrl+Space` shows/hides the app |

### Search Interface

- **Search Input**: Large text input with real-time results
- **Folder Picker**: Native folder dialog or manual path entry
- **Mode Selector**: Dropdown to choose JIT/Cache/Journalist mode
- **3D Visualization**: Neural network animation during search (Three.js)

### Starred Searches

Save frequently-used searches by clicking the ⭐ Star button on any search result:
- Starred searches appear in the sidebar
- Click a starred search to restore and re-run it
- Unstar or delete from the sidebar

### Statistics Panel

Track your search activity (stored encrypted locally):
- Total searches performed
- Files indexed
- Cache hit rate percentage
- Current usage streak

### Achievements System

Unlock achievements as you use Ixos:
- First Search, Power User, Speed Demon
- Privacy Champion (10 JIT searches)
- Cache Master (90% hit rate)
- Archivist (1000+ files, 50+ searches)

### System Tray

- **Icon**: Ixos icon in notification area
- **Menu**: Show, Settings, Quit
- **Double-click**: Shows main window

---

## CLI Commands

### Search Command

```cmd
.\target\release\ixos.exe search <QUERY> [OPTIONS]
```

**Arguments:**
- `<QUERY>` - The search query (required)

**Options:**

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--limit` | `-l` | 20 | Maximum number of results |
| `--format` | `-f` | human | Output format: `human`, `json`, `csv`, `ripgrep` |
| `--dir` | `-d` | current | Directory to search |
| `--json` | | | Shorthand for `--format json` |
| `--progressive` | | | Show quick lexical results, then semantic |
| `--show-scores` | | | Display score breakdown |
| `--cache-mode` | | jit | `jit` (memory only) or `cache` (persistent) |
| `--stub-model` | | | Use fast stub model (no real semantic) |
| `--secure-timing` | | | Enable 100ms timing floor (security) |
| `--context` | `-C` | 5 | Lines of context around matches |
| `--sandbox` | | | Restrict search to directory |
| `--no-secure-ranking` | | | Disable integrity/behavioral scoring |
| `--journalist-mode` | | | Enable maximum privacy (memory-only, auto-clear) |

**Examples:**

```cmd
# Basic search
.\target\release\ixos.exe search "quarterly report"

# JSON output for scripting
.\target\release\ixos.exe search "api docs" --json

# Progressive mode with score breakdown
.\target\release\ixos.exe search "machine learning" --progressive --show-scores

# Fast testing without model download
.\target\release\ixos.exe search "test query" --stub-model

# Search with persistent caching
.\target\release\ixos.exe search "important document" --cache-mode cache

# Secure mode for sensitive documents
.\target\release\ixos.exe search "classified" --secure-timing
```

---

### Index Command

```cmd
.\target\release\ixos.exe index <DIRECTORIES> [OPTIONS]
```

**Options:**

| Flag | Default | Description |
|------|---------|-------------|
| `--use-xattr` | false | Enable persistent caching (ADS/xattr) |
| `--progress` | false | Show indexing progress |
| `--clear` | false | Clear existing index first |

**Examples:**

```cmd
# Index with caching enabled
.\target\release\ixos.exe index .\documents --use-xattr

# Index with progress display
.\target\release\ixos.exe index .\dataset --progress
```

---

### Config Command

```cmd
.\target\release\ixos.exe config [OPTIONS]
```

**Options:**

| Flag | Description |
|------|-------------|
| `--list` | Show all configuration values |
| `--get <KEY>` | Get specific setting value |
| `--set <KEY>=<VALUE>` | Set configuration value |
| `--reset` | Reset to defaults |
| `--path` | Show config file path |

---

## Search Modes (Flash / Auto / Pro)

Ixos supports intelligent quality modes in the desktop UI:

- **Flash**: Uses Ixos Flash v2 model. Fastest, optimized for instant feedback.
- **Auto** (recommended): Starts with Flash, automatically refines using Pro fusion when ambiguity is detected (score gap < 0.05, weak lexical match, short queries).
- **Pro**: Always uses Pro fusion (semantic 0.33 / lexical 0.67 weights) for maximum accuracy.

Both Flash and Pro models are preloaded when Auto mode is selected to ensure fast refinement.

Use the **Quality** dropdown in the search bar to switch modes.

**Configuration Keys:**

```
search.default_limit       - Default number of results (default: 20)
search.timeout_seconds     - Search timeout (default: 5)
search.enable_secure_ranking - Enable security scoring (default: true)
search.progressive_by_default - Use progressive mode by default
search.cache_mode          - Default cache mode: "jit" or "cache"
search.use_stub_model      - Use stub model by default
search.secure_timing       - Enable timing protection by default
search.context_lines       - Lines of context (default: 5)

output.default_format      - Output format (default: human)
output.color               - Enable colored output (default: true)
output.show_scores         - Show scores by default

index.use_xattr            - Enable caching by default (default: true)
index.extensions           - File extensions to index

security.sandbox_enabled   - Restrict to specific directories
security.verify_integrity  - Verify file integrity
```

**Examples:**

```cmd
# List all settings
.\target\release\ixos.exe config --list

# Get specific value
.\target\release\ixos.exe config --get search.default_limit

# Set a value
.\target\release\ixos.exe config --set search.cache_mode=cache

# Show config file location
.\target\release\ixos.exe config --path
```

---

### Compliance Command

```cmd
.\target\release\ixos.exe compliance [SUBCOMMAND]
```

**Subcommands:**

| Subcommand | Description |
|------------|-------------|
| `consent --grant` | Grant AI consent |
| `consent --withdraw` | Withdraw AI consent |
| `consent --status` | Check consent status |
| `gdpr access` | View all stored data (Article 15) |
| `gdpr erase` | Delete data (Article 17) |
| `gdpr export` | Export data as JSON (Article 20) |
| `ccpa know` | Request data disclosure |
| `ccpa delete` | Request data deletion |
| `ccpa opt-out` | Opt out of data collection |
| `ccpa notice` | View "Do Not Sell" notice |
| `docs --output <PATH>` | Export technical documentation |
| `audit --days <N>` | View audit log |

**Examples:**

```cmd
# Grant consent for AI operations
.\target\release\ixos.exe compliance consent --grant

# Export your data (GDPR)
.\target\release\ixos.exe compliance gdpr export

# View recent audit events
.\target\release\ixos.exe compliance audit --days 7
```

---

### Version Command

```cmd
.\target\release\ixos.exe version [OPTIONS]
```

**Options:**

| Flag | Description |
|------|-------------|
| `--verbose` | Show detailed system information |

---

## Output Formats

### Human Format (Default)

Colored, human-readable output:

```
Results (5 files):
1. .\dataset\medical\medical_42.txt (0.87)
2. .\dataset\medical\medical_15.txt (0.82)
3. .\dataset\space\space_9.txt (0.78)
```

With `--show-scores`:

```
Results (5 files):
1. .\dataset\medical\medical_42.txt
   Score: 0.87 [Semantic: 0.85 | Integrity: 1.0 | Temporal: 0.5 | Behavior: 1.0]
```

### JSON Format

```json
{
  "type": "semantic",
  "count": 5,
  "results": [
    {
      "path": ".\\dataset\\medical\\medical_42.txt",
      "score": 0.87,
      "integrity_verified": true,
      "score_breakdown": {
        "semantic": 0.85,
        "integrity": 1.0,
        "temporal": 0.5,
        "behavior": 1.0
      }
    }
  ]
}
```

### CSV Format

```csv
path,score,integrity_verified
.\dataset\medical\medical_42.txt,0.87,true
.\dataset\medical\medical_15.txt,0.82,true
```

### Ripgrep Format

For piping to `fzf` or other tools:

```
.\dataset\medical\medical_42.txt:1:snippet of matching content
```

---

## Cache Modes

### JIT Mode (Just-In-Time)

- **Flag**: `--cache-mode jit`
- **Persistence**: None - embeddings discarded after search
- **Privacy**: Maximum - no forensic artifacts
- **Performance**: Slower for repeated searches
- **Use Case**: Journalists, sensitive document handling

### Cache Mode

- **Flag**: `--cache-mode cache`
- **Persistence**: File metadata (ADS on Windows, xattr on Unix)
- **Privacy**: Embeddings stored with files
- **Performance**: Fast subsequent searches
- **Use Case**: Power users, large document collections

### Journalist Mode

- **Flag**: `--journalist-mode`
- **Persistence**: Absolutely none (forces JIT mode)
- **Privacy**: Maximum + Secure Wipe
- **Features**:
  - Memory-only operation
  - Auto-clear after search
  - Secure memory zeroing
  - "Panic Button" cleanup
- **Use Case**: High-risk environments, sensitive investigations

---

## Security Features

### Secure Timing Mode

- **Flag**: `--secure-timing`
- **Effect**: 100ms minimum embedding time, single-threaded
- **Purpose**: Prevents timing analysis attacks
- **When to Use**: Processing sensitive data that may be exposed to attackers

### Secure Ranking

- **Default**: Enabled
- **Disable**: `--no-secure-ranking`
- **Features**:
  - File integrity verification (SHA256)
  - Behavioral scoring (detects bot-like access)
  - Temporal scoring (penalizes recently modified files)
  - Composite scoring with configurable weights

### Memory Protection

- Sensitive data uses `SecureBuffer` with:
  - Memory locking (mlock) to prevent swapping
  - Automatic zeroization on drop
  - Protected embedding buffers

---

## Performance Features

### Parallel Processing

- **File Loading**: Rayon parallel iteration for I/O
- **Search**: Parallel scoring for large file sets (>100 files)
- **Effect**: ~7ms to load 1000 files

### System Detection

Uses `sysinfo` crate to auto-detect:
- CPU core count
- Available RAM
- Performance profile selection

### Performance Profiles

| Profile | RAM | Concurrent Embeds | Batch Size |
|---------|-----|-------------------|------------|
| LowSpec | <4GB | 1 | 10 |
| MidSpec | 4-8GB | 2 | 50 |
| HighSpec | 8GB+ | 4 | 100 |

---

## Model Information

### Ixos Flash v2 (Default)

- **Type**: Distilled Model2Vec (mpnet-teacher)
- **Dimensions**: 512 (float16)
- **Speed**: ~170-420ms per 1k candidates
- **Quality**: MRR@10 0.766 on real corpus
- **Use case**: Default model for all searches

### Ixos Pro v1

- **Type**: Flash + learned lexical/semantic fusion
- **Weights**: Semantic 0.33 / Lexical 0.67
- **Quality**: MRR@10 0.883 on real corpus
- **Use case**: Triggered by Auto mode for ambiguous queries

### Potion 8M (Legacy)

- **Type**: Model2Vec (int8 quantized)
- **Dimensions**: 256
- **Speed**: ~22-200ms per 1k candidates
- **Quality**: MRR@10 0.727
- **Use case**: Fallback if Ixos models unavailable

### Stub Model

- **Flag**: `--stub-model`
- **Use**: Testing without network/model download
- **Speed**: Very fast (no real semantic understanding)
- **Quality**: Deterministic hashing (not semantic)

---

## Compliance

### EU AI Act

- AI disclosure before first operation
- Consent management with `compliance consent`
- Technical documentation export

### GDPR

- Article 15: Right of access (`gdpr access`)
- Article 17: Right to erasure (`gdpr erase`)
- Article 20: Data portability (`gdpr export`)

### CCPA

- Right to know (`ccpa know`)
- Right to delete (`ccpa delete`)
- Right to opt-out (`ccpa opt-out`)
- "Do Not Sell" notice (`ccpa notice`)

---

## Legal & Forensics (P3)

### Cryptographic Attestation

- **Purpose**: Legal proof of file existence and content at a specific time
- **Algorithm**: Ed25519 digital signatures
- **Features**:
  - Signs file hash + embedding hash + timestamp
  - Includes hardware ID binding
  - Verifiable offline
- **Export**: JSON/JSONL for eDiscovery tools (Relativity, Concordance)

### Chain of Custody

- **Integrity**: SHA256 hashing of all processed files
- **Audit**: Immutable audit logs for all operations
- **Verification**: `AttestationService` for validating signatures

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `IXOS_RAM_GB` | Override RAM detection (e.g., "4.0") |
| `RUST_LOG` | Set log level (e.g., "debug", "trace") |
| `NO_COLOR` | Disable colored output |

---

## File Support

### Supported Extensions

Text files only:
- `.txt`, `.md` - Plain text and Markdown
- `.json` - JSON files
- `.rs`, `.py`, `.js`, `.ts` - Source code
- `.toml`, `.yaml`, `.yml` - Configuration files

### Unsupported (Candidate Generation)

- Binary files
- PDF, DOCX, XLSX - excluded from candidate generation for speed (lazy extraction planned for evidence display)
- Files >10MB (processed in chunks)

---

## Differentiation from Competitors

### vs. SemTools

| Feature | SemTools | Ixos |
|---------|----------|------|
| Context display | `--n-lines` | `--context` (default 5) |
| Score breakdown | No | Yes (`--show-scores`) |
| Cache modes | Workspace | JIT + Cache |
| Security | None | Timing protection, integrity verification |
| Compliance | None | GDPR, CCPA, EU AI Act |
| Hybrid search | Pure semantic | Lexical + Semantic cascade |
| Attack detection | No | Degradation attack mitigation |

---

*For more information, see IMPLEMENTATION_ROADMAP.md and TESTING_RESULTS.md*
