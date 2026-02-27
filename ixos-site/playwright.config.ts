import { defineConfig } from "@playwright/test";

const PORT = 3310;
const HOST = "localhost";

export default defineConfig({
  testDir: "./tests",
  timeout: 120_000,
  fullyParallel: false,
  reporter: [["list"]],
  snapshotPathTemplate: ".visual/{testFilePath}/{arg}{ext}",
  use: {
    baseURL: `http://${HOST}:${PORT}`,
    headless: true,
    colorScheme: "dark",
    locale: "en-US",
    reducedMotion: "reduce",
  },
  webServer: {
    command: `npm run build && npm run start -- --hostname ${HOST} --port ${PORT}`,
    url: `http://${HOST}:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
