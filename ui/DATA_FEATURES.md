# Data Persistence Features

This document describes the encrypted data persistence, statistics tracking, and achievement system in Ixos.

## Features

### 1. Encrypted Search History

Search history is stored locally in an encrypted format using AES-256-GCM encryption.

**Key Features:**
- Chat-like interface showing past searches
- Stores query, directory, results, mode, and timestamp
- Max 100 recent searches
- Click to restore previous search
- Swipe/delete individual entries
- Clear all with confirmation

**Storage:**
- File: `search_history.encrypted` in app config directory
- Encryption: AES-256-GCM with PBKDF2 key derivation
- Device-bound: Uses machine ID for encryption key

### 2. Statistics Tracking

Comprehensive usage statistics tracked across all searches.

**Metrics Tracked:**
- Total searches
- Files indexed
- Embeddings generated
- Cache hits/misses
- Search performance (fastest, slowest, average)
- Daily streaks
- Per-mode usage (cache, JIT, journalist)

**Storage:**
- File: `statistics.encrypted`
- Auto-saves after each search
- Persists across app restarts

### 3. Achievement System

Gamified achievement system with 11 unlockable badges.

**Achievements:**
1. **First Steps** - Complete your first search
2. **Getting Started** - 10 searches
3. **Power User** - 100 searches
4. **Search Expert** - 1,000 searches
5. **Consistent** - 3-day streak
6. **Week Warrior** - 7-day streak
7. **Month Master** - 30-day streak
8. **Privacy Pro** - Use Journalist mode
9. **Speed Demon** - Search under 500ms
10. **Cache Master** - 90% cache hit rate (min 20 searches)
11. **Explorer** - Index 1,000 files

**Features:**
- Progress bars for locked achievements
- Toast notifications when unlocked
- Glow effects on unlocked badges
- Hover tooltips with descriptions

## Architecture

### Stores (Zustand)

#### `historyStore.ts`
- Manages search thread history
- Auto-saves to encrypted file
- Provides CRUD operations

#### `statsStore.ts`
- Tracks all usage metrics
- Calculates streaks daily
- Checks achievements after each search
- Provides getters for computed values

### Utilities

#### `crypto.ts`
- `deriveKey()` - PBKDF2 key derivation
- `encrypt()` - AES-256-GCM encryption
- `decrypt()` - AES-256-GCM decryption
- `getMachineId()` - Device fingerprinting

#### `storage.ts`
- `saveEncrypted()` - Save encrypted JSON
- `loadEncrypted()` - Load and decrypt JSON
- `deleteEncrypted()` - Remove file
- `clearAllEncrypted()` - Emergency clear (journalist mode)

### Tauri Backend

#### `commands/storage.rs`
- `write_encrypted_file` - Write to AppConfig directory
- `read_encrypted_file` - Read from AppConfig directory
- `delete_encrypted_file` - Delete single file
- `clear_all_encrypted_files` - Clear all (emergency)

**File Location:**
- Windows: `%APPDATA%\com.ixos.app\`
- macOS: `~/Library/Application Support/com.ixos.app/`
- Linux: `~/.config/ixos-app/`

## Components

### Statistics View

```tsx
<StatsView />
```
- Tab interface: Statistics | Achievements
- Stats panel with animated counters
- Achievement grid with progress

### Achievement Notifications

```tsx
<AchievementNotifications />
```
- Toast notifications for new achievements
- Auto-dismiss after 5 seconds
- Animated background timer
- Shows achievement icon, name, description

### History List

```tsx
<HistoryList />
```
- Chat-like list of past searches
- Shows query, directory, result count, duration, mode
- Click to select thread
- Hover to show delete button
- Clear all with confirmation

## Integration

### App Initialization

```tsx
import { useAppInit } from '@/hooks/useAppInit';

function App() {
  const { isInitialized, error } = useAppInit();

  if (!isInitialized) return <LoadingScreen />;

  return <MainApp />;
}
```

### Search Integration

The `searchStore` automatically tracks metrics on search completion:

```typescript
// On search complete:
- Records duration
- Increments stats.totalSearches
- Updates streak
- Checks for new achievements
- Adds to history
- Shows achievement toast if unlocked
```

### Emergency Clear

Journalist mode emergency clear (Ctrl+Shift+X):

```typescript
await emergencyClear();
// Clears:
// - All embeddings cache
// - Search history
// - Statistics
// - Configuration
```

## Security

### Encryption
- **Algorithm:** AES-256-GCM (authenticated encryption)
- **Key Derivation:** PBKDF2 with 100,000 iterations
- **Salt:** Fixed application salt
- **IV:** Random 12-byte nonce per encryption

### Device Binding
Encryption key is derived from machine ID (combination of):
- User agent
- Screen resolution
- Timezone
- Language

This prevents history from being decrypted on another device.

### Privacy
- All data stored locally
- No cloud sync
- No telemetry
- Encrypted at rest
- Emergency clear available

## Development

### Testing Locally

Without Tauri (uses localStorage):
```bash
npm run dev
```

With Tauri:
```bash
npm run tauri dev
```

### Manual Testing

1. Search multiple times
2. Check stats panel updates
3. Verify achievements unlock
4. Clear history and verify deletion
5. Restart app and verify persistence

### Debugging

Enable verbose logging:
```typescript
// In crypto.ts, storage.ts
console.log('Encryption key derived');
console.log('Data saved:', filename);
```

Check AppConfig directory:
```bash
# Windows
dir %APPDATA%\com.ixos.app\

# macOS
ls ~/Library/Application\ Support/com.ixos.app/

# Linux
ls ~/.config/ixos-app/
```

## Future Enhancements

- [ ] Export history as JSON
- [ ] Import/merge history from backup
- [ ] More achievements (e.g., "Night Owl" for late searches)
- [ ] Statistics charts (searches over time)
- [ ] Search analytics (most common queries, directories)
- [ ] Achievement sharing (generate shareable image)
- [ ] Custom achievement goals
- [ ] Statistics reset with confirmation
