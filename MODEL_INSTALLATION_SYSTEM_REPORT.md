# Tauri App Model Installation System Investigation

**Date:** 2026-01-27  
**Summary:** Complete analysis of the Ixos Desktop app's model downloading, installation, authentication, and verification systems.

---

## 1. Model Download & Installation System

### Entry Point: `download_model` Command
**File:** `src-tauri/src/commands/system.rs` (Lines 223-311)

The Tauri backend exposes a `download_model` command that:
- Takes model type (string) and optional HuggingFace token
- Maps model types to specific HuggingFace repositories
- Downloads model files to app-specific directories
- Supports resume (checks if file exists and size > 0)

### Model Storage Locations (Layered Search)
**File:** `src/ixos_embed/mmap_model.rs` (Lines 314-375)

Models are searched in this priority order:
1. **Relative to executable** (`{exe_dir}/models/...`)
2. **Tauri resources directory** (`{exe_dir}/resources/models/...`)
3. **Parent directories of executable** (for dev builds in `target/debug/`)
4. **App data directory** 
   - Windows: `%APPDATA%/Ixos/models/{model_name}`
   - Unix: `~/.local/share/ixos/models/{model_name}`
5. **Development:** Relative to cwd (`models/...`)
6. **Compile-time workspace root** (for cargo run in dev)

### Download Implementation Details
**File:** `src-tauri/src/commands/system.rs` (Lines 245-310)

```rust
// Model repositories defined at download time
ModelType::IxosFlashV2 => (
    "ixos-flash-v2",                          // Subdir
    "Thunderboltdy10/Ixos-Flash",             // HF repo
    vec!["config.json", "model.safetensors", 
         "tokenizer.json", "vocab.txt"]       // Files to download
),
ModelType::IxosProV1 => (
    "ixos-pro-v1",
    "Thunderboltdy10/Ixos-Pro",
    vec!["config.json", "model.safetensors", 
         "tokenizer.json", "vocab.txt"]
),
```

**Download Flow:**
- Creates `{data_dir}/Ixos/models/{subdir}` directory structure
- Uses HTTP requests with optional Bearer token auth
- Streams bytes and writes to disk with error handling
- Returns error if status code is not 2xx
- No checksum/integrity verification after download

---

## 2. Model List Configuration - Why MANY Models?

### Models Defined in System
**File:** `src/ixos_embed/mmap_model.rs` (Lines 55-71 and 384-417)

Six model types are defined:
1. **Potion** - Quantized potion-base-8M (recommended, reliable)
2. **Qwen** - Distilled from Qwen3-Embedding-0.6B (experimental)
3. **IxosFlashV2** - Ixos Flash v2 (distilled, fast)
4. **IxosFlashV4** - Ixos Flash v4 (512d, int8, quality-leaning)
5. **IxosFlashV4Fast** - Ixos Flash v4 Fast (192d, int8, speed-leaning)
6. **IxosProV1** - Ixos Pro v1 (distilled, higher quality)

### Why This Discrepancy?

The system tracks **ALL available model types** for:
- **Flexibility in development** - Different optimization experiments
- **A/B testing capability** - Compare models side-by-side
- **Future expansion** - Allows adding new models without code changes
- **Documented migration path** - See `docs/CHANGELOG_MODELS.md`

**However, only 2 are actively shipped to users:**
- **Ixos Flash v2** (Fast mode) - Default, fastest option
- **Ixos Pro v1** (Accurate mode) - Higher quality reranking

### UI Presentation
**File:** `ui/src/components/search/ModelSwitcher.tsx` (Lines 189-208)

The UI switcher shows only these two options:
```typescript
const models: ModelOption[] = [
    {
        id: 'ixos-flash-v2',
        label: 'Ixos Flash',
        description: 'Fast, efficient model for mostly standard searches',
        available: status?.ixosFlashV2Available ?? false,
        icon: Beaker,
    },
    {
        id: 'ixos-pro-v1',
        label: 'Ixos Pro',
        description: 'Higher precision for complex queries',
        available: status?.ixosProV1Available ?? false,
        icon: Wand2,
    }
];
```

The other four model types exist in the backend for development/testing but are not exposed in the public UI.

---

## 3. Model Storage Locations

