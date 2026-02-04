// Vercel Blob Store configuration
const BLOB_STORE_ID = "efuuegbvyq6yzst0";
const BASE_URL = `https://${BLOB_STORE_ID}.public.blob.vercel-storage.com`;

export const DOWNLOADS = {
  "windows-x64": `${BASE_URL}/installers/latest/ixos-setup.exe`,
  "macos-arm64": `${BASE_URL}/installers/latest/ixos_aarch64.dmg`,
  "macos-x64": `${BASE_URL}/installers/latest/ixos_x86_64.dmg`,
  "linux-x64": `${BASE_URL}/installers/latest/ixos.AppImage`,
} as const;

export type DownloadPlatform = keyof typeof DOWNLOADS;

export function getDownloadUrl(platform: DownloadPlatform): string {
  return DOWNLOADS[platform];
}
