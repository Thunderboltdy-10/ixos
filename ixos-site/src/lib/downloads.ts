// TODO: Replace with your actual Vercel Blob Store URL ID
const BLOB_STORE_ID = "efuuegbvyq6yzst0";
const BASE_URL = `https://${BLOB_STORE_ID}.public.blob.vercel-storage.com`;

export const DOWNLOADS = {
  windows: `${BASE_URL}/installers/latest/ixos-setup.exe`,
  macos: `${BASE_URL}/installers/latest/ixos.dmg`,
};

export type DownloadPlatform = keyof typeof DOWNLOADS;

export function getDownloadUrl(platform: DownloadPlatform) {
  return DOWNLOADS[platform];
}