### Installation Locations

#### Windows
- **Primary:** `C:\Users\{user}\AppData\Roaming\Ixos\models\`
  - `ixos-flash-v2/` → Flash v2 model files
  - `ixos-pro-v1/` → Pro v1 model files

#### macOS/Linux
- **Primary:** `~/.local/share/ixos/models/`
- **Alternative:** `~/.cache/huggingface/hub/` (HF cache)

### Model File Structure
Each model directory contains:
```
models/ixos-flash-v2/
├── config.json              (Model configuration)
├── model.safetensors        (Model weights in safetensors format)
├── tokenizer.json           (Tokenizer configuration)
└── vocab.txt                (Vocabulary file)
```

### Status Checking
**File:** `src-tauri/src/commands/system.rs` (Lines 150-194)

The `get_model_status` command returns:
```rust
pub struct ModelStatus {
    pub ixos_flash_v2_available: bool,
    pub ixos_flash_v2_path: Option<String>,
    pub ixos_pro_v1_available: bool,
    pub ixos_pro_v1_path: Option<String>,
    pub any_available: bool,
    pub recommended: Option<String>,        // "ixos-flash-v2" or "ixos-pro-v1"
    pub loaded_model: Option<String>,       // Currently loaded model
}
```

---

## 4. Authentication Flow for Model Downloads

### Entitlement-Based Access
**File:** `src-tauri/src/commands/auth.rs` (Lines 10-108)

The system uses JWT tokens for authorization:

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct EntitlementClaims {
    pub sub: String,           // Subject (user ID)
    pub did: String,           // Device ID (DID)
    pub plan: String,          // User plan (free/pro)
    pub features: Vec<String>, // Feature flags
    pub exp: usize,            // Token expiration (Unix timestamp)
    pub iss: String,           // Issuer ("ixos-control-plane")
    pub iat: Option<usize>,    // Issued at
}
```

**Token Flow:**
1. Backend receives JWT token from frontend (Clerk authentication)
2. `verify_entitlement_token` validates JWT signature using EC256 public key
3. `set_entitlement_token` stores token in app state
4. `check_search_allowed` verifies:
   - Token is valid and not expired
   - Device ID in token matches local device ID
   - Returns `true` only if both conditions pass

### Model Download Authentication
**File:** `src-tauri/src/commands/system.rs` (Lines 225-228)

The `download_model` command accepts an optional `hf_token`:
```rust
pub async fn download_model(
    _app: AppHandle,
    model_type: String,
    hf_token: Option<String>,  // ← Optional HuggingFace token
) -> Result<String, String>
```

**Bearer Token Usage (Lines 282-288):**
```rust
let mut request = client.get(&url);
if let Some(token) = &hf_token {
    if !token.is_empty() {
        request = request.header("Authorization", format!("Bearer {}", token));
    }
}
```

**Access Control for Model Preloading:**
**File:** `src-tauri/src/commands/system.rs` (Lines 196-221)

The `preload_model` command enforces authentication:
```rust
pub async fn preload_model(
    state: State<'_, AppState>,
    model_type: String,
) -> Result<String, String> {
    // Check authentication first
    if state.get_entitlement_token().is_none() {
        return Err("Authentication required to preload models".to_string());
    }
    // ... proceed with preload
}
```

### UI Authentication Integration
**File:** `ui/src/components/search/ModelSwitcher.tsx` (Lines 36-46, 100-114)

```typescript
import { useAuth } from '@clerk/clerk-react';

export function ModelSwitcher({ value, onChange }: ModelSwitcherProps) {
    const { isSignedIn } = useAuth();
    
    const handleSelect = async (model: ModelType) => {
        // Skip preload if not authenticated
        if (isSignedIn) {
            setPreloadingModel(model);
            await safeInvoke('preload_model', { modelType: model });
        }
    };
}
```

---

## 5. Verification & Validation Logic

### Current Verification System

#### File Existence Check
**File:** `src/ixos_embed/mmap_model.rs` (Lines 377-381)

```rust
fn has_model_files(path: &std::path::Path) -> bool {
    path.join("embeddings.safetensors").exists() 
        || path.join("model.safetensors").exists()
}
```

**Limitation:** Only checks if safetensors file exists, not validit
