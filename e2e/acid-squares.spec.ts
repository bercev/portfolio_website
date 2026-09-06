import { attachRuntimeErrorCollector, expect, test } from "./runtime-errors";

test("does not mount Acid Squares while the journey is running", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("data-journey", "active");
  await expect(page.locator('[data-effect="acid-squares"]')).toHaveCount(0);
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
