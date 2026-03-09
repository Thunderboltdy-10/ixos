/**
 * Encrypted persistent storage using Tauri's invoke API
 * Falls back to localStorage if Tauri is not available (dev mode)
 */

import { invoke } from '@tauri-apps/api/core';
import { encrypt, decrypt, deriveKey, getMachineId, getLegacyMachineIdForFallback } from './crypto';

const STORAGE_DIR = 'ixos-data';

/**
 * Check if running in Tauri environment
 */
function isTauri(): boolean {
  return '__TAURI__' in window;
}

/**
 * Save encrypted data to filesystem via Tauri
 */
export async function saveEncrypted(filename: string, data: object): Promise<void> {
  try {
    const machineId = await getMachineId();
    const key = await deriveKey(machineId);
    const json = JSON.stringify(data);
    const encrypted = await encrypt(json, key);

    if (isTauri()) {
      // Use Tauri to save to AppConfig directory
      await invoke('write_encrypted_file', {
        filename,
        data: encrypted,
      });
    } else {
      // Fallback to localStorage for development
      localStorage.setItem(`${STORAGE_DIR}:${filename}`, encrypted);
    }
  } catch (error) {
    console.error(`Failed to save ${filename}:`, error);
    throw error;
  }
}

/**
 * Load and decrypt data from filesystem
 */
export async function loadEncrypted<T>(filename: string): Promise<T | null> {
  try {
    let encrypted: string;

    if (isTauri()) {
      // Use Tauri to read from AppConfig directory
      encrypted = await invoke<string>('read_encrypted_file', { filename });
    } else {
      // Fallback to localStorage
      const stored = localStorage.getItem(`${STORAGE_DIR}:${filename}`);
      if (!stored) return null;
      encrypted = stored;
    }

    const machineId = await getMachineId();
    const key = await deriveKey(machineId);
    let decrypted: string;
    try {
      decrypted = await decrypt(encrypted, key);
    } catch {
      const legacyId = await getLegacyMachineIdForFallback();
      if (legacyId === machineId) throw new Error('Decrypt failed');
      const legacyKey = await deriveKey(legacyId);
      decrypted = await decrypt(encrypted, legacyKey);
      // Migrate forward with new key
      await saveEncrypted(filename, JSON.parse(decrypted)).catch(() => { });
    }

    return JSON.parse(decrypted) as T;
  } catch (error) {
    // File doesn't exist or can't be decrypted - return null
    console.warn(`Could not load ${filename}:`, error);
    return null;
  }
}

/**
 * Delete an encrypted file
 */
export async function deleteEncrypted(filename: string): Promise<void> {
  try {
    if (isTauri()) {
      await invoke('delete_encrypted_file', { filename });
    } else {
      localStorage.removeItem(`${STORAGE_DIR}:${filename}`);
    }
  } catch (error) {
    console.error(`Failed to delete ${filename}:`, error);
  }
}

/**
 * Clear all encrypted data (for journalist mode emergency clear)
 */
export async function clearAllEncrypted(): Promise<void> {
  try {
    if (isTauri()) {
      await invoke('clear_all_encrypted_files');
    } else {
      // Clear all localStorage items with our prefix
      const keys = Object.keys(localStorage).filter(k => k.startsWith(`${STORAGE_DIR}:`));
      keys.forEach(k => localStorage.removeItem(k));
    }
  } catch (error) {
    console.error('Failed to clear encrypted data:', error);
  }
}
