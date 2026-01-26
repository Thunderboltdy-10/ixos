const { put } = require("@vercel/blob");
const fs = require("fs");
const path = require("path");

async function uploadArtifacts() {
    const artifactsDir = process.env.ARTIFACTS_DIR || "./artifacts";
    const version = process.env.VERSION || "0.1.0"; // Should be passed from CI

    if (!fs.existsSync(artifactsDir)) {
        console.error(`Artifacts directory not found: ${artifactsDir}`);
        process.exit(1);
    }

    const files = fs.readdirSync(artifactsDir);
    const uploadedFiles = {};
    const platformMap = {
        ".exe": "windows-x86_64",
        ".dmg": "darwin-universal", // Simplified, usually split by arch
        ".AppImage": "linux-x86_64",
        ".deb": "linux-x86_64"
    };

    // 1. Upload Binaries and Signatures
    for (const file of files) {
        // Skip signature files for direct upload loop, we handle them with binaries
        if (file.endsWith(".sig")) continue;

        const filePath = path.join(artifactsDir, file);
        const blob = await put(`installers/latest/${file}`, fs.readFileSync(filePath), {
            access: 'public',
            addRandomSuffix: false,
            token: process.env.BLOB_READ_WRITE_TOKEN
        });

        console.log(`Uploaded ${file} to ${blob.url}`);

        // Find platform key
        let platformKey = null;
        if (file.endsWith(".exe")) platformKey = "windows-x86_64";
        else if (file.endsWith(".AppImage")) platformKey = "linux-x86_64";
        else if (file.endsWith(".dmg")) {
            // Check filename for arch if possible, otherwise default
            platformKey = file.includes("aarch64") ? "darwin-aarch64" : "darwin-x86_64";
        }

        if (platformKey) {
            // Read signature
            const sigFile = files.find(f => f === `${file}.sig`);
            let signature = "";
            if (sigFile) {
                signature = fs.readFileSync(path.join(artifactsDir, sigFile), "utf-8");
            }

            uploadedFiles[platformKey] = {
                signature,
                url: blob.url
            };
        }
    }

    // 2. Generate and Upload latest.json
    const manifest = {
        version,
        notes: "Update via Vercel Blob",
        pub_date: new Date().toISOString(),
        platforms: uploadedFiles
    };

    const manifestBlob = await put(`installers/latest/latest.json`, JSON.stringify(manifest, null, 2), {
        access: 'public',
        addRandomSuffix: false,
        token: process.env.BLOB_READ_WRITE_TOKEN
    });

    console.log(`Uploaded latest.json to ${manifestBlob.url}`);
}

uploadArtifacts().catch((err) => {
    console.error(err);
    process.exit(1);
});
