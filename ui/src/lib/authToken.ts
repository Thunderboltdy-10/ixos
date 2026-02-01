import { invoke } from '@tauri-apps/api/core';
import { decrypt, deriveKey, encrypt, getMachineId, getLegacyMachineIdForFallback } from '@/lib/crypto';

const AUTH_TOKEN_FILE = 'auth_token.encrypted';

export async function storeEntitlementToken(token: string): Promise<void> {
  const machineId = await getMachineId();
  const key = await deriveKey(machineId);
  const encrypted = await encrypt(token, key);
  await invoke('write_encrypted_file', { filename: AUTH_TOKEN_FILE, data: encrypted });
}

export async function loadEntitlementToken(): Promise<string | null> {
  try {
    const encrypted = await invoke<string>('read_encrypted_file', { filename: AUTH_TOKEN_FILE });
    const machineId = await getMachineId();
    const key = await deriveKey(machineId);
    try {
      return await decrypt(encrypted, key);
    } catch {
      const legacyId = await getLegacyMachineIdForFallback();
      if (legacyId !== machineId) {
        const legacyKey = await deriveKey(legacyId);
        const token = await decrypt(encrypted, legacyKey);
        // Migrate to new key for future loads.
        await storeEntitlementToken(token).catch(() => { });
        return token;
      }
      throw new Error('Decrypt failed');
    }
  } catch {
    return null;
  }
}

export async function clearEntitlementToken(): Promise<void> {
  await invoke('delete_encrypted_file', { filename: AUTH_TOKEN_FILE });
}

