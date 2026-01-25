import { platform, hostname } from '@tauri-apps/plugin-os';

const OS_NAMES: Record<string, string> = {
  'windows': 'Windows',
  'macos': 'macOS',
  'linux': 'Linux',
  'ios': 'iOS',
  'android': 'Android',
};

/**
 * Get a human-readable device label using Tauri OS plugin.
 * Falls back to navigator.platform if not running in Tauri.
 */
export async function getDeviceLabel(): Promise<string> {
  try {
    const os = await platform();
    const host = await hostname();

    const osName = OS_NAMES[os] || os;
    return host ? `${osName} (${host})` : osName;
  } catch {
    // Fallback for browser dev mode (not running in Tauri)
    return getFallbackDeviceLabel();
  }
}

/**
 * Synchronous fallback for when Tauri is not available.
 * Used in browser dev mode.
 */
function getFallbackDeviceLabel(): string {
  const platform = navigator.platform || 'Unknown';

  // Map common platform strings to friendly names
  if (platform.startsWith('Win')) return 'Windows';
  if (platform.startsWith('Mac')) return 'macOS';
  if (platform.includes('Linux')) return 'Linux';
  if (platform.includes('iPhone') || platform.includes('iPad')) return 'iOS';
  if (platform.includes('Android')) return 'Android';

  return platform;
}
