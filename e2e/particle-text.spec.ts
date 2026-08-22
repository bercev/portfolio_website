import {
  attachRuntimeErrorCollector,
  expect,
  test,
} from "./runtime-errors";

test("renders BERAT as interactive Particle Text on capable devices", async ({
  page,
}) => {
  const runtimeErrors = attachRuntimeErrorCollector(page);
  await page.goto("/");

  const heading = page.getByRole("heading", { level: 1 });
  const particleText = heading.locator("[data-hero-particle-text]");

  await expect(heading).toHaveAccessibleName("Berat Ercevik");
  await expect(particleText).toHaveAttribute(
    "data-particle-text-mode",
    "enhanced",
  );
  await expect(particleText.locator('canvas[aria-hidden="true"]')).toBeVisible();
  await expect(particleText.getByText("BERAT", { exact: true })).toBeAttached();

  runtimeErrors.assertEmpty();
});

test("keeps Particle Text enhanced after switching themes", async ({ page }) => {
  const runtimeErrors = attachRuntimeErrorCollector(page);
  await page.goto("/");

  const particleText = page.locator("[data-hero-particle-text]");
  await expect(particleText).toHaveAttribute(
    "data-particle-text-mode",
    "enhanced",
  );

  await page
    .getByRole("button", { name: /Switch to (light|dark) theme/ })
    .click();

  await expect(particleText).toHaveAttribute(
    "data-particle-text-mode",
    "enhanced",
  );
  await expect(particleText.locator('canvas[aria-hidden="true"]')).toBeVisible();

  runtimeErrors.assertEmpty();
});

test("uses a static BERAT fallback when reduced motion is requested", async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  const runtimeErrors = attachRuntimeErrorCollector(page);
  await page.goto("/");

  const particleText = page.locator("[data-hero-particle-text]");
  await expect(particleText).toHaveAttribute(
    "data-particle-text-mode",
    "static",
  );
  await expect(particleText.getByText("BERAT", { exact: true })).toBeVisible();
  await expect(particleText.locator("canvas")).toHaveCount(0);

  runtimeErrors.assertEmpty();
  await context.close();
});
