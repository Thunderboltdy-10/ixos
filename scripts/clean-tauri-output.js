const fs = require("fs");
const path = require("path");

const root = process.cwd();
const targets = [
  path.join(root, "target", "release", "_up_"),
  path.join(root, "target", "release", "bundle"),
  path.join(root, "target", "release", "nsis"),
  path.join(root, "target", "release", "wix"),
];

for (const target of targets) {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
    console.log(`[clean:tauri] removed ${path.relative(root, target)}`);
  }
}
