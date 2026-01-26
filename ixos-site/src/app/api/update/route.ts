import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
    const REPO_OWNER = "Thunderboltdy-10";
    const REPO_NAME = "Ixos";
    const githubToken = process.env.GITHUB_TOKEN;

    try {
        const headers: HeadersInit = {
            "User-Agent": "Ixos-Updater",
            Accept: "application/vnd.github.v3+json",
        };

        if (githubToken) {
            headers["Authorization"] = `Bearer ${githubToken}`;
        }

        // Fetch the latest.json asset from the latest release
        const res = await fetch(
            `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`,
            {
                headers,
                next: { revalidate: 60 },
            }
        );

        if (!res.ok) {
            return new NextResponse("Release not found", { status: 404 });
        }

        const release = await res.json();
        const asset = release.assets.find((a: any) => a.name === "latest.json");

        if (!asset) {
            return new NextResponse("latest.json not found in release", { status: 404 });
        }

        // Fetch the actual content of latest.json
        const contentRes = await fetch(asset.browser_download_url, {
            headers: githubToken ? { "Authorization": `Bearer ${githubToken}` } : {},
        });

        if (!contentRes.ok) {
            return new NextResponse("Failed to fetch latest.json content", { status: 500 });
        }

        const data = await contentRes.json();

        // Rewrite the download URLs in latest.json to point to our authenticated proxy
        // This ensures the actual binary download works even for private repos.
        const host = request.headers.get("host");
        const protocol = host?.includes("localhost") ? "http" : "https";
        const baseUrl = `${protocol}://${host}`;

        if (data.platforms) {
            for (const platform of Object.keys(data.platforms)) {
                // Map Tauri platform keys to our API query params
                let mappedPlatform = "windows";
                if (platform.includes("darwin") || platform.includes("macos")) mappedPlatform = "macos";
                if (platform.includes("linux")) mappedPlatform = "linux";

                data.platforms[platform].url = `${baseUrl}/api/download?platform=${mappedPlatform}`;
            }
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Update proxy error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
