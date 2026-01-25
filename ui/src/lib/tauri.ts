import { invoke } from '@tauri-apps/api/core';
import type { IxosConfig, SearchOptions, ConsentStatus } from './types';

/**
 * Start a progressive search
 */
export async function searchProgressive(
  query: string,
  directory: string,
  options: SearchOptions = {}
): Promise<void> {
  await invoke('search_progressive', { query, directory, options });
}

/**
 * Cancel the current search
 */
export async function cancelSearch(): Promise<void> {
  await invoke('cancel_search');
}

/**
 * Get current configuration
 */
export async function getConfig(): Promise<IxosConfig> {
  return await invoke('get_config');
}

/**
 * Update configuration
 */
export async function updateConfig(config: IxosConfig): Promise<void> {
  await invoke('update_config', { config });
}

/**
 * Reset configuration to defaults
 */
export async function resetConfig(): Promise<void> {
  await invoke('reset_config');
}

/**
 * Get consent status
 */
export async function getConsentStatus(): Promise<ConsentStatus> {
  return await invoke('get_consent_status');
}

/**
 * Grant consent
 */
export async function grantConsent(): Promise<void> {
  await invoke('grant_consent');
}

/**
 * Withdraw consent
 */
export async function withdrawConsent(): Promise<void> {
  await invoke('withdraw_consent');
}

/**
 * Show the overlay window
 */
export async function showOverlay(): Promise<void> {
  await invoke('show_overlay');
}

/**
 * Hide the overlay window
 */
export async function hideOverlay(): Promise<void> {
  await invoke('hide_overlay');
}

/**
 * Open a file with default application
 */
export async function openFile(path: string): Promise<void> {
  await invoke('open_file', { path });
}

/**
 * Reveal a file in the system file explorer
 */
export async function revealInExplorer(path: string): Promise<void> {
  await invoke('reveal_in_explorer', { path });
}

/**
 * Emergency clear all sensitive data (journalist mode)
 */
export async function emergencyClear(): Promise<void> {
  await invoke('emergency_clear');
  // Also clear encrypted local data
  await invoke('clear_all_encrypted_files');
}

/**
 * Get the default search directory
 */
export async function getDefaultSearchDirectory(): Promise<string> {
  return await invoke('get_default_search_directory');
}

/**
 * Select a directory using the system file picker
 */
export async function selectDirectory(): Promise<string | null> {
  return await invoke('select_directory');
}

/**
 * Get keyboard shortcut configuration
 */
export async function getShortcutConfig(): Promise<import('./types').ShortcutConfig> {
  return await invoke('get_shortcut_config');
}

/**
 * Set keyboard shortcut configuration
 */
export async function setShortcutConfig(config: import('./types').ShortcutConfig): Promise<void> {
  await invoke('set_shortcut_config', { config });
}

/**
 * Set the entitlement token in the Tauri backend
 */
export async function setEntitlementToken(token: string): Promise<void> {
  await invoke('set_entitlement_token', { token });
}

/**
 * Open the Lemon Squeezy checkout in an in-app window
 */
export async function openCheckout(
  variantId: string,
  userId: string,
  userEmail?: string,
  options?: {
    pricingUrl?: string;
    checkoutUrlTemplate?: string;
    successUrl?: string;
    cancelUrl?: string;
  }
): Promise<void> {
  await invoke('open_checkout', {
    variant_id: variantId,
    user_id: userId,
    user_email: userEmail,
    pricing_url: options?.pricingUrl,
    checkout_url_template: options?.checkoutUrlTemplate,
    success_url: options?.successUrl,
    cancel_url: options?.cancelUrl,
  });
}

/**
 * Open an external URL inside a dedicated in-app window
 */
export async function openExternalUrl(url: string, title?: string, label?: string): Promise<void> {
  await invoke('open_external_url', { url, title, label });
}
