import {
  attachRuntimeErrorCollector,
  expect,
  test,
} from "./runtime-errors";

test("activates one shared specular renderer for native buttons", async ({
  page,
}) => {
  const runtimeErrors = attachRuntimeErrorCollector(page);

  await page.goto("/");

  const renderer = page.locator("[data-specular-controls]");
  await expect(renderer).toHaveCount(1);
  await expect(renderer.locator("canvas")).toHaveCount(1);
  await expect(page.locator("[data-click-spark]")).toHaveCount(1);

  await page.locator("[data-bubble-menu-trigger]").hover();
  await expect(renderer).toHaveAttribute("data-specular-active", "true");

  runtimeErrors.assertEmpty();
});

test("activates the specular renderer for research preview links", async ({
  page,
}) => {
  const runtimeErrors = attachRuntimeErrorCollector(page);

  await page.goto("/");

  const renderer = page.locator("[data-specular-controls]");
  const researchLink = page.locator("[data-hover-preview] a").first();
  await researchLink.hover();

  await expect(renderer).toHaveAttribute("data-specular-active", "true");
  await expect(
    page.locator("[data-hover-preview-image]").first(),
  ).toBeVisible();

  runtimeErrors.assertEmpty();
});

test("omits specular rendering for reduced motion", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  const runtimeErrors = attachRuntimeErrorCollector(page);

  await page.goto("/");

  await expect(page.locator("[data-specular-controls]")).toHaveCount(0);
  await expect(page.locator("[data-click-spark]")).toHaveCount(0);

  runtimeErrors.assertEmpty();
  await context.close();
});
