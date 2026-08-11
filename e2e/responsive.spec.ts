import { expect, test, type Page } from "@playwright/test";

function collectRuntimeErrors(page: Page) {
  const errors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  return errors;
}

test("mounts enhanced pointer effects on a fine-pointer desktop", async ({
  page,
}) => {
  const errors = collectRuntimeErrors(page);

  await page.goto("/");

  await expect(page.locator("[data-effect-mode]")).toHaveAttribute(
    "data-effect-mode",
    "enhanced",
  );
  await expect(page.locator('[data-effect="pixel-trail"]')).toHaveCount(1);
  await expect(page.locator('[data-effect="click-spark"]')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("uses the mobile profile without pointer effects at 390px", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  const errors = collectRuntimeErrors(page);

  await page.goto("/");

  await expect(page.locator("[data-effect-mode]")).toHaveAttribute(
    "data-effect-mode",
    "mobile",
  );
  await expect(page.locator('[data-effect="pixel-trail"]')).toHaveCount(0);
  await expect(page.locator('[data-effect="click-spark"]')).toHaveCount(0);
  expect(errors).toEqual([]);

  await context.close();
});

test("renders static decoration and no pointer effects for reduced motion", async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  const errors = collectRuntimeErrors(page);

  await page.goto("/");

  await expect(page.locator("[data-effect-mode]")).toHaveAttribute(
    "data-effect-mode",
    "static",
  );
  await expect(page.locator('[data-effect="pixel-trail"]')).toHaveCount(0);
  await expect(page.locator('[data-effect="click-spark"]')).toHaveCount(0);
  expect(errors).toEqual([]);

  await context.close();
});
