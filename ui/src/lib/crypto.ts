/**
 * Cryptographic utilities for encrypting local data
 * Uses Web Crypto API with AES-256-GCM for authenticated encryption
 */

const SALT = 'ixos-v1-salt-2026';
const ITERATIONS = 100000;

/**
 * Derive an encryption key from a password using PBKDF2
 */
export async function deriveKey(password: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(SALT),
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data with AES-256-GCM
 * Returns base64-encoded (IV + ciphertext)
 */
export async function encrypt(data: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data)
  );

  // Combine IV + encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  // Convert to base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt AES-256-GCM encrypted data
 */
export async function decrypt(encrypted: string, key: CryptoKey): Promise<string> {
  try {
    // Decode from base64
    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));

    // Extract IV and ciphertext
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    throw new Error('Decryption failed - data may be corrupted or key is wrong');
  }
}

async function getLegacyMachineId(): Promise<string> {
  const components = [
    navigator.userAgent,
    screen.width.toString(),
    screen.height.toString(),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
  ];

  const combined = components.join('|');
  const encoder = new TextEncoder();
  const data = encoder.encode(combined);

  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

/**
 * Get a machine-specific identifier for deriving encryption keys.
 * Uses Tauri device identity when available, falls back to legacy fingerprint.
 */
export async function getMachineId(): Promise<string> {
  if (typeof window !== 'undefined' && '__TAURI__' in window) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const deviceId = await invoke<string>('get_device_id');
      if (deviceId) return deviceId;
    } catch {
      // Fall back to legacy fingerprint
    }
  }

  return getLegacyMachineId();
}

export async function getLegacyMachineIdForFallback(): Promise<string> {
  return getLegacyMachineId();
}
