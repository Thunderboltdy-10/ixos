// TODO: Replace with your actual Vercel Blob Store URL ID
const BLOB_STORE_ID = "YOUR_BLOB_STORE_ID";
const BASE_URL = `https://${BLOB_STORE_ID}.public.blob.vercel-storage.com`;

export const DOWNLOADS = {
  windows: `${BASE_URL}/installers/latest/ixos-setup.exe`,
  macos: `${BASE_URL}/installers/latest/ixos.dmg`,
};

export type DownloadPlatform = keyof typeof DOWNLOADS;

export function getDownloadUrl(platform: DownloadPlatform) {
  return DOWNLOADS[platform];
}

