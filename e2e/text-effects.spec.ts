import {
  attachRuntimeErrorCollector,
  expect,
  test,
} from "./runtime-errors";

test("keeps animated text and links semantically stable", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");

  const hero = page.locator("#home");
  const stableTagline = hero.locator(".sr-only", {
    hasText: /^I build software that reasons, adapts, and ships\.$/,
  });
  await expect(
    hero.locator(".sr-only", { hasText: /^Berat$/ }),
  ).toBeAttached();
  await expect(stableTagline).toBeAttached();
  await expect(
    page.locator("#about .sr-only", { hasText: /^About$/ }),
  ).toBeAttached();

  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 100);
  await page.clock.runFor(2_400);
  await expect(
    hero.getByText("Rigorous", { exact: true }),
  ).toBeAttached();
  await expect(stableTagline).toBeAttached();

  const external = hero.getByRole("link", { name: /GitHub/i }).first();
  await expect(external).toHaveAttribute("target", "_blank");
  await expect(external).toHaveAttribute("rel", /noopener/);
  await expect(external).toHaveAttribute("rel", /noreferrer/);
});

test("keeps the first trait static for reduced motion", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  const runtimeErrors = attachRuntimeErrorCollector(page);

  await page.clock.install();
  await page.goto("/");
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 100);
  await page.clock.runFor(2_400);

  await expect(
    page.locator("#home").getByText("Curious", { exact: true }),
  ).toBeAttached();
  await expect(
    page.locator("#home").getByText("Rigorous", { exact: true }),
  ).toHaveCount(0);

  runtimeErrors.assertEmpty();
  await context.close();
});
