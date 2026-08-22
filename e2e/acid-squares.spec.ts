import { attachRuntimeErrorCollector, expect, test } from "./runtime-errors";

test("mounts the Acid Squares canvas", async ({ page }) => {
  await page.goto("/");

  const effect = page.locator('[data-effect="acid-squares"]');
  await expect(effect).toHaveCount(1);
  await expect(effect.locator("canvas")).toHaveCount(1);
});

test("keeps a frozen Acid Squares frame for reduced motion", async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  const runtimeErrors = attachRuntimeErrorCollector(page);

  await page.goto("/");

  await expect(page.locator("[data-effect-mode]")).toHaveAttribute(
    "data-effect-mode",
    "static",
  );
  await expect(
    page.locator('[data-effect="acid-squares"] canvas'),
  ).toHaveCount(1);

  runtimeErrors.assertEmpty();
  await context.close();
});
