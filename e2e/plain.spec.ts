import {
  attachRuntimeErrorCollector,
  expect,
  test,
} from "./runtime-errors";

test("serves a no-animation site without WebGL", async ({ page }) => {
  const runtimeErrors = attachRuntimeErrorCollector(page);
  await page.goto("/plain");

  await expect(page.locator("html")).not.toHaveAttribute("data-journey");
  await expect(page.locator("[data-journey-scene]")).toHaveCount(0);
  await expect(page.locator("[data-plain-root]")).toBeVisible();
  await expect(page.locator("[data-plain-backdrop]")).toBeVisible();
  await expect(page.locator('[data-effect="acid-squares"]')).toHaveCount(0);
  await expect(page.locator("[data-vitae-orbit]")).toHaveCount(0);

  const fallback = page.locator("[data-hero-name-fallback]");
  await expect(fallback).toBeVisible();
  await expect(fallback).toHaveText("BERAT");

  await expect(page.locator("#skills .skill-marquee--static").first()).toBeVisible();
  await expect(
    page.getByRole("link", { name: "View with animations" }).first(),
  ).toHaveAttribute("href", "/");

  runtimeErrors.assertEmpty();
});

test("switches between the animated and plain sites", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "View without animations" }).first().click();
  await expect(page).toHaveURL(/\/plain\/?$/);
  await expect(page.locator("[data-plain-root]")).toBeVisible();

  await page.getByRole("link", { name: "View with animations" }).first().click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("[data-plain-root]")).toHaveCount(0);
});
