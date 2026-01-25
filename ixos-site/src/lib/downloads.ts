export const DOWNLOADS = {
  windows: "/downloads/ixos-latest-windows-x64.exe",
  macos: null as string | null,
};

export type DownloadPlatform = keyof typeof DOWNLOADS;

export function getDownloadUrl(platform: DownloadPlatform) {
  return DOWNLOADS[platform];
}

