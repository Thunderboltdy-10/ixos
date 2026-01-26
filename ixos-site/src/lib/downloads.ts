export const DOWNLOADS = {
  windows: "/api/download?platform=windows",
  macos: "/api/download?platform=macos",
};

export type DownloadPlatform = keyof typeof DOWNLOADS;

export function getDownloadUrl(platform: DownloadPlatform) {
  return DOWNLOADS[platform];
}

