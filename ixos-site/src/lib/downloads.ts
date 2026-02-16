// GitHub Releases configuration
const BASE_URL = "https://github.com/IxosProtocol/ixos-releases/releases/latest/download";

export const DOWNLOADS = {
  "windows-x64": `${BASE_URL}/ixos-setup.exe`,
  "macos-arm64": `${BASE_URL}/ixos-aarch64.dmg`,
  "macos-x64": `${BASE_URL}/ixos-x64.dmg`,
  "linux-x64": `${BASE_URL}/ixos.AppImage`,
} as const;

export type DownloadPlatform = keyof typeof DOWNLOADS;

export function getDownloadUrl(platform: DownloadPlatform): string {
  return DOWNLOADS[platform];
}
