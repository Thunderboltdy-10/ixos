import { expect, test } from "@playwright/test";

const ROUTES = ["/1", "/2", "/3"] as const;

const VIEWPORTS = [
  { width: 1440, height: 1800, label: "w1440" },
  { width: 1024, height: 1600, label: "w1024" },
  { width: 390, height: 2200, label: "w390" },
] as const;

for (const route of ROUTES) {
  for (const viewport of VIEWPORTS) {
    test(`${route} ${viewport.label}`, async ({ page }) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];

      page.on("console", (message) => {
        if (message.type() === "error") {
          const sourceUrl = message.location().url ?? "";
          const isIgnorable404 =
            message.text().includes("Failed to load resource: the server responded with a status of 404") &&
            (sourceUrl.includes("/_vercel/insights/script.js") || sourceUrl.includes("/favicon.ico"));
          if (isIgnorable404) {
            return;
          }
          consoleErrors.push(message.text());
        }
      });
      page.on("pageerror", (error) => {
        pageErrors.push(error.message);
      });

      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });

      await page.goto(`${route}?visual=1`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1800);
      // Reveal scroll-triggered sections before capturing the full page.
      const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < pageHeight; y += Math.floor(viewport.height * 0.7)) {
        await page.evaluate((position) => window.scrollTo(0, position), y);
        await page.waitForTimeout(120);
      }
      const freeAccess = page.getByRole("heading", { name: "Every search mode is free." });
      await freeAccess.scrollIntoViewIfNeeded();
      await expect(freeAccess).toBeVisible();
      await expect(page.getByText("Use the Rust CLI or desktop app without an account.", { exact: false })).toBeVisible();
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(1200);

      await expect(page).toHaveScreenshot(
        `variant-${route.replace("/", "")}-${viewport.width}.png`,
        {
          fullPage: true,
          animations: "disabled",
          caret: "hide",
          timeout: 15_000,
        }
      );

      expect(
        consoleErrors,
        `Console errors detected on ${route} (${viewport.width}px):\n${consoleErrors.join("\n")}`
      ).toEqual([]);
      expect(
        pageErrors,
        `Page runtime errors detected on ${route} (${viewport.width}px):\n${pageErrors.join("\n")}`
      ).toEqual([]);
    });
  }
}

// ─── No Horizontal Overflow Assertions ───────────────────────────────────────

const OVERFLOW_ROUTES = ["/1", "/2", "/3", "/demo"] as const;

for (const route of OVERFLOW_ROUTES) {
  test(`${route} no horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(route, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        hasOverflow: doc.scrollWidth > doc.clientWidth + 1,
      };
    });

    expect(
      overflow.hasOverflow,
      `Horizontal overflow on ${route}: scrollWidth=${overflow.scrollWidth} > clientWidth=${overflow.clientWidth}`
    ).toBe(false);
  });
}
