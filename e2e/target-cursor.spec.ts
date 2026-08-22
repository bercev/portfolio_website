import {
  attachRuntimeErrorCollector,
  expect,
  test,
} from "./runtime-errors";

test("replaces the pixel trail with a target cursor on fine pointers", async ({
  page,
}) => {
  const runtimeErrors = attachRuntimeErrorCollector(page);

  await page.goto("/");

  const cursor = page.locator("[data-target-cursor]");
  await expect(cursor).toHaveCount(1);
  await expect(page.locator("[data-pixel-trail]")).toHaveCount(0);
  await expect(page.locator("[data-click-spark]")).toHaveCount(1);
  await expect(page.locator(".cursor-target")).not.toHaveCount(0);
  await expect(page.locator("body")).toHaveCSS("cursor", "none");

  const firstTarget = page.locator(".cursor-target").first();
  await firstTarget.hover();
  await expect(cursor).toHaveAttribute("data-target-cursor-active", "true");

  runtimeErrors.assertEmpty();
});

test("hides the target cursor while reading an embedded publication PDF", async ({
  page,
}) => {
  const runtimeErrors = attachRuntimeErrorCollector(page);

  await page.goto("/");

  const cursor = page.locator("[data-target-cursor]");
  const publication = page
    .locator("[data-hover-preview]")
    .filter({ hasText: "SkillOptimizer" });
  await publication.getByRole("link", { name: /SkillOptimizer/ }).hover();

  const reader = publication.locator("[data-pdf-reader]");
  await expect(reader).toBeVisible();
  await expect(cursor).toHaveCSS("opacity", "1");

  await reader.hover();
  await expect(cursor).toHaveCSS("opacity", "0");

  await page.mouse.move(0, 0);
  await expect(cursor).toHaveCSS("opacity", "1");

  runtimeErrors.assertEmpty();
});

test("does not mount pointer effects for reduced motion", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  const runtimeErrors = attachRuntimeErrorCollector(page);

  await page.goto("/");

  await expect(page.locator("[data-target-cursor]")).toHaveCount(0);
  await expect(page.locator("[data-pixel-trail]")).toHaveCount(0);
  await expect(page.locator("[data-click-spark]")).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveCSS("cursor", "none");

  runtimeErrors.assertEmpty();
  await context.close();
});
