/**
 * generate-latest-json.js
 *
 * Replaces upload-release.js. Generates Tauri v2 updater `latest.json`
 * from local artifacts and uploads it as a release asset to ixos-releases.
 *
 * Env vars:
 *   ARTIFACTS_DIR - path to downloaded release artifacts
 *   VERSION       - version tag (e.g., v0.2.0)
 *   GH_TOKEN      - PAT with contents:write on IxosProtocol/ixos-releases
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const RELEASES_REPO = "IxosProtocol/ixos-releases";

// Map installer filename patterns to Tauri updater platform keys
const PLATFORM_MAP = [
  { pattern: /aarch64-apple-darwin.*\.app\.tar\.gz$/, key: "darwin-aarch64" },
  { pattern: /x86_64-apple-darwin.*\.app\.tar\.gz$/, key: "darwin-x86_64" },
  { pattern: /amd64\.AppImage\.tar\.gz$/, key: "linux-x86_64" },
  { pattern: /x86_64.*\.AppImage\.tar\.gz$/, key: "linux-x86_64" },
  { pattern: /x64[-_]setup.*\.nsis\.zip$/, key: "windows-x86_64" },
  { pattern: /x64[-_]en-US.*\.msi\.zip$/, key: "windows-x86_64" },
];

function main() {
  const artifactsDir = process.env.ARTIFACTS_DIR || "./artifacts";
  const version = (process.env.VERSION || "0.1.0").replace(/^v/, "");

  if (!fs.existsSync(artifactsDir)) {
    console.error(`Artifacts directory not found: ${artifactsDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(artifactsDir);
  const platforms = {};

  for (const file of files) {
    // Skip non-updater files (we only want .tar.gz and .zip bundles for Tauri updater)
    if (file.endsWith(".sig")) continue;
    if (file.endsWith(".sha256")) continue;

    // Try to match to a platform key
    let platformKey = null;
    for (const { pattern, key } of PLATFORM_MAP) {
      if (pattern.test(file)) {
        platformKey = key;
        break;
      }
    }

    if (!platformKey) continue;

    // Skip if we already have a better match for this platform
    if (platforms[platformKey]) continue;

    // Read signature file if available
    const sigFile = `${file}.sig`;
    let signature = "";
    if (files.includes(sigFile)) {
      signature = fs.readFileSync(path.join(artifactsDir, sigFile), "utf-8").trim();
    }

    // Construct download URL pointing to ixos-releases
    const url = `https://github.com/${RELEASES_REPO}/releases/download/v${version}/${file}`;

    platforms[platformKey] = { signature, url };
    console.log(`  ${platformKey} -> ${file}`);
  }

  if (Object.keys(platforms).length === 0) {
    console.error("No updater-compatible artifacts found.");
    process.exit(1);
  }

  const manifest = {
    version: `v${version}`,
    notes: `Release v${version}`,
    pub_date: new Date().toISOString(),
    platforms,
  };

  // Write latest.json locally
  const jsonPath = path.join(artifactsDir, "latest.json");
  fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2));
  console.log(`\nGenerated latest.json with ${Object.keys(platforms).length} platforms`);

  // Upload to ixos-releases as a release asset
  const tag = `v${version}`;
  try {
    execSync(
      `gh release upload "${tag}" "${jsonPath}" --repo ${RELEASES_REPO} --clobber`,
      { stdio: "inherit", env: { ...process.env, GH_TOKEN: process.env.GH_TOKEN } }
    );
    console.log("Uploaded latest.json to ixos-releases");
  } catch (err) {
    console.error("Failed to upload latest.json:", err.message);
    process.exit(1);
  }
}

main();
