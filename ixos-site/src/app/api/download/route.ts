import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

interface GitHubAsset {
    name: string;
    browser_download_url: string;
}

interface GitHubRelease {
    assets: GitHubAsset[];
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform") || "windows";

    // Repo configuration - update if repo name changes
    const REPO_OWNER = "ixos";
    const REPO_NAME = "ixos-protocol";

    try {
        const res = await fetch(
            `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`,
            {
                headers: {
                    "User-Agent": "Ixos-Landing-Page",
                    Accept: "application/vnd.github.v3+json",
                },
                next: { revalidate: 60 }, // Cache for 60s to avoid rate limits
            }
        );

        if (!res.ok) {
            console.error(`GitHub API responded with ${res.status}`);
            // Fallback to releases page
            return NextResponse.redirect(`https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/latest`);
        }

        const release: GitHubRelease = await res.json();
        let asset: GitHubAsset | undefined;

        if (platform === "windows") {
            // Prefer .exe (nsis), fallback to .msi
            asset = release.assets.find((a) => a.name.endsWith(".exe") && !a.name.includes("sig"));
            if (!asset) asset = release.assets.find((a) => a.name.endsWith(".msi"));
        } else if (platform === "macos") {
            // Prefer .dmg, fallback to tar.gz
            asset = release.assets.find((a) => a.name.endsWith(".dmg"));
            if (!asset) asset = release.assets.find((a) => a.name.endsWith(".app.tar.gz"));
        } else if (platform === "linux") {
            // Prefer .deb, fallback to AppImage
            asset = release.assets.find((a) => a.name.endsWith(".deb"));
            if (!asset) asset = release.assets.find((a) => a.name.endsWith(".AppImage"));
        }

        if (asset) {
            return NextResponse.redirect(asset.browser_download_url);
        }

        // Fallback: If no specific asset found, go to releases page
        return NextResponse.redirect(`https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/latest`);
    } catch (error) {
        console.error("Failed to fetch release:", error);
        return NextResponse.redirect(`https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/latest`);
    }
}
