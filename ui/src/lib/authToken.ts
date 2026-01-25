import { invoke } from '@tauri-apps/api/core';
import { decrypt, deriveKey, encrypt, getMachineId } from '@/lib/crypto';

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
    return await decrypt(encrypted, key);
  } catch {
    return null;
  }
}

export async function clearEntitlementToken(): Promise<void> {
  await invoke('delete_encrypted_file', { filename: AUTH_TOKEN_FILE });
}

