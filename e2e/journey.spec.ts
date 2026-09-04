import {
  attachRuntimeErrorCollector,
  expect,
  test,
} from "./runtime-errors";

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
  await expect(kickers.nth(0)).toHaveText("Station 02 — Origin");
  await expect(kickers.nth(4)).toHaveText("Station 06 — Toolkit");
  await expect(kickers.nth(5)).toHaveText("Station 07 — Connect");
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
