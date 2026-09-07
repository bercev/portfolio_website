import {
  attachRuntimeErrorCollector,
  expect,
  test,
} from "./runtime-errors";
import { measureHeroWordmarkInk, readJourneyT } from "./journey-helpers";

test("renders the immersive 3D journey on capable devices", async ({ page }) => {
  const runtimeErrors = attachRuntimeErrorCollector(page);
  await page.goto("/");

  const scene = page.locator("[data-journey-scene]");
  await expect(page.locator("html")).toHaveAttribute("data-journey", "active");
  await expect(scene).toBeVisible();
  await expect(scene).toHaveCSS("position", "fixed");

  // The 3D particle name replaces the flat fallback.
  await expect(page.locator("[data-hero-name-fallback]")).toBeHidden();
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(
    "Berat Ercevik",
  );

  runtimeErrors.assertEmpty();
});

test("keeps the journey active after switching themes", async ({ page }) => {
  const runtimeErrors = attachRuntimeErrorCollector(page);
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("data-journey", "active");

  await page.getByRole("button", { name: "Open utility menu" }).click();
  await page
    .getByRole("button", { name: /Switch to (light|dark) theme/ })
    .click();

  await expect(page.locator("html")).toHaveAttribute("data-journey", "active");
  await expect(page.locator("[data-journey-scene]")).toBeVisible();

  runtimeErrors.assertEmpty();
});

test("renders every numbered station in semantic order", async ({ page }) => {
  await page.goto("/");

  const kickers = page.locator(".journey-kicker");
  await expect(kickers).toHaveCount(6);
  await expect(kickers.nth(0)).toHaveText("02");
  await expect(kickers.nth(1)).toHaveText("03");
  await expect(kickers.nth(2)).toHaveText("04");
  await expect(kickers.nth(3)).toHaveText("05");
  await expect(kickers.nth(4)).toHaveText("06");
  await expect(kickers.nth(5)).toHaveText("07");
});

test("holds the camera on BERAT at the top of the page", async ({ page }) => {
  const runtimeErrors = attachRuntimeErrorCollector(page);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-journey", "active");
  await expect.poll(() => readJourneyT(page)).toBeGreaterThanOrEqual(0);
  expect(await readJourneyT(page)).toBeLessThan(0.03);
  await expect
    .poll(() => page.locator("[data-journey-scene]").getAttribute("data-journey-look"))
    .toBe("berat");
  runtimeErrors.assertEmpty();
});

for (const theme of ["dark", "light"] as const) {
  test.describe(`hero wordmark (${theme})`, () => {
    test.use({ colorScheme: theme });

    test(`shows BERAT particle ink in ${theme} mode`, async ({ page }) => {
      const runtimeErrors = attachRuntimeErrorCollector(page);
      await page.addInitScript((value) => {
        localStorage.setItem("theme", value);
      }, theme);
      await page.goto("/");
      await expect(page.locator("html")).toHaveAttribute("data-journey", "active", {
        timeout: 20_000,
      });
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect(page.locator("[data-hero-name-fallback]")).toBeHidden();
      await expect.poll(() => readJourneyT(page)).toBeLessThan(0.03);
      await expect
        .poll(() =>
          page.locator("[data-journey-scene]").getAttribute("data-journey-look"),
        )
        .toBe("berat");
      const ink = await measureHeroWordmarkInk(page);
      expect(ink.inkRatio, `${theme} ink=${JSON.stringify(ink)}`).toBeGreaterThan(
        0.012,
      );
      expect(ink.columnHits, `${theme} ink=${JSON.stringify(ink)}`).toBeGreaterThanOrEqual(
        3,
      );
      expect(ink.widthSpan, `${theme} ink=${JSON.stringify(ink)}`).toBeGreaterThan(
        0.25,
      );
      runtimeErrors.assertEmpty();
    });
  });
}

test("keeps the journey moving from Experience through Projects", async ({
  page,
}) => {
  const runtimeErrors = attachRuntimeErrorCollector(page);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-journey", "active");
  await expect.poll(() => readJourneyT(page)).toBeGreaterThanOrEqual(0);

  await page.locator("#experience").scrollIntoViewIfNeeded();
  await expect.poll(() => readJourneyT(page)).toBeGreaterThan(0.2);
  const tAtExperience = await readJourneyT(page);

  await page.locator("#projects").scrollIntoViewIfNeeded();
  await expect
    .poll(() => readJourneyT(page))
    .toBeGreaterThan(tAtExperience + 0.02);

  const tAtProjects = await readJourneyT(page);
  await page.evaluate(() => window.scrollBy(0, 800));
  await expect.poll(() => readJourneyT(page)).toBeGreaterThan(tAtProjects);
  expect(await readJourneyT(page)).toBeLessThan(0.9);

  runtimeErrors.assertEmpty();
});

test("keeps the journey unfinished from Skills through Contact", async ({
  page,
}) => {
  const runtimeErrors = attachRuntimeErrorCollector(page);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-journey", "active");

  await page.locator("#skills").scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    const el = document.getElementById("skills");
    if (!el) return;
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY);
  });
  await expect.poll(() => readJourneyT(page), { timeout: 10_000 }).toBeGreaterThan(0.5);
  const tAtSkills = await readJourneyT(page);
  expect(tAtSkills).toBeLessThan(0.9);

  await page.locator("#contact").scrollIntoViewIfNeeded();
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );
  await expect.poll(() => readJourneyT(page)).toBeGreaterThan(tAtSkills);
  const tAtContact = await readJourneyT(page);
  expect(tAtContact).toBeLessThan(0.94);

  runtimeErrors.assertEmpty();
});

test("uses a flat BERAT fallback when reduced motion is requested", async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  const runtimeErrors = attachRuntimeErrorCollector(page);
  await page.goto("/");

  await expect(page.locator("html")).not.toHaveAttribute("data-journey");
  const fallback = page.locator("[data-hero-name-fallback]");
  await expect(fallback).toBeVisible();
  await expect(fallback).toHaveText("BERAT");

  runtimeErrors.assertEmpty();
  await context.close();
});
