import type { Browser, Page } from "@playwright/test";

import {
  attachRuntimeErrorCollector,
  expect,
  test,
} from "./runtime-errors";

type ThemeName = "light" | "dark";

type ThemeFrame = {
  backgroundColor: string;
  className: string;
  colorScheme: string;
};

async function installFirstFrameThemeProbe(page: Page) {
  await page.addInitScript(() => {
    const themeFrame = new Promise<ThemeFrame>((resolve) => {
      const captureWhenContentIsPaintable = () => {
        if (!document.querySelector("#home")) return false;

        window.requestAnimationFrame(() => {
          const root = document.documentElement;
          const styles = window.getComputedStyle(root);
          resolve({
            backgroundColor: styles.backgroundColor,
            className: root.className,
            colorScheme: styles.colorScheme,
          });
        });
        return true;
      };

      if (captureWhenContentIsPaintable()) return;

      const observer = new MutationObserver(() => {
        if (captureWhenContentIsPaintable()) observer.disconnect();
      });
      observer.observe(document, { childList: true, subtree: true });
    });

    (
      window as typeof window & {
        __portfolioThemeFrame?: Promise<ThemeFrame>;
      }
    ).__portfolioThemeFrame = themeFrame;
  });
}

async function readFirstFrameTheme(page: Page) {
  return page.evaluate(() =>
    (
      window as typeof window & {
        __portfolioThemeFrame?: Promise<ThemeFrame>;
      }
    ).__portfolioThemeFrame,
  );
}

async function expectStableTheme(page: Page, theme: ThemeName) {
  const html = page.locator("html");
  await expect(html).toHaveClass(new RegExp(`(^|\\s)${theme}(\\s|$)`));

  const firstClassName = await html.getAttribute("class");
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        window.requestAnimationFrame(() =>
          window.requestAnimationFrame(() => resolve()),
        ),
      ),
  );
  await expect(html).toHaveClass(firstClassName ?? "");
}

async function openSystemThemePage(browser: Browser, theme: ThemeName) {
  const context = await browser.newContext({ colorScheme: theme });
  const page = await context.newPage();
  const runtimeErrors = attachRuntimeErrorCollector(page);
  await installFirstFrameThemeProbe(page);
  await page.goto("/");

  return { context, page, runtimeErrors };
}

for (const theme of ["light", "dark"] as const) {
  test(`resolves the ${theme} system scheme before the first visible frame`, async ({
    browser,
  }) => {
    const { context, page, runtimeErrors } = await openSystemThemePage(
      browser,
      theme,
    );

    await expectStableTheme(page, theme);
    await expect(page.getByRole("button", { name: `Switch to ${theme === "light" ? "dark" : "light"} theme` })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("theme"))).toBeNull();

    const firstFrame = await readFirstFrameTheme(page);
    expect(firstFrame).toBeDefined();
    expect(firstFrame!.className.split(/\s+/)).toContain(theme);
    expect(firstFrame!.colorScheme).toBe(theme);
    expect(firstFrame!.backgroundColor).toBe(
      await page.locator("html").evaluate(
        (element) => window.getComputedStyle(element).backgroundColor,
      ),
    );

    runtimeErrors.assertEmpty();
    await context.close();
  });
}

test("rejects an unexpected stored theme and falls back to the system scheme", async ({
  browser,
}) => {
  const context = await browser.newContext({ colorScheme: "dark" });
  const page = await context.newPage();
  const runtimeErrors = attachRuntimeErrorCollector(page);
  let releaseHydrationScripts = () => {};
  const hydrationScriptsReleased = new Promise<void>((resolve) => {
    releaseHydrationScripts = resolve;
  });
  await page.route(/\/_next\/static\/.*\.js(?:\?|$)/, async (route) => {
    await hydrationScriptsReleased;
    await route.continue();
  });
  await installFirstFrameThemeProbe(page);
  await page.addInitScript(() => localStorage.setItem("theme", "sepia"));

  await page.goto("/", { waitUntil: "commit" });

  const firstFrame = await readFirstFrameTheme(page);
  releaseHydrationScripts();
  await page.waitForLoadState("load");

  expect(firstFrame).toBeDefined();
  expect(firstFrame!.className.split(/\s+/)).toContain("dark");
  expect(firstFrame!.className.split(/\s+/)).not.toContain("sepia");
  expect(firstFrame!.colorScheme).toBe("dark");

  await expectStableTheme(page, "dark");
  expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe("system");
  await expect(page.locator("html")).not.toHaveClass(/(^|\s)sepia(\s|$)/);

  runtimeErrors.assertEmpty();
  await context.close();
});

test("toggles theme and restores the persisted choice before reload paints", async ({
  browser,
}) => {
  const context = await browser.newContext({ colorScheme: "light" });
  const page = await context.newPage();
  const runtimeErrors = attachRuntimeErrorCollector(page);

  await page.goto("/");
  await expectStableTheme(page, "light");

  const toggle = page.getByRole("button", { name: "Switch to dark theme" });
  await expect(toggle).toBeVisible();
  await toggle.click();

  await expectStableTheme(page, "dark");
  await expect(
    page.getByRole("button", { name: "Switch to light theme" }),
  ).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe("dark");

  await installFirstFrameThemeProbe(page);
  await page.reload();

  await expectStableTheme(page, "dark");
  const firstFrame = await readFirstFrameTheme(page);
  expect(firstFrame).toBeDefined();
  expect(firstFrame!.className.split(/\s+/)).toContain("dark");
  expect(firstFrame!.colorScheme).toBe("dark");
  expect(firstFrame!.backgroundColor).toBe(
    await page.locator("html").evaluate(
      (element) => window.getComputedStyle(element).backgroundColor,
    ),
  );
  await expect(
    page.getByRole("button", { name: "Switch to light theme" }),
  ).toBeVisible();

  runtimeErrors.assertEmpty();
  await context.close();
});
