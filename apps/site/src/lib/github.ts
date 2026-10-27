const REPO = "Thunderboltdy-10/ixos";

export const GITHUB = `https://github.com/${REPO}`;
export const RELEASES = `${GITHUB}/releases`;
export const HUGGING_FACE = "https://huggingface.co/Thunderboltdy10";

export type System = "windows" | "mac" | "linux";

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
