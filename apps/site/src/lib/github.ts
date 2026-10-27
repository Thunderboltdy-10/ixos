const REPO = "Thunderboltdy-10/ixos";

export const GITHUB = `https://github.com/${REPO}`;
export const RELEASES = `${GITHUB}/releases`;
export const HUGGING_FACE = "https://huggingface.co/Thunderboltdy10";

export type System = "windows" | "mac" | "linux";

export interface Installer {
  system: System;
  label: string;
  url: string;
}

interface Release {
  tag_name: string;
  draft: boolean;
  prerelease: boolean;
  assets: { name: string; browser_download_url: string }[];
}

const HOUR = { next: { revalidate: 3600 } };

export async function starCount(): Promise<number | null> {
  try {
    const response = await fetch(`https://api.github.com/repos/${REPO}`, HOUR);
    if (!response.ok) return null;
    const repo: { stargazers_count?: number } = await response.json();
    return repo.stargazers_count ?? null;
  } catch {
    return null;
  }
}

/**
 * Installers from the newest published desktop release. Engine releases share
 * the repository, so GitHub's "latest release" is not always the app.
 */
export async function installers(): Promise<{ version: string; files: Installer[] } | null> {
  try {
    const response = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=30`, HOUR);
    if (!response.ok) return null;
    const releases: Release[] = await response.json();
    const release = releases.find((r) => !r.draft && !r.prerelease && r.tag_name.startsWith("desktop-v"));
    if (!release) return null;
    const find = (test: RegExp) => release.assets.find((asset) => test.test(asset.name))?.browser_download_url;
    const files: (Installer | null)[] = [
      pick("windows", "Windows", find(/-setup\.exe$/i) ?? find(/\.msi$/i)),
      pick("mac", "macOS, Apple silicon", find(/aarch64\.dmg$/i)),
      pick("mac", "macOS, Intel", find(/(x64|x86_64)\.dmg$/i)),
      pick("linux", "Linux, AppImage", find(/\.AppImage$/i)),
      pick("linux", "Linux, .deb", find(/\.deb$/i)),
    ];
    return { version: release.tag_name.replace("desktop-v", ""), files: files.filter((file) => file !== null) };
  } catch {
    return null;
  }
}

function pick(system: System, label: string, url: string | undefined): Installer | null {
  return url ? { system, label, url } : null;
}
